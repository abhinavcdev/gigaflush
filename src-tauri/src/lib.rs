mod commands;
mod scanner;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_positioner::{Position, WindowExt};

fn show_panel(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("panel") {
        let _ = window.move_window(Position::TrayCenter);
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![
            commands::start_scan,
            commands::delete_all,
            commands::get_default_path,
            commands::path_exists,
            commands::pick_folder,
        ])
        .setup(|app| {
            // Pure tray utility: no Dock icon, no app switcher entry.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // ── Panel window (hidden by default) ───────────────────────
            let _panel =
                WebviewWindowBuilder::new(app, "panel", WebviewUrl::App("index.html".into()))
                    .title("NodeMinus")
                    .inner_size(420.0, 620.0)
                    .decorations(false)
                    .transparent(true)
                    .always_on_top(true)
                    .visible(false)
                    .skip_taskbar(true)
                    .build()?;

            // ── Right-click context menu ───────────────────────────────
            let quick_scan =
                MenuItem::with_id(app, "quick_scan", "Quick Scan", true, None::<&str>)?;
            let preferences =
                MenuItem::with_id(app, "preferences", "Preferences...", false, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit NodeMinus", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quick_scan, &preferences, &separator, &quit])?;

            // ── System tray icon ───────────────────────────────────────
            let icon_bytes = include_bytes!("../icons/tray-icon.png");
            let icon = tauri::image::Image::from_bytes(icon_bytes)?;

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quick_scan" => {
                        show_panel(app);
                        if let Some(window) = app.get_webview_window("panel") {
                            let _ = window.emit("quick-scan-requested", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("panel") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                show_panel(app);
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                if commands::is_folder_picker_open() {
                    return;
                }
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running NodeMinus");
}
