/**
 * LodgeX MCP Worker — Room Inventory Intelligence (Wave 1).
 *
 * Read-only tools for SL-02 + SL-03. Assign / hold / release / check-in are
 * refused. create_proposal writes an AiProposal only — never occupancy.
 *
 * Env:
 *   LODGEX_API_BASE   LodgeX origin, e.g. https://app.example.com (no trailing slash)
 *   LODGEX_MCP_TOKEN  Bearer token matching Laravel LODGEX_MCP_TOKEN
 *
 * Do not hard-code a staging host.
 */

export interface Env {
  LODGEX_API_BASE?: string;
  LODGEX_MCP_TOKEN?: string;
}

const WRITE_TOOLS = new Set([
  "assign",
  "assign_room",
  "hold",
  "hold_room",
  "release",
  "release_hold",
  "release_room",
  "check_in",
  "check_in_guest",
  "write_occupancy",
]);

const TOOLS = [
  {
    name: "ping",
    description: "Health check. Returns pong and an ISO timestamp.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "whoami",
    description: "Returns the server identity and bound LodgeX capabilities.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_rooms",
    description: "List live Room Inventory rooms (rooms_old) with Vacant Clean availability flags. Read-only.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max rows (default 200)" } },
    },
  },
  {
    name: "get_occupancy",
    description: "Occupancy summary plus reservations. Read-only. Does not write occupancy.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "list_reservations",
    description: "List reservations and whether each occupies inventory. Read-only.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "list_availability",
    description:
      "List rooms that pass the Vacant Clean rule: Vacant Clean and not held, blocked, assigned, restricted, or on maintenance.",
    inputSchema: {
      type: "object",
      properties: {
        reservation_id: { type: "number", description: "Optional reservation to exclude from overlap" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_proposal",
    description:
      "Create a shadow AiProposal for an unassigned reservation. Does not assign, hold, release, or check in.",
    inputSchema: {
      type: "object",
      properties: { reservation_id: { type: "number" } },
      required: ["reservation_id"],
    },
  },
  {
    name: "assign",
    description: "REFUSED. AI cannot assign rooms.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "hold",
    description: "REFUSED. AI cannot hold rooms.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "release",
    description: "REFUSED. AI cannot release rooms.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "check_in",
    description: "REFUSED. AI cannot check in a guest.",
    inputSchema: { type: "object", properties: {} },
  },
];

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function textResult(text: string, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

function refuseWrite(name: string) {
  return textResult(
    JSON.stringify({
      ok: false,
      error:
        "Room Inventory Intelligence is proposal-only. AI cannot assign, hold, release, check in, or write occupancy.",
      tool: name,
    }),
    true,
  );
}

async function lodgeXFetch(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const base = (env.LODGEX_API_BASE || "").replace(/\/$/, "");
  const token = env.LODGEX_MCP_TOKEN || "";
  if (!base) {
    throw new Error("LODGEX_API_BASE is not configured. Set it on the Worker; do not hard-code a host.");
  }
  if (!token) {
    throw new Error("LODGEX_MCP_TOKEN is not configured.");
  }

  const response = await fetch(`${base}/api/ai/room-inventory${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body === "object" && body && "error" in body
      ? String((body as { error: string }).error)
      : `LodgeX API ${response.status}`);
  }
  return body;
}

async function callTool(name: string, args: Record<string, unknown>, env: Env) {
  if (WRITE_TOOLS.has(name)) {
    return refuseWrite(name);
  }

  switch (name) {
    case "ping":
      return textResult(JSON.stringify({ pong: true, ts: new Date().toISOString() }));
    case "whoami":
      return textResult(
        JSON.stringify({
          server: "lodgex-mcp",
          agent: "room_inventory_intelligence",
          capabilities: ["SL-02", "SL-03"],
          class: "P",
          mode: "shadow",
        }),
      );
    case "list_rooms": {
      const limit = Number(args.limit ?? 200);
      const data = await lodgeXFetch(env, `/rooms?limit=${encodeURIComponent(String(limit))}`);
      return textResult(JSON.stringify(data));
    }
    case "get_occupancy": {
      const limit = Number(args.limit ?? 200);
      const data = await lodgeXFetch(env, `/occupancy?limit=${encodeURIComponent(String(limit))}`);
      return textResult(JSON.stringify(data));
    }
    case "list_reservations": {
      const limit = Number(args.limit ?? 200);
      const data = await lodgeXFetch(env, `/reservations?limit=${encodeURIComponent(String(limit))}`);
      return textResult(JSON.stringify(data));
    }
    case "list_availability": {
      const params = new URLSearchParams();
      if (args.reservation_id != null) params.set("reservation_id", String(args.reservation_id));
      if (args.limit != null) params.set("limit", String(args.limit));
      const qs = params.toString();
      const data = await lodgeXFetch(env, `/availability${qs ? `?${qs}` : ""}`);
      return textResult(JSON.stringify(data));
    }
    case "create_proposal": {
      const reservationId = args.reservation_id;
      if (reservationId == null) {
        return textResult("reservation_id is required", true);
      }
      const data = await lodgeXFetch(env, "/proposals", {
        method: "POST",
        body: JSON.stringify({ reservation_id: reservationId }),
      });
      return textResult(JSON.stringify(data));
    }
    default:
      return textResult(`Unknown tool: ${name}`, true);
  }
}

async function handleJsonRpc(message: Record<string, unknown>, env: Env) {
  const id = message.id ?? null;
  const method = String(message.method || "");
  const params = (message.params && typeof message.params === "object"
    ? message.params
    : {}) as Record<string, unknown>;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "lodgex-mcp", version: "1.0.0" },
    });
  }

  if (method === "notifications/initialized" || method.startsWith("notifications/")) {
    return null;
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const name = String(params.name || "");
    const args = (params.arguments && typeof params.arguments === "object"
      ? params.arguments
      : {}) as Record<string, unknown>;
    try {
      const result = await callTool(name, args, env);
      return jsonRpcResult(id, result);
    } catch (error) {
      return jsonRpcResult(id, textResult(error instanceof Error ? error.message : String(error), true));
    }
  }

  if (method === "ping") {
    return jsonRpcResult(id, {});
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return Response.json({
        ok: true,
        worker: "lodgex-mcp",
        agent: "room_inventory_intelligence",
        capabilities: ["SL-02", "SL-03"],
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json(jsonRpcError(null, -32700, "Parse error"), { status: 400 });
    }

    const messages = Array.isArray(payload) ? payload : [payload];
    const results = [];
    for (const message of messages) {
      if (!message || typeof message !== "object") {
        continue;
      }
      const result = await handleJsonRpc(message as Record<string, unknown>, env);
      if (result !== null) {
        results.push(result);
      }
    }

    if (Array.isArray(payload)) {
      return Response.json(results);
    }
    return Response.json(results[0] ?? jsonRpcError(null, -32600, "Invalid request"));
  },
};
