/**
 * PackEX Station Agent (minimal Node heartbeat worker)
 *
 * Usage:
 *   cd agents
 *   cp .env.example .env
 *   npm start
 *
 * Env:
 *   PACKEX_BASE_URL=https://your-app.vercel.app
 *   PACKEX_TENANT_SLUG=acme
 *   PACKEX_STATION_ID=...
 *   STATION_AGENT_KEY=...   (must match server env)
 *   AGENT_VERSION=0.2.0
 *   HEARTBEAT_INTERVAL_MS=30000
 */

import { cpus, freemem, totalmem } from "os";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { setTimeout as sleep } from "timers/promises";
import { fileURLToPath } from "url";

function loadDotEnv() {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const envPath = resolve(dir, ".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[agent] missing env ${name}`);
    process.exit(1);
  }
  return value;
}

function estimateCpuPercent() {
  const load = cpus().reduce((sum, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return sum + (1 - idle / total);
  }, 0);
  return Math.round((load / Math.max(1, cpus().length)) * 1000) / 10;
}

function estimateDiskFreeGb() {
  // Scaffold stand-in — replace with real disk free space in production Agent.
  const free = freemem() / 1024 ** 3;
  const total = totalmem() / 1024 ** 3;
  return Math.round(Math.max(free, total * 0.1) * 10) / 10;
}

async function sendHeartbeat(opts) {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/api/t/${opts.tenantSlug}/stations/${opts.stationId}/heartbeat`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-packex-agent-key": opts.agentKey,
    },
    body: JSON.stringify(opts.payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  const baseUrl = required("PACKEX_BASE_URL");
  const tenantSlug = required("PACKEX_TENANT_SLUG");
  const stationId = required("PACKEX_STATION_ID");
  const agentKey = required("STATION_AGENT_KEY");
  const version = process.env.AGENT_VERSION?.trim() || "0.2.0";
  const intervalMs = Math.max(
    5000,
    Number(process.env.HEARTBEAT_INTERVAL_MS || 30_000) || 30_000,
  );

  console.log(`[agent] PackEX Station Agent ${version}`);
  console.log(`[agent] tenant=${tenantSlug} station=${stationId}`);
  console.log(`[agent] heartbeat every ${intervalMs}ms → ${baseUrl}`);

  let queueSize = 0;
  let failures = 0;

  for (;;) {
    const started = Date.now();
    const payload = {
      version,
      cpuPercent: estimateCpuPercent(),
      diskFreeGb: estimateDiskFreeGb(),
      queueSize,
      timeDriftMs: 0,
      online: true,
    };

    try {
      const serverNow = Date.now();
      const data = await sendHeartbeat({
        baseUrl,
        tenantSlug,
        stationId,
        agentKey,
        payload: {
          ...payload,
          timeDriftMs: Math.abs(serverNow - started),
        },
      });
      failures = 0;
      console.log(
        `[agent] ok status=${data.stationStatus ?? "?"} cpu=${payload.cpuPercent}% disk~${payload.diskFreeGb}GB queue=${queueSize}`,
      );
      if (queueSize > 0) queueSize = Math.max(0, queueSize - 1);
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[agent] heartbeat failed (#${failures}): ${message}`);
      queueSize += 1;
    }

    await sleep(intervalMs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
