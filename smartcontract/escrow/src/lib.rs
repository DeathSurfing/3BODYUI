use cosmwasm_schema::QueryResponses;
use cosmwasm_std::{
    attr, entry_point, to_json_binary, Addr, BankMsg, Binary, Coin, Deps, DepsMut, Env,
    MessageInfo, QueryRequest, Response, StdError, StdResult, Timestamp, Uint128, WasmQuery,
};
use cw2;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use thiserror::Error;

static CONTRACT_NAME: &str = "crates.io:escrow-mvp";
static CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    #[error("Payment already exists")]
    PaymentExists {},
    #[error("Payment not found")]
    PaymentNotFound {},
    #[error("Invalid state transition")]
    InvalidState {},
    #[error("Unauthorized")]
    Unauthorized {},
    #[error("Insufficient funds sent")]
    InsufficientFunds {},
    #[error("Refund not allowed yet")]
    RefundNotAllowed {},
    #[error("LP not active")]
    LPNotActive {},
    // [L5] explicit error for wrong-denom or multi-coin sends
    #[error("Invalid funds: send exactly one coin of the expected denom")]
    InvalidFunds {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub admin: String,
    pub refund_timeout_seconds: u64,
    pub denom: String,
    pub lp_registry: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ExecuteMsg {
    Deposit { payment_id: String, seller: String },
    ConfirmPayout { payment_id: String, lp: String },
    Refund { payment_id: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema, QueryResponses)]
pub enum QueryMsg {
    #[returns(PaymentInfo)]
    GetPayment { payment_id: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct PaymentInfo {
    pub payment_id: String,
    // [C2] payer: the address that deposited USDT and receives the refund on timeout
    pub payer: Addr,
    pub seller: Addr,
    pub amount: Uint128,
    pub denom: String,
    pub state: PaymentState,
    pub created_at: Timestamp,
    pub deadline: Timestamp,
    pub lp: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum PaymentState {
    Deposited,
    PayoutConfirmed,
    Refunded,
}

// Query message for LP Registry contract
// [L10] Keep local copy for now; replace with crate import once workspace deps are wired
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum LPRegistryQueryMsg {
    GetLP { lp: String },
}

const ADMIN: Item<String> = Item::new("admin");
const DENOM: Item<String> = Item::new("denom");
const REFUND_TIMEOUT: Item<u64> = Item::new("refund_timeout");
const LP_REGISTRY: Item<String> = Item::new("lp_registry");
const PAYMENTS: Map<&str, PaymentInfo> = Map::new("payments");

// [C1] entry_point required for wasm export
#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    // [M6] Validate admin at instantiation so invalid addresses fail immediately
    let admin_addr = deps.api.addr_validate(&msg.admin)?;
    ADMIN.save(deps.storage, &admin_addr.to_string())?;
    DENOM.save(deps.storage, &msg.denom)?;
    REFUND_TIMEOUT.save(deps.storage, &msg.refund_timeout_seconds)?;
    LP_REGISTRY.save(deps.storage, &msg.lp_registry)?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attributes(vec![
        attr("action", "instantiate"),
        attr("admin", admin_addr.to_string()),
    ]))
}

// [C1] entry_point required for wasm export
#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Deposit { payment_id, seller } => deposit(deps, env, info, payment_id, seller),
        ExecuteMsg::ConfirmPayout { payment_id, lp } => {
            confirm_payout(deps, env, info, payment_id, lp)
        }
        ExecuteMsg::Refund { payment_id } => refund(deps, env, info, payment_id),
    }
}

