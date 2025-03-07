import { hrwHash } from "hrw-hash" ;
import Redis, { RedisKey, RedisOptions } from "ioredis";

const ringShard: Record<string, Redis> = {};
const ringNameList: string[] = [];

/**
 * Initialize connection for each shard inside redis ring.
 * Array should be empty, to make sure all the connection is running properly.
 */
export function connectToRing(options: RedisOptions): string[] {
  const connectionListEnv = process.env.REDIS_RING_DSN || "";
  const connectionList = connectionListEnv.split(";");
  const errors: string[] = [];

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
      errors[index] = (e as Error)?.message || "";
    }
  });

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
  const shardName = hrwHash(stringKey, ringNameList)[0];
  const conn = ringShard[shardName];
  return conn;
}

/**
 * Get redis value using ring.
 */
export async function ringGet(key: RedisKey): Promise<string | null> {
  const conn = getConnection(key);
  const result = await conn.get(key);
  return result;
}

/**
 * Set value using ring.
 */
export async function ringSet(key: RedisKey, value: string | number | Buffer): Promise<boolean> {
  try {
    const conn = getConnection(key);
    await conn.set(key, value);
    return true;
  } catch {
    return false;
  }
}
