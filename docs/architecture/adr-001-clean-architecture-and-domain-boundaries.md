# ADR-001: Clean Architecture and Bounded Context Decoupling

## Status
Accepted

## Context
- **Problem**: The ESA Housekeeping platform began as an operations dashboard and rapidly evolved to incorporate keyless digital locks, multi-lingual checklists, real-time sync, and hardware programming. As features expanded, domain entities (`RoomDoc`), infrastructure operations (Redis I/O, Web Bluetooth, Web NFC), and presentation state became tightly coupled.
- **Constraints**:
  - Small engineering team operating with high velocity.
  - Zero downtime requirement across 123 active hotel suites.
  - Must run seamlessly across Desktop browsers, iPads, and iPhones (Mobile Safari/PWA).
  - Next.js 16 (Turbopack) server/client component boundary constraints.

## Options Considered

| Option | Pros | Cons | Complexity |
|---|---|---|---|
| **Option A: Full Hexagonal / Ports & Adapters Overhaul** | Complete decoupling, 100% framework-agnostic domain layer. | High boilerplate, significant file churn, delays feature delivery. | High |
| **Option B: Pragmatic Clean Architecture with DDD Bounded Contexts (Selected)** | Clear separation between Domain, Application Services, Infrastructure, and UI; preserves Next.js performance and file-based routing. | Requires disciplined module boundaries and linting rules. | Medium |
| **Option C: Monolithic Feature Folders without Layer Boundaries** | Fastest short-term velocity. | Spaghetti dependencies, tight coupling, impossible to unit test without database mocking. | Low |

## Decision
We adopt **Option B: Pragmatic Clean Architecture with Domain-Driven Design (DDD) Bounded Contexts**.

1. **Domain Isolation**:
   - Entities (`RoomDoc`, `ChecklistItem`, `LockTelemetry`) reside in `@/lib/domain/` or `@/lib/models.ts` with zero dependencies on Next.js runtime, cookies, or database clients.
2. **Bounded Context Decoupling**:
   - Explicit bounded contexts for **Housekeeping**, **Lock Telemetry**, **Guest Access**, and **Shift Handover**.
   - Cross-context communication occurs exclusively via typed event records (`history`) and defined service interfaces.
3. **Early Return Pattern**:
   - All validation and guard checks in services and API endpoints must use the early return pattern to eliminate nested conditionals.

## Rationale
- Decoupling core business rules from Next.js server actions and storage engines ensures that domain logic (e.g., turnover checklists, welfare check rules for 3-day DND, battery threshold alerts) can be tested in sub-second vitest unit tests without database mocks.
- Eliminates circular dependencies that previously triggered Turbopack bundler warnings when client components imported server-only headers.

## Consequences
- **Positive**:
  - Independent unit testing of all business rules (57/57 tests passing in <1s).
  - Clear separation between frontend presentation and backend telemetry.
  - Safe addition of new lock vendors (dormakaba, ASSA ABLOY) without touching housekeeping code.
- **Negative**:
  - Requires translating domain models to view models in presentation layers.
  - Slight increase in total file count.
- **Mitigation**:
  - Use TypeScript strict mode and automated ESLint boundaries to prevent presentation code from importing infrastructure clients directly.

## Revisit Trigger
- If the property expands beyond 500 suites or incorporates multiple hotel properties under a unified multi-tenant PMS schema.
