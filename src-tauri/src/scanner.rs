use jwalk::WalkDir;
use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Emitter};

/// A recognized project-local generated folder.
#[derive(Serialize, Clone, Debug)]
pub struct FoundProject {
    pub name: String,
    pub path: String,
    pub cleanup_path: String,
    pub ecosystem: String,
    pub folder: String,
    pub recovery: String,
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
    ".gradle",
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

/// Never inspect installed package stores or Python environments for projects.
const PACKAGE_STORES: &[&str] = &[
    ".pub-cache",
    ".cargo",
    ".rustup",
    ".npm",
    ".pnpm-store",
    ".yarn",
    ".cache",
    ".venv",
    "venv",
];

fn in_package_store(path: &Path) -> bool {
    path.ancestors().any(|ancestor| {
        ancestor
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| PACKAGE_STORES.contains(&n))
    })
}

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

/// One conservative, project-local cleanup rule. Never match generic build/dist.
#[derive(Clone, Copy)]
pub struct CleanupRule {
    pub ecosystem: &'static str,
    pub recovery: &'static str,
}

pub fn cleanup_rule(path: &Path) -> Option<CleanupRule> {
    let parent = path.parent()?;
    let name = path.file_name()?.to_str()?;
    let marker = |name: &str| fs::symlink_metadata(parent.join(name)).is_ok_and(|m| m.is_file());
    let (ecosystem, recovery) = match name {
        "node_modules" if marker("package.json") => (
            "node",
            "Reinstall with your package manager. Locally edited dependencies will be lost.",
        ),
        "build" | ".dart_tool" if marker("pubspec.yaml") => (
            "flutter",
            "Run flutter pub get (or dart pub get), then rebuild. Stop running builds first.",
        ),
        "target" if marker("Cargo.toml") => {
            ("rust", "Run cargo build. The next build will take longer.")
        }
        ".pytest_cache" | ".mypy_cache" | ".ruff_cache"
            if marker("pyproject.toml") || marker("setup.py") || marker("requirements.txt") =>
        {
            (
                "python",
                "Your test runner or linter recreates this cache on its next run.",
            )
        }
        ".build" if marker("Package.swift") => (
            "swift",
            "Run swift build. Dependencies and build output will be recreated.",
        ),
        ".gradle"
            if marker("build.gradle")
                || marker("build.gradle.kts")
                || marker("settings.gradle")
                || marker("settings.gradle.kts") =>
        {
            (
                "gradle",
                "Gradle recreates this project cache on the next build.",
            )
        }
        "target" if marker("pom.xml") => ("maven", "Run mvn package to rebuild compiled output."),
        _ => return None,
    };
    if in_package_store(path)
        || path.parent().is_some_and(|parent| {
            parent
                .ancestors()
                .any(|ancestor| ancestor.file_name().is_some_and(|n| n == ".gradle"))
        })
    {
        return None;
    }
    Some(CleanupRule {
        ecosystem,
        recovery,
    })
}

/// Recheck at deletion time, including symlinks in every path component.
pub fn validate_cleanup_path(path: &Path) -> Result<(), String> {
    if !path.is_absolute()
        || path
            .components()
            .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err("Refused: cleanup requires an absolute path without parent traversal".into());
    }
    for ancestor in path.ancestors() {
        let meta = fs::symlink_metadata(ancestor).map_err(|e| e.to_string())?;
        if meta.file_type().is_symlink() {
            return Err("Refused: symbolic links are not cleanup targets".into());
        }
    }
    if !path.is_dir() || cleanup_rule(path).is_none() {
        return Err(
            "Refused: folder is not a recognized generated directory with a project manifest"
                .into(),
        );
    }
    Ok(())
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn scan_projects_with<F>(root: &Path, on_found: F) -> ScanResults
where
    F: FnMut(&FoundProject),
{
    scan_projects_filtered(root, &[], on_found)
}

