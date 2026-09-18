#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env,
    Symbol, Vec,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const BUMP_TO: u32 = 120 * DAY_IN_LEDGERS;
const MAX_LIQUIDITY_BPS: u32 = 10_000;
const MAX_RISK_PROFILE: u32 = 2;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserPolicy {
    pub risk_profile: u32,
    pub target_timestamp: u64,
    pub liquidity_target_bps: u32,
    pub automation_paused: bool,
    pub allowed_strategies: Vec<Symbol>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Policy(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    PolicyNotFound = 1,
    InvalidRiskProfile = 2,
    InvalidLiquidityBps = 3,
    InvalidTargetTimestamp = 4,
    AutomationPaused = 5,
    StrategyNotAllowed = 6,
    ZeroAllocationAmount = 7,
}

#[contractevent]
pub struct PolicySet {
    #[topic]
    pub user: Address,
    pub risk_profile: u32,
    pub target_timestamp: u64,
    pub liquidity_target_bps: u32,
}

#[contractevent]
pub struct RiskUpdated {
    #[topic]
    pub user: Address,
    pub risk_profile: u32,
}

#[contractevent]
pub struct TargetUpdated {
    #[topic]
    pub user: Address,
    pub target_timestamp: u64,
}

#[contractevent]
pub struct StrategyAllowed {
    #[topic]
    pub user: Address,
    #[topic]
    pub strategy: Symbol,
    pub allowed: bool,
}

#[contractevent]
pub struct AllocationAuthorized {
    #[topic]
    pub user: Address,
    #[topic]
    pub strategy: Symbol,
    pub amount_bps: u32,
}

#[contractevent]
pub struct RebalanceAuthorized {
    #[topic]
    pub user: Address,
    #[topic]
    pub from_strategy: Symbol,
    #[topic]
    pub to_strategy: Symbol,
}

#[contractevent]
pub struct AutomationPaused {
    #[topic]
    pub user: Address,
    pub paused: bool,
}

#[contract]
pub struct TrinqaAllocationPolicy;

fn validate_policy_fields(env: &Env, policy: &UserPolicy) -> Result<(), Error> {
    if policy.risk_profile > MAX_RISK_PROFILE {
        return Err(Error::InvalidRiskProfile);
    }
    if policy.liquidity_target_bps > MAX_LIQUIDITY_BPS {
        return Err(Error::InvalidLiquidityBps);
    }
    if policy.target_timestamp <= env.ledger().timestamp() {
        return Err(Error::InvalidTargetTimestamp);
    }
    Ok(())
}

fn policy_key(user: &Address) -> DataKey {
    DataKey::Policy(user.clone())
}

fn load_policy(env: &Env, user: &Address) -> Result<UserPolicy, Error> {
    env.storage()
        .persistent()
        .get(&policy_key(user))
        .ok_or(Error::PolicyNotFound)
}

fn store_policy(env: &Env, user: &Address, policy: &UserPolicy) {
    let key = policy_key(user);
    env.storage().persistent().set(&key, policy);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
}

fn strategy_allowed(policy: &UserPolicy, strategy: &Symbol) -> bool {
    for i in 0..policy.allowed_strategies.len() {
        if policy.allowed_strategies.get(i).unwrap() == *strategy {
            return true;
        }
    }
    false
}

fn assert_automation_active(policy: &UserPolicy) -> Result<(), Error> {
    if policy.automation_paused {
        return Err(Error::AutomationPaused);
    }
    Ok(())
}

#[contractimpl]
impl TrinqaAllocationPolicy {
    pub fn set_policy(env: Env, user: Address, policy: UserPolicy) -> Result<(), Error> {
        user.require_auth();
        validate_policy_fields(&env, &policy)?;
        store_policy(&env, &user, &policy);
        PolicySet {
            user: user.clone(),
            risk_profile: policy.risk_profile,
            target_timestamp: policy.target_timestamp,
            liquidity_target_bps: policy.liquidity_target_bps,
        }
        .publish(&env);
        Ok(())
    }

    pub fn get_policy(env: Env, user: Address) -> Result<UserPolicy, Error> {
        load_policy(&env, &user)
    }

    pub fn update_risk(env: Env, user: Address, risk_profile: u32) -> Result<(), Error> {
        user.require_auth();
        if risk_profile > MAX_RISK_PROFILE {
            return Err(Error::InvalidRiskProfile);
        }
        let mut policy = load_policy(&env, &user)?;
        policy.risk_profile = risk_profile;
        store_policy(&env, &user, &policy);
        RiskUpdated {
            user: user.clone(),
            risk_profile,
        }
        .publish(&env);
        Ok(())
    }

    pub fn update_target_date(env: Env, user: Address, target_timestamp: u64) -> Result<(), Error> {
        user.require_auth();
        if target_timestamp <= env.ledger().timestamp() {
            return Err(Error::InvalidTargetTimestamp);
        }
        let mut policy = load_policy(&env, &user)?;
        policy.target_timestamp = target_timestamp;
        store_policy(&env, &user, &policy);
        TargetUpdated {
            user: user.clone(),
            target_timestamp,
        }
        .publish(&env);
        Ok(())
    }

    pub fn set_strategy_allowed(
        env: Env,
        user: Address,
        strategy: Symbol,
        allowed: bool,
    ) -> Result<(), Error> {
        user.require_auth();
        let mut policy = load_policy(&env, &user)?;
        let mut next = Vec::new(&env);
        let mut found = false;
        for i in 0..policy.allowed_strategies.len() {
            let s = policy.allowed_strategies.get(i).unwrap();
            if s == strategy {
                found = true;
                if allowed {
                    next.push_back(s);
                }
            } else {
                next.push_back(s);
            }
        }
        if allowed && !found {
            next.push_back(strategy.clone());
        }
        policy.allowed_strategies = next;
        store_policy(&env, &user, &policy);
        StrategyAllowed {
            user: user.clone(),
            strategy,
            allowed,
        }
        .publish(&env);
        Ok(())
    }

    pub fn authorize_allocation(
        env: Env,
        user: Address,
        strategy: Symbol,
        amount_bps: u32,
    ) -> Result<bool, Error> {
        user.require_auth();
        if amount_bps == 0 {
            return Err(Error::ZeroAllocationAmount);
        }
        if amount_bps > MAX_LIQUIDITY_BPS {
            return Err(Error::InvalidLiquidityBps);
        }
        let policy = load_policy(&env, &user)?;
        assert_automation_active(&policy)?;
        if !strategy_allowed(&policy, &strategy) {
            return Err(Error::StrategyNotAllowed);
        }
        store_policy(&env, &user, &policy);
        AllocationAuthorized {
            user: user.clone(),
            strategy: strategy.clone(),
            amount_bps,
        }
        .publish(&env);
        Ok(true)
    }

    pub fn authorize_rebalance(
        env: Env,
        user: Address,
        from_strategy: Symbol,
        to_strategy: Symbol,
    ) -> Result<bool, Error> {
        user.require_auth();
        let policy = load_policy(&env, &user)?;
        assert_automation_active(&policy)?;
        if !strategy_allowed(&policy, &from_strategy) || !strategy_allowed(&policy, &to_strategy) {
            return Err(Error::StrategyNotAllowed);
        }
        store_policy(&env, &user, &policy);
        RebalanceAuthorized {
            user: user.clone(),
            from_strategy,
            to_strategy,
        }
        .publish(&env);
        Ok(true)
    }

    pub fn pause_automation(env: Env, user: Address, paused: bool) -> Result<(), Error> {
        user.require_auth();
        let mut policy = load_policy(&env, &user)?;
        policy.automation_paused = paused;
        store_policy(&env, &user, &policy);
        AutomationPaused {
            user: user.clone(),
            paused,
        }
        .publish(&env);
        Ok(())
    }
}

mod test;
