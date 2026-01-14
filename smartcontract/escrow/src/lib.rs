use cosmwasm_std::{
    attr, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, StdError,
    CosmosMsg, Coin, BankMsg, Uint128, Timestamp,
};
use cw_storage_plus::{Map, Item};
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
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub admin: String,
    /// refund timeout seconds after deposit
    pub refund_timeout_seconds: u64,
    /// denom for native token (e.g., "ust")
    pub denom: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ExecuteMsg {
    /// deposit funds into escrow by paying native coins along with this call
    Deposit { payment_id: String, seller: String },
    /// admin/operator confirms payout
    ConfirmPayout { payment_id: String, lp: String },
    /// refund after timeout: can be called by seller or admin
    Refund { payment_id: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum QueryMsg {
    GetPayment { payment_id: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct PaymentInfo {
    pub payment_id: String,
    pub seller: String,
    pub amount: Uint128,
    pub denom: String,
    pub state: PaymentState,
    pub created_at: Timestamp,
    pub deadline: Timestamp,
    pub lp: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum PaymentState {
    Created,
    Deposited,
    PayoutConfirmed,
    Completed,
    Refunded,
}

const ADMIN: Item<String> = Item::new("admin");
const DENOM: Item<String> = Item::new("denom");
const REFUND_TIMEOUT: Item<u64> = Item::new("refund_timeout");
const PAYMENTS: Map<&str, PaymentInfo> = Map::new("payments");

pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    ADMIN.save(deps.storage, &msg.admin)?;
    DENOM.save(deps.storage, &msg.denom)?;
    REFUND_TIMEOUT.save(deps.storage, &msg.refund_timeout_seconds)?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attributes(vec![
        attr("action", "instantiate"),
        attr("admin", msg.admin),
        attr("denom", msg.denom),
    ]))
}

pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Deposit { payment_id, seller } => deposit(deps, env, info, payment_id, seller),
        ExecuteMsg::ConfirmPayout { payment_id, lp } => confirm_payout(deps, env, info, payment_id, lp),
        ExecuteMsg::Refund { payment_id } => refund(deps, env, info, payment_id),
    }
}

fn deposit(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    payment_id: String,
    seller: Addr,
) -> Result<Response, ContractError> {
    // Payment must not already exist
    if PAYMENTS.may_load(deps.storage, payment_id.as_str())?.is_some() {
        return Err(ContractError::PaymentExists {});
    }

    let denom = DENOM.load(deps.storage)?;
    // Expect exactly one coin in the denom
    let sent_amount = info
        .funds
        .iter()
        .find(|c| c.denom == denom)
        .map(|c| c.amount)
        .unwrap_or(Uint128::zero());

    if sent_amount == Uint128::zero() {
        return Err(ContractError::InsufficientFunds {});
    }

    let now = env.block.time;
    let timeout = REFUND_TIMEOUT.load(deps.storage)?;
    let deadline = now.plus_seconds(timeout);

    let info_struct = PaymentInfo {
        payment_id: payment_id.clone(),
        seller: seller.clone(),
        amount: sent_amount,
        denom: denom.clone(),
        state: PaymentState::Deposited,
        created_at: now,
        deadline,
        lp: None,
    };

    PAYMENTS.save(deps.storage, payment_id.as_str(), &info_struct)?;

    let res = Response::new().add_attributes(vec![
        attr("action", "deposit"),
        attr("payment_id", payment_id),
        attr("seller", seller),
        attr("amount", sent_amount.to_string()),
        attr("denom", denom),
    ]);

    Ok(res)
}

fn confirm_payout(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    payment_id: String,
    lp: String,
) -> Result<Response, ContractError> {
    let admin = ADMIN.load(deps.storage)?;
    if info.sender != admin {
        return Err(ContractError::Unauthorized {});
    }

    let mut payment = PAYMENTS
        .may_load(deps.storage, payment_id.as_str())?
        .ok_or(ContractError::PaymentNotFound {})?;

    if payment.state != PaymentState::Deposited {
        return Err(ContractError::InvalidState {});
    }

    // Mark payout confirmed and transfer funds to LP (native bank send)
    let coin = Coin {
        denom: payment.denom.clone(),
        amount: payment.amount,
    };
    payment.state = PaymentState::PayoutConfirmed;
    payment.lp = Some(lp.clone());
    PAYMENTS.save(deps.storage, payment_id.as_str(), &payment)?;

    // Send funds to LP
    let send = BankMsg::Send {
        to_address: lp.clone(),
        amount: vec![coin.clone()],
    };

    let res = Response::new()
        .add_message(send)
        .add_attributes(vec![
            attr("action", "confirm_payout"),
            attr("payment_id", payment_id.clone()),
            attr("lp", lp),
            attr("amount", coin.amount.to_string()),
            attr("denom", coin.denom),
        ]);

    Ok(res)
}

fn refund(deps: DepsMut, env: Env, info: MessageInfo, payment_id: String) -> Result<Response, ContractError> {
    let maybe = PAYMENTS.may_load(deps.storage, payment_id.as_str())?;
    let mut payment = maybe.ok_or(ContractError::PaymentNotFound {})?;

    // Only allow refund if state is Deposited and deadline passed, or admin can force
    let now = env.block.time;
    let admin = ADMIN.load(deps.storage)?;
    let is_admin = info.sender == admin;
    let is_seller = info.sender == payment.seller;

    if payment.state != PaymentState::Deposited {
        return Err(ContractError::InvalidState {});
    }

    if now < payment.deadline && !is_admin {
        return Err(ContractError::RefundNotAllowed {});
    }

    // refund to seller
    let coin = Coin {
        denom: payment.denom.clone(),
        amount: payment.amount,
    };

    payment.state = PaymentState::Refunded;
    PAYMENTS.save(deps.storage, payment_id.as_str(), &payment)?;

    let send = BankMsg::Send {
        to_address: payment.seller.clone(),
        amount: vec![coin.clone()],
    };

    let res = Response::new()
        .add_message(send)
        .add_attributes(vec![
            attr("action", "refund"),
            attr("payment_id", payment_id),
            attr("refund_to", payment.seller),
            attr("amount", coin.amount.to_string()),
            attr("denom", coin.denom),
        ]);

    Ok(res)
}

pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetPayment { payment_id } => to_binary(&query_payment(deps, payment_id)?),
    }
}

