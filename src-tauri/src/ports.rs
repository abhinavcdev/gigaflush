//! Idle dev server detection.
//!
//! Finds local dev servers (Node, Bun, Deno, Python, Ruby, PHP) that are still
//! holding a port long after anyone used them — typically left behind by a
//! closed terminal or a coding agent. Only conservative recommendations are
//! returned: the process must belong to the current user, have no open
//! connections on its ports, use almost no CPU, and be either orphaned or
//! running for hours. Other dev servers are reported as context (`idle:
//! false`) and are never stoppable. Stopping re-verifies each process by PID *and* start
//! time, then asks it to exit with SIGTERM (the same as Ctrl+C).

use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap, HashSet};

/// Minimum uptime before anything is suggested.
const MIN_AGE_SECS: u64 = 30 * 60;
/// Uptime after which a still-parented server counts as forgotten.
const STALE_AGE_SECS: u64 = 6 * 60 * 60;
/// Lifetime average CPU (cpu time / wall time) above which a server is "working".
const MAX_CPU_RATIO: f64 = 0.02;
/// Never suggest editor, agent, notebook or language tooling.
const PROTECTED: &[&str] = &[
    "claude",
    "codex",
    "copilot",
    "cursor",
    "vscode",
    "language-server",
    "languageserver",
    "langserver",
    "lsp",
    "mcp",
    "tsserver",
    "jupyter",
    "ipykernel",
    "gigaflush",
];

