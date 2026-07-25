type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function isDistributedRateLimitEnabled() {
  return upstashConfig() !== null;
}

/** In-memory limiter — correct per instance only. Used as the fallback. */
function localRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(opts.key);

  if (!current || current.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }

  if (current.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  buckets.set(opts.key, current);
  return { ok: true };
}

/**
 * Fixed-window counter in Upstash Redis via the REST API (no SDK dependency).
 * INCR + EXPIRE are pipelined, so one round trip covers the whole check.
 */
async function upstashRateLimit(opts: RateLimitOptions): Promise<RateLimitResult | null> {
  const config = upstashConfig();
  if (!config) return null;

  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const redisKey = `packex:rl:${opts.key}`;

  try {
    const res = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec), "NX"],
        ["TTL", redisKey],
      ]),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const payload = (await res.json()) as { result: unknown; error?: string }[];
    const count = Number(payload[0]?.result ?? 0);
    const ttl = Number(payload[2]?.result ?? windowSec);

    if (!Number.isFinite(count) || count <= 0) return null;

    if (count > opts.limit) {
      return { ok: false, retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec) };
    }
    return { ok: true };
  } catch {
    // Redis being unreachable must never take the app down.
    return null;
  }
}

/**
 * Distributed when Upstash is configured, per-instance otherwise.
 * Prefer this in route handlers; `rateLimit` stays for synchronous call sites.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const distributed = await upstashRateLimit(opts);
  if (distributed) return distributed;
  return localRateLimit(opts);
}

/** Synchronous, in-memory only. */
export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  return localRateLimit(opts);
}

export function clientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/** Periodic cleanup so the local Map does not grow forever. */
export function pruneRateLimitBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Exposed for tests. */
export function __resetLocalBuckets() {
  buckets.clear();
}
