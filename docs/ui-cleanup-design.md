# Gigaflush: native workspace cleanup

Direction confirmed by the user: macOS / OpenAI desktop aesthetics. This pinned direction takes precedence over the design seed's alternatives. Retain Tauri, vanilla JS, the tray workflow and parallel Rust scanning.

A compact system-colored panel uses a quiet titlebar, workspace selector, cleanup-type disclosure, restrained storage readout, searchable folder list and anchored review action. System typography, subtle separators, blue selection, clear paths, system light/dark appearance. No decorative gradients, hero cards, custom fonts or animation dependencies.

Motion: short control presses, one-time incoming row reveal, a translating scan indicator, and a confirmation sheet. Reduced motion disables movement. Existing rows retain DOM identity; streamed discoveries are batched, and results render in bounded pages.

Cleanup uses an explicit backend allowlist and project markers: Node dependencies; Flutter/Dart build and tool output; Rust target; Python tool caches; Swift .build; Gradle project cache; Maven target. No generic build/dist, virtual environments, source, lockfiles, global caches or downloaded SDK cleanup. Each candidate shows its ecosystem, folder and recovery instructions. Nothing is selected by default. Confirmation lists exact paths and explains permanent removal and rebuild cost.

Deletion revalidates the allowlist and refuses symlink paths, parent traversal and missing markers. File operations run away from the UI thread. Tests cover recognition, unrelated folders, duplicates, symlinks, deletion failures and marker removal.
