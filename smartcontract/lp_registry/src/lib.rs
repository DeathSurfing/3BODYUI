use cosmwasm_schema::QueryResponses;
use cosmwasm_std::{
    attr, entry_point, to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo,
    OverflowError, Response, StdError, StdResult, Uint128,
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
    // [L7] AlreadyRegistered kept for future use (slashed LPs attempting re-register)
    #[error("LP already registered / blacklisted")]
    AlreadyRegistered {},
    #[error("LP not found")]
    LPNotFound {},
    #[error("Unauthorized")]
    Unauthorized {},
    #[error("Insufficient funds sent")]
    InsufficientFunds {},
    // [L4] explicit zero-amount error
    #[error("Amount must be greater than zero")]
    ZeroAmount {},
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
    // [L8 / usability] Added full info query
    #[returns(LPInfo)]
    GetLPInfo { lp: String },
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

// [C1] entry_point required for wasm export
#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    // [M6] Validate admin address at instantiation so the contract fails fast on bad input
    let admin_addr = deps.api.addr_validate(&msg.admin)?;
    ADMIN.save(deps.storage, &admin_addr.to_string())?;
    DENOM.save(deps.storage, &msg.denom)?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "instantiate"))
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
    // [H1] Sender must be the LP address they are staking for
    let lp_addr = deps.api.addr_validate(&lp)?;
    if info.sender != lp_addr {
        return Err(ContractError::Unauthorized {});
    }

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

    // [M4] If LP was slashed (active=false), block re-staking — policy: once slashed, banned
    // To allow rehabilitation instead, replace this block with: if !lpinfo.stake.is_zero() { lpinfo.active = true; }
    if !lpinfo.active {
        return Err(ContractError::AlreadyRegistered {});
    }

    lpinfo.stake = lpinfo.stake.checked_add(sent)?;
    LPS.save(deps.storage, lp.as_str(), &lpinfo)?;

    Ok(Response::new().add_attributes(vec![
        attr("action", "stake"),
        attr("lp", lp),
        attr("amount", sent.to_string()),
    ]))
}

