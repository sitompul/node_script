import Redis, { RedisKey, RedisOptions } from "ioredis";
import { Xxh64 } from "@node-rs/xxhash";
import { Rendezvous } from "./Rendezvous";

// Mimic xxh64 hash on golang.
export function sum64String(input: string): bigint {
  const xxh64 = new Xxh64();
  xxh64.update(input);
  const result = xxh64.digest();
  xxh64.reset();
  return result;
}

// Rendezvous Hashing (HRW) function
export function rendezvousHash(key: string, nodes: string[]): string {
  if (nodes.length === 0) return "";

  let bestNode: string = "";
  let highestScore: bigint = 0n; // Initialize to a very small BigInt

  for (const node of nodes) {
    const score = sum64String(key + String(node)); // Hash (key + node)
    if (score > highestScore) {
      highestScore = score;
      bestNode = node;
    }
  }

  return bestNode;
}

const ringShard: Record<string, Redis> = {};
let r: Rendezvous;

/**
 * Initialize connection for each shard inside redis ring.
 * Array values should be all empty string (""), to make sure all the connection is running properly.
 * "connectionListEnv" is connection string list separated by ";"
 */
export function connectToRing(
  connectionListEnv: string,
  options: RedisOptions,
): string[] {
  const connectionList = connectionListEnv.split(";");
  const errors: string[] = [];
  const ringNameList: string[] = [];

  connectionList.forEach(async (conn, index) => {
    const c = new Redis(conn, options);
    try {
      const shardName = `shard${index + 1}`; // https://redis.uptrace.dev/guide/ring.html#quickstart "shard{index}" is coming from original redis golang ring tutorial.
      ringShard[shardName] = c;
      ringNameList[index] = shardName

      const res = await c.ping();
      if (res === "PONG") {
        errors[index] = "";
      } else {
        errors[index] = "failed to ping redis connection";
      }
    } catch (e) {
      errors[index] = (e as Error)?.message || "failed to connect to redis ring";
    }
  });

  r = new Rendezvous(ringNameList, sum64String);

  return errors;
}

/**
 * Main algorithm for shard promoting.
 */
function getConnection(key: RedisKey): Redis {
  let stringKey = "";
  if (typeof key === "string") {
    // Key is regular string.
    stringKey = key;
  } else {
    // Key is buffer.
    stringKey = key.toString("utf-8");
  }
  const shardName = r.lookup(stringKey);
  const conn = ringShard[shardName];
  return conn;
}

/**
 * Get redis value using ring. If timeoutMs present will do promise race and return null if timeout.
 */
export async function ringGet(
  key: RedisKey,
  timeoutMs?: number,
): Promise<string | null> {
  const conn = getConnection(key);
  const result = conn.get(key);
  
  if (timeoutMs == null) {
    return await result;
  } else {
    const timeout: Promise<null> = new Promise((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );
    const p: Promise<string | null> = Promise.race([
      result,
      timeout,
    ]);
    return await p;
  }
}

/**
 * Set value using ring. If timeoutMs present will do promise race and return "timeout" if timeout.
 */
export async function ringSet(
  key: RedisKey,
  value: string | number | Buffer,
  expSec: number,
  timeoutMs?: number,
): Promise<string> {
  try {
    const conn = getConnection(key);
    const result = conn.set(key, value, "EX", expSec);

    if (timeoutMs == null) {
      return await result;
    } else {
      const timeout: Promise<string> = new Promise((resolve) =>
        setTimeout(() => resolve("timeout"), timeoutMs)
      );
      const p: Promise<string> = Promise.race([
        result,
        timeout,
      ]);
      return await p;
    }
  } catch (e) {
    return (e as Error)?.message || "failed to set value via ring";
  }
}

/**
 * Flush all to all ring shards.
 */
export async function ringFlushAll(): Promise<Record<string, string>>{
  const errors: Record<string, string> = {}
  for (const shardName in ringShard) {
    const c = ringShard[shardName];
    try {
      await c.flushall();
      errors[shardName] = "";
    } catch (e) {
      errors[shardName] = (e as Error)?.message || "failed to flush via ring";
    }
  }
  return errors;
}

(async function(): Promise<void> {
})();

