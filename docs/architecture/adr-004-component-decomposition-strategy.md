# ADR-004: Frontend Component Decomposition and Modular Architecture Strategy

## Status
Accepted

## Context
- **Problem**: 
  The primary user-facing components in `esa-housekeeping` grew rapidly during operational feature expansion:
  - `components/SupervisorDashboard.tsx` (~2,034 lines): Contains filter logic, metrics calculations, real-time polling, audio chime playback, modal state management, room card rendering, and batch broadcast actions in a single file.
  - `components/LockProgrammerStation.tsx` (~1,249 lines): Combines BLE discovery, serial port management, iOS OTA bridge detection, keycard sector encoding, 123-room matrix rendering, and Onity hardware wiring documentation.
  This exceeds the software architecture budget (<200 lines per file, <80 lines per React component), elevates cognitive load, increases risk of merge conflicts, and makes isolated component unit testing difficult.
- **Constraints**:
  - Live 24/7 hotel operations: Housekeeping staff and supervisors rely on the dashboard continuously throughout daily turnovers.
  - Zero behavioral regressions: Visual styling, keyboard shortcuts, animations, audio chimes, and offline optimistic updates must remain exactly as configured.
  - Next.js 16 (Turbopack) and TypeScript strict mode compliance.

## Options Considered

| Option | Pros | Cons | Complexity |
|---|---|---|---|
| **Option A: Status Quo (Retain Monolithic Files)** | Zero refactoring effort; avoids risk of introducing new bugs during refactoring. | Violates Single Responsibility Principle; monolithic files become increasingly difficult to maintain and test. | Low |
| **Option B: One-Shot Big-Bang Decomposition** | Immediately achieves full modular compliance across all files. | Extremely high risk of runtime regressions in live hotel shifts; massive git diff blocking ongoing operational fixes. | High |
| **Option C: Phased Domain-Driven Component Decomposition with Custom Hooks (Selected)** | Safely isolates state and hardware logic into custom hooks; extracts presentation into modular sub-components (<150 LOC) with top-level container facades maintaining 100% backward compatibility. | Requires staged multi-phase refactoring plan. | Medium |

## Decision
We adopt **Option C: Phased Domain-Driven Component Decomposition with Custom Hooks**.

1. **Architectural Budgets & Rules**:
   - **File Budget**: Maximum 200 lines per source file.
   - **Component Budget**: Maximum 80 lines of JSX rendering per component function.
   - **Hook Extraction**: Any component containing >3 `useEffect` hooks or >4 `useState` instances must extract state orchestration into a custom hook under `@/hooks/`.
   - **Early Return Pattern**: Guard clauses and loading/error states must return early rather than wrapping entire JSX bodies in nested ternary operators.

2. **Decomposition Map for `SupervisorDashboard.tsx`**:
   - `hooks/useSupervisorFilters.ts`: Search queries, floor filters, priority sorting, status filtering, and count aggregations.
   - `hooks/useSupervisorSync.ts`: Real-time interval polling, optimistic status mutations, conflict detection, and audio notifications.
   - `components/supervisor/SupervisorHeroMetrics.tsx`: Top summary statistics, turnover progress bar, and critical room badges.
   - `components/supervisor/SupervisorFilterToolbar.tsx`: Search bar, floor selector chips, and quick-action shortcuts (Lock Programmer, Refresh).
   - `components/supervisor/SupervisorRoomGrid.tsx`: Virtualized/responsive grid rendering 123 suite cards.
   - `components/supervisor/SupervisorRoomCard.tsx`: Individual suite card with status badges, housekeeper avatar, quick status popover, and drawer trigger.
   - `components/supervisor/modals/`: Isolated dialog components (`BroadcastModal.tsx`, `RoomHistoryModal.tsx`, `HousekeeperAssignModal.tsx`).

3. **Decomposition Map for `LockProgrammerStation.tsx`**:
   - `hooks/useLockTelemetry.ts`: Telemetry polling, battery health categorization, and lock clock drift calculation.
   - `hooks/useLockHardware.ts`: State machine orchestrating Web Bluetooth, Web Serial, and Mobile OTA Cloud Sync adapters.
   - `components/lock-programmer/LockHeroBanner.tsx`: Device connection status, signal strength, and low-battery warnings.
   - `components/lock-programmer/LockSuiteGrid.tsx`: 123-suite matrix with interactive selection and status chips.
   - `components/lock-programmer/LockActionConsole.tsx`: Clock sync button, keycard encoder form, and live diagnostic terminal log.
   - `components/lock-programmer/OnityHardwareReference.tsx`: Hardware pinout tables, PP3 cable wiring diagrams, and switch configurations.

4. **Preservation of Public Interface**:
   - The top-level files `components/SupervisorDashboard.tsx` and `components/LockProgrammerStation.tsx` remain as clean orchestrator containers re-exporting sub-components to ensure zero breaking changes across existing pages and tests.

## Rationale
- Decoupling state management (`hooks/`) from presentation (`components/`) allows state machines (e.g., room filter predicates and lock hardware state machines) to be tested in isolated unit tests without rendering DOM nodes.
- Small, focused components improve React reconciliation efficiency and reduce unnecessary re-renders across the 123-suite grid when only a single room changes state.

## Consequences
- **Positive**:
  - Dramatically improves code readability and maintainability.
  - Eliminates merge conflict bottlenecks between dashboard features and hardware features.
  - Sub-components can be individually visually tested in storybook or component previews.
- **Negative**:
  - Increases number of files in the repository.
- **Mitigation**:
  - Group related sub-components inside feature directories (`components/supervisor/` and `components/lock-programmer/`) with clean barrel exports.

## Revisit Trigger
- When all components reach compliance with the <200 LOC budget, or if migrating to React Server Components (RSC) streaming architecture for the suite grid.
