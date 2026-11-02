---
name: Gigaflush
description: A quiet native desktop panel for reviewing workspace cleanup.
colors:
  surface: "#f7f7f5"
  content: "#ffffff"
  control: "#eeefed"
  hover: "#e5e6e3"
  text: "#202320"
  muted: "#626761"
  line: "#dedfdb"
  accent: "#0869d1"
  selected: "#e8f1fc"
  danger: "#bd302b"
  success: "#28733f"
  dark-surface: "#262725"
  dark-content: "#20211f"
  dark-control: "#343632"
  dark-hover: "#3e403b"
  dark-text: "#f2f3ef"
  dark-muted: "#a5aaa1"
  dark-line: "#41443d"
  dark-accent: "#68aeff"
  dark-selected: "#293c50"
  dark-danger: "#ff8a82"
  dark-success: "#8aca9b"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'
    fontSize: "13px"
  readout:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'
    fontSize: "32px"
    fontWeight: 550
    lineHeight: 1.1
    letterSpacing: "-1px"
  path:
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace'
    fontSize: "10px"
rounded:
  row: "6px"
  control: "8px"
  sheet: "14px"
  shell: "16px"
spacing:
  control-gap: "8px"
  row-gap: "10px"
  inset: "22px"
  sheet-inset: "24px"
components:
  button:
    backgroundColor: "{colors.control}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 12px"
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.content}"
    rounded: "{rounded.control}"
    height: "34px"
---

## Overview

The user-pinned direction is modern native macOS / OpenAI desktop. System typography, quiet surfaces, clear paths, and restrained controls make cleanup feel deliberate. This direction takes precedence over generic style rules that discourage system fonts or a storage readout.

This document records the built implementation in `src/styles.css`, `src/index.html`, and `src/main.js`. There are no decorative images, custom fonts, gradients, or animation dependencies.

## Colors

Use the surface color for the shell, content color for the results area and folder selector, and control color for secondary buttons. Text-colored primary buttons establish hierarchy; blue identifies selection, focus, and active progress. Success and danger colors communicate outcomes. Reserve the solid red action (`#bf332e`, white text, hover `#a52723`) for final destructive confirmation.

Follow the operating system appearance using `prefers-color-scheme` by default; the titlebar theme button cycles System → Light → Dark and pins the choice via `html[data-theme]` (applied before first paint). Dark tokens replace the corresponding light roles; do not invert individual elements independently. Selected rows keep a blue surface with readable text. Disabled buttons use reduced opacity (`.42`).

## Typography

Use the platform sans-serif throughout. Brand and dialog titles have restrained emphasis; the storage readout uses tabular numerals. Controls and project names are generally 12px, secondary interface text 11px, and paths or metadata 10px. Dialog titles are 19px with a compact 1.25 line height. Supporting dialog copy uses a 1.6 line height.

Use monospace only for filesystem paths and code. Keep project names and list paths to one line with ellipsis; preserve full paths in tooltips and allow wrapping in confirmation. Do not introduce display fonts or oversized marketing typography.

## Layout

The viewport is a vertical panel: quiet titlebar, storage summary, folder selector and status, primary controls, cleanup-type disclosure, searchable results, and anchored review footer. The results list consumes remaining space and scrolls independently. Keep repeated rows flat and separated by subtle lines.

Use the shared inset for the main panel regions. Rows have 12px vertical and 10px horizontal padding, with a checkbox, flexible information column, and right-aligned size/action column. Expanded cleanup types use two columns.

Below 620px height, tighten the titlebar, reduce the readout to 28px, and limit the expanded type list to a scrollable 90px region. Below 380px width, reduce main horizontal padding and control gaps, and hide the search shortcut hint. Confirmation content scrolls within the viewport; its path list is separately limited to 180px.

## Elevation & Depth

The shell and controls use borders and surface changes rather than decorative shadows. Confirmation and onboarding sheets use a soft offset shadow (`0 16px 48px`, black at 20% in light appearance and approximately 53% in dark). A translucent black backdrop separates these sheets from the panel.

## Shapes

Use softly rounded rectangular controls, rows, sheets, and shell at the documented radii. Avoid pill-shaped controls and nested cards. Icons are small, consistent outline SVGs with a 1.7 stroke width and rounded caps and joins. The native checkbox remains recognizable.

## Components

- **Brand mark:** the Gigaflush G (source: `brand/`), a geometric arc whose blue tail reads as reclaimed space on a storage gauge. In the titlebar it sits on the app icon's dark tile in both themes; it is the only gradient in the panel.
- **Buttons:** quiet neutral secondary actions, text-colored primary actions, and red final removal. Press feedback scales to `.97`; hover changes the surface. Keyboard focus uses a 3px accent outline with 2px offset.
- **Folder selector:** full-width bordered control, folder icon, readable path, and trailing chevron.
- **Search:** subdued inset surface with icon and keyboard hint; focus adds a 2px accent outline. Keep input text selectable.
- **Result rows:** checkbox, project name, exact cleanup path, ecosystem/folder metadata, tabular size, and Review action. Selection changes the row surface. Nothing is selected initially.
- **Cleanup disclosure:** exposes ecosystem checkboxes and their folder names without making configuration the main screen.
- **Review sheet:** names permanent removal, gives recovery guidance, lists exact paths, and places Cancel before the destructive action. Focus begins on Cancel and returns to the initiating control when dismissed.
- **Progress and empty states:** use direct status text, a slim scan track, a restrained skeleton, and a centered empty message. Error states use the danger role.

Motion is brief and functional: 320ms incoming-row reveal staggered by 28ms per row in a batch, a sweep across the row being deleted, a "Removed" confirmation then a 320ms collapse, a 420ms eased readout that counts down live during cleanup, a completion check, 260ms sheet entrance, 160ms backdrop appearance, 220ms cleanup progress updates, and a 1.5s translating scan track. The shared easing is `cubic-bezier(.16, 1, .3, 1)`. Reduced-motion preference disables animation and transitions. Preserve existing row identity, batch streamed updates, and initially show 100 results with explicit incremental loading.

## Do's and Don'ts

- Keep source paths, removal consequences, and recovery instructions readable.
- Preserve keyboard navigation, visible focus, system appearance, and reduced-motion behavior.
- Keep the footer action anchored and list content scrollable.
- Use restrained system controls and spacing rather than decorative branding.
- Do not add gradients, custom fonts, decorative illustrations, glass effects, or animation libraries.
- Do not substitute a generic dashboard or marketing page for the native cleanup panel.
- Do not use destructive red for the initial Review cleanup action.
