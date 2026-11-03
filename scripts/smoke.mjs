#!/usr/bin/env node
// Smoke test: spawns the built server (node dist/index.js) over stdio against a
// local mock of the Driversnote GraphQL API. No network access, no real key.
// Usage: npm run build && npm run smoke
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_KEY = "test-key";

const failures = [];
function check(cond, msg) {
  if (cond) console.log(`  ok   ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    failures.push(msg);
  }
}

// ---- mock Driversnote API ----
const seen = [];
const mock = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "POST" || req.headers["x-api-key"] !== TEST_KEY) {
      res.writeHead(401);
      res.end(JSON.stringify({ fault: { faultstring: "Invalid ApiKey", detail: { errorcode: "oauth.v2.InvalidApiKey" } } }));
      return;
    }
    const { query, variables } = JSON.parse(body);
    seen.push({ query, variables });
    const pageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null };
    let data;
    if (/\bvehicles\(/.test(query)) {
      data = {
        vehicles: {
          totalCount: 1,
          pageInfo,
          nodes: [{ id: "veh-1", name: "Company Volvo", licensePlate: "ABC123", isArchived: false, isCurrentlySelected: true,
            country: { id: "SE", name: "Sweden" }, vehicleType: { id: "1", name: "Car" }, odometerUsage: { id: "km", name: "Kilometres" } }],
        },
      };
    } else if (/\btrips\(/.test(query)) {
      data = {
        trips: {
          totalCount: 1,
          pageInfo,
          nodes: [{ id: "trip-1", distance: 12400, startAt: "2026-10-01T08:00:00Z", stopAt: "2026-10-01T08:30:00Z", amount: 31.0,
            vehicle: { id: "veh-1", name: "Company Volvo", licensePlate: "ABC123" }, tripType: { id: "business", name: "business", label: "Business" } }],
        },
      };
    } else if (/\bcompanyInfo\b/.test(query)) {
      data = { companyInfo: { name: "Driversnote", infoEmail: "info@example.com", phoneNumber: null, phoneNumberRaw: null } };
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ errors: [{ message: "mock: operation not implemented" }] }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ data }));
  });
});
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const mockUrl = `http://127.0.0.1:${mock.address().port}/graphql`;
console.log(`mock Driversnote API on ${mockUrl}`);

async function withServer(extraEnv, fn) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(root, "dist/index.js")],
    env: { ...getDefaultEnvironment(), DRIVERSNOTE_API_URL: mockUrl, LOG_LEVEL: "warn", ...extraEnv },
    stderr: "inherit",
  });
  const client = new Client({ name: "driversnote-smoke", version: "0.0.0" });
  await client.connect(transport);
  try {
    await fn(client);
  } finally {
    await client.close();
  }
}

const textOf = (r) => r.content.map((c) => c.text ?? "").join("");

try {
  console.log("\n[1] default tiers (read only), API key = test-key");
  await withServer({ DRIVERSNOTE_API_KEY: TEST_KEY }, async (client) => {
    const { tools } = await client.listTools();
    console.log(`  tools listed: ${tools.length}`);
    check(tools.length === 37, "37 tools at default tiers");
    check(tools.every((t) => t.annotations?.readOnlyHint === true), "every listed tool is readOnlyHint");
    check(!tools.some((t) => /_(create|update|delete)$/.test(t.name)), "no create/update/delete tools listed");

    const vehicles = await client.callTool({ name: "driversnote_vehicles_list", arguments: {} });
    console.log(`  driversnote_vehicles_list -> ${textOf(vehicles)}`);
    check(!vehicles.isError && JSON.parse(textOf(vehicles)).nodes[0].id === "veh-1", "vehicles list returns canned vehicle");

    const trips = await client.callTool({ name: "driversnote_trips_list", arguments: { startDate: "2026-10-01", endDate: "2026-10-31" } });
    console.log(`  driversnote_trips_list -> ${textOf(trips)}`);
    check(!trips.isError && JSON.parse(textOf(trips)).nodes[0].id === "trip-1", "trips list returns canned trip");
    const tripCall = seen.find((s) => /\btrips\(/.test(s.query));
    check(tripCall?.variables.startDate === "2026-10-01" && tripCall?.variables.first === 100, "trips variables: startDate passed, first defaults to 100");

    const noDates = await client.callTool({ name: "driversnote_trips_list", arguments: {} });
    check(noDates.isError === true && /startDate/.test(textOf(noDates)), "trips list without dates -> isError naming startDate");

    const info = await client.callTool({ name: "driversnote_company_info", arguments: {} });
    console.log(`  driversnote_company_info -> ${textOf(info)}`);
    check(!info.isError && JSON.parse(textOf(info)).name === "Driversnote", "company info returns canned data");

    const gated = await client.callTool({ name: "driversnote_vehicle_delete", arguments: { id: "veh-1" } });
    console.log(`  driversnote_vehicle_delete (gated) -> ${textOf(gated)}`);
    check(gated.isError === true, "admin tool is gated at default tiers");
    check(!seen.some((s) => /vehicleDelete/.test(s.query)), "gated call never reached the API");
  });

  console.log("\n[2] DRIVERSNOTE_TOOL_TIERS=read,write,admin");
  await withServer({ DRIVERSNOTE_API_KEY: TEST_KEY, DRIVERSNOTE_TOOL_TIERS: "read,write,admin" }, async (client) => {
    const { tools } = await client.listTools();
    console.log(`  tools listed: ${tools.length}`);
    check(tools.length === 96, "96 tools with all tiers enabled");
    check(new Set(tools.map((t) => t.name)).size === 96, "tool names are unique");
    check(tools.filter((t) => t.annotations?.readOnlyHint).length === 37, "37 read-only tools");
  });

  console.log("\n[3] wrong API key -> clear auth error");
  await withServer({ DRIVERSNOTE_API_KEY: "wrong-key" }, async (client) => {
    const r = await client.callTool({ name: "driversnote_company_info", arguments: {} });
    console.log(`  driversnote_company_info -> ${textOf(r)}`);
    check(r.isError === true && /Invalid or missing Driversnote API key/.test(textOf(r)), "401 fault mapped to invalid/missing API key error");
    check(!textOf(r).includes("wrong-key"), "error text does not echo the key");
  });

  console.log("\n[4] DRIVERSNOTE_API_URL outside the allowlist -> server refuses to start");
  let refused = false;
  try {
    await withServer({ DRIVERSNOTE_API_KEY: TEST_KEY, DRIVERSNOTE_API_URL: "https://evil.example.com/graphql" }, async () => {});
  } catch {
    refused = true;
  }
  check(refused, "startup fails for https://evil.example.com");
} catch (e) {
  console.error("smoke test crashed:", e);
  failures.push("crash");
} finally {
  mock.close();
}

if (failures.length > 0) {
  console.error(`\nSMOKE FAILED (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nSMOKE PASSED");
