use cosmwasm_schema::QueryResponses;
use cosmwasm_std::{
    attr, to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo, OverflowError,
    Response, StdError, StdResult, Uint128,
};
use cw2;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use thiserror::Error;

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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema, QueryResponses)]
pub enum QueryMsg {
    #[returns(bool)]
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

fn stake(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    lp: String,
) -> Result<Response, ContractError> {
    let denom = DENOM.load(deps.storage)?;
    let sent = info
        .funds
        .iter()
        .find(|c| c.denom == denom)
        .map(|c| c.amount)
        .unwrap_or_default();

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

    let mut lpinfo = LPS
        .may_load(deps.storage, lp.as_str())?
        .ok_or(ContractError::LPNotFound {})?;
    if lpinfo.stake < amount {
        return Err(ContractError::Std(StdError::generic_err(
            "Not enough stake",
        )));
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

    Ok(Response::new().add_message(msg).add_attributes(vec![
        attr("action", "unstake"),
        attr("lp", lpinfo.lp),
        attr("amount", amount.to_string()),
    ]))
}

fn slash(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    lp: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let admin = ADMIN.load(deps.storage)?;
    let admin_addr = deps.api.addr_validate(&admin)?;
    if info.sender != admin_addr {
        return Err(ContractError::Unauthorized {});
    }

    let mut lpinfo = LPS
        .may_load(deps.storage, lp.as_str())?
        .ok_or(ContractError::LPNotFound {})?;
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

    Ok(Response::new().add_attributes(vec![
        attr("action", "slash"),
        attr("lp", lp),
        attr("amount", amount.to_string()),
    ]))
}

pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetLP { lp } => {
            let active = LPS
                .may_load(deps.storage, lp.as_str())?
                .map(|l| l.active)
                .unwrap_or(false);
            to_json_binary(&active)
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
        let admin = "admin".to_string();
        let info = mock_info(&admin, &[]);

        let msg = InstantiateMsg {
            admin: admin.clone(),
            denom: "uusd".to_string(),
        };

        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        (deps, env, info)
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let admin = "admin".to_string();
        let info = mock_info(&admin, &[]);

        let msg = InstantiateMsg {
            admin: admin.clone(),
            denom: "uusd".to_string(),
        };

        let res = instantiate(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes.len(), 1);
        assert_eq!(res.attributes[0].key, "action");
        assert_eq!(res.attributes[0].value, "instantiate");
    }

    #[test]
    fn test_stake_new_lp() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let stake_amount = 1000u128;

        let info = mock_info(&lp, &coins(stake_amount, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };

        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes.len(), 1);
        assert_eq!(res.attributes[0].key, "action");
        assert_eq!(res.attributes[0].value, "stake");

        // Verify LP is active
        let query_msg = QueryMsg::GetLP { lp: lp.clone() };
        let active: bool = from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();
        assert!(active);
    }

    #[test]
    fn test_stake_existing_lp() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();

        // First stake
        let info = mock_info(&lp, &coins(1000, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Second stake
        let info = mock_info(&lp, &coins(500, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };
        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "stake");
    }

    #[test]
    fn test_stake_insufficient_funds() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();

        let info = mock_info(&lp, &[]);
        let msg = ExecuteMsg::Stake { lp: lp.clone() };

        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        assert!(matches!(
            res.unwrap_err(),
            ContractError::InsufficientFunds {}
        ));
    }

    #[test]
    fn test_unstake() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();

        // Stake first
        let info = mock_info(&lp, &coins(1000, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Unstake
        let info = mock_info(&lp, &[]);
        let msg = ExecuteMsg::Unstake {
            lp: lp.clone(),
            amount: Uint128::new(500),
        };

        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes.len(), 3);
        assert_eq!(res.attributes[0].value, "unstake");
    }

    #[test]
    fn test_unstake_unauthorized() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let attacker = "attacker".to_string();

        // Stake first
        let info = mock_info(&lp, &coins(1000, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Try to unstake from different address
        let info = mock_info(&attacker, &[]);
        let msg = ExecuteMsg::Unstake {
            lp: lp.clone(),
            amount: Uint128::new(500),
        };

        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    #[test]
    fn test_unstake_not_found() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();

        let info = mock_info(&lp, &[]);
        let msg = ExecuteMsg::Unstake {
            lp: lp.clone(),
            amount: Uint128::new(500),
        };

        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::LPNotFound {}));
    }

    #[test]
    fn test_slash() {
        let (mut deps, env, info) = setup_contract();
        let lp = "lp1".to_string();

        // Stake first
        let stake_info = mock_info(&lp, &coins(1000, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };
        execute(deps.as_mut(), env.clone(), stake_info, msg).unwrap();

        // Slash by admin
        let msg = ExecuteMsg::Slash {
            lp: lp.clone(),
            amount: Uint128::new(300),
        };

        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "slash");
        assert_eq!(res.attributes[1].value, lp);
        assert_eq!(res.attributes[2].value, "300");
    }

    #[test]
    fn test_slash_unauthorized() {
        let (mut deps, env, _admin_info) = setup_contract();
        let lp = "lp1".to_string();
        let attacker = "attacker".to_string();

        // Stake first
        let stake_info = mock_info(&lp, &coins(1000, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };
        execute(deps.as_mut(), env.clone(), stake_info, msg).unwrap();

        // Try to slash from non-admin address
        let attacker_info = mock_info(&attacker, &[]);
        let msg = ExecuteMsg::Slash {
            lp: lp.clone(),
            amount: Uint128::new(300),
        };

        let res = execute(deps.as_mut(), env, attacker_info, msg);
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    #[test]
    fn test_slash_to_zero_deactivates() {
        let (mut deps, env, info) = setup_contract();
        let lp = "lp1".to_string();

        // Stake
        let stake_info = mock_info(&lp, &coins(1000, "uusd"));
        let msg = ExecuteMsg::Stake { lp: lp.clone() };
        execute(deps.as_mut(), env.clone(), stake_info, msg).unwrap();

        // Slash more than staked
        let msg = ExecuteMsg::Slash {
            lp: lp.clone(),
            amount: Uint128::new(1500),
        };

        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Verify LP is now inactive
        let query_msg = QueryMsg::GetLP { lp: lp.clone() };
        let active: bool = from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();
        assert!(!active);
    }

    #[test]
    fn test_query_nonexistent_lp() {
        let (deps, env, _info) = setup_contract();
        let lp = "nonexistent".to_string();

        let query_msg = QueryMsg::GetLP { lp: lp.clone() };
        let active: bool = from_json(&query(deps.as_ref(), env, query_msg).unwrap()).unwrap();
        assert!(!active);
    }
}
