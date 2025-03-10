import mysql, { FieldPacket, QueryResult } from "mysql2/promise";

function getRandomIntInclusive(min: number, max: number): number {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
}

/**
 * Check if sql script containing mutation syntax.
 */
export function isMutationQuery(query: string): boolean {
  return query.split(" ").some((element) => {
    const upperElement = element.toUpperCase();
    return upperElement === "INSERT" ||
      upperElement === "UPDATE" ||
      upperElement === "DELETE" ||
      upperElement === "MERGE" ||
      upperElement === "REPLACE" ||
      upperElement === "TRUNCATE" ||
      upperElement === "TRANSACTION" ||
      upperElement === "COMMIT";
  })
}

export type Connection = {
  write: mysql.Connection,
  read: mysql.Connection[],
};

let conn: Connection | null = null;

/**
 * Connect to database read list (replicas) and write database (master).
 */
export async function connectReplicas(): Promise<Connection> {
  if (conn) return conn;
  const write = await mysql.createConnection("");
  const readConnectionString = (process.env.DATABASE_REPLICAS_DSN || "").split(";");
  const read: mysql.Connection[] = [];
  readConnectionString.forEach(async (val, index) => {
    const c = await mysql.createConnection(val);
    read[index] = c;
  });

  conn = {
    write,
    read,
  }
  return conn;
}

export async function getConnection(sql: string): Promise<mysql.Connection> {
  if (!conn) {
    // If no connection connect to replica and generate connection.
    await connectReplicas();
    return await getConnection(sql);
  }
  if (isMutationQuery(sql)) {
    // If mutation query detected on sql code, use write.
    return conn.write;
  } else {
    // If read array is empty use write database to read.
    if (conn.read.length === 0) {
      return conn.write;
    } else {
      // Randomize between 0 to last index of read array.
      const readIndex = getRandomIntInclusive(0, conn.read.length - 1);
      return conn.read[readIndex];
    }
  }
}

// Query database using mysql2 driver.
export async function query<T extends QueryResult>(sql: string, values: any): Promise<[T, FieldPacket[]]> {
  const c = await getConnection(sql);
  const result =  await c.query<T>(sql, values);
  return result;
}

// Same with query but using prepare statement, faster for recurring task and complex sql query.
export async function execute<T extends QueryResult>(sql: string, values: any): Promise<[T, FieldPacket[]]> {
  const c = await getConnection(sql);
  const result =  await c.execute<T>(sql, values);
  return result;
}

export async function txBegin(): Promise<void> {
  const c = await getConnection("INSERT"); // Force connection to use Write database since it's transaction.
  await c.query("START TRANSACTION");
}

export async function txCommit(): Promise<void> {
  const c = await getConnection("INSERT"); // Force connection to use Write database since it's transaction.
  await c.query("COMMIT");
}

export async function txRollback(): Promise<void> {
  const c = await getConnection("INSERT"); // Force connection to use Write database since it's transaction.
  await c.query("ROLLBACK");
}
