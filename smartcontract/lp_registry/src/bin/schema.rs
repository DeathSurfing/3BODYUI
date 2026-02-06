// This binary generates JSON schema for the LP Registry contract
// Run with: cargo run --bin schema_lp_registry

#![cfg(not(target_arch = "wasm32"))]

use cosmwasm_schema::write_api;
use lp_registry::{ExecuteMsg, InstantiateMsg, QueryMsg};

fn main() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        query: QueryMsg,
    }
}