fn query_payment(deps: Deps, payment_id: String) -> StdResult<Option<PaymentInfo>> {
    Ok(PAYMENTS.may_load(deps.storage, payment_id.as_str())?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins};

    #[test]
    fn test_deposit_and_refund_flow() {
        let mut deps = mock_dependencies();
        let admin = "admin";
        let denom = "utest";
        let instantiate_msg = InstantiateMsg {
            admin: admin.to_string(),
            refund_timeout_seconds: 10,
            denom: denom.to_string(),
        };
        let env = mock_env();
        let info = mock_info(admin, &[]);
        instantiate(deps.as_mut(), env.clone(), info, instantiate_msg).unwrap();

        // deposit
        let seller = "seller";
        let payment_id = "pay-1".to_string();
        let deposit_info = mock_info(seller, &coins(1000, denom));
        let res = deposit(deps.as_mut(), env.clone(), deposit_info, payment_id.clone(), seller.to_string()).unwrap();
        assert_eq!(res.attributes.iter().any(|a| a.key=="action" && a.value=="deposit"), true);

        // Try refund before timeout by seller -> should error
        let refund_info = mock_info(seller, &[]);
        let should_err = refund(deps.as_mut(), env.clone(), refund_info, payment_id.clone());
        assert!(should_err.is_err());

        // advance time beyond timeout
        let mut env2 = env.clone();
        env2.block.time = env.block.time.plus_seconds(20);

        let refund_info2 = mock_info(seller, &[]);
        let res2 = refund(deps.as_mut(), env2, refund_info2, payment_id.clone()).unwrap();
        assert_eq!(res2.attributes.iter().any(|a| a.key=="action" && a.value=="refund"), true);
    }

    #[test]
    fn test_deposit_and_confirm_payout_by_admin() {
        let mut deps = mock_dependencies();
        let admin = "admin";
        let denom = "utest";
        let instantiate_msg = InstantiateMsg {
            admin: admin.to_string(),
            refund_timeout_seconds: 10,
            denom: denom.to_string(),
        };
        let env = mock_env();
        let info = mock_info(admin, &[]);
        instantiate(deps.as_mut(), env.clone(), info, instantiate_msg).unwrap();

        // deposit
        let seller = "seller";
        let payment_id = "pay-2".to_string();
        let deposit_info = mock_info(seller, &coins(2000, denom));
        deposit(deps.as_mut(), env.clone(), deposit_info, payment_id.clone(), seller.to_string()).unwrap();

        // confirm payout by non-admin should fail
        let non_admin = mock_info("hacker", &[]);
        let res_err = confirm_payout(deps.as_mut(), env.clone(), non_admin, payment_id.clone(), "lp1".to_string());
        assert!(res_err.is_err());

        // confirm payout by admin
        let admin_info = mock_info(admin, &[]);
        let res = confirm_payout(deps.as_mut(), env.clone(), admin_info, payment_id.clone(), "lp1".to_string()).unwrap();
        assert_eq!(res.attributes.iter().any(|a| a.key=="action" && a.value=="confirm_payout"), true);
    }
}
