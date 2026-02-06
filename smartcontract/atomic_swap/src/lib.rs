use cosmwasm_schema::QueryResponses;
use cosmwasm_std::{
    attr, to_json_binary, Addr, BankMsg, Binary, Coin, Decimal, Deps, DepsMut, Env, MessageInfo,
    Response, StdError, StdResult, Timestamp, Uint128,
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
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum OrderStatus {
    Open,
    Locked,
    Fulfilled,
    Expired,
    Disputed,
    Cancelled,
}

const CONFIG: Item<ContractConfig> = Item::new("config");
const ORDERS: Map<&str, Order> = Map::new("orders");

pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
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
        } => create_order(
            deps,
            env,
            info,
            order_id,
            recipient_upi,
            inr_amount,
            exchange_rate,
            deadline,
        ),
        ExecuteMsg::FulfillOrder { order_id, proof } => {
            fulfill_order(deps, env, info, order_id, proof)
        }
        ExecuteMsg::Dispute { order_id, reason } => dispute(deps, env, info, order_id, reason),
        ExecuteMsg::ResolveDispute {
            order_id,
            refund_payer,
        } => resolve_dispute(deps, env, info, order_id, refund_payer),
        ExecuteMsg::CancelOrder { order_id } => cancel_order(deps, env, info, order_id),
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

    let usdt_amount = info
        .funds
        .iter()
        .find(|c| c.denom == config.denom)
        .map(|c| c.amount)
        .unwrap_or(Uint128::zero());

    if usdt_amount.is_zero() {
        return Err(ContractError::InsufficientFunds {});
    }

    if usdt_amount < config.min_order_amount {
        return Err(ContractError::InvalidAmount {});
    }

    if usdt_amount > config.max_order_amount {
        return Err(ContractError::InvalidAmount {});
    }

    let deadline_ts = Timestamp::from_seconds(deadline);
    if deadline_ts <= env.block.time {
        return Err(ContractError::InvalidAmount {});
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

    order.status = OrderStatus::Fulfilled;
    ORDERS.save(deps.storage, order_id.as_str(), &order)?;

    let coin = Coin {
        denom: CONFIG.load(deps.storage)?.denom,
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
    let challenge_deadline = order
        .created_at
        .plus_seconds(config.challenge_period_seconds);

    if env.block.time > challenge_deadline {
        return Err(ContractError::Unauthorized {});
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

    order.status = if refund_payer {
        OrderStatus::Expired
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

            let orders: Vec<String> = ORDERS
                .range(deps.storage, start, None, cosmwasm_std::Order::Ascending)
                .take(limit)
                .filter(|item| {
                    if let Ok((_, order)) = item {
                        status.as_ref().map_or(true, |s| &order.status == s)
                    } else {
                        false
                    }
                })
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
    use cosmwasm_std::{coins, from_json, Empty, OwnedDeps};

    fn setup_contract() -> (
        OwnedDeps<MockStorage, MockApi, MockQuerier, Empty>,
        Env,
        MessageInfo,
    ) {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let oracle = "oracle".to_string();
        let info = mock_info(&oracle, &[]);

        let msg = InstantiateMsg {
            denom: "uusdt".to_string(),
            oracle: oracle.clone(),
            challenge_period_seconds: 86400,             // 24 hours
            min_order_amount: Uint128::new(1000000),     // 1 USDT
            max_order_amount: Uint128::new(10000000000), // 10000 USDT
        };

        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        (deps, env, info)
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let oracle = "oracle".to_string();
        let info = mock_info(&oracle, &[]);

        let msg = InstantiateMsg {
            denom: "uusdt".to_string(),
            oracle: oracle.clone(),
            challenge_period_seconds: 86400,
            min_order_amount: Uint128::new(1000000),
            max_order_amount: Uint128::new(10000000000),
        };

        let res = instantiate(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes.len(), 3);
        assert_eq!(res.attributes[0].value, "instantiate");
    }

    #[test]
    fn test_create_order() {
        let (mut deps, env, _oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let usdt_amount = 12050000u128; // 12.05 USDT
        let info = mock_info(&payer, &coins(usdt_amount, "uusdt"));

        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,                                         // ₹1000.00
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128), // 83.1
            deadline: env.block.time.seconds() + 3600,                  // 1 hour
        };

        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "create_order");
        assert_eq!(res.attributes[1].value, "order_1");

        // Verify order stored
        let query_msg = QueryMsg::GetOrder {
            order_id: "order_1".to_string(),
        };
        let order: Order = from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();
        assert_eq!(order.usdt_amount, Uint128::new(usdt_amount));
        assert_eq!(order.status, OrderStatus::Open);
    }

    #[test]
    fn test_create_order_duplicate() {
        let (mut deps, env, _oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let usdt_amount = 12050000u128;
        let info = mock_info(&payer, &coins(usdt_amount, "uusdt"));

        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128),
            deadline: env.block.time.seconds() + 3600,
        };

        execute(deps.as_mut(), env.clone(), info.clone(), msg.clone()).unwrap();

        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::OrderExists {}));
    }

    #[test]
    fn test_create_order_insufficient_funds() {
        let (mut deps, env, _oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let info = mock_info(&payer, &[]);

        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128),
            deadline: env.block.time.seconds() + 3600,
        };

        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        assert!(matches!(
            res.unwrap_err(),
            ContractError::InsufficientFunds {}
        ));
    }

    #[test]
    fn test_fulfill_order() {
        let (mut deps, env, _oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let lp = "lp".to_string();
        let usdt_amount = 12050000u128;

        // Create order
        let info = mock_info(&payer, &coins(usdt_amount, "uusdt"));
        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128),
            deadline: env.block.time.seconds() + 3600,
        };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Fulfill order
        let lp_info = mock_info(&lp, &[]);
        let msg = ExecuteMsg::FulfillOrder {
            order_id: "order_1".to_string(),
            proof: "upi_txn_12345".to_string(),
        };

        let res = execute(deps.as_mut(), env.clone(), lp_info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "fulfill_order");
        assert_eq!(res.attributes[1].value, "order_1");

        // Verify order status
        let query_msg = QueryMsg::GetOrder {
            order_id: "order_1".to_string(),
        };
        let order: Order = from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();
        assert_eq!(order.status, OrderStatus::Fulfilled);
        assert_eq!(order.lp, Some(Addr::unchecked(&lp)));
    }

    #[test]
    fn test_fulfill_order_expired() {
        let (mut deps, mut env, _oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let lp = "lp".to_string();
        let usdt_amount = 12050000u128;

        // Create order
        let info = mock_info(&payer, &coins(usdt_amount, "uusdt"));
        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128),
            deadline: env.block.time.seconds() + 3600,
        };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Advance past deadline
        env.block.time = env.block.time.plus_seconds(3601);

        // Try to fulfill expired order
        let lp_info = mock_info(&lp, &[]);
        let msg = ExecuteMsg::FulfillOrder {
            order_id: "order_1".to_string(),
            proof: "upi_txn_12345".to_string(),
        };

        let res = execute(deps.as_mut(), env, lp_info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::OrderExpired {}));
    }

    #[test]
    fn test_cancel_order() {
        let (mut deps, env, _oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let usdt_amount = 12050000u128;

        // Create order
        let info = mock_info(&payer, &coins(usdt_amount, "uusdt"));
        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128),
            deadline: env.block.time.seconds() + 3600,
        };
        execute(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Cancel order
        let msg = ExecuteMsg::CancelOrder {
            order_id: "order_1".to_string(),
        };

        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "cancel_order");

        // Verify order status
        let query_msg = QueryMsg::GetOrder {
            order_id: "order_1".to_string(),
        };
        let order: Order = from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();
        assert_eq!(order.status, OrderStatus::Cancelled);
    }

    #[test]
    fn test_dispute_and_resolve() {
        let (mut deps, env, oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let lp = "lp".to_string();
        let usdt_amount = 12050000u128;

        // Create order
        let info = mock_info(&payer, &coins(usdt_amount, "uusdt"));
        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128),
            deadline: env.block.time.seconds() + 3600,
        };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Fulfill order
        let lp_info = mock_info(&lp, &[]);
        let msg = ExecuteMsg::FulfillOrder {
            order_id: "order_1".to_string(),
            proof: "upi_txn_12345".to_string(),
        };
        execute(deps.as_mut(), env.clone(), lp_info, msg).unwrap();

        // Dispute
        let payer_info = mock_info(&payer, &[]);
        let msg = ExecuteMsg::Dispute {
            order_id: "order_1".to_string(),
            reason: "Payment not received".to_string(),
        };

        let res = execute(deps.as_mut(), env.clone(), payer_info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "dispute");

        // Resolve dispute (refund payer)
        let msg = ExecuteMsg::ResolveDispute {
            order_id: "order_1".to_string(),
            refund_payer: true,
        };

        let res = execute(deps.as_mut(), env.clone(), oracle_info.clone(), msg).unwrap();
        assert_eq!(res.attributes[0].value, "resolve_dispute");
        assert_eq!(res.attributes[2].value, "refund");

        // Verify order status
        let query_msg = QueryMsg::GetOrder {
            order_id: "order_1".to_string(),
        };
        let order: Order = from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();
        assert_eq!(order.status, OrderStatus::Expired);
    }

    #[test]
    fn test_dispute_unauthorized() {
        let (mut deps, env, _oracle_info) = setup_contract();
        let payer = "payer".to_string();
        let lp = "lp".to_string();
        let attacker = "attacker".to_string();
        let usdt_amount = 12050000u128;

        // Create order
        let info = mock_info(&payer, &coins(usdt_amount, "uusdt"));
        let msg = ExecuteMsg::CreateOrder {
            order_id: "order_1".to_string(),
            recipient_upi: "user@upi".to_string(),
            inr_amount: 100000,
            exchange_rate: Decimal::from_ratio(83100u128, 1000000u128),
            deadline: env.block.time.seconds() + 3600,
        };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Fulfill order
        let lp_info = mock_info(&lp, &[]);
        let msg = ExecuteMsg::FulfillOrder {
            order_id: "order_1".to_string(),
            proof: "upi_txn_12345".to_string(),
        };
        execute(deps.as_mut(), env.clone(), lp_info, msg).unwrap();

        // Try to dispute from non-payer
        let attacker_info = mock_info(&attacker, &[]);
        let msg = ExecuteMsg::Dispute {
            order_id: "order_1".to_string(),
            reason: "Payment not received".to_string(),
        };

        let res = execute(deps.as_mut(), env, attacker_info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    #[test]
    fn test_query_config() {
        let (deps, env, _oracle_info) = setup_contract();

        let query_msg = QueryMsg::GetConfig {};
        let config: ContractConfig =
            from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();

        assert_eq!(config.denom, "uusdt");
        assert_eq!(config.challenge_period_seconds, 86400);
    }
}
