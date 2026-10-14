# ADR-002: Repository Pattern and Dual-Mode Concurrency Store

## Status
Accepted

## Context
- **Problem**: The hotel operational state must support real-time concurrent updates from multiple attendants, guests tapping digital keys, and supervisors auditing rooms simultaneously. If two actors write to Suite 101 concurrently, state could be clobbered. Additionally, the development environment must work offline without requiring a live cloud Redis cluster.
- **Constraints**:
  - Production deployments on Vercel serverless environment (stateless execution).
  - Low-latency response times (<50ms) for door unlock authorizations.
  - Resilience against Redis timeouts and connection resets.

## Options Considered

| Option | Pros | Cons | Complexity |
|---|---|---|---|
| **Option A: Traditional Relational DB (PostgreSQL / Prisma)** | Strict ACID transactions, foreign keys. | Heavier infrastructure, higher latency on serverless cold starts, connection pool exhaustion. | Medium |
| **Option B: Distributed Key-Value Store with Mutex Lock (Selected)** | Ultra-fast (<15ms) reads/writes, supports Redis TCP, Upstash REST, and In-Memory fallback; per-suite concurrency locking. | Requires manual schema migrations and custom snapshot routines. | Medium |
| **Option C: Client-Side LocalStorage Only** | Zero backend infrastructure cost. | Impossible to coordinate live state across staff devices or unlock doors remotely. | Low |

## Decision
We adopt **Option B: Typed Repository Pattern with Multi-Transport Redis / Memory Engine and Suite Mutex Locking**.

1. **`IRoomRepository` Interface Contract**:
   Define an explicit repository contract decoupling consumers from storage transport:
   ```typescript
   export interface IRoomRepository {
     get(id: string): Promise<RoomDoc | null>;
     put(id: string, doc: RoomDoc): Promise<number>;
     getAll(): Promise<{ version: number; docs: SuiteDocs }>;
     remove(id: string): Promise<number>;
     withSuiteLock<T>(id: string, fn: () => Promise<T>): Promise<T>;
     snapshot(date: string): Promise<number>;
   }
   ```
2. **Multi-Transport Fallback**:
   - Primary (Cloud/Local Production): Redis TCP connection pool with 8,000ms socket timeout.
   - Secondary (Serverless Edge): Upstash REST HTTP API (`KV_REST_API_URL` & `KV_REST_API_TOKEN`).
   - Development/Test: Zero-dependency in-memory Map with atomic mutations.
3. **Pessimistic Concurrency (`withSuiteLock`)**:
   - All mutating operations (guest unlocks, maintenance reports, lock programming) execute inside `withSuiteLock(suite, fn)`.
   - Uses atomic set-if-not-exists (`SET NX EX 5`) distributed lock with auto-expiry to prevent deadlocks.

## Rationale
- Serverless workloads on Vercel benefit from stateless HTTP/REST Redis fallback when TCP sockets are constrained.
- Per-suite mutex locking guarantees that guest unlock commands and supervisor cleaning inspections on the same suite do not overwrite each other's timestamps or audit histories.

## Consequences
- **Positive**:
  - Zero lock contention between different rooms (Suite 101 and Suite 234 update in parallel).
  - Automatic fallback allows unit tests and local development to run with zero external services.
  - Automated disaster recovery snapshots before schema resets (`snapshotBeforeReset`).
- **Negative**:
  - Multi-key atomic transactions across the entire hotel are not supported natively without Redis Lua scripts.
- **Mitigation**:
  - Cross-room updates (e.g. batch clock synchronization) iterate per-suite with individual room locks.

## Revisit Trigger
- If property size exceeds 1,000 suites or multi-property distributed replication is required.
