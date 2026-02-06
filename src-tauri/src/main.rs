// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                // Optional: Open devtools in debug mode
                // let window = app.get_webview_window("main").unwrap();
                // window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            three_body_payment_lib::secure_store,
            three_body_payment_lib::secure_retrieve,
            three_body_payment_lib::secure_delete,
            three_body_payment_lib::show_notification,
            three_body_payment_lib::get_app_version,
            three_body_payment_lib::open_external_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
