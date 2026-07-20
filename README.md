# Vue in Motion

An interactive Vue 3 demo built around one shared task workspace. Add or complete a task once and watch Vue update derived insights, multiple component projections, REST activity, and the test story across the page.

## What the page demonstrates

- Reactive source state and computed totals, progress, and next-task insight.
- One `useTasks()` composable powering the workspace, progress view, and activity stream.
- Component composition without duplicating state.
- A visible request journey from UI intent through `HttpTaskRepository` and MSW.
- Behavioral tests that protect the same user workflow shown in the browser.

## Local setup with Bun

This project uses Bun as its package manager and script runner.

```sh
bun install
bun dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Useful commands

```sh
bun run test:unit --run  # one test run
bun run test:unit        # watch mode
bun run type-check       # Vue + TypeScript checks
bun run lint             # Oxlint + ESLint
bun run format           # Prettier
bun run build            # type-check and production build
```

## REST API and mock mode

The application always uses `HttpTaskRepository`, which calls the REST API with the browser's real `fetch` implementation. By default, Mock Service Worker (MSW) intercepts those requests and returns deterministic JSON responses without requiring a backend.

```sh
cp .env.example .env.local
```

```dotenv
VITE_API_MODE=mock
VITE_API_URL=/api/tasks
```

The mock API implements:

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/toggle`

When a backend is available, set `VITE_API_MODE=real` and point `VITE_API_URL` at its tasks endpoint. No Vue component changes are required.

Unit tests inject `FakeTaskRepository` for fast component tests. REST adapter integration tests use the same MSW handlers as development so request methods, payloads, responses, and failures are exercised. See [docs/architecture.md](docs/architecture.md) for the full decision.

## Penpot design workflow

The Penpot file separates design work into three ownership areas:

- **Explorations** for alternatives and UX review.
- **Approved** for accepted screens, tokens, and component masters.
- **Code snapshot** for generated boards representing the current Vue implementation.

Automation only replaces Code snapshot boards. After approving a design change, export the
versioned design contract before implementation:

```sh
bun run design:contract
bun run design:sync
```

See [design-system/README.md](design-system/README.md) and
[penpot-selfhost/README.md](penpot-selfhost/README.md) for the complete workflow.
