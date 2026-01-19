use cosmwasm_std::{
    attr, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, StdError,
    BankMsg, Coin, Uint128, OverflowError,
};
use cw_storage_plus::{Map, Item};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use cw2;

static CONTRACT_NAME: &str = "crates.io:lp-registry-mvp";
static CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    #[error("{0}")]
    Overflow(#[from] OverflowError),
    #[error("LP already registered")]
    AlreadyRegistered {},
    #[error("LP not found")]
    LPNotFound {},
    #[error("Unauthorized")]
    Unauthorized {},
    #[error("Insufficient funds sent")]
    InsufficientFunds {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub admin: String,
    pub denom: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ExecuteMsg {
    Stake { lp: String },
    Unstake { lp: String, amount: Uint128 },
    Slash { lp: String, amount: Uint128 },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum QueryMsg {
    GetLP { lp: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct LPInfo {
    pub lp: String,
    pub stake: Uint128,
    pub active: bool,
}

const ADMIN: Item<String> = Item::new("admin");
const DENOM: Item<String> = Item::new("denom");
const LPS: Map<&str, LPInfo> = Map::new("lps");

pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    ADMIN.save(deps.storage, &msg.admin)?;
    DENOM.save(deps.storage, &msg.denom)?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "instantiate"))
}

pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Stake { lp } => stake(deps, env, info, lp),
        ExecuteMsg::Unstake { lp, amount } => unstake(deps, env, info, lp, amount),
        ExecuteMsg::Slash { lp, amount } => slash(deps, env, info, lp, amount),
    }
}

fn stake(deps: DepsMut, _env: Env, info: MessageInfo, lp: String) -> Result<Response, ContractError> {
    let denom = DENOM.load(deps.storage)?;
    let sent = info.funds.iter().find(|c| c.denom == denom).map(|c| c.amount).unwrap_or_default();

    if sent.is_zero() {
        return Err(ContractError::InsufficientFunds {});
    }

    let mut lpinfo = LPS.may_load(deps.storage, lp.as_str())?.unwrap_or(LPInfo {
        lp: lp.clone(),
        stake: Uint128::zero(),
        active: true,
    });

    // add funds (keeps original intent)
    lpinfo.stake = lpinfo.stake.checked_add(sent)?;
    LPS.save(deps.storage, lp.as_str(), &lpinfo)?;

    Ok(Response::new().add_attribute("action", "stake"))
}

fn unstake(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    lp: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    // Validate LP address and compare with sender
    let lp_addr = deps.api.addr_validate(&lp)?;
    if info.sender != lp_addr {
        return Err(ContractError::Unauthorized {});
    }

    let mut lpinfo = LPS.may_load(deps.storage, lp.as_str())?.ok_or(ContractError::LPNotFound {})?;
    if lpinfo.stake < amount {
        return Err(ContractError::Std(StdError::generic_err("Not enough stake")));
    }
    lpinfo.stake = lpinfo.stake.checked_sub(amount)?;
    LPS.save(deps.storage, lp.as_str(), &lpinfo)?;

    // send coins back to LP
    let denom = DENOM.load(deps.storage)?;
    let coin = Coin { denom, amount };

    let msg = BankMsg::Send {
        to_address: lpinfo.lp.clone(),
        amount: vec![coin.clone()],
    };

    Ok(Response::new()
        .add_message(msg)
        .add_attributes(vec![attr("action", "unstake"), attr("lp", lpinfo.lp), attr("amount", amount.to_string())]))
}

fn slash(deps: DepsMut, _env: Env, info: MessageInfo, lp: String, amount: Uint128) -> Result<Response, ContractError> {
    let admin = ADMIN.load(deps.storage)?;
    let admin_addr = deps.api.addr_validate(&admin)?;
    if info.sender != admin_addr {
        return Err(ContractError::Unauthorized {});
    }

    let mut lpinfo = LPS.may_load(deps.storage, lp.as_str())?.ok_or(ContractError::LPNotFound {})?;
    if lpinfo.stake < amount {
        // set to zero
        lpinfo.stake = Uint128::zero();
    } else {
        lpinfo.stake = lpinfo.stake.checked_sub(amount)?;
    }
    // optionally set active=false if stake is zero
    if lpinfo.stake.is_zero() {
        lpinfo.active = false;
    }
    LPS.save(deps.storage, lp.as_str(), &lpinfo)?;

    Ok(Response::new().add_attributes(vec![attr("action", "slash"), attr("lp", lp), attr("amount", amount.to_string())]))
}

pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetLP { lp } => {
            let active = LPS.may_load(deps.storage, lp.as_str())?.map(|l| l.active).unwrap_or(false);
            to_json_binary(&active)
        }
    }
}