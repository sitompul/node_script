import mysql from "mysql2/promise";

const connString = "";

let conn: mysql.Connection | null = null;

export async function getConnection(): Promise<mysql.Connection> {
  if (!conn) {
    conn = await mysql.createConnection(connString);
  }
  return conn
}

export async function getAllTableNames(): Promise<string[]> {
  const result: string[] = [];

  return result;
}
