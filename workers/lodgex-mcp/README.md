# lodgex-mcp Worker

Cloudflare Worker source for the live `lodgex-mcp` Worker. There is no separate GitHub repo; this tree is the source of record.

Wave 1 adds **read-only** MCP tools for Room Inventory Intelligence (locked modules **SL-02** Reservations & Occupancy and **SL-03** Front Desk). Class P (proposal / shadow) only.

Wave 2 adds **read-only stubs** for Housekeeping Workload (**SL-04**) and Labour Forecast (**SL-11**). Publish board / overtime / mark Ready are refused.

This PR does **not** deploy. Use wrangler when you are ready to update the existing Worker.

## Tools

| Tool | Behavior |
| --- | --- |
| `ping` | Health check |
| `whoami` | Worker identity + SL-02 / SL-03 |
| `list_rooms` | Live `rooms_old` inventory rows |
| `get_occupancy` | Occupancy summary + reservations |
| `list_reservations` | Reservation list |
| `list_availability` | Stay-night ledger, then Vacant Clean fitness. Vacant Clean is **not** availability. |
| `create_proposal` | Persist an `AiProposal` (not an assignment) |
| `get_housekeeping_workload` | SL-04 draft clean list (read-only / labelled draft) |
| `get_labour_forecast` | SL-11 staffing forecast (read-only / labelled draft) |
| `assign` / `hold` / `release` / `check_in` | **Refused** |
| `publish_hk_board` / `approve_overtime` / `mark_ready` | **Refused** |

## Env (Worker)

Set these on the Worker. Do **not** hard-code a staging host in source.

| Variable | Purpose |
| --- | --- |
| `LODGEX_API_BASE` | LodgeX origin, no trailing slash (example: `https://your-lodgex-host`) |
| `LODGEX_MCP_TOKEN` | Bearer token; must match Laravel `LODGEX_MCP_TOKEN` |

Laravel `.env`:

```
LODGEX_MCP_TOKEN=
```

The Worker calls `{LODGEX_API_BASE}/api/ai/room-inventory/*`.

## Deploy (manual)

Requires wrangler authenticated against the account that already owns `lodgex-mcp`.

```bash
cd workers/lodgex-mcp
npm install
npx wrangler secret put LODGEX_API_BASE
npx wrangler secret put LODGEX_MCP_TOKEN
npx wrangler deploy
```

`wrangler.toml` `name = "lodgex-mcp"` targets the existing Worker.

## Local

```bash
cd workers/lodgex-mcp
npx wrangler dev
```

Point `LODGEX_API_BASE` at a local LodgeX (`http://127.0.0.1:8000`) only in your own env — never commit it.
