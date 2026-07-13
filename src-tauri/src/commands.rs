use crate::scanner;
use serde::Serialize;
use std::convert::TryInto;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

static FOLDER_PICKER_OPEN: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Debug, Serialize)]
pub struct PurgeProgress {
    pub index: usize,
    pub total: usize,
    pub path: String,
    pub size_bytes: u64,
    pub freed_bytes: u64,
    pub status: String,
    pub error: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DeleteAttempt {
    pub path: String,
    pub size_bytes: u64,
    pub status: DeleteStatus,
}

#[derive(Clone, Debug, PartialEq)]
pub enum DeleteStatus {
    Deleted,
    Failed(String),
}

#[derive(Clone, Debug, PartialEq)]
pub struct BulkDeleteResult {
    pub freed_bytes: u64,
    pub attempts: Vec<DeleteAttempt>,
}

/// Only directories literally named `node_modules` may ever be deleted,
/// no matter what the frontend sends.
fn is_node_modules_dir(path: &Path) -> bool {
    path.file_name().is_some_and(|name| name == "node_modules")
}

pub fn delete_paths_with_progress<F>(paths: &[String], mut on_progress: F) -> BulkDeleteResult
where
    F: FnMut(PurgeProgress),
{
    let total = paths.len();
    let mut freed_bytes = 0;
    let mut attempts = Vec::with_capacity(total);

    for (offset, path) in paths.iter().enumerate() {
        let index = offset + 1;
        let p = Path::new(path);

        if !is_node_modules_dir(p) {
            let error = "Refused: not a node_modules directory".to_string();
            on_progress(PurgeProgress {
                index,
                total,
                path: path.clone(),
                size_bytes: 0,
                freed_bytes,
                status: "failed".to_string(),
                error: Some(error.clone()),
            });
            attempts.push(DeleteAttempt {
                path: path.clone(),
                size_bytes: 0,
                status: DeleteStatus::Failed(error),
            });
            continue;
        }

        let size_bytes = scanner::calculate_dir_size(p);

        on_progress(PurgeProgress {
            index,
            total,
            path: path.clone(),
            size_bytes,
            freed_bytes,
            status: "deleting".to_string(),
            error: None,
        });

        match std::fs::remove_dir_all(p) {
            Ok(_) => {
                freed_bytes += size_bytes;
                on_progress(PurgeProgress {
                    index,
                    total,
                    path: path.clone(),
                    size_bytes,
                    freed_bytes,
                    status: "deleted".to_string(),
                    error: None,
                });
                attempts.push(DeleteAttempt {
                    path: path.clone(),
                    size_bytes,
                    status: DeleteStatus::Deleted,
                });
            }
            Err(e) => {
                let error = e.to_string();
                on_progress(PurgeProgress {
                    index,
                    total,
                    path: path.clone(),
                    size_bytes,
                    freed_bytes,
                    status: "failed".to_string(),
                    error: Some(error.clone()),
                });
                attempts.push(DeleteAttempt {
                    path: path.clone(),
                    size_bytes,
                    status: DeleteStatus::Failed(error),
                });
            }
        }
    }

    BulkDeleteResult {
        freed_bytes,
        attempts,
    }
}

/// Kick off a background scan. Results are streamed back via `project-found`
/// and `scan-complete` events rather than returned directly.
/// Returns immediately — the scan runs on a detached background thread.
#[tauri::command]
pub async fn start_scan(app: AppHandle, path: String) -> Result<(), String> {
    let root = expand_home_path(&path);
    if !root.is_dir() {
        return Err(format!("Folder not found: {}", root.display()));
    }
    std::thread::spawn(move || {
        scanner::scan_directory(&app, &root.to_string_lossy());
    });
    Ok(())
}

/// Delete multiple `node_modules` directories, returning total freed bytes.
/// Individual failures are logged but do not stop the remaining deletions.
#[tauri::command]
pub async fn delete_all(app: AppHandle, paths: Vec<String>) -> Result<u64, String> {
    let result = delete_paths_with_progress(&paths, |progress| {
        app.emit("purge-progress", progress).ok();
    });

    Ok(result.freed_bytes)
}

/// Return the user's home directory as the default scan root.
#[tauri::command]
pub fn get_default_path() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| {
            if cfg!(windows) {
                "C:\\".to_string()
            } else {
                "/".to_string()
            }
        })
}

/// Check whether a path exists and is a directory (used to validate
/// remembered scan targets on startup).
#[tauri::command]
pub fn path_exists(path: String) -> bool {
    expand_home_path(&path).is_dir()
}

