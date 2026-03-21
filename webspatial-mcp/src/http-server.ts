#!/usr/bin/env node

/**
 * HTTP + SSE transport variant of the WebSpatial ADB MCP server.
 *
 * This enables the browser/emulator → JS/MCP → model → local execution
 * feedback loop described in the architecture:
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │  Browser / WebSpatial Emulator                  │
 *   │  (React app with @webspatial/react-sdk)         │
 *   └───────────────┬─────────────────────────────────┘
 *                   │  HTTP/SSE
 *   ┌───────────────▼─────────────────────────────────┐
 *   │  This MCP Server (HTTP transport)               │
 *   │  - Receives tool calls via Streamable HTTP      │
 *   │  - Executes adb commands against the emulator   │
 *   │  - Returns screenshots, UI state, logs          │
 *   └───────────────┬─────────────────────────────────┘
 *                   │  child_process
 *   ┌───────────────▼─────────────────────────────────┐
 *   │  adb → PICO OS 6 Emulator                      │
 *   │  - input (tap, swipe, text, hover)              │
 *   │  - screencap, uiautomator dump                  │
 *   │  - logcat, shell                                │
 *   └─────────────────────────────────────────────────┘
 *
 * Start with: node build/http-server.js
 * Default port: 3100 (override with PORT env var)
 */

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import { inputTools } from "./tools/input.js";
import { inspectionTools } from "./tools/inspection.js";
import { webspatialTools } from "./tools/webspatial.js";
import { resources } from "./resources/index.js";
import { autoSelectDevice, setAdbPath, setDeviceSerial } from "./utils/adb.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

if (process.env.ADB_PATH) setAdbPath(process.env.ADB_PATH);
if (process.env.ANDROID_DEVICE_SERIAL) setDeviceSerial(process.env.ANDROID_DEVICE_SERIAL);

const PORT = parseInt(process.env.PORT ?? "3100", 10);

// ---------------------------------------------------------------------------
// Server factory — creates a fresh McpServer per SSE session
// ---------------------------------------------------------------------------

function createServer(): McpServer {
  const server = new McpServer(
    { name: "webspatial-adb", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  const allTools = [...inputTools, ...inspectionTools, ...webspatialTools];
  for (const tool of allTools) {
    server.tool(tool.name, tool.description, tool.schema.shape, tool.handler as any);
  }

  for (const res of resources) {
    server.resource(
      res.name,
      res.uri,
      { description: res.description, mimeType: res.mimeType },
      async (uri) => {
        const data = await res.handler();
        if (data.blob) {
          return { contents: [{ uri: uri.href, blob: data.blob, mimeType: data.mimeType }] };
        }
        return { contents: [{ uri: uri.href, text: data.text ?? "", mimeType: data.mimeType }] };
      },
    );
  }

  return server;
}

// ---------------------------------------------------------------------------
// Express app with SSE transport
// ---------------------------------------------------------------------------

const app = express();

// Store active transports
const transports = new Map<string, SSEServerTransport>();

// CORS for local dev
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

app.get("/sse", async (req, res) => {
  console.error(`[http] New SSE connection from ${req.ip}`);
  const transport = new SSEServerTransport("/messages", res);
  const server = createServer();

  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
    console.error(`[http] SSE connection closed: ${transport.sessionId}`);
  });

  await server.connect(transport);
});

app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await transport.handlePostMessage(req, res);
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "webspatial-adb", version: "0.1.0" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  try {
    const serial = await autoSelectDevice();
    console.error(`[webspatial-adb] Using device: ${serial}`);
  } catch {
    console.error("[webspatial-adb] Warning: No device found at startup.");
  }

  app.listen(PORT, () => {
    console.error(`[webspatial-adb] HTTP+SSE server listening on http://localhost:${PORT}`);
    console.error(`[webspatial-adb] SSE endpoint: http://localhost:${PORT}/sse`);
    console.error(`[webspatial-adb] Messages endpoint: http://localhost:${PORT}/messages`);
  });
}

main().catch((err) => {
  console.error("[webspatial-adb] Fatal:", err);
  process.exit(1);
});
