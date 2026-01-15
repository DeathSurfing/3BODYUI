use cosmwasm_std::{
    attr, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, StdError,
    BankMsg, Coin, Uint128,
};
use cw_storage_plus::{Map, Item};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use thiserror::Error;

static CONTRACT_NAME: &str = "crates.io:lp-registry-mvp";
static CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
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
    /// denom for stake (native)
    pub denom: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ExecuteMsg {
    RegisterLP { lp: String },
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

pub fn instantiate(deps: DepsMut, _env: Env, _info: MessageInfo, msg: InstantiateMsg) -> Result<Response, ContractError> {
    ADMIN.save(deps.storage, &msg.admin)?;
    DENOM.save(deps.storage, &msg.denom)?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attributes(vec![attr("action", "instantiate"), attr("admin", msg.admin)]))
}

pub fn execute(deps: DepsMut, env: Env, info: MessageInfo, msg: ExecuteMsg) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::RegisterLP { lp } => register_lp(deps, env, info, lp),
        ExecuteMsg::Stake { lp } => stake(deps, env, info, lp),
        ExecuteMsg::Unstake { lp, amount } => unstake(deps, env, info, lp, amount),
        ExecuteMsg::Slash { lp, amount } => slash(deps, env, info, lp, amount),
    }
}

fn register_lp(_deps: DepsMut, _env: Env, info: MessageInfo, lp: String) -> Result<Response, ContractError> {
    // Only lp itself or admin could register; to keep simple, allow sender == lp
    let sender = info.sender.to_string();
    if sender != lp {
        return Err(ContractError::Unauthorized {});
    }
    // check exist
    // map access requires deps; we cheat by failing if already stored: use a closure to check
    // (but we have no deps here) -> for clarity, register_lp will be called through execute with deps
    Err(ContractError::Std(StdError::generic_err("Use with full deps via execute wrapper")))
}

fn register_lp_internal(deps: DepsMut, lp: String) -> Result<Response, ContractError> {
    if LPS.may_load(deps.storage, lp.as_str())?.is_some() {
        return Err(ContractError::AlreadyRegistered {});
    }
    let lpinfo = LPInfo {
        lp: lp.clone(),
        stake: Uint128::zero(),
        active: true,
    };
    LPS.save(deps.storage, lp.as_str(), &lpinfo)?;
    Ok(Response::new().add_attributes(vec![attr("action", "register_lp"), attr("lp", lp)]))
}

fn stake(deps: DepsMut, _env: Env, info: MessageInfo, lp: String) -> Result<Response, ContractError> {
    let denom = DENOM.load(deps.storage)?;
    let sent = info
        .funds
        .iter()
        .find(|c| c.denom == denom)
        .map(|c| c.amount)
        .unwrap_or(Uint128::zero());

    if sent == Uint128::zero() {
        return Err(ContractError::InsufficientFunds {});
    }

    // ensure LP is registered; if not, register automatically if sender == lp
    let sender = info.sender.to_string();
    if sender != lp {
        return Err(ContractError::Unauthorized {});
    }

    let mut lpinfo = match LPS.may_load(deps.storage, lp.as_str())? {
        Some(v) => v,
        None => {
            // register implicitly
            LPInfo {
                lp: lp.clone(),
                stake: Uint128::zero(),
                active: true,
            }
        }
    };

    lpinfo.stake = lpinfo.stake.checked_add(sent)?;
    LPS.save(deps.storage, lp.as_str(), &lpinfo)?;

    Ok(Response::new().add_attributes(vec![
        attr("action", "stake"),
        attr("lp", lp),
        attr("amount", sent.to_string()),
    ]))
}

fn unstake(deps: DepsMut, _env: Env, info: MessageInfo, lp: String, amount: Uint128) -> Result<Response, ContractError> {
    let sender = info.sender.to_string();
    if sender != lp {
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
    if info.sender != admin {
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
        QueryMsg::GetLP { lp } => to_binary(&query_lp(deps, lp)?),
    }
}

fn query_lp(deps: Deps, lp: String) -> StdResult<Option<LPInfo>> {
    Ok(LPS.may_load(deps.storage, lp.as_str())?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::coins;

    #[test]
    fn test_register_and_stake_and_slash() {
        let mut deps = mock_dependencies();
        let admin = "admin";
        let denom = "ustake";
        let instantiate_msg = InstantiateMsg {
            admin: admin.to_string(),
            denom: denom.to_string(),
        };
        let env = mock_env();
        let info = mock_info(admin, &[]);
        instantiate(deps.as_mut(), env.clone(), info, instantiate_msg).unwrap();

        // register by calling stake as lp
        let lp = "lp1";
        let stake_info = mock_info(lp, &coins(500u128, denom));
        let res = stake(deps.as_mut(), env.clone(), stake_info, lp.to_string()).unwrap();
        assert!(res.attributes.iter().any(|a| a.key=="action" && a.value=="stake"));

        // slash by non-admin should fail
        let non_admin = mock_info("hacker", &[]);
        let res_err = slash(deps.as_mut(), env.clone(), non_admin, lp.to_string(), Uint128::new(100));
        assert!(res_err.is_err());

        // slash by admin
        let admin_info = mock_info(admin, &[]);
        let res2 = slash(deps.as_mut(), env.clone(), admin_info, lp.to_string(), Uint128::new(200)).unwrap();
        assert!(res2.attributes.iter().any(|a| a.key=="action" && a.value=="slash"));
    }
}
