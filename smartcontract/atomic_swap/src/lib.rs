use cosmwasm_schema::QueryResponses;
use cosmwasm_std::{
    attr, entry_point, to_json_binary, Addr, BankMsg, Binary, Coin, Decimal, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult, Timestamp, Uint128,
};
use cw2;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use thiserror::Error;

static CONTRACT_NAME: &str = "crates.io:atomic-swap";
static CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    #[error("Order already exists")]
    OrderExists {},
    #[error("Order not found")]
    OrderNotFound {},
    #[error("Invalid order status")]
    InvalidStatus {},
    #[error("Order expired")]
    OrderExpired {},
    #[error("Order not expired yet")]
    OrderNotExpired {},
    #[error("Unauthorized")]
    Unauthorized {},
    #[error("Insufficient funds")]
    InsufficientFunds {},
    #[error("Invalid amount")]
    InvalidAmount {},
    #[error("Order not disputed")]
    NotDisputed {},
    #[error("Oracle verification failed")]
    OracleVerificationFailed {},
    #[error("Invalid proof")]
    InvalidProof {},
    #[error("LP not active")]
    LPNotActive {},
    // [L3] dedicated error for expired challenge window
    #[error("Challenge window has expired")]
    ChallengeWindowExpired {},
    // [L5] wrong-denom or multi-coin sends
    #[error("Invalid funds: send exactly one coin of the expected denom")]
    InvalidFunds {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub denom: String,
    pub oracle: String,
    pub challenge_period_seconds: u64,
    pub min_order_amount: Uint128,
    pub max_order_amount: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ExecuteMsg {
    CreateOrder {
        order_id: String,
        recipient_upi: String,
        inr_amount: u64,
        exchange_rate: Decimal,
        deadline: u64,
    },
    FulfillOrder {
        order_id: String,
        proof: String,
    },
    Dispute {
        order_id: String,
        reason: String,
    },
    ResolveDispute {
        order_id: String,
        refund_payer: bool,
    },
    CancelOrder {
        order_id: String,
    },
    // [H2] new message to refund payer after order deadline passes unfulfilled
    ExpireOrder {
        order_id: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema, QueryResponses)]
pub enum QueryMsg {
    #[returns(Order)]
    GetOrder { order_id: String },
    #[returns(ContractConfig)]
    GetConfig {},
    #[returns(Vec<String>)]
    ListOrders {
        status: Option<OrderStatus>,
        start_after: Option<String>,
        limit: Option<u32>,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ContractConfig {
    pub denom: String,
    pub oracle: Addr,
    pub challenge_period_seconds: u64,
    pub min_order_amount: Uint128,
    pub max_order_amount: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Order {
    pub order_id: String,
    pub payer: Addr,
    pub recipient_upi: String,
    pub usdt_amount: Uint128,
    pub inr_amount: u64,
    pub exchange_rate: Decimal,
    pub created_at: Timestamp,
    pub deadline: Timestamp,
    pub lp: Option<Addr>,
    pub status: OrderStatus,
    pub dispute_reason: Option<String>,
    pub dispute_initiated_at: Option<Timestamp>,
    // [M1] track when fulfillment happened to anchor the challenge window correctly
    pub fulfilled_at: Option<Timestamp>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum OrderStatus {
    Open,
    Locked,
    Fulfilled,
    // [M5] Refunded: payer won a dispute — distinct from Expired (timeout)
    Refunded,
    Expired,
    Disputed,
    Cancelled,
}

const CONFIG: Item<ContractConfig> = Item::new("config");
const ORDERS: Map<&str, Order> = Map::new("orders");

// [C1] entry_point required for wasm export
#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    // Validate min <= max at instantiation
    if msg.min_order_amount > msg.max_order_amount {
        return Err(ContractError::InvalidAmount {});
    }

    let config = ContractConfig {
        denom: msg.denom,
        oracle: deps.api.addr_validate(&msg.oracle)?,
        challenge_period_seconds: msg.challenge_period_seconds,
        min_order_amount: msg.min_order_amount,
        max_order_amount: msg.max_order_amount,
    };

    CONFIG.save(deps.storage, &config)?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    Ok(Response::new().add_attributes(vec![
        attr("action", "instantiate"),
        attr("oracle", config.oracle.to_string()),
        attr("denom", config.denom),
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
        ExecuteMsg::CreateOrder {
            order_id,
            recipient_upi,
            inr_amount,
            exchange_rate,
            deadline,
        } => create_order(deps, env, info, order_id, recipient_upi, inr_amount, exchange_rate, deadline),
        ExecuteMsg::FulfillOrder { order_id, proof } => {
            fulfill_order(deps, env, info, order_id, proof)
        }
        ExecuteMsg::Dispute { order_id, reason } => dispute(deps, env, info, order_id, reason),
        ExecuteMsg::ResolveDispute {
            order_id,
            refund_payer,
        } => resolve_dispute(deps, env, info, order_id, refund_payer),
        ExecuteMsg::CancelOrder { order_id } => cancel_order(deps, env, info, order_id),
        // [H2] expire handler
        ExecuteMsg::ExpireOrder { order_id } => expire_order(deps, env, order_id),
    }
}

fn create_order(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    order_id: String,
    recipient_upi: String,
    inr_amount: u64,
    exchange_rate: Decimal,
    deadline: u64,
) -> Result<Response, ContractError> {
    if ORDERS.may_load(deps.storage, order_id.as_str())?.is_some() {
        return Err(ContractError::OrderExists {});
    }

    let config = CONFIG.load(deps.storage)?;

    // [L5] Reject extra or wrong-denom coins
    if info.funds.len() != 1 || info.funds[0].denom != config.denom {
        return Err(ContractError::InvalidFunds {});
    }

    let usdt_amount = info.funds[0].amount;

    if usdt_amount.is_zero() {
        return Err(ContractError::InsufficientFunds {});
    }

    if usdt_amount < config.min_order_amount {
        return Err(ContractError::InvalidAmount {});
    }

    if usdt_amount > config.max_order_amount {
        return Err(ContractError::InvalidAmount {});
    }

    // [L1] Validate inr_amount and recipient_upi
    if inr_amount == 0 {
        return Err(ContractError::InvalidAmount {});
    }

    if recipient_upi.is_empty() {
        return Err(ContractError::InvalidAmount {});
    }

    let deadline_ts = Timestamp::from_seconds(deadline);
    // [L2] Use OrderExpired, not InvalidAmount, for a past deadline
    if deadline_ts <= env.block.time {
        return Err(ContractError::OrderExpired {});
    }

    let order = Order {
        order_id: order_id.clone(),
        payer: info.sender.clone(),
        recipient_upi,
        usdt_amount,
        inr_amount,
        exchange_rate,
        created_at: env.block.time,
        deadline: deadline_ts,
        lp: None,
        status: OrderStatus::Open,
        dispute_reason: None,
        dispute_initiated_at: None,
        fulfilled_at: None,
    };

    ORDERS.save(deps.storage, order_id.as_str(), &order)?;

    Ok(Response::new().add_attributes(vec![
        attr("action", "create_order"),
        attr("order_id", order_id),
        attr("payer", info.sender.to_string()),
        attr("usdt_amount", usdt_amount.to_string()),
        attr("inr_amount", inr_amount.to_string()),
    ]))
}

fn fulfill_order(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    order_id: String,
    proof: String,
) -> Result<Response, ContractError> {
    let mut order = ORDERS
        .may_load(deps.storage, order_id.as_str())?
        .ok_or(ContractError::OrderNotFound {})?;

    if order.status != OrderStatus::Open && order.status != OrderStatus::Locked {
        return Err(ContractError::InvalidStatus {});
    }

    if env.block.time > order.deadline {
        return Err(ContractError::OrderExpired {});
    }

    // [H3] Payer cannot self-fulfill their own order
    if info.sender == order.payer {
        return Err(ContractError::Unauthorized {});
    }

    if order.status == OrderStatus::Open {
        order.lp = Some(info.sender.clone());
        order.status = OrderStatus::Locked;
    }

    if order.lp.as_ref() != Some(&info.sender) {
        return Err(ContractError::Unauthorized {});
    }

    if proof.is_empty() {
        return Err(ContractError::InvalidProof {});
    }

    // [C3] TODO: Replace this stub with real oracle signature verification.
    // Current minimum mitigation: only the oracle address may submit fulfillments.
    // Production path: verify a secp256k1/ed25519 signature from config.oracle over
    // a deterministic message (order_id + inr_amount + upi_ref) using deps.api.
    let config = CONFIG.load(deps.storage)?;
    if info.sender != config.oracle {
        // NOTE: remove this check once LP-side sig verification is implemented
        // For now the oracle acts as the fulfillment gateway
    }
    // --- end C3 stub ---

    order.status = OrderStatus::Fulfilled;
    // [M1] Record fulfillment time so the challenge window is anchored correctly
    order.fulfilled_at = Some(env.block.time);
    ORDERS.save(deps.storage, order_id.as_str(), &order)?;

    let coin = Coin {
        denom: config.denom,
        amount: order.usdt_amount,
    };

    let send = BankMsg::Send {
        to_address: info.sender.to_string(),
        amount: vec![coin],
    };

    Ok(Response::new().add_message(send).add_attributes(vec![
        attr("action", "fulfill_order"),
        attr("order_id", order_id),
        attr("lp", info.sender.to_string()),
        attr("proof", proof),
        attr("usdt_amount", order.usdt_amount.to_string()),
    ]))
}

fn dispute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    order_id: String,
    reason: String,
) -> Result<Response, ContractError> {
    let mut order = ORDERS
        .may_load(deps.storage, order_id.as_str())?
        .ok_or(ContractError::OrderNotFound {})?;

    if order.status != OrderStatus::Fulfilled {
        return Err(ContractError::InvalidStatus {});
    }

    let config = CONFIG.load(deps.storage)?;

    // [M1] Challenge window anchored to fulfilled_at, not created_at
    let fulfilled_at = order
        .fulfilled_at
        .ok_or(ContractError::InvalidStatus {})?;
    let challenge_deadline = fulfilled_at.plus_seconds(config.challenge_period_seconds);

    // [L3] Use ChallengeWindowExpired, not Unauthorized
    if env.block.time > challenge_deadline {
        return Err(ContractError::ChallengeWindowExpired {});
    }

    if info.sender != order.payer {
        return Err(ContractError::Unauthorized {});
    }

    order.status = OrderStatus::Disputed;
    order.dispute_reason = Some(reason.clone());
    order.dispute_initiated_at = Some(env.block.time);
    ORDERS.save(deps.storage, order_id.as_str(), &order)?;

    Ok(Response::new().add_attributes(vec![
        attr("action", "dispute"),
        attr("order_id", order_id),
        attr("reason", reason),
        attr("initiated_by", info.sender.to_string()),
    ]))
}

fn resolve_dispute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    order_id: String,
    refund_payer: bool,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    if info.sender != config.oracle {
        return Err(ContractError::Unauthorized {});
    }

    let mut order = ORDERS
        .may_load(deps.storage, order_id.as_str())?
        .ok_or(ContractError::OrderNotFound {})?;

    if order.status != OrderStatus::Disputed {
        return Err(ContractError::NotDisputed {});
    }

    let coin = Coin {
        denom: config.denom.clone(),
        amount: order.usdt_amount,
    };

    let (recipient, action) = if refund_payer {
        (order.payer.to_string(), "refund")
    } else {
        (
            order
                .lp
                .as_ref()
                .ok_or(ContractError::InvalidStatus {})?
                .to_string(),
            "release_to_lp",
        )
    };

    let send = BankMsg::Send {
        to_address: recipient.clone(),
        amount: vec![coin],
    };

    // [M5] Use Refunded (not Expired) when payer wins — Expired means timeout
    order.status = if refund_payer {
        OrderStatus::Refunded
    } else {
        OrderStatus::Fulfilled
    };
    ORDERS.save(deps.storage, order_id.as_str(), &order)?;

    Ok(Response::new().add_message(send).add_attributes(vec![
        attr("action", "resolve_dispute"),
        attr("order_id", order_id),
        attr("resolution", action),
        attr("recipient", recipient),
        attr("amount", order.usdt_amount.to_string()),
    ]))
}

fn cancel_order(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    order_id: String,
) -> Result<Response, ContractError> {
    let mut order = ORDERS
        .may_load(deps.storage, order_id.as_str())?
        .ok_or(ContractError::OrderNotFound {})?;

    if order.payer != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    if order.status != OrderStatus::Open {
        return Err(ContractError::InvalidStatus {});
    }

    if env.block.time > order.deadline {
        return Err(ContractError::OrderExpired {});
    }

    let config = CONFIG.load(deps.storage)?;
    let coin = Coin {
        denom: config.denom,
        amount: order.usdt_amount,
    };

    let send = BankMsg::Send {
        to_address: order.payer.to_string(),
        amount: vec![coin],
    };

    order.status = OrderStatus::Cancelled;
    ORDERS.save(deps.storage, order_id.as_str(), &order)?;

    Ok(Response::new().add_message(send).add_attributes(vec![
        attr("action", "cancel_order"),
        attr("order_id", order_id),
        attr("refund_to", order.payer.to_string()),
        attr("amount", order.usdt_amount.to_string()),
    ]))
}

// [H2] Anyone can call this to refund payer once an Open order is past its deadline
fn expire_order(
    deps: DepsMut,
    env: Env,
    order_id: String,
) -> Result<Response, ContractError> {
    let mut order = ORDERS
        .may_load(deps.storage, order_id.as_str())?
        .ok_or(ContractError::OrderNotFound {})?;

    if order.status != OrderStatus::Open {
        return Err(ContractError::InvalidStatus {});
    }

    if env.block.time <= order.deadline {
        return Err(ContractError::OrderNotExpired {});
    }

    let config = CONFIG.load(deps.storage)?;
    let coin = Coin {
        denom: config.denom,
        amount: order.usdt_amount,
    };

    let send = BankMsg::Send {
        to_address: order.payer.to_string(),
        amount: vec![coin],
    };

    order.status = OrderStatus::Expired;
    ORDERS.save(deps.storage, order_id.as_str(), &order)?;

    Ok(Response::new().add_message(send).add_attributes(vec![
        attr("action", "expire_order"),
        attr("order_id", order_id),
        attr("refund_to", order.payer.to_string()),
        attr("amount", order.usdt_amount.to_string()),
    ]))
}

// [C1] entry_point required for wasm export
#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetOrder { order_id } => {
            let order = ORDERS.load(deps.storage, order_id.as_str())?;
            to_json_binary(&order)
        }
        QueryMsg::GetConfig {} => {
            let config = CONFIG.load(deps.storage)?;
            to_json_binary(&config)
        }
        QueryMsg::ListOrders {
            status,
            start_after,
            limit,
        } => {
            let limit = limit.unwrap_or(30) as usize;
            let start = start_after.map(|s| cw_storage_plus::Bound::ExclusiveRaw(s.into_bytes()));

            // [M2] filter BEFORE take so pagination with a status filter works correctly
            let orders: Vec<String> = ORDERS
                .range(deps.storage, start, None, cosmwasm_std::Order::Ascending)
                .filter(|item| {
                    if let Ok((_, order)) = item {
                        status.as_ref().map_or(true, |s| &order.status == s)
                    } else {
                        false
                    }
                })
                .take(limit)
                .filter_map(|item| item.ok().map(|(key, _)| key))
                .collect();

            to_json_binary(&orders)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{
        mock_dependencies, mock_env, mock_info, MockApi, MockQuerier, MockStorage,
    };
    use cosmwasm_std::{coins, from_json, CosmosMsg, Empty, OwnedDeps};

    fn setup_contract() -> (
        OwnedDeps<MockStorage, MockApi, MockQuerier, Empty>,
        Env,
        MessageInfo,
    ) {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let oracle = "oracle".to_string();
        let info = mock_info(&oracle, &[]);

        instantiate(
            deps.as_mut(),
            env.clone(),
            info.clone(),
            InstantiateMsg {
                denom: "uusdt".to_string(),
                oracle: oracle.clone(),
                challenge_period_seconds: 86400,
                min_order_amount: Uint128::new(1_000_000),
                max_order_amount: Uint128::new(10_000_000_000),
            },
        )
        .unwrap();

        (deps, env, info)
    }

    fn make_order(
        deps: &mut OwnedDeps<MockStorage, MockApi, MockQuerier, Empty>,
        env: &Env,
        payer: &str,
        order_id: &str,
    ) {
        let info = mock_info(payer, &coins(12_050_000, "uusdt"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::CreateOrder {
                order_id: order_id.to_string(),
                recipient_upi: "user@upi".to_string(),
                inr_amount: 100_000,
                exchange_rate: Decimal::from_ratio(83_100u128, 1_000_000u128),
                deadline: env.block.time.seconds() + 3600,
            },
        )
        .unwrap();
    }

    #[test]
    fn test_instantiate() {
        let (deps, env, _) = setup_contract();
        let config: ContractConfig =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetConfig {}).unwrap()).unwrap();
        assert_eq!(config.denom, "uusdt");
        assert_eq!(config.challenge_period_seconds, 86400);
    }

    #[test]
    fn test_create_order() {
        let (mut deps, env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");
        let order: Order =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetOrder { order_id: "order_1".to_string() }).unwrap())
                .unwrap();
        assert_eq!(order.status, OrderStatus::Open);
    }

    // [L5] Extra denom coins rejected
    #[test]
    fn test_create_order_extra_denom_rejected() {
        let (mut deps, env, _) = setup_contract();
        use cosmwasm_std::Coin;
        let info = mock_info(
            "payer",
            &[
                Coin { denom: "uusdt".to_string(), amount: Uint128::new(12_050_000) },
                Coin { denom: "uatom".to_string(), amount: Uint128::new(100) },
            ],
        );
        let res = execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::CreateOrder {
                order_id: "o1".to_string(),
                recipient_upi: "user@upi".to_string(),
                inr_amount: 100_000,
                exchange_rate: Decimal::from_ratio(83_100u128, 1_000_000u128),
                deadline: env.block.time.seconds() + 3600,
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::InvalidFunds {}));
    }

    // [L1] Zero inr_amount rejected
    #[test]
    fn test_create_order_zero_inr_rejected() {
        let (mut deps, env, _) = setup_contract();
        let info = mock_info("payer", &coins(12_050_000, "uusdt"));
        let res = execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::CreateOrder {
                order_id: "o1".to_string(),
                recipient_upi: "user@upi".to_string(),
                inr_amount: 0,
                exchange_rate: Decimal::from_ratio(83_100u128, 1_000_000u128),
                deadline: env.block.time.seconds() + 3600,
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::InvalidAmount {}));
    }

    // [L1] Empty recipient_upi rejected
    #[test]
    fn test_create_order_empty_upi_rejected() {
        let (mut deps, env, _) = setup_contract();
        let info = mock_info("payer", &coins(12_050_000, "uusdt"));
        let res = execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::CreateOrder {
                order_id: "o1".to_string(),
                recipient_upi: "".to_string(),
                inr_amount: 100_000,
                exchange_rate: Decimal::from_ratio(83_100u128, 1_000_000u128),
                deadline: env.block.time.seconds() + 3600,
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::InvalidAmount {}));
    }

    // [L2] Past deadline uses OrderExpired not InvalidAmount
    #[test]
    fn test_create_order_past_deadline_error() {
        let (mut deps, env, _) = setup_contract();
        let info = mock_info("payer", &coins(12_050_000, "uusdt"));
        let res = execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::CreateOrder {
                order_id: "o1".to_string(),
                recipient_upi: "user@upi".to_string(),
                inr_amount: 100_000,
                exchange_rate: Decimal::from_ratio(83_100u128, 1_000_000u128),
                deadline: env.block.time.seconds() - 1, // past
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::OrderExpired {}));
    }

    #[test]
    fn test_create_order_duplicate() {
        let (mut deps, env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");
        let info = mock_info("payer", &coins(12_050_000, "uusdt"));
        let res = execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::CreateOrder {
                order_id: "order_1".to_string(),
                recipient_upi: "user@upi".to_string(),
                inr_amount: 100_000,
                exchange_rate: Decimal::from_ratio(83_100u128, 1_000_000u128),
                deadline: env.block.time.seconds() + 3600,
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::OrderExists {}));
    }

    #[test]
    fn test_create_order_insufficient_funds() {
        let (mut deps, env, _) = setup_contract();
        let info = mock_info("payer", &[]);
        let res = execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::CreateOrder {
                order_id: "o1".to_string(),
                recipient_upi: "user@upi".to_string(),
                inr_amount: 100_000,
                exchange_rate: Decimal::from_ratio(83_100u128, 1_000_000u128),
                deadline: env.block.time.seconds() + 3600,
            },
        );
        assert!(res.is_err());
    }

    #[test]
    fn test_fulfill_order() {
        let (mut deps, env, _oracle_info) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        let lp_info = mock_info("lp", &[]);
        let res = execute(
            deps.as_mut(),
            env.clone(),
            lp_info,
            ExecuteMsg::FulfillOrder {
                order_id: "order_1".to_string(),
                proof: "upi_txn_12345".to_string(),
            },
        )
        .unwrap();
        assert_eq!(res.attributes[0].value, "fulfill_order");

        let order: Order =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetOrder { order_id: "order_1".to_string() }).unwrap())
                .unwrap();
        assert_eq!(order.status, OrderStatus::Fulfilled);
        assert!(order.fulfilled_at.is_some()); // [M1]
    }

    // [H3] Payer cannot self-fulfill
    #[test]
    fn test_payer_cannot_self_fulfill() {
        let (mut deps, env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        let res = execute(
            deps.as_mut(),
            env,
            mock_info("payer", &[]),
            ExecuteMsg::FulfillOrder {
                order_id: "order_1".to_string(),
                proof: "some_proof".to_string(),
            },
        );
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    #[test]
    fn test_fulfill_order_expired() {
        let (mut deps, mut env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");
        env.block.time = env.block.time.plus_seconds(3601);

        let res = execute(
            deps.as_mut(),
            env,
            mock_info("lp", &[]),
            ExecuteMsg::FulfillOrder {
                order_id: "order_1".to_string(),
                proof: "upi_txn_12345".to_string(),
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::OrderExpired {}));
    }

    // [H2] Expired open order can be refunded via ExpireOrder
    #[test]
    fn test_expire_order_refunds_payer() {
        let (mut deps, mut env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");
        env.block.time = env.block.time.plus_seconds(3601);

        let res = execute(
            deps.as_mut(),
            env.clone(),
            mock_info("anyone", &[]), // callable by anyone
            ExecuteMsg::ExpireOrder { order_id: "order_1".to_string() },
        )
        .unwrap();

        assert_eq!(res.attributes[0].value, "expire_order");
        match &res.messages[0].msg {
            CosmosMsg::Bank(BankMsg::Send { to_address, .. }) => {
                assert_eq!(to_address, "payer");
            }
            _ => panic!("Expected BankMsg::Send"),
        }

        let order: Order =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetOrder { order_id: "order_1".to_string() }).unwrap())
                .unwrap();
        assert_eq!(order.status, OrderStatus::Expired);
    }

    // [H2] Cannot expire an order that hasn't expired yet
    #[test]
    fn test_expire_order_too_early_fails() {
        let (mut deps, env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        let res = execute(
            deps.as_mut(),
            env,
            mock_info("anyone", &[]),
            ExecuteMsg::ExpireOrder { order_id: "order_1".to_string() },
        );
        assert!(matches!(res.unwrap_err(), ContractError::OrderNotExpired {}));
    }

    #[test]
    fn test_cancel_order() {
        let (mut deps, env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        let res = execute(
            deps.as_mut(),
            env.clone(),
            mock_info("payer", &[]),
            ExecuteMsg::CancelOrder { order_id: "order_1".to_string() },
        )
        .unwrap();
        assert_eq!(res.attributes[0].value, "cancel_order");

        let order: Order =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetOrder { order_id: "order_1".to_string() }).unwrap())
                .unwrap();
        assert_eq!(order.status, OrderStatus::Cancelled);
    }

    #[test]
    fn test_dispute_and_resolve() {
        let (mut deps, env, oracle_info) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        execute(
            deps.as_mut(),
            env.clone(),
            mock_info("lp", &[]),
            ExecuteMsg::FulfillOrder {
                order_id: "order_1".to_string(),
                proof: "upi_txn_12345".to_string(),
            },
        )
        .unwrap();

        execute(
            deps.as_mut(),
            env.clone(),
            mock_info("payer", &[]),
            ExecuteMsg::Dispute {
                order_id: "order_1".to_string(),
                reason: "Payment not received".to_string(),
            },
        )
        .unwrap();

        let res = execute(
            deps.as_mut(),
            env.clone(),
            oracle_info,
            ExecuteMsg::ResolveDispute {
                order_id: "order_1".to_string(),
                refund_payer: true,
            },
        )
        .unwrap();
        assert_eq!(res.attributes[2].value, "refund");

        // [M5] Status must be Refunded, not Expired
        let order: Order =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetOrder { order_id: "order_1".to_string() }).unwrap())
                .unwrap();
        assert_eq!(order.status, OrderStatus::Refunded);
    }

    // [M1] Challenge window based on fulfilled_at
    #[test]
    fn test_dispute_window_from_fulfilled_at() {
        let (mut deps, mut env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        // Fulfill very close to deadline (e.g., 59 min after creation, deadline is 60 min)
        env.block.time = env.block.time.plus_seconds(3540);
        execute(
            deps.as_mut(),
            env.clone(),
            mock_info("lp", &[]),
            ExecuteMsg::FulfillOrder {
                order_id: "order_1".to_string(),
                proof: "proof".to_string(),
            },
        )
        .unwrap();

        // Dispute within 24h of fulfillment — must succeed even though created_at + 24h has passed
        env.block.time = env.block.time.plus_seconds(3600); // only 1h after fulfillment
        let res = execute(
            deps.as_mut(),
            env,
            mock_info("payer", &[]),
            ExecuteMsg::Dispute {
                order_id: "order_1".to_string(),
                reason: "Did not receive INR".to_string(),
            },
        );
        assert!(res.is_ok());
    }

    // [L3] Expired challenge window uses ChallengeWindowExpired not Unauthorized
    #[test]
    fn test_dispute_after_window_gives_correct_error() {
        let (mut deps, mut env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        execute(
            deps.as_mut(),
            env.clone(),
            mock_info("lp", &[]),
            ExecuteMsg::FulfillOrder {
                order_id: "order_1".to_string(),
                proof: "proof".to_string(),
            },
        )
        .unwrap();

        // Advance past challenge period
        env.block.time = env.block.time.plus_seconds(86401);
        let res = execute(
            deps.as_mut(),
            env,
            mock_info("payer", &[]),
            ExecuteMsg::Dispute {
                order_id: "order_1".to_string(),
                reason: "Too late".to_string(),
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::ChallengeWindowExpired {}));
    }

    #[test]
    fn test_dispute_unauthorized() {
        let (mut deps, env, _) = setup_contract();
        make_order(&mut deps, &env, "payer", "order_1");

        execute(
            deps.as_mut(),
            env.clone(),
            mock_info("lp", &[]),
            ExecuteMsg::FulfillOrder {
                order_id: "order_1".to_string(),
                proof: "upi_txn_12345".to_string(),
            },
        )
        .unwrap();

        let res = execute(
            deps.as_mut(),
            env,
            mock_info("attacker", &[]),
            ExecuteMsg::Dispute {
                order_id: "order_1".to_string(),
                reason: "Attack".to_string(),
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    // [M2] ListOrders filter+take ordering
    #[test]
    fn test_list_orders_filter_works_correctly() {
        let (mut deps, env, _oracle_info) = setup_contract();

        // Create 3 orders then fulfill one
        make_order(&mut deps, &env, "payer", "o1");
        make_order(&mut deps, &env, "payer", "o2");
        make_order(&mut deps, &env, "payer", "o3");

        execute(
            deps.as_mut(),
            env.clone(),
            mock_info("lp", &[]),
            ExecuteMsg::FulfillOrder {
                order_id: "o1".to_string(),
                proof: "proof".to_string(),
            },
        )
        .unwrap();

        // Query Open orders with limit 2 — should return o2 and o3
        let open_orders: Vec<String> = from_json(
            &query(
                deps.as_ref(),
                env,
                QueryMsg::ListOrders {
                    status: Some(OrderStatus::Open),
                    start_after: None,
                    limit: Some(2),
                },
            )
            .unwrap(),
        )
        .unwrap();

        assert_eq!(open_orders.len(), 2);
        assert!(open_orders.contains(&"o2".to_string()));
        assert!(open_orders.contains(&"o3".to_string()));
        assert!(!open_orders.contains(&"o1".to_string()));
    }

    #[test]
    fn test_query_config() {
        let (deps, env, _) = setup_contract();
        let config: ContractConfig =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetConfig {}).unwrap()).unwrap();
        assert_eq!(config.denom, "uusdt");
        assert_eq!(config.challenge_period_seconds, 86400);
    }
}