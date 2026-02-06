// This binary generates JSON schema for the Escrow contract
// Run with: cargo run --bin schema_escrow

#![cfg(not(target_arch = "wasm32"))]

use cosmwasm_schema::write_api;
use escrow::{ExecuteMsg, InstantiateMsg, QueryMsg};

fn main() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        query: QueryMsg,
    }
}
