use cosmwasm_std::{
    attr, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, StdError,
    Coin, BankMsg, Uint128, Timestamp, Addr, WasmQuery, QueryRequest,
};
use cw_storage_plus::{Map, Item};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use cw2;

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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum QueryMsg {
    GetPayment { payment_id: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct PaymentInfo {
    pub payment_id: String,
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
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum LPRegistryQueryMsg {
    GetLP { lp: String },
}

const ADMIN: Item<String> = Item::new("admin");
const DENOM: Item<String> = Item::new("denom");
const REFUND_TIMEOUT: Item<u64> = Item::new("refund_timeout");
const LP_REGISTRY: Item<String> = Item::new("lp_registry");
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
    LP_REGISTRY.save(deps.storage, &msg.lp_registry)?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attributes(vec![
        attr("action", "instantiate"),
        attr("admin", msg.admin),
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
    seller: String,
) -> Result<Response, ContractError> {
    if PAYMENTS.may_load(deps.storage, payment_id.as_str())?.is_some() {
        return Err(ContractError::PaymentExists {});
    }

    let seller_addr = deps.api.addr_validate(&seller)?;
    let denom = DENOM.load(deps.storage)?;

    let sent_amount = info
        .funds
        .iter()
        .find(|c| c.denom == denom)
        .map(|c| c.amount)
        .unwrap_or(Uint128::zero());

    if sent_amount.is_zero() {
        return Err(ContractError::InsufficientFunds {});
    }

    let now = env.block.time;
    let deadline = now.plus_seconds(REFUND_TIMEOUT.load(deps.storage)?);

    let payment = PaymentInfo {
        payment_id: payment_id.clone(),
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
    // validate admin string to Addr and compare
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

fn refund(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    payment_id: String,
) -> Result<Response, ContractError> {
    let mut payment = PAYMENTS
        .may_load(deps.storage, payment_id.as_str())?
        .ok_or(ContractError::PaymentNotFound {})?;

    // Only allow refund if state is Deposited and deadline passed, or admin can force
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

    // refund to seller
    let coin = Coin {
        denom: payment.denom.clone(),
        amount: payment.amount,
    };

    payment.state = PaymentState::Refunded;
    PAYMENTS.save(deps.storage, payment_id.as_str(), &payment)?;

    let send = BankMsg::Send {
        to_address: payment.seller.to_string(),
        amount: vec![coin.clone()],
    };

    let res = Response::new()
        .add_message(send)
        .add_attributes(vec![
            attr("action", "refund"),
            attr("payment_id", payment_id),
            attr("refund_to", payment.seller.to_string()),
            attr("amount", coin.amount.to_string()),
            attr("denom", coin.denom),
        ]);

    Ok(res)
}

pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetPayment { payment_id } => {
            to_json_binary(&PAYMENTS.may_load(deps.storage, payment_id.as_str())?)
        }
    }
}