# Self-hosted Penpot

This directory runs the official Penpot 2.16 containers with Docker Compose.
It is configured for a private instance on this computer.

## Start

From this directory:

```sh
docker compose up -d
docker compose ps
```

Open:

- Penpot: http://localhost:9001
- Development email inbox: http://localhost:1080

Create your first account from Penpot's registration screen. Email verification
is disabled in this local profile.

## Connect Penpot MCP to Codex

The Compose stack includes Penpot's official MCP service and enables the MCP
feature in the frontend. The MCP endpoint is proxied through Penpot itself; do
not publish ports 4401–4403 separately.

1. Log in to Penpot and create or open a design file.
2. Open **Your account → Integrations → MCP Server** and enable MCP.
3. Generate an MCP key and copy the server URL Penpot provides. For this local
   instance it will look like:

   ```text
   http://localhost:9001/mcp/stream?userToken=YOUR_MCP_KEY
   ```

4. Register that exact URL with Codex:

   ```sh
   codex mcp add penpot --url \
     "http://localhost:9001/mcp/stream?userToken=YOUR_MCP_KEY"
   ```

5. In the open design file, choose **File → MCP Server → Connect**. Keep that
   file open while the agent works. Penpot MCP targets the currently focused
   page in the active MCP tab.

Treat the MCP URL as a secret because it contains the non-recoverable user
token. Start with a read-only prompt such as “list the pages in this file”
before authorizing design changes.

## Sync the Vue website design

With the Vue in Motion Penpot file open and its MCP plugin connected, rebuild
the editable desktop website and companion design-system boards:

```sh
node sync-vue-design.mjs
```

Extract the reusable Penpot components after syncing:

```bash
node extract-vue-components.mjs
```

The component masters live on `Component library / Extracted`. The sync command
preserves that board so its library references remain stable.

Export any Penpot board for visual review:

```bash
node export-penpot-shape.mjs <shape-id> <output.png>
node export-penpot-shape.mjs "name:Component / Projection graph" <output.png>
```

The sync replaces the active page canvas, creates the complete 1728px desktop
story, adds the design-system specimen board, and updates the local colors,
typography styles, and core design tokens. It reads the authenticated Penpot
MCP URL from `~/.codex/config.toml`; no key is stored in this repository.

## Operate the stack

```sh
# Follow all logs
docker compose logs -f

# Stop containers while keeping data
docker compose down

# Start again
docker compose up -d

# Pull the pinned version and recreate containers
docker compose pull
docker compose up -d
```

PostgreSQL data and uploaded Penpot assets are stored in named Docker volumes.
`docker compose down` preserves them. Do not use `docker compose down -v` unless
you intentionally want to erase the instance.

## Create a user from the CLI

If registration is later disabled:

```sh
docker compose exec penpot-backend python3 manage.py create-profile
```

## Back up

Back up both named volumes:

- `penpot_penpot_postgres_v15`
- `penpot_penpot_assets`

The exact names can be confirmed with:

```sh
docker volume ls --filter label=com.docker.compose.project=penpot
```

For a real deployment, also test restoring those backups before relying on
them.

## Before exposing Penpot to the internet

The checked-in example is intentionally a localhost configuration. Before
making it reachable from another machine:

1. Put Penpot behind an HTTPS reverse proxy.
2. Set `PENPOT_PUBLIC_URI` to the final `https://` URL.
3. Replace `disable-secure-session-cookies` with
   `enable-secure-session-cookies`.
4. Replace `disable-email-verification` with
   `enable-email-verification`.
5. Configure a real SMTP provider instead of `penpot-mailcatch`.
6. Decide whether public registration should remain enabled. For a private
   team, add `disable-registration` and create profiles with the CLI.
7. Restrict ports 9001 and 1080 at the firewall; the mail catcher must never be
   publicly reachable.
8. Establish automated database and asset-volume backups.

Penpot's official Docker guide includes NGINX, Caddy, and Traefik examples:
https://help.penpot.app/technical-guide/getting-started/docker/

All supported flags and environment variables:
https://help.penpot.app/technical-guide/configuration/

## Updating

The version is deliberately pinned in `.env`. Read the Penpot release notes,
back up the database and assets, and update in small version increments:

```sh
# Edit PENPOT_VERSION in .env, then:
docker compose pull
docker compose up -d
docker compose ps
```

Avoid jumping across many Penpot releases in one upgrade.