pub fn scan_projects_filtered<F>(root: &Path, ecosystems: &[String], mut on_found: F) -> ScanResults
where
    F: FnMut(&FoundProject),
{
    let mut projects = Vec::new();
    let mut total_size = 0;
    let walker = WalkDir::new(root)
        .skip_hidden(false)
        .follow_links(false)
        .process_read_dir(|_depth, path, _state, children| {
            if in_package_store(path)
                || path.file_name().is_some_and(|n| n == ".gradle")
                || cleanup_rule(path).is_some()
            {
                children.clear();
                return;
            }
            for entry in children.iter_mut().flatten() {
                let name = entry.file_name.to_string_lossy();
                if entry.file_type().is_dir()
                    && (SKIP_DIRS.contains(&name.as_ref())
                        || PACKAGE_STORES.contains(&name.as_ref())
                        || name == "node_modules"
                        || cleanup_rule(&entry.path()).is_some())
                {
                    entry.read_children_path = None;
                }
            }
        });
    for entry in walker.into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_dir() {
            continue;
        }
        let path = entry.path();
        let Some(rule) = cleanup_rule(&path) else {
            continue;
        };
        if !ecosystems.is_empty() && !ecosystems.iter().any(|e| e == rule.ecosystem) {
            continue;
        }
        let Some(parent) = path.parent() else {
            continue;
        };
        let size = calculate_dir_size(&path);
        let project = FoundProject {
            name: extract_project_name(parent),
            path: parent.to_string_lossy().into_owned(),
            cleanup_path: path.to_string_lossy().into_owned(),
            ecosystem: rule.ecosystem.into(),
            folder: path.file_name().unwrap().to_string_lossy().into_owned(),
            recovery: rule.recovery.into(),
            size_bytes: size,
        };
        total_size += size;
        on_found(&project);
        projects.push(project);
    }
    ScanResults {
        total_count: projects.len(),
        projects,
        total_size,
    }
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn scan_projects(root: &Path) -> ScanResults {
    scan_projects_with(root, |_| {})
}

pub fn scan_directory(app: &AppHandle, root: &str, ecosystems: &[String]) {
    let results = scan_projects_filtered(Path::new(root), ecosystems, |project| {
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
    fn skips_shared_package_stores_and_virtual_environments() {
        let temp = tempfile::tempdir().unwrap();
        for folder in [
            ".pub-cache",
            ".cargo",
            ".rustup",
            ".npm",
            ".cache",
            ".gradle",
            ".venv",
            "venv",
        ] {
            let nested = temp.path().join(folder).join("package");
            fs::create_dir_all(nested.join("node_modules")).unwrap();
            fs::write(nested.join("package.json"), "{}").unwrap();
        }
        assert_eq!(scan_projects(temp.path()).total_count, 0);
    }

    #[test]
    fn filters_ecosystems_and_avoids_nested_duplicates() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::write(root.join("pubspec.yaml"), "name: app").unwrap();
        fs::create_dir_all(root.join("build/nested/node_modules")).unwrap();
        fs::write(root.join("build/nested/package.json"), "{}").unwrap();
        fs::create_dir_all(root.join("rust/target")).unwrap();
        fs::write(root.join("rust/Cargo.toml"), "").unwrap();
        let all = scan_projects(root);
        assert_eq!(all.total_count, 2);
        let rust = scan_projects_filtered(root, &["rust".into()], |_| {});
        assert_eq!(rust.total_count, 1);
        assert_eq!(rust.projects[0].ecosystem, "rust");
    }

    #[test]
    fn ignores_ambiguous_builds_and_unrecognized_dependencies() {
        let temp = tempfile::tempdir().unwrap();
        for folder in ["build", "dist", "target", "node_modules", ".venv", ".build"] {
            fs::create_dir_all(temp.path().join(folder)).unwrap();
        }
        assert_eq!(scan_projects(temp.path()).total_count, 0);
    }

    #[test]
    fn discovers_generated_folders_only_in_recognized_projects() {
        let temp = tempfile::tempdir().unwrap();
        for (project, marker, folders) in [
            ("mobile", "pubspec.yaml", vec!["build", ".dart_tool"]),
            ("rust", "Cargo.toml", vec!["target"]),
            ("swift", "Package.swift", vec![".build"]),
            ("gradle", "build.gradle.kts", vec![".gradle"]),
            ("maven", "pom.xml", vec!["target"]),
            (
                "python",
                "pyproject.toml",
                vec![".pytest_cache", ".ruff_cache"],
            ),
        ] {
            let root = temp.path().join(project);
            fs::create_dir_all(&root).unwrap();
            fs::write(root.join(marker), "").unwrap();
            for folder in folders {
                fs::create_dir_all(root.join(folder)).unwrap();
                fs::write(root.join(folder).join("cache"), b"123").unwrap();
            }
        }
        fs::create_dir_all(temp.path().join("unrelated/build")).unwrap();
        fs::write(temp.path().join("unrelated/build/source"), b"keep").unwrap();
        let results = scan_projects(temp.path());
        assert_eq!(results.total_count, 8);
        assert_eq!(results.total_size, 24);
    }

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
