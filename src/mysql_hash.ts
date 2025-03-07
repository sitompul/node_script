import mysql, { RowDataPacket } from "mysql2/promise";

// First connection string.
const first = "";

// Second connection string.
const second = "";

type TableResult = RowDataPacket & {
  table_name: string,
}

export async function getAllTableNames(connString: string): Promise<string[]> {
  const c = await mysql.createConnection(connString);
  const url = new URL(connString);
  const databaseName = url.pathname.substring(1);
  const [rows] = await c.query<TableResult[]>(
    `SELECT table_name AS 'table_name' 
    FROM information_schema.tables 
    WHERE table_schema = ?;`,
    databaseName,
  );

  const result: string[] = [];
  rows.forEach(value => {
    result.push(value.table_name);
  });

  await c.end();
  return result;
}

type ChecksumResult = RowDataPacket & {
  Table: string,
  Checksum: number,
};

export async function generateCheckSum(connString: string): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  const tableList = await getAllTableNames(connString);
  const c = await mysql.createConnection(connString);

  tableList.forEach(async (val) => {
    const [rows] = await c.query<ChecksumResult[]>(
      `CHECKSUM TABLE ${val}`,
    );
    if (rows.length) {
      result[val] = rows[0].Checksum;
    }
  });

  await c.end();
  return result;
}

function arraysAreEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((value, index) => value === arr2[index]);
}

/**
 * Compare two database and check sum, returns empty array on first result if success.
 */
export async function compareDb(
  firstConn: string,
  secondConn: string,
): Promise<[string[], string]> {
  const tableFirst = await getAllTableNames(firstConn);
  const tableSecond = await getAllTableNames(secondConn);
  
  if (!arraysAreEqual(tableFirst, tableSecond)) {
    return [
      [""],
      "error: array are not equal"
    ];
  }

  const troubledTable: string[] = [];
  
  const firstChecksum = await generateCheckSum(firstConn);
  const secondChecksum = await generateCheckSum(secondConn);

  tableFirst.forEach(val => {
    const f = firstChecksum[val];
    const s = secondChecksum[val];
    if (f !== s) {
      troubledTable.push(val);
    }
  });

  return [ troubledTable, "" ];
}

async function main() {
  console.log(await compareDb(first, second));
}

main();