fn unstake(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    lp: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    // [L4] Reject zero-amount unstake (would emit zero-coin BankMsg that Cosmos SDK rejects)
    if amount.is_zero() {
        return Err(ContractError::ZeroAmount {});
    }

    let lp_addr = deps.api.addr_validate(&lp)?;
    if info.sender != lp_addr {
        return Err(ContractError::Unauthorized {});
    }

    let mut lpinfo = LPS
        .may_load(deps.storage, lp.as_str())?
        .ok_or(ContractError::LPNotFound {})?;

    if lpinfo.stake < amount {
        return Err(ContractError::Std(StdError::generic_err("Not enough stake")));
    }

    lpinfo.stake = lpinfo.stake.checked_sub(amount)?;

    // [M3] Deactivate LP if stake reaches zero (mirrors slash() behaviour)
    if lpinfo.stake.is_zero() {
        lpinfo.active = false;
    }

    LPS.save(deps.storage, lp.as_str(), &lpinfo)?;

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

    // [M7] NOTE: slashed funds remain in the contract (intentional burn for MVP).
    // For production, add a treasury address to InstantiateMsg and send funds there.
    if lpinfo.stake < amount {
        lpinfo.stake = Uint128::zero();
    } else {
        lpinfo.stake = lpinfo.stake.checked_sub(amount)?;
    }

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

// [C1] entry_point required for wasm export
#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetLP { lp } => {
            let active = LPS
                .may_load(deps.storage, lp.as_str())?
                .map(|l| l.active)
                .unwrap_or(false);
            to_json_binary(&active)
        }
        // [L8 / usability] Full LP info query for UIs and LP bots
        QueryMsg::GetLPInfo { lp } => {
            let info = LPS
                .may_load(deps.storage, lp.as_str())?
                .ok_or_else(|| StdError::not_found("LP"))?;
            to_json_binary(&info)
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

        instantiate(
            deps.as_mut(),
            env.clone(),
            info.clone(),
            InstantiateMsg {
                admin: admin.clone(),
                denom: "uusd".to_string(),
            },
        )
        .unwrap();

        (deps, env, info)
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("admin", &[]);
        let res = instantiate(
            deps.as_mut(),
            env,
            info,
            InstantiateMsg {
                admin: "admin".to_string(),
                denom: "uusd".to_string(),
            },
        )
        .unwrap();
        assert_eq!(res.attributes[0].value, "instantiate");
    }

    // [M6] Invalid admin fails at instantiation
    #[test]
    fn test_instantiate_invalid_admin_fails() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("anyone", &[]);
        let res = instantiate(
            deps.as_mut(),
            env,
            info,
            InstantiateMsg {
                admin: "".to_string(),
                denom: "uusd".to_string(),
            },
        );
        assert!(res.is_err());
    }


    #[test]
    fn test_stake_new_lp() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Stake { lp: lp.clone() }).unwrap();
        let active: bool =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetLP { lp }).unwrap()).unwrap();
        assert!(active);
    }

    // [H1] Staking for another address must fail
    #[test]
    fn test_stake_for_other_address_fails() {
        let (mut deps, env, _info) = setup_contract();
        let attacker = "attacker".to_string();
        let victim = "victim".to_string();
        let info = mock_info(&attacker, &coins(1000, "uusd"));
        let res = execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::Stake { lp: victim.clone() },
        );
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    #[test]
    fn test_stake_existing_lp() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        let info = mock_info(&lp, &coins(500, "uusd"));
        let res = execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        assert_eq!(res.attributes[0].value, "stake");
    }

    #[test]
    fn test_stake_insufficient_funds() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &[]);
        let res = execute(deps.as_mut(), env, info, ExecuteMsg::Stake { lp });
        assert!(matches!(res.unwrap_err(), ContractError::InsufficientFunds {}));
    }

    // [M4] Slashed LP cannot re-stake
    #[test]
    fn test_slashed_lp_cannot_restake() {
        let (mut deps, env, admin_info) = setup_contract();
        let lp = "lp1".to_string();

        // Stake
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();

        // Slash to zero
        execute(
            deps.as_mut(),
            env.clone(),
            admin_info,
            ExecuteMsg::Slash {
                lp: lp.clone(),
                amount: Uint128::new(1500),
            },
        )
        .unwrap();

        // Attempt to re-stake — must fail
        let info = mock_info(&lp, &coins(500, "uusd"));
        let res = execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        );
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::AlreadyRegistered {}));
    }

    #[test]
    fn test_unstake() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        let res = execute(
            deps.as_mut(),
            env.clone(),
            mock_info(&lp, &[]),
            ExecuteMsg::Unstake {
                lp: lp.clone(),
                amount: Uint128::new(500),
            },
        )
        .unwrap();
        assert_eq!(res.attributes[0].value, "unstake");
    }

    // [M3] Full unstake deactivates LP
    #[test]
    fn test_full_unstake_deactivates_lp() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        execute(
            deps.as_mut(),
            env.clone(),
            mock_info(&lp, &[]),
            ExecuteMsg::Unstake {
                lp: lp.clone(),
                amount: Uint128::new(1000),
            },
        )
        .unwrap();
        let active: bool =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetLP { lp }).unwrap()).unwrap();
        assert!(!active);
    }

    // [L4] Unstake with zero amount must fail cleanly
    #[test]
    fn test_unstake_zero_amount_fails() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        let res = execute(
            deps.as_mut(),
            env,
            mock_info(&lp, &[]),
            ExecuteMsg::Unstake {
                lp,
                amount: Uint128::zero(),
            },
        );
        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), ContractError::ZeroAmount {}));
    }

    #[test]
    fn test_unstake_unauthorized() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        let res = execute(
            deps.as_mut(),
            env,
            mock_info("attacker", &[]),
            ExecuteMsg::Unstake {
                lp,
                amount: Uint128::new(500),
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    #[test]
    fn test_unstake_not_found() {
        let (mut deps, env, _info) = setup_contract();
        let res = execute(
            deps.as_mut(),
            env,
            mock_info("lp1", &[]),
            ExecuteMsg::Unstake {
                lp: "lp1".to_string(),
                amount: Uint128::new(500),
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::LPNotFound {}));
    }

    #[test]
    fn test_slash() {
        let (mut deps, env, info) = setup_contract();
        let lp = "lp1".to_string();
        let stake_info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            stake_info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        let res = execute(
            deps.as_mut(),
            env,
            info,
            ExecuteMsg::Slash {
                lp: lp.clone(),
                amount: Uint128::new(300),
            },
        )
        .unwrap();
        assert_eq!(res.attributes[0].value, "slash");
        assert_eq!(res.attributes[1].value, lp);
        assert_eq!(res.attributes[2].value, "300");
    }

    #[test]
    fn test_slash_unauthorized() {
        let (mut deps, env, _admin_info) = setup_contract();
        let lp = "lp1".to_string();
        let stake_info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            stake_info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        let res = execute(
            deps.as_mut(),
            env,
            mock_info("attacker", &[]),
            ExecuteMsg::Slash {
                lp,
                amount: Uint128::new(300),
            },
        );
        assert!(matches!(res.unwrap_err(), ContractError::Unauthorized {}));
    }

    #[test]
    fn test_slash_to_zero_deactivates() {
        let (mut deps, env, info) = setup_contract();
        let lp = "lp1".to_string();
        let stake_info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            stake_info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Slash {
                lp: lp.clone(),
                amount: Uint128::new(1500),
            },
        )
        .unwrap();
        let active: bool =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetLP { lp }).unwrap()).unwrap();
        assert!(!active);
    }

    #[test]
    fn test_query_nonexistent_lp() {
        let (deps, env, _info) = setup_contract();
        let active: bool =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetLP { lp: "nonexistent".to_string() }).unwrap())
                .unwrap();
        assert!(!active);
    }

    // GetLPInfo query
    #[test]
    fn test_query_lp_info() {
        let (mut deps, env, _info) = setup_contract();
        let lp = "lp1".to_string();
        let info = mock_info(&lp, &coins(1000, "uusd"));
        execute(
            deps.as_mut(),
            env.clone(),
            info,
            ExecuteMsg::Stake { lp: lp.clone() },
        )
        .unwrap();
        let lp_info: LPInfo =
            from_json(&query(deps.as_ref(), env, QueryMsg::GetLPInfo { lp: lp.clone() }).unwrap())
                .unwrap();
        assert_eq!(lp_info.stake, Uint128::new(1000));
        assert!(lp_info.active);
    }
}