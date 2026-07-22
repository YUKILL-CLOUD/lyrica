// Lyrica — Rust backend entry point
// All setup is delegated to lib.rs for testability.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lyrica_lib::run();
}
