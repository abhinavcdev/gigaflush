use jwalk::WalkDir;
use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Emitter};

/// A discovered project with a `node_modules` directory.
#[derive(Serialize, Clone, Debug)]
pub struct FoundProject {
    pub name: String,
    pub path: String,
    pub node_modules_path: String,
    pub size_bytes: u64,
}

/// Payload emitted when the scan finishes.
#[derive(Serialize, Clone, Debug)]
pub struct ScanComplete {
    pub total_size: u64,
    pub total_count: usize,
}

/// Full result of a scan, useful for tests and non-event consumers.
#[derive(Clone, Debug)]
pub struct ScanResults {
    #[cfg_attr(not(test), allow(dead_code))]
    pub projects: Vec<FoundProject>,
    pub total_size: u64,
    pub total_count: usize,
}

/// Directories to skip during traversal — system dirs, VCS, trash, etc.
const SKIP_DIRS: &[&str] = &[
    "Library",
    "System",
    "System Volume Information",
    ".git",
    "$Recycle.Bin",
    ".Trash",
    "Windows",
    "Program Files",
    "Program Files (x86)",
    "proc",
    "sys",
    "dev",
    "snap",
];

/// Recursively sum the sizes of every file inside `path`.
pub fn calculate_dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .skip_hidden(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.metadata().ok())
        .filter(|meta| meta.is_file())
        .map(|meta| meta.len())
        .sum()
}

/// Try to read the `name` field from `project_dir/package.json`.
/// Falls back to the directory's basename.
pub fn extract_project_name(project_dir: &Path) -> String {
    let fallback = project_dir
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "unknown".to_string());

    let pkg_path = project_dir.join("package.json");
    match fs::read_to_string(&pkg_path) {
        Ok(contents) => serde_json::from_str::<serde_json::Value>(&contents)
            .ok()
            .and_then(|v| v.get("name")?.as_str().map(String::from))
            .filter(|n| !n.is_empty())
            .unwrap_or(fallback),
        Err(_) => fallback,
    }
}

/// Walk `root` looking for top-level `node_modules` directories,
/// invoking `on_found` for each project as it is discovered so callers
/// can stream results while the walk is still running.
pub fn scan_projects_with<F>(root: &Path, mut on_found: F) -> ScanResults
where
    F: FnMut(&FoundProject),
{
    let mut projects = Vec::new();
    let mut total_size: u64 = 0;
    let mut total_count: usize = 0;

    let walker = WalkDir::new(root).skip_hidden(false).process_read_dir(
        |_depth, _path, _read_dir_state, children| {
            for child in children.iter_mut() {
                if let Ok(entry) = child {
                    let name = entry.file_name.to_string_lossy().to_string();
                    if entry.file_type().is_dir()
                        && (SKIP_DIRS.contains(&name.as_str()) || name == "node_modules")
                    {
                        entry.read_children_path = None;
                    }
                }
            }
        },
    );

    for entry in walker {
        match entry {
            Ok(entry) => {
                if !entry.file_type().is_dir() {
                    continue;
                }

                let name = entry.file_name.to_string_lossy().to_string();
                if name != "node_modules" {
                    continue;
                }

                let nm_path = entry.path();
                let project_dir = match nm_path.parent() {
                    Some(p) => p.to_path_buf(),
                    None => continue,
                };

                let size = calculate_dir_size(&nm_path);
                let project_name = extract_project_name(&project_dir);

                let project = FoundProject {
                    name: project_name,
                    path: project_dir.to_string_lossy().into_owned(),
                    node_modules_path: nm_path.to_string_lossy().into_owned(),
                    size_bytes: size,
                };

                total_size += size;
                total_count += 1;
                on_found(&project);
                projects.push(project);
            }
            Err(e) => {
                eprintln!("scanner: skipping entry — {}", e);
            }
        }
    }

    ScanResults {
        projects,
        total_size,
        total_count,
    }
}

/// Walk `root` looking for top-level `node_modules` directories.
#[cfg_attr(not(test), allow(dead_code))]
pub fn scan_projects(root: &Path) -> ScanResults {
    scan_projects_with(root, |_| {})
}

/// Walk `root` looking for `node_modules` directories.
///
/// Every match is streamed to the frontend as a `project-found` event while
/// the walk is still running, and `scan-complete` fires when it finishes.
pub fn scan_directory(app: &AppHandle, root: &str) {
    let results = scan_projects_with(Path::new(root), |project| {
        app.emit("project-found", project).ok();
    });

    app.emit(
        "scan-complete",
        ScanComplete {
            total_size: results.total_size,
            total_count: results.total_count,
        },
    )
    .ok();
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn extracts_package_name_and_falls_back_to_directory_name() {
        let temp = tempfile::tempdir().unwrap();
        let named_project = temp.path().join("named-project");
        let fallback_project = temp.path().join("fallback-project");
        fs::create_dir_all(&named_project).unwrap();
        fs::create_dir_all(&fallback_project).unwrap();
        fs::write(
            named_project.join("package.json"),
            r#"{"name":"@acme/web"}"#,
        )
        .unwrap();

        assert_eq!(extract_project_name(&named_project), "@acme/web");
        assert_eq!(extract_project_name(&fallback_project), "fallback-project");
    }

    #[test]
    fn sums_only_files_inside_directory_tree() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("node_modules");
        let nested = root.join("pkg");
        fs::create_dir_all(&nested).unwrap();
        fs::write(root.join("one.bin"), vec![0; 10]).unwrap();
        fs::write(nested.join("two.bin"), vec![0; 15]).unwrap();

        assert_eq!(calculate_dir_size(&root), 25);
    }

    #[test]
    fn scan_projects_finds_top_level_node_modules_without_nested_duplicates() {
        let temp = tempfile::tempdir().unwrap();
        let project = temp.path().join("project-a");
        let nested_node_modules = project.join("node_modules/pkg/node_modules");
        fs::create_dir_all(&nested_node_modules).unwrap();
        fs::write(project.join("package.json"), r#"{"name":"project-a"}"#).unwrap();
        fs::write(project.join("node_modules/pkg/index.js"), vec![0; 7]).unwrap();
        fs::write(nested_node_modules.join("nested.js"), vec![0; 11]).unwrap();

        let scan = scan_projects(temp.path());

        assert_eq!(scan.total_count, 1);
        assert_eq!(scan.total_size, 18);
        assert_eq!(scan.projects.len(), 1);
        assert_eq!(scan.projects[0].name, "project-a");
        assert_eq!(scan.projects[0].path, project.to_string_lossy());
    }
}