#[derive(Clone, Debug, Serialize)]
pub struct IdleServer {
    pub pid: u32,
    /// Process start time as reported by `ps`; identifies the process across PID reuse.
    pub started: String,
    pub runtime: String,
    pub label: String,
    pub cwd: Option<String>,
    pub ports: Vec<u16>,
    pub uptime_secs: u64,
    pub memory_bytes: u64,
    pub orphaned: bool,
    /// Safe to suggest stopping. In-use servers are listed for context only.
    pub idle: bool,
    /// Something is connected to one of its ports right now.
    pub connected: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct IdleScan {
    pub supported: bool,
    pub servers: Vec<IdleServer>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct StopTarget {
    pub pid: u32,
    pub started: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct StopResult {
    pub pid: u32,
    pub stopped: bool,
    pub memory_bytes: u64,
    pub error: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
struct Proc {
    pid: u32,
    ppid: u32,
    uid: u32,
    rss_kb: u64,
    age_secs: u64,
    cpu_secs: f64,
    started: String,
    comm: String,
}

// ── Platform layer ────────────────────────────────────────────────

#[cfg(unix)]
mod sys {
    use std::process::Command;

    pub fn run(program: &str, args: &[&str]) -> Option<String> {
        let out = Command::new(program).args(args).output().ok()?;
        // lsof exits 1 when nothing matched; its output is still valid.
        Some(String::from_utf8_lossy(&out.stdout).into_owned())
    }

    pub fn uid() -> u32 {
        unsafe { libc::getuid() }
    }

    pub fn signal(pid: u32, sig: i32) -> bool {
        unsafe { libc::kill(pid as libc::pid_t, sig) == 0 }
    }

    pub fn alive(pid: u32) -> bool {
        signal(pid, 0)
    }

    pub fn started(pid: u32) -> Option<String> {
        let out = run("ps", &["-o", "lstart=", "-p", &pid.to_string()])?;
        let token = out.split_whitespace().collect::<Vec<_>>().join(" ");
        (!token.is_empty()).then_some(token)
    }
}

type PortMap = HashMap<u32, BTreeSet<u16>>;

#[cfg(unix)]
fn snapshot() -> Option<(Vec<Proc>, PortMap, PortMap)> {
    let ps = sys::run(
        "ps",
        &["-axo", "pid=,ppid=,uid=,rss=,etime=,time=,lstart=,comm="],
    )?;
    let procs = ps.lines().filter_map(parse_ps_line).collect::<Vec<_>>();
    let listening = parse_lsof_ports(&sys::run(
        "lsof",
        &["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpn"],
    )?);
    let connected = parse_lsof_ports(&sys::run(
        "lsof",
        &["-nP", "-iTCP", "-sTCP:ESTABLISHED", "-Fpn"],
    )?);
    Some((procs, listening, connected))
}

/// List idle dev servers worth stopping.
pub fn find_idle_servers() -> IdleScan {
    #[cfg(unix)]
    {
        let Some((procs, listening, connected)) = snapshot() else {
            return IdleScan {
                supported: false,
                servers: Vec::new(),
            };
        };
        let mut servers = recommend(
            &procs,
            &listening,
            &connected,
            sys::uid(),
            std::process::id(),
        );
        if !servers.is_empty() {
            let pids = servers
                .iter()
                .map(|s| s.pid.to_string())
                .collect::<Vec<_>>()
                .join(",");
            let args = sys::run("ps", &["-o", "pid=,args=", "-p", &pids]).unwrap_or_default();
            let cwds =
                sys::run("lsof", &["-a", "-d", "cwd", "-p", &pids, "-Fpn"]).unwrap_or_default();
            let args = parse_pid_text(&args);
            let cwds = parse_lsof_names(&cwds);
            servers.retain_mut(|server| {
                let Some(args) = args.get(&server.pid) else {
                    return false;
                };
                let lower = args.to_ascii_lowercase();
                if PROTECTED.iter().any(|word| lower.contains(word)) {
                    return false;
                }
                server.label = label_of(args, &server.runtime);
                server.cwd = cwds.get(&server.pid).cloned();
                true
            });
        }
        IdleScan {
            supported: true,
            servers,
        }
    }
    #[cfg(not(unix))]
    {
        IdleScan {
            supported: false,
            servers: Vec::new(),
        }
    }
}

/// Stop the given servers. Each is re-checked against a fresh scan and only
/// stopped if it is still the same process and still idle.
pub fn stop_idle_servers(targets: &[StopTarget]) -> Vec<StopResult> {
    #[cfg(unix)]
    {
        use std::time::{Duration, Instant};

        let current = find_idle_servers().servers;
        let procs = sys::run(
            "ps",
            &["-axo", "pid=,ppid=,uid=,rss=,etime=,time=,lstart=,comm="],
        )
        .map(|out| out.lines().filter_map(parse_ps_line).collect::<Vec<_>>())
        .unwrap_or_default();

        targets
            .iter()
            .map(|target| {
                let Some(server) = current
                    .iter()
                    .find(|s| s.idle && s.pid == target.pid && s.started == target.started)
                else {
                    return StopResult {
                        pid: target.pid,
                        stopped: false,
                        memory_bytes: 0,
                        error: Some("No longer idle, or already stopped".into()),
                    };
                };

                // The server and everything it spawned (bundlers, workerd, …).
                let mut family = vec![(server.pid, server.started.clone())];
                family.extend(
                    descendants(&procs, server.pid)
                        .into_iter()
                        .map(|p| (p.pid, p.started.clone())),
                );
                let still_same = |(pid, started): &(u32, String)| {
                    sys::alive(*pid) && sys::started(*pid).as_deref() == Some(started.as_str())
                };

                sys::signal(server.pid, libc::SIGTERM);
                let deadline = Instant::now() + Duration::from_secs(3);
                while sys::alive(server.pid) && Instant::now() < deadline {
                    std::thread::sleep(Duration::from_millis(80));
                }
                // Children that outlived their parent get the same polite request.
                let leftovers = family
                    .iter()
                    .filter(|p| still_same(p))
                    .cloned()
                    .collect::<Vec<_>>();
                if !leftovers.is_empty() {
                    for (pid, _) in &leftovers {
                        sys::signal(*pid, libc::SIGTERM);
                    }
                    std::thread::sleep(Duration::from_millis(800));
                    for member in leftovers.iter().filter(|p| still_same(p)) {
                        sys::signal(member.0, libc::SIGKILL);
                    }
                }

                let stopped = !sys::alive(server.pid)
                    || sys::started(server.pid).as_deref() != Some(server.started.as_str());
                StopResult {
                    pid: server.pid,
                    stopped,
                    memory_bytes: if stopped { server.memory_bytes } else { 0 },
                    error: (!stopped).then(|| "The process did not exit".into()),
                }
            })
            .collect()
    }
    #[cfg(not(unix))]
    {
        targets
            .iter()
            .map(|t| StopResult {
                pid: t.pid,
                stopped: false,
                memory_bytes: 0,
                error: Some("Not supported on this platform yet".into()),
            })
            .collect()
    }
}

// ── Pure logic (unit tested) ──────────────────────────────────────

fn recommend(
    procs: &[Proc],
    listening: &HashMap<u32, BTreeSet<u16>>,
    connected: &HashMap<u32, BTreeSet<u16>>,
    uid: u32,
    self_pid: u32,
) -> Vec<IdleServer> {
    let by_pid: HashMap<u32, &Proc> = procs.iter().map(|p| (p.pid, p)).collect();

    // Never touch Gigaflush or anything it runs inside.
    let mut protected = HashSet::new();
    let mut cursor = Some(self_pid);
    while let Some(pid) = cursor.filter(|pid| *pid > 1 && protected.insert(*pid)) {
        cursor = by_pid.get(&pid).map(|p| p.ppid);
    }

    // Attribute each listening socket to a dev runtime: the listener itself,
    // or its direct parent when the listener is a helper binary (wrangler → workerd).
    struct Group {
        ports: BTreeSet<u16>,
        busy: bool,
    }
    let mut groups: HashMap<u32, Group> = HashMap::new();
    for (pid, ports) in listening {
        let Some(proc_) = by_pid.get(pid) else {
            continue;
        };
        let owner = if runtime_of(&proc_.comm).is_some() {
            proc_
        } else {
            match by_pid.get(&proc_.ppid) {
                Some(parent) if runtime_of(&parent.comm).is_some() => parent,
                _ => continue,
            }
        };
        let busy = connected
            .get(pid)
            .is_some_and(|open| open.iter().any(|port| ports.contains(port)));
        let group = groups.entry(owner.pid).or_insert(Group {
            ports: BTreeSet::new(),
            busy: false,
        });
        group.ports.extend(ports);
        group.busy |= busy;
    }

    // A dev server whose parent is also a candidate folds into the top-most one.
    let roots = groups.keys().copied().collect::<HashSet<_>>();
    let folded = roots
        .iter()
        .filter_map(|pid| {
            let mut top = *pid;
            while let Some(parent) = by_pid
                .get(&top)
                .map(|p| p.ppid)
                .filter(|p| roots.contains(p))
            {
                if parent == *pid {
                    break;
                }
                top = parent;
            }
            (top != *pid).then_some((*pid, top))
        })
        .collect::<Vec<_>>();
    for (child, top) in folded {
        if let Some(group) = groups.remove(&child) {
            let target = groups.get_mut(&top).expect("top group is never folded");
            target.ports.extend(group.ports);
            target.busy |= group.busy;
        }
    }

    let mut servers = groups
        .into_iter()
        .filter_map(|(pid, group)| {
            let root = by_pid.get(&pid)?;
            if root.uid != uid || protected.contains(&pid) {
                return None;
            }
            let family = std::iter::once(*root)
                .chain(descendants(procs, pid))
                .collect::<Vec<_>>();
            if family
                .iter()
                .any(|p| protected.contains(&p.pid) || p.uid != uid)
            {
                return None;
            }
            let cpu: f64 = family.iter().map(|p| p.cpu_secs).sum();
            let age = root.age_secs;
            let orphaned = root.ppid <= 1
                || by_pid.get(&root.ppid).is_some_and(|p| {
                    basename(&p.comm) == "systemd" || basename(&p.comm) == "launchd"
                });
            let quiet = age >= MIN_AGE_SECS && cpu / (age.max(1) as f64) < MAX_CPU_RATIO;
            let idle = quiet && !group.busy && (orphaned || age >= STALE_AGE_SECS);
            let runtime = runtime_of(&root.comm)?;
            Some(IdleServer {
                pid,
                started: root.started.clone(),
                runtime: runtime.to_string(),
                label: runtime.to_string(),
                cwd: None,
                ports: group.ports.into_iter().collect(),
                uptime_secs: age,
                memory_bytes: family.iter().map(|p| p.rss_kb * 1024).sum(),
                orphaned,
                idle,
                connected: group.busy,
            })
        })
        .collect::<Vec<_>>();
    servers.sort_by_key(|s| (!s.idle, std::cmp::Reverse(s.uptime_secs)));
    servers
}

fn descendants(procs: &[Proc], root: u32) -> Vec<&Proc> {
    let mut found = Vec::new();
    let mut frontier = vec![root];
    while let Some(pid) = frontier.pop() {
        for child in procs.iter().filter(|p| p.ppid == pid && p.pid != root) {
            if !found.iter().any(|p: &&Proc| p.pid == child.pid) {
                found.push(child);
                frontier.push(child.pid);
            }
        }
    }
    found
}

fn basename(path: &str) -> &str {
    path.rsplit(['/', '\\']).next().unwrap_or(path)
}

fn runtime_of(comm: &str) -> Option<&'static str> {
    let name = basename(comm).to_ascii_lowercase();
    match name.as_str() {
        "node" | "nodejs" => Some("node"),
        "bun" => Some("bun"),
        "deno" => Some("deno"),
        "ruby" => Some("ruby"),
        "php" => Some("php"),
        n if n.starts_with("python") => Some("python"),
        _ => None,
    }
}

/// Parse one `ps -axo pid=,ppid=,uid=,rss=,etime=,time=,lstart=,comm=` line.
/// `lstart` is always five tokens ("Sat Nov  1 01:20:33 2026").
fn parse_ps_line(line: &str) -> Option<Proc> {
    let mut rest = line.trim_start();
    let mut next = || {
        let end = rest.find(char::is_whitespace).unwrap_or(rest.len());
        let token = &rest[..end];
        rest = rest[end..].trim_start();
        (!token.is_empty()).then_some(token)
    };
    let pid = next()?.parse().ok()?;
    let ppid = next()?.parse().ok()?;
    let uid = next()?.parse().ok()?;
    let rss_kb = next()?.parse().ok()?;
    let age_secs = parse_clock(next()?)? as u64;
    let cpu_secs = parse_clock(next()?)?;
    let started = (0..5)
        .map(|_| next())
        .collect::<Option<Vec<_>>>()?
        .join(" ");
    let comm = rest.trim().to_string();
    (!comm.is_empty()).then_some(Proc {
        pid,
        ppid,
        uid,
        rss_kb,
        age_secs,
        cpu_secs,
        started,
        comm,
    })
}

/// Parse `ps` durations: `[[dd-]hh:]mm:ss[.cc]`.
fn parse_clock(text: &str) -> Option<f64> {
    let (days, clock) = match text.split_once('-') {
        Some((d, c)) => (d.parse::<f64>().ok()?, c),
        None => (0.0, text),
    };
    let mut secs = 0.0;
    for part in clock.split(':') {
        secs = secs * 60.0 + part.parse::<f64>().ok()?;
    }
    Some(days * 86_400.0 + secs)
}

/// Parse `lsof -Fpn` output into pid → local ports.
fn parse_lsof_ports(out: &str) -> HashMap<u32, BTreeSet<u16>> {
    let mut map: HashMap<u32, BTreeSet<u16>> = HashMap::new();
    let mut pid = None;
    for line in out.lines() {
        if let Some(p) = line.strip_prefix('p') {
            pid = p.parse().ok();
        } else if let (Some(name), Some(pid)) = (line.strip_prefix('n'), pid) {
            let local = name.split("->").next().unwrap_or(name);
            if let Some(port) = local.rsplit(':').next().and_then(|p| p.parse().ok()) {
                map.entry(pid).or_default().insert(port);
            }
        }
    }
    map
}

/// Parse `lsof -Fpn` output into pid → first name (used for cwd).
fn parse_lsof_names(out: &str) -> HashMap<u32, String> {
    let mut map = HashMap::new();
    let mut pid = None;
    for line in out.lines() {
        if let Some(p) = line.strip_prefix('p') {
            pid = p.parse().ok();
        } else if let (Some(name), Some(pid)) = (line.strip_prefix('n'), pid) {
            map.entry(pid).or_insert_with(|| name.to_string());
        }
    }
    map
}

/// Parse `ps -o pid=,args=` output.
fn parse_pid_text(out: &str) -> HashMap<u32, String> {
    out.lines()
        .filter_map(|line| {
            let (pid, rest) = line.trim_start().split_once(char::is_whitespace)?;
            Some((pid.parse().ok()?, rest.trim().to_string()))
        })
        .collect()
}

/// A short human name for a server command: "astro dev", "vite", "manage runserver".
fn label_of(args: &str, runtime: &str) -> String {
    let mut tokens = args.split_whitespace().skip(1).peekable();
    let mut script = None;
    while let Some(token) = tokens.next() {
        if token == "-m" {
            script = tokens.next().map(str::to_string);
            break;
        }
        if !token.starts_with('-') {
            script = Some(token.to_string());
            break;
        }
    }
    let Some(script) = script else {
        return runtime.to_string();
    };
    let name = match script.rsplit_once("node_modules/") {
        Some((_, pkg)) => {
            let pkg = pkg.strip_prefix(".bin/").unwrap_or(pkg);
            let mut parts = pkg.split('/');
            let first = parts.next().unwrap_or(pkg);
            if first.starts_with('@') {
                parts.next().unwrap_or(first).to_string()
            } else {
                first.to_string()
            }
        }
        None => {
            let base = basename(&script);
            base.rsplit_once('.')
                .filter(|(stem, ext)| {
                    !stem.is_empty()
                        && matches!(*ext, "js" | "mjs" | "cjs" | "ts" | "py" | "rb" | "php")
                })
                .map(|(stem, _)| stem)
                .unwrap_or(base)
                .to_string()
        }
    };
    match tokens.next() {
        Some(sub) if sub.chars().all(|c| c.is_ascii_alphabetic()) && sub.len() <= 12 => {
            format!("{name} {sub}")
        }
        _ => name,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn proc_(pid: u32, ppid: u32, age: u64, cpu: f64, comm: &str) -> Proc {
        Proc {
            pid,
            ppid,
            uid: 501,
            rss_kb: 10_000,
            age_secs: age,
            cpu_secs: cpu,
            started: format!("start-{pid}"),
            comm: comm.into(),
        }
    }

    fn ports(entries: &[(u32, &[u16])]) -> HashMap<u32, BTreeSet<u16>> {
        entries
            .iter()
            .map(|(pid, ports)| (*pid, ports.iter().copied().collect()))
            .collect()
    }

    const DAY: u64 = 86_400;

    fn idle(
        procs: &[Proc],
        listening: &HashMap<u32, BTreeSet<u16>>,
        connected: &HashMap<u32, BTreeSet<u16>>,
        self_pid: u32,
    ) -> Vec<IdleServer> {
        recommend(procs, listening, connected, 501, self_pid)
            .into_iter()
            .filter(|s| s.idle)
            .collect()
    }

    #[test]
    fn parses_macos_ps_line() {
        let p = parse_ps_line(
            "14945     1   501   5024 07-00:06:58   0:06.63 Sat Oct 25 01:13:35 2026     /opt/homebrew/bin/node",
        )
        .unwrap();
        assert_eq!(p.pid, 14945);
        assert_eq!(p.ppid, 1);
        assert_eq!(p.age_secs, 7 * DAY + 6 * 60 + 58);
        assert!((p.cpu_secs - 6.63).abs() < 1e-9);
        assert_eq!(p.started, "Sat Oct 25 01:13:35 2026");
        assert_eq!(p.comm, "/opt/homebrew/bin/node");
    }

    #[test]
    fn parses_clock_formats() {
        assert_eq!(parse_clock("05:07"), Some(307.0));
        assert_eq!(parse_clock("1:02:03"), Some(3723.0));
        assert_eq!(parse_clock("2-00:00:01"), Some(2.0 * 86_400.0 + 1.0));
        assert_eq!(parse_clock("3:42.11"), Some(222.11));
    }

    #[test]
    fn parses_lsof_local_ports() {
        let out =
            "p35097\nf27\nn127.0.0.1:4321->127.0.0.1:53128\np619\nf8\nn*:5000\nf9\nn[::1]:7000\n";
        let map = parse_lsof_ports(out);
        assert_eq!(map[&35097], [4321].into());
        assert_eq!(map[&619], [5000, 7000].into());
    }

    #[test]
    fn recommends_orphaned_idle_server() {
        let procs = vec![proc_(10, 1, 7 * DAY, 6.0, "/opt/homebrew/bin/node")];
        let found = recommend(&procs, &ports(&[(10, &[4322])]), &HashMap::new(), 501, 999);
        assert_eq!(found.len(), 1);
        assert!(found[0].orphaned);
        assert_eq!(found[0].ports, vec![4322]);
    }

    #[test]
    fn skips_server_with_open_connections() {
        let procs = vec![proc_(10, 1, 15 * DAY, 200.0, "node")];
        let listening = ports(&[(10, &[4321])]);
        let connected = ports(&[(10, &[4321])]);
        assert!(idle(&procs, &listening, &connected, 999).is_empty());
        let all = recommend(&procs, &listening, &connected, 501, 999);
        assert!(all[0].connected && !all[0].idle);
    }

    #[test]
    fn skips_young_busy_foreign_and_unknown_processes() {
        let procs = vec![
            proc_(10, 1, 10 * 60, 0.1, "node"),          // too young
            proc_(11, 1, DAY, 0.2 * DAY as f64, "node"), // 20% CPU: working
            Proc {
                uid: 0,
                ..proc_(12, 1, DAY, 1.0, "python3")
            }, // another user
            proc_(13, 1, DAY, 1.0, "postgres"),          // not a dev runtime
            proc_(14, 50, 2 * 60 * 60, 1.0, "node"),     // parented and only 2h old
            proc_(50, 1, DAY, 1.0, "zsh"),
        ];
        let listening = ports(&[
            (10, &[1]),
            (11, &[2]),
            (12, &[3]),
            (13, &[5432]),
            (14, &[4]),
        ]);
        assert!(idle(&procs, &listening, &HashMap::new(), 999).is_empty());
        // Context list: only this user's dev runtimes, never postgres or root's python.
        let mut shown = recommend(&procs, &listening, &HashMap::new(), 501, 999)
            .iter()
            .map(|s| s.pid)
            .collect::<Vec<_>>();
        shown.sort();
        assert_eq!(shown, vec![10, 11, 14]);
    }

    #[test]
    fn credits_helper_listener_to_its_runtime_parent() {
        let procs = vec![
            proc_(20, 1, DAY, 80.0, "node"),
            proc_(21, 20, DAY, 40.0, "/x/workerd"),
        ];
        let found = recommend(&procs, &ports(&[(21, &[8789])]), &HashMap::new(), 501, 999);
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].pid, 20);
        assert_eq!(found[0].ports, vec![8789]);
        assert_eq!(found[0].memory_bytes, 2 * 10_000 * 1024);
    }

    #[test]
    fn never_recommends_own_ancestry() {
        let procs = vec![
            proc_(30, 1, DAY, 1.0, "node"),
            proc_(31, 30, DAY, 1.0, "gigaflush"),
        ];
        assert!(recommend(&procs, &ports(&[(30, &[1420])]), &HashMap::new(), 501, 31).is_empty());
    }

    #[test]
    fn labels_common_commands() {
        assert_eq!(
            label_of(
                "/bin/node /p/node_modules/astro/bin/astro.mjs dev --port 4321",
                "node"
            ),
            "astro dev"
        );
        assert_eq!(
            label_of("node /p/node_modules/.bin/vite --host 0.0.0.0", "node"),
            "vite"
        );
        assert_eq!(
            label_of(
                "node --no-warnings /p/node_modules/wrangler/wrangler-dist/cli.js dev --port 8789",
                "node"
            ),
            "wrangler dev"
        );
        assert_eq!(
            label_of("python3 manage.py runserver", "python"),
            "manage runserver"
        );
        assert_eq!(
            label_of("python3 -m http.server 8000", "python"),
            "http.server"
        );
        assert_eq!(label_of("node", "node"), "node");
    }
}
