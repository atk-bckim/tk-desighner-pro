# Tkinter Designer Pro Redesign Design

## Goal

Elevate Tkinter Designer from a functional prototype into a commercial-grade professional GUI builder. The redesigned product should feel like a serious desktop development tool for experienced Tkinter developers: precise, dense enough for real work, visually polished, and predictable under repeated use.

This redesign is product-level, not a surface reskin. It should improve the app shell, workflow hierarchy, canvas experience, inspector ergonomics, output feedback, and visual system while preserving the existing core feature set and generated-code model.

## Product Direction

The visual direction is `Precision Studio`.

Tkinter Designer Pro should sit between Figma, Visual Studio Designer, and VS Code: a canvas-first professional tool with compact panels, crisp state feedback, and quiet confidence. The app should avoid marketing-page styling, decorative card stacks, oversized hero patterns, and playful SaaS illustration language.

The product should feel like paid software because it has:

- Clear workspace hierarchy.
- Stable tool chrome.
- Predictable controls.
- Dense but readable panels.
- Consistent state, focus, hover, selected, disabled, warning, and success treatments.
- Strong separation between editing, inspecting, validating, previewing, and exporting.

## Non-Goals

The first redesign pass does not change Tkinter code generation behavior, backend API semantics, project JSON format, or widget model unless a small compatibility change is required to support the improved UI.

It also does not introduce a marketing landing page, authentication, cloud storage, billing, collaboration, plugin systems, or a new layout engine. The first screen remains the usable designer workspace.

## Information Architecture

The app is organized into five primary regions.

### Top Command Bar

Purpose: global project commands and run/export actions.

Contents:

- Product mark and project name.
- Save/load project commands.
- Undo/redo.
- View controls such as snap, zoom, fit, and panel toggles.
- Preview, validate, and export actions.
- Entry point for command/search workflows if implemented in a later pass.

The command bar should be compact, horizontally stable, and visually separated from editing panels. Primary actions must be obvious without making every button compete for attention.

### Left Studio Rail

Purpose: switch between creation and project-structure tools.

Tabs:

- Widgets.
- Layers.
- Assets.
- Variables.
- Components.

The current simultaneous `Toolbox` plus `ObjectTree` layout is too cramped for a pro product. The redesigned left area should act as a docked studio rail with one active tool surface at a time, while keeping fast access to the other surfaces.

Widget insertion needs search, category grouping, and visually stronger affordances for common controls. Layers should behave more like a professional layer tree, with hierarchy, selection, locked state, event state, and widget type visible at scan speed.

### Primary Canvas

Purpose: the main design workspace.

Canvas improvements:

- Clear viewport background distinct from the root window surface.
- Better grid/ruler contrast.
- Improved empty state with template and first-widget entry points.
- Refined selected widget outline, resize handles, locked indicator, event indicator, and smart guide colors.
- Selection HUD for coordinates and dimensions during drag/resize.
- Better zoom affordance and status readout.

The canvas must remain the primary visual focus. Panels should support canvas work rather than dominate it.

### Right Inspector

Purpose: edit the selected widget or root window.

Tabs or grouped sections:

- Layout.
- Style.
- Data.
- Events.
- Advanced.

The current property panel mixes layout, widget configuration, bindings, z-order, menu bar, and root settings in long vertical flows. The redesign should group properties by user intent, keep common properties immediately available, and move advanced or infrequent options behind clear grouping.

The inspector must handle three states well:

- Nothing selected: root/window/project settings.
- One widget selected: focused widget editing.
- Multiple widgets selected: alignment, distribution, common style, bulk actions.

### Bottom Output Dock

Purpose: generated code and operational feedback.

Tabs:

- Code.
- Validation.
- Logs.
- Export Preview.

The generated code panel should stop feeling like a collapsible appendix and instead become a professional output dock. Validation and preview/export failures should have a durable place to appear, not only transient toast messages.

## Design System

### Color

Use a restrained dark professional shell with a bright canvas surface.

Core roles:

- App background: graphite/ink.
- Panel surface: slightly lifted graphite.
- Canvas surround: deep neutral surface with visible viewport boundary.
- Root canvas: user-configurable, default white or Tkinter-like neutral.
- Primary accent: cyan for selection, preview, and active UI.
- Success: emerald for export/success states.
- Warning: amber for validation warnings.
- Danger: red for destructive actions.
- Text: high-contrast foreground, muted foreground, disabled foreground.
- Border: subtle but visible enough to define dense tool panels.

Raw hex values should be concentrated in shared CSS tokens where practical instead of repeated in components.

### Typography

The app should use a deliberate product typography system.

Expectations:

