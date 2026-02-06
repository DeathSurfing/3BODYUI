// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use keyring::Entry;

const APP_SERVICE_NAME: &str = "com.threebody.protocol";

/// Securely store a key-value pair in the native keychain/keystore
/// 
/// Uses platform-native secure storage:
/// - macOS: Keychain Services
/// - iOS: Keychain Services (hardware-backed when available)
/// - Windows: Credential Manager (DPAPI)
/// - Linux: Secret Service API / libsecret
/// 
/// # Arguments
/// * `key` - The key to store the value under (will be combined with app identifier)
/// * `value` - The value to store (encrypted by the OS)
/// 
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error message on failure
#[tauri::command]
fn secure_store(key: String, value: String) -> Result<(), String> {
    println!("[Secure Storage] Storing key: {}", key);
    
    let entry = Entry::new(APP_SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.set_password(&value)
        .map_err(|e| format!("Failed to store password: {}", e))?;
    
    println!("[Secure Storage] Successfully stored key: {}", key);
    Ok(())
}

/// Retrieve a value from secure storage by key
/// 
/// # Arguments
/// * `key` - The key to retrieve the value for
/// 
/// # Returns
/// * `Ok(Some(value))` if key exists
/// * `Ok(None)` if key doesn't exist
/// * `Err(String)` with error message on failure
#[tauri::command]
fn secure_retrieve(key: String) -> Result<Option<String>, String> {
    println!("[Secure Storage] Retrieving key: {}", key);
    
    let entry = Entry::new(APP_SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    match entry.get_password() {
        Ok(value) => {
            println!("[Secure Storage] Successfully retrieved key: {}", key);
            Ok(Some(value))
        }
        Err(keyring::Error::NoEntry) => {
            println!("[Secure Storage] Key not found: {}", key);
            Ok(None)
        }
        Err(e) => {
            println!("[Secure Storage] Error retrieving key {}: {}", key, e);
            Err(format!("Failed to retrieve password: {}", e))
        }
    }
}

/// Delete a key-value pair from secure storage
/// 
/// # Arguments
/// * `key` - The key to delete
/// 
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error message on failure
#[tauri::command]
fn secure_delete(key: String) -> Result<(), String> {
    println!("[Secure Storage] Deleting key: {}", key);
    
    let entry = Entry::new(APP_SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.delete_password()
        .map_err(|e| format!("Failed to delete password: {}", e))?;
    
    println!("[Secure Storage] Successfully deleted key: {}", key);
    Ok(())
}

/// Show a native notification to the user
/// 
/// # Arguments
/// * `title` - The notification title
/// * `body` - The notification body text
/// 
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error message on failure
#[tauri::command]
async fn show_notification(title: String, body: String) -> Result<(), String> {
    println!("[Notification] Showing: {} - {}", title, body);
    
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use tauri_plugin_notification::NotificationExt;
        
        let app_handle = tauri::Manager::app_handle(
            &tauri::Builder::default().build(tauri::generate_context!())
                .map_err(|e| format!("Failed to build app: {}", e))?
        );
        
        app_handle.notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|e| format!("Failed to show notification: {}", e))?;
    }
    
    // For mobile, notifications require additional setup (APNs for iOS, FCM for Android)
    // This will be implemented when mobile notification support is configured
    
    Ok(())
}

/// Get the current application version
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Open an external URL in the default system browser
/// 
/// # Arguments
/// * `url` - The URL to open (must be http:// or https://)
/// 
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error message on failure
#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    println!("[Shell] Opening URL: {}", url);
    
    // Validate URL
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL must start with http:// or https://".to_string());
    }
    
    // Use the shell plugin to open the URL
    tauri_plugin_shell::Shell::open(&tauri_plugin_shell::Shell::new(), &url, None)
        .map_err(|e| format!("Failed to open URL: {}", e))?;
    
    println!("[Shell] Successfully opened URL: {}", url);
    Ok(())
}

/// Get the path to the app's data directory
/// 
/// This is where the app can store non-sensitive data files
/// 
/// # Returns
/// * Path string to the app data directory
#[tauri::command]
fn get_app_data_dir(app_handle: AppHandle) -> Result<String, String> {
    let path = app_handle.path_resolver()
        .app_data_dir()
        .ok_or("Could not resolve app data directory")?;
    
    Ok(path.to_string_lossy().to_string())
}

/// Check if running on a mobile platform
#[tauri::command]
fn is_mobile() -> bool {
    cfg!(any(target_os = "ios", target_os = "android"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            secure_store,
            secure_retrieve,
            secure_delete,
            show_notification,
            get_app_version,
            open_external_url,
            get_app_data_dir,
            is_mobile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
