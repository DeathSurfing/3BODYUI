// This binary generates JSON schema for the Atomic Swap contract
// Run with: cargo run --bin schema_atomic_swap

#![cfg(not(target_arch = "wasm32"))]

use atomic_swap::{ExecuteMsg, InstantiateMsg, QueryMsg};
use cosmwasm_schema::write_api;

fn main() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        query: QueryMsg,
    }
}