fn deposit(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    payment_id: String,
    seller: String,
) -> Result<Response, ContractError> {
    if PAYMENTS
        .may_load(deps.storage, payment_id.as_str())?
        .is_some()
    {
        return Err(ContractError::PaymentExists {});
    }

    let seller_addr = deps.api.addr_validate(&seller)?;
    let denom = DENOM.load(deps.storage)?;

    // [L5] Reject if not exactly one coin of the expected denom
    if info.funds.len() != 1 || info.funds[0].denom != denom {
        return Err(ContractError::InvalidFunds {});
    }

    let sent_amount = info.funds[0].amount;
    if sent_amount.is_zero() {
        return Err(ContractError::InsufficientFunds {});
    }

    let now = env.block.time;
    let deadline = now.plus_seconds(REFUND_TIMEOUT.load(deps.storage)?);

    let payment = PaymentInfo {
        payment_id: payment_id.clone(),
        // [C2] Store payer so refund goes back to the right address
        payer: info.sender.clone(),
        seller: seller_addr,
        amount: sent_amount,
        denom: denom.clone(),
        state: PaymentState::Deposited,
        created_at: now,
        deadline,
        lp: None,
    };

    PAYMENTS.save(deps.storage, payment_id.as_str(), &payment)?;

    Ok(Response::new().add_attributes(vec![
        attr("action", "deposit"),
        attr("payment_id", payment_id),
        attr("payer", info.sender.to_string()),
        attr("amount", sent_amount.to_string()),
    ]))
}

fn confirm_payout(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    payment_id: String,
    lp: String,
) -> Result<Response, ContractError> {
    let admin = ADMIN.load(deps.storage)?;
    let admin_addr = deps.api.addr_validate(&admin)?;
    if info.sender != admin_addr {
        return Err(ContractError::Unauthorized {});
    }

    let mut payment = PAYMENTS
        .may_load(deps.storage, payment_id.as_str())?
        .ok_or(ContractError::PaymentNotFound {})?;

    if payment.state != PaymentState::Deposited {
        return Err(ContractError::InvalidState {});
    }

    // Cross-contract: query LP registry for active status (expects bool)
    let registry = LP_REGISTRY.load(deps.storage)?;
    let lp_query = lp.clone();
    let lp_active: bool = deps.querier.query(&QueryRequest::Wasm(WasmQuery::Smart {
        contract_addr: registry,
        msg: to_json_binary(&LPRegistryQueryMsg::GetLP { lp: lp_query })?,
    }))?;

    if !lp_active {
        return Err(ContractError::LPNotActive {});
    }

    let coin = Coin {
        denom: payment.denom.clone(),
        amount: payment.amount,
    };
    payment.state = PaymentState::PayoutConfirmed;
    payment.lp = Some(lp.clone());
    PAYMENTS.save(deps.storage, payment_id.as_str(), &payment)?;

    let send = BankMsg::Send {
        to_address: lp.clone(),
        amount: vec![coin.clone()],
    };

    Ok(Response::new().add_message(send).add_attributes(vec![
        attr("action", "confirm_payout"),
        attr("payment_id", payment_id.clone()),
        attr("lp", lp),
        attr("amount", coin.amount.to_string()),
        attr("denom", coin.denom),
    ]))
}

fn refund(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    payment_id: String,
) -> Result<Response, ContractError> {
    let mut payment = PAYMENTS
        .may_load(deps.storage, payment_id.as_str())?
        .ok_or(ContractError::PaymentNotFound {})?;

    let now = env.block.time;
    let admin = ADMIN.load(deps.storage)?;
    let admin_addr = deps.api.addr_validate(&admin)?;
    let is_admin = info.sender == admin_addr;

    if payment.state != PaymentState::Deposited {
        return Err(ContractError::InvalidState {});
    }

    if now < payment.deadline && !is_admin {
        return Err(ContractError::RefundNotAllowed {});
    }

    let coin = Coin {
        denom: payment.denom.clone(),
        amount: payment.amount,
    };

    payment.state = PaymentState::Refunded;
    PAYMENTS.save(deps.storage, payment_id.as_str(), &payment)?;

    // [C2] Refund goes to payer (USDT depositor), not seller (INR recipient)
    let send = BankMsg::Send {
        to_address: payment.payer.to_string(),
        amount: vec![coin.clone()],
    };

    Ok(Response::new().add_message(send).add_attributes(vec![
        attr("action", "refund"),
        attr("payment_id", payment_id),
        attr("refund_to", payment.payer.to_string()),
        attr("amount", coin.amount.to_string()),
        attr("denom", coin.denom),
    ]))
}