- Compact UI labels.
- Clear panel headings.
- Monospace or tabular treatment where coordinates, code, dimensions, and generated output appear.
- No browser-default control typography.
- No oversized headings inside tool panels.
- No negative letter spacing.

### Components

Reusable visual families should include:

- Icon button.
- Text button.
- Primary action button.
- Segmented/tab control.
- Panel header.
- Panel section.
- Tree row.
- Widget palette row.
- Inspector field.
- Toast.
- Dock tab.
- Status chip.
- Empty state action.

Cards should be limited to repeated items and modals. App regions should be panels, docks, rails, and canvas surfaces rather than nested decorative cards.

### Icons

Use consistent SVG-style icons rather than emoji or text glyphs where practical. Icons should be small, optically centered, and match the tool chrome. Icon-only buttons require labels through `aria-label` and tooltips or title text.

## Core Workflow Requirements

### Create

Users can quickly find widgets, insert them, and understand what was added. Common widgets should be easier to scan than rare widgets without hiding advanced controls.

### Arrange

Dragging, resizing, snapping, locking, aligning, distributing, and selecting should feel precise. Selection state and drag feedback should be clear at default zoom.

### Inspect

The selected widget's layout, style, data, and events should be discoverable without scrolling through a mixed property list. Multi-select should emphasize bulk operations.

### Preview

Preview remains backed by generated Tkinter code and the backend subprocess runner. Preview status should show in the command bar/toast and persist in the bottom output dock when errors occur.

### Validate

Validation should become a visible workflow. Errors and warnings should be listed in the bottom dock, grouped by issue type when practical, and linked to relevant widgets when possible in later passes.

### Export

Export should feel like a final product operation. Success and failure need clear feedback, and the generated code should remain inspectable.

## Implementation Scope

### Pass 1: Foundation

- Introduce shared design tokens in CSS.
- Normalize app shell colors, typography, borders, radii, focus states, and scrollbars.
- Replace ad hoc text glyphs and emoji-style indicators where feasible.
- Keep existing state shape and backend calls.

### Pass 2: App Shell

- Redesign top command bar.
- Replace dual left panels with a studio rail and active panel surface.
- Preserve access to widgets, layers, variables, assets, and components.
- Improve status bar and output dock hierarchy.

### Pass 3: Canvas

- Improve canvas surround, root surface, grid, ruler, smart guides, selection handles, event/lock indicators, and empty state.
- Keep drag/drop and existing widget rendering behavior intact unless small fixes are required.

### Pass 4: Inspector

- Reorganize the property panel into clear groups or tabs.
- Improve root, single-selection, and multi-selection states.
- Preserve all current editable fields.

### Pass 5: Feedback And Polish

- Improve toast styling and behavior.
- Add durable validation/output feedback where data already exists.
- Tighten keyboard focus, hover, disabled, selected, active, warning, and success states.
- Verify desktop and mobile-sized layouts enough to avoid broken overflow.

## Constraints

The project uses React, TypeScript, Vite, Zustand, dnd-kit, and Tailwind CSS 4 through the Vite plugin. The redesign should stay within that stack.

No new backend framework, generated-code dependency, or persistence model is required. Any new dependency should have a clear product payoff; otherwise prefer local components and CSS.

The frontend currently has duplicated code-generation logic in the backend and `CodePreview`. The redesign should not widen that mismatch. If output workflows change, they should preserve existing backend API calls and project serialization.

## Accessibility And Quality Criteria

The implementation should meet these quality bars:

- Interactive controls have accessible names.
- Keyboard focus remains visible.
- Text contrast is readable in panels and canvas chrome.
- Icon-only controls are labeled.
- Panel layouts do not require horizontal scrolling at common desktop widths.
- Small controls remain usable in dense tool panels.
- Reduced-motion preferences are respected for any added animation.
- Empty, selected, disabled, error, success, and loading states are visually distinct.

## Verification Plan

The redesign is not complete until verified against the current objective.

Verification should include:

- Frontend build.
- Frontend lint or explicit note of remaining lint issues.
- Browser/IAB visual inspection of the app.
- Desktop viewport screenshot review.
- Mobile-sized viewport check for major overflow or unreadable controls.
- Core interaction path: add widget, select widget, edit property, preview or validate, inspect generated code/output.

Completion requires the app to look and behave like a coherent professional tool, not merely to compile.

## Open Decisions

The user approved the product-level redesign direction and accepted a longer timeline. The working direction is `Precision Studio` unless the user later overrides the visual language.

Specific implementation details such as exact icon set, whether inspector grouping uses tabs or accordion sections, and whether the output dock is always visible or collapsible can be decided during implementation planning based on existing component constraints.