/// Open a native folder picker dialog and return the selected path.
///
/// The panel window is always-on-top, which would leave the native dialog
/// stuck behind it — so always-on-top is suspended while the picker is open.
/// The `FOLDER_PICKER_OPEN` flag keeps the focus-loss handler from hiding
/// the panel while the dialog has focus.
#[tauri::command]
pub async fn pick_folder(
    app: AppHandle,
    current_path: Option<String>,
) -> Result<Option<String>, String> {
    struct PickerGuard;
    impl Drop for PickerGuard {
        fn drop(&mut self) {
            FOLDER_PICKER_OPEN.store(false, Ordering::SeqCst);
        }
    }
    FOLDER_PICKER_OPEN.store(true, Ordering::SeqCst);
    let _guard = PickerGuard;

    let panel = app.get_webview_window("panel");
    if let Some(window) = &panel {
        let _ = window.set_always_on_top(false);
    }

    let mut dialog = app.dialog().file().set_title("Choose a folder to scan");

    if let Some(path) = current_path {
        let path = expand_home_path(&path);
        if path.exists() {
            dialog = dialog.set_directory(path);
        }
    }

    let picked = dialog.blocking_pick_folder();

    if let Some(window) = &panel {
        let _ = window.set_always_on_top(true);
        let _ = window.set_focus();
    }

    picked
        .map(|file_path| {
            let path: PathBuf = file_path
                .try_into()
                .map_err(|err| format!("Could not read selected folder: {err}"))?;
            Ok(path.to_string_lossy().into_owned())
        })
        .transpose()
}

pub fn is_folder_picker_open() -> bool {
    FOLDER_PICKER_OPEN.load(Ordering::SeqCst)
}

fn expand_home_path(path: &str) -> PathBuf {
    if path == "~" {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from(path));
    }

    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }

    PathBuf::from(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn delete_paths_reports_progress_and_freed_bytes_per_path() {
        let temp = tempfile::tempdir().unwrap();
        let first = temp.path().join("first/node_modules");
        let second = temp.path().join("second/node_modules");
        fs::create_dir_all(&first).unwrap();
        fs::create_dir_all(&second).unwrap();
        fs::write(first.join("a.bin"), vec![0; 7]).unwrap();
        fs::write(second.join("b.bin"), vec![0; 11]).unwrap();

        let paths = vec![
            first.to_string_lossy().into_owned(),
            second.to_string_lossy().into_owned(),
        ];
        let mut progress = Vec::new();

        let result = delete_paths_with_progress(&paths, |event| progress.push(event));

        assert_eq!(result.freed_bytes, 18);
        assert_eq!(result.attempts.len(), 2);
        assert!(matches!(result.attempts[0].status, DeleteStatus::Deleted));
        assert!(matches!(result.attempts[1].status, DeleteStatus::Deleted));
        assert_eq!(progress.len(), 4);
        assert_eq!(progress[0].status, "deleting");
        assert_eq!(progress[1].status, "deleted");
        assert_eq!(progress[1].freed_bytes, 7);
        assert_eq!(progress[3].freed_bytes, 18);
        assert!(!first.exists());
        assert!(!second.exists());
    }

    #[test]
    fn delete_paths_refuses_non_node_modules_paths() {
        let temp = tempfile::tempdir().unwrap();
        let victim = temp.path().join("important-data");
        fs::create_dir_all(&victim).unwrap();
        fs::write(victim.join("keep.txt"), b"data").unwrap();

        let mut progress = Vec::new();
        let result = delete_paths_with_progress(
            &[victim.to_string_lossy().into_owned()],
            |event| progress.push(event),
        );

        assert_eq!(result.freed_bytes, 0);
        assert!(matches!(result.attempts[0].status, DeleteStatus::Failed(_)));
        assert_eq!(progress.len(), 1);
        assert_eq!(progress[0].status, "failed");
        assert!(victim.join("keep.txt").exists());
    }

    #[test]
    fn delete_paths_continues_after_failures() {
        let temp = tempfile::tempdir().unwrap();
        let missing = temp.path().join("missing/node_modules");
        let existing = temp.path().join("existing/node_modules");
        fs::create_dir_all(&existing).unwrap();
        fs::write(existing.join("pkg.bin"), vec![0; 5]).unwrap();

        let paths = vec![
            missing.to_string_lossy().into_owned(),
            existing.to_string_lossy().into_owned(),
        ];
        let mut progress = Vec::new();

        let result = delete_paths_with_progress(&paths, |event| progress.push(event));

        assert_eq!(result.freed_bytes, 5);
        assert!(matches!(result.attempts[0].status, DeleteStatus::Failed(_)));
        assert!(matches!(result.attempts[1].status, DeleteStatus::Deleted));
        assert_eq!(progress[1].status, "failed");
        assert_eq!(progress[3].status, "deleted");
        assert!(!existing.exists());
    }
}
