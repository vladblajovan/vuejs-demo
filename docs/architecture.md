# Architecture decision

## Decision

Use a small feature-oriented Vue application with a repository boundary:

```text
App / TaskBoard
       ↓ actions, ↑ reactive state
useTasks composable
       ↓ tasks, counts, progress, next task, activity, request trace
Task insights / Shared views / Data journey
       ↓ persistence operations
TaskRepository interface
       ↓
HttpTaskRepository
       ↓ fetch
REST /api/tasks
       ↓ development and integration tests
Mock Service Worker handlers
```

The runtime always uses `HttpTaskRepository`. This keeps the production code path honest: list, create, and toggle operations always pass through `fetch`, JSON serialization, HTTP methods, status handling, and API error handling.

`VITE_API_MODE=mock` starts Mock Service Worker before Vue mounts. MSW intercepts requests at the network layer and returns mock responses from `src/mocks/handlers.ts`. `VITE_API_MODE=real` skips the worker, so the same requests reach the configured backend.

## Why this fits the demo

- Vue components stay focused on rendering and interaction.
- `useTasks` owns the shared task state, filtering, loading, errors, computed insights, recent activity, and the latest request trace.
- Every scroll section receives projections of the same composable instance; no section owns a competing task collection.
- The repository owns REST request construction and response handling.
- MSW keeps development independent from backend availability while exercising the real client path.
- Component tests inject an in-memory fake; REST integration tests exercise the adapter through MSW.
- A real backend can replace MSW without changing components or the repository contract.

Router and Pinia are intentionally omitted. This is one page with one small state domain, so Vue's Composition API is sufficient. Add Vue Router when there are distinct navigable views; add Pinia when state must be shared across distant feature trees or requires richer devtools/history support.

## Transport options considered

| Transport | Use now? | Trade-off |
| --- | --- | --- |
| REST + MSW | Yes | Real fetch behavior without a backend; mock state resets when the worker restarts. |
| REST backend | Ready | Set `VITE_API_MODE=real` and configure the endpoint when a server exists. |
| Fake repository | Unit tests | Fast and observable for Vue behavior without testing HTTP concerns repeatedly. |
| GraphQL | No | Useful for richer graph-shaped data, but unnecessary for three task operations. |

## Replacing MSW with a backend

1. Implement the documented REST endpoints on the server.
2. Set `VITE_API_MODE=real`.
3. Set `VITE_API_URL` to the server's task endpoint.
4. Keep the MSW-backed integration suite as the deterministic client contract test.

No `TaskBoard` or `useTasks` rewrite should be required.
