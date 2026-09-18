#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, symbol_short, Env};

fn sample_policy(env: &Env) -> UserPolicy {
    UserPolicy {
        risk_profile: 1,
        target_timestamp: env.ledger().timestamp() + 86_400,
        liquidity_target_bps: 2_500,
        automation_paused: false,
        allowed_strategies: Vec::from_array(
            env,
            [symbol_short!("defindex"), symbol_short!("blend")],
        ),
    }
}

#[test]
fn set_and_get_policy() {
    let env = Env::default();
    env.mock_all_auths();
    let user = Address::generate(&env);
    let contract_id = env.register(TrinqaAllocationPolicy, ());
    let client = TrinqaAllocationPolicyClient::new(&env, &contract_id);

    let policy = sample_policy(&env);
    client.set_policy(&user, &policy);
    let stored = client.get_policy(&user);
    assert_eq!(stored, policy);
}

#[test]
fn update_risk_and_target() {
    let env = Env::default();
    env.mock_all_auths();
    let user = Address::generate(&env);
    let contract_id = env.register(TrinqaAllocationPolicy, ());
    let client = TrinqaAllocationPolicyClient::new(&env, &contract_id);

    client.set_policy(&user, &sample_policy(&env));
    client.update_risk(&user, &2u32);
    client.update_target_date(&user, &(env.ledger().timestamp() + 172_800));

    let stored = client.get_policy(&user);
    assert_eq!(stored.risk_profile, 2);
    assert!(stored.target_timestamp > env.ledger().timestamp());
}

#[test]
fn strategy_allowlist_and_authorize() {
    let env = Env::default();
    env.mock_all_auths();
    let user = Address::generate(&env);
    let contract_id = env.register(TrinqaAllocationPolicy, ());
    let client = TrinqaAllocationPolicyClient::new(&env, &contract_id);

    client.set_policy(&user, &sample_policy(&env));
    let soroswap = symbol_short!("soroswap");
    client.set_strategy_allowed(&user, &soroswap, &true);

    assert!(client.authorize_allocation(&user, &soroswap, &500));
    assert!(client.authorize_rebalance(&user, &soroswap, &symbol_short!("defindex")));
}

#[test]
fn pause_blocks_authorization() {
    let env = Env::default();
    env.mock_all_auths();
    let user = Address::generate(&env);
    let contract_id = env.register(TrinqaAllocationPolicy, ());
    let client = TrinqaAllocationPolicyClient::new(&env, &contract_id);

    client.set_policy(&user, &sample_policy(&env));
    client.pause_automation(&user, &true);

    let result = client.try_authorize_allocation(&user, &symbol_short!("defindex"), &100);
    assert_eq!(result, Err(Ok(Error::AutomationPaused)));
}

#[test]
fn rejects_zero_allocation_bps() {
    let env = Env::default();
    env.mock_all_auths();
    let user = Address::generate(&env);
    let contract_id = env.register(TrinqaAllocationPolicy, ());
    let client = TrinqaAllocationPolicyClient::new(&env, &contract_id);

    client.set_policy(&user, &sample_policy(&env));
    let result = client.try_authorize_allocation(&user, &symbol_short!("defindex"), &0u32);
    assert_eq!(result, Err(Ok(Error::ZeroAllocationAmount)));
}

#[test]
fn rejects_invalid_liquidity_bps() {
    let env = Env::default();
    env.mock_all_auths();
    let user = Address::generate(&env);
    let contract_id = env.register(TrinqaAllocationPolicy, ());
    let client = TrinqaAllocationPolicyClient::new(&env, &contract_id);

    let mut policy = sample_policy(&env);
    policy.liquidity_target_bps = 10_001;
    let result = client.try_set_policy(&user, &policy);
    assert_eq!(result, Err(Ok(Error::InvalidLiquidityBps)));
}