// [C1] entry_point required for wasm export
#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetPayment { payment_id } => {
            to_json_binary(&PAYMENTS.may_load(deps.storage, payment_id.as_str())?)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{
        mock_dependencies, mock_env, mock_info, MockApi, MockQuerier, MockStorage,
    };
    use cosmwasm_std::{coins, from_json, Addr, CosmosMsg, Empty, OwnedDeps, Uint128};

    fn setup_contract() -> (
        OwnedDeps<MockStorage, MockApi, MockQuerier, Empty>,
        Env,
        MessageInfo,
        String,
    ) {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let admin = "admin".to_string();
        let info = mock_info(&admin, &[]);
        let lp_registry = "lp_registry".to_string();

        let msg = InstantiateMsg {
            admin: admin.clone(),
            refund_timeout_seconds: 3600,
            denom: "uusd".to_string(),
            lp_registry: lp_registry.clone(),
        };

        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();
        (deps, env, info, lp_registry)
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let admin = "admin".to_string();
        let info = mock_info(&admin, &[]);

        let msg = InstantiateMsg {
            admin: admin.clone(),
            refund_timeout_seconds: 3600,
            denom: "uusd".to_string(),
            lp_registry: "lp_registry".to_string(),
        };

        let res = instantiate(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes.len(), 2);
        assert_eq!(res.attributes[0].key, "action");
        assert_eq!(res.attributes[0].value, "instantiate");
    }

    // [M6] Invalid admin address fails at instantiation
    #[test]
    fn test_instantiate_invalid_admin_fails() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("anyone", &[]);
        let msg = InstantiateMsg {
            admin: "".to_string(), // Invalid address
            refund_timeout_seconds: 3600,
            denom: "uusd".to_string(),
            lp_registry: "lp_registry".to_string(),
        };
        assert!(instantiate(deps.as_mut(), env, info, msg).is_err());
    }

    #[test]
    fn test_deposit() {
        let (mut deps, env, _info, _) = setup_contract();
        let buyer = "buyer".to_string();
        let seller = "seller".to_string();
        let payment_id = "payment_1".to_string();
        let deposit_amount = 1000u128;

        let info = mock_info(&buyer, &coins(deposit_amount, "uusd"));
        let msg = ExecuteMsg::Deposit {
            payment_id: payment_id.clone(),
            seller: seller.clone(),
        };

        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "deposit");
        assert_eq!(res.attributes[1].value, payment_id);

        let payment: Option<PaymentInfo> =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetPayment { payment_id }).unwrap())
                .unwrap();

        let payment = payment.unwrap();
        // [C2] payer must be buyer
        assert_eq!(payment.payer, Addr::unchecked(&buyer));
        assert_eq!(payment.seller, Addr::unchecked(&seller));
        assert_eq!(payment.amount, Uint128::new(deposit_amount));
        assert_eq!(payment.state, PaymentState::Deposited);
    }

    // [L5] Wrong denom rejected
    #[test]
    fn test_deposit_wrong_denom_rejected() {
        let (mut deps, env, _info, _) = setup_contract();
        let info = mock_info("buyer", &coins(1000, "uatom"));
        let msg = ExecuteMsg::Deposit {
            payment_id: "p1".to_string(),
            seller: "seller".to_string(),
        };
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::InvalidFunds {}));
    }

    // [L5] Multiple coins rejected
    #[test]
    fn test_deposit_multiple_coins_rejected() {
        let (mut deps, env, _info, _) = setup_contract();
        use cosmwasm_std::Coin;
        let info = mock_info(
            "buyer",
            &[
                Coin { denom: "uusd".to_string(), amount: Uint128::new(1000) },
                Coin { denom: "uatom".to_string(), amount: Uint128::new(100) },
            ],
        );
        let msg = ExecuteMsg::Deposit {
            payment_id: "p1".to_string(),
            seller: "seller".to_string(),
        };
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::InvalidFunds {}));
    }

    #[test]
    fn test_deposit_duplicate_payment_id() {
        let (mut deps, env, _info, _) = setup_contract();
        let info = mock_info("buyer", &coins(1000, "uusd"));
        let msg = ExecuteMsg::Deposit {
            payment_id: "payment_1".to_string(),
            seller: "seller".to_string(),
        };
        execute(deps.as_mut(), env.clone(), info.clone(), msg.clone()).unwrap();
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(matches!(res.unwrap_err(), ContractError::PaymentExists {}));
    }

    #[test]
    fn test_deposit_insufficient_funds() {
        let (mut deps, env, _info, _) = setup_contract();
        let info = mock_info("buyer", &[]);
        let msg = ExecuteMsg::Deposit {
            payment_id: "payment_1".to_string(),
            seller: "seller".to_string(),
        };
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        // No coins at all -> InvalidFunds (wrong number of coins)
        assert!(matches!(res.unwrap_err(), ContractError::InvalidFunds {}));
    }

    // [C2] Core regression: refund goes to payer not seller
    #[test]
    fn test_refund_goes_to_payer_not_seller() {
        let (mut deps, env, _info, _) = setup_contract();
        let buyer = "buyer".to_string();
        let seller = "seller".to_string();

        let info = mock_info(&buyer, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Deposit {
                payment_id: "p1".to_string(),
                seller: seller.clone(),
            },
        )
        .unwrap();

        let mut env = env;
        env.block.time = env.block.time.plus_seconds(3601);

        let res = execute(
            deps.as_mut(),
            env,
            mock_info(&buyer, &[]),
            ExecuteMsg::Refund { payment_id: "p1".to_string() },
        )
        .unwrap();

        // Verify BankMsg goes to buyer (payer), not seller
        match &res.messages[0].msg {
            CosmosMsg::Bank(BankMsg::Send { to_address, .. }) => {
                assert_eq!(to_address, &buyer);
                assert_ne!(to_address, &seller);
            }
            _ => panic!("Expected BankMsg::Send"),
        }
        let refund_to = res.attributes.iter().find(|a| a.key == "refund_to").unwrap();
        assert_eq!(refund_to.value, buyer);
    }

    #[test]
    fn test_refund() {
        let (mut deps, env, _info, _) = setup_contract();
        let buyer = "buyer".to_string();

        let info = mock_info(&buyer, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Deposit {
                payment_id: "payment_1".to_string(),
                seller: "seller".to_string(),
            },
        )
        .unwrap();

        let mut env = env;
        env.block.time = env.block.time.plus_seconds(3601);

        let res = execute(
            deps.as_mut(),
            env.clone(),
            mock_info(&buyer, &[]),
            ExecuteMsg::Refund { payment_id: "payment_1".to_string() },
        )
        .unwrap();

        assert_eq!(res.attributes[0].value, "refund");

        let payment: Option<PaymentInfo> = from_json(
            &query(
                deps.as_ref(),
                env,
                QueryMsg::GetPayment { payment_id: "payment_1".to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(payment.unwrap().state, PaymentState::Refunded);
    }

    // [L6] Admin-forced early refund
    #[test]
    fn test_admin_can_refund_early() {
        let (mut deps, env, admin_info, _) = setup_contract();
        let info = mock_info("buyer", &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Deposit {
                payment_id: "p1".to_string(),
                seller: "seller".to_string(),
            },
        )
        .unwrap();

        // Admin refunds before deadline — must succeed
        let res = execute(
            deps.as_mut(),
            env,
            admin_info,
            ExecuteMsg::Refund { payment_id: "p1".to_string() },
        );
        assert!(res.is_ok());
    }

    #[test]
    fn test_refund_too_early() {
        let (mut deps, env, _info, _) = setup_contract();
        let info = mock_info("buyer", &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Deposit {
                payment_id: "p1".to_string(),
                seller: "seller".to_string(),
            },
        )
        .unwrap();
        let res = execute(
            deps.as_mut(),
            env,
            mock_info("buyer", &[]),
            ExecuteMsg::Refund { payment_id: "p1".to_string() },
        );
        assert!(matches!(res.unwrap_err(), ContractError::RefundNotAllowed {}));
    }

    #[test]
    fn test_refund_nonexistent_payment() {
        let (mut deps, env, _info, _) = setup_contract();
        let res = execute(
            deps.as_mut(),
            env,
            mock_info("buyer", &[]),
            ExecuteMsg::Refund { payment_id: "nonexistent".to_string() },
        );
        assert!(matches!(res.unwrap_err(), ContractError::PaymentNotFound {}));
    }
}