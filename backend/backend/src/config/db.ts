import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DB_SERVER) {
  throw new Error("DB_SERVER is not set in .env");
}

const dbConfig: sql.config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  server: process.env.DB_SERVER!,   // IP address
  database: process.env.DB_NAME!,
  port: Number(process.env.DB_PORT),

  options: {
    encrypt: false,                 // IMPORTANT for local SQL
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    console.log("Connecting to SQL with config:", {
      server: dbConfig.server,
      database: dbConfig.database,
      user: dbConfig.user,
      port: dbConfig.port,
    });

    pool = await sql.connect(dbConfig);
    console.log("MS SQL Connected Successfully!");
  }
  return pool;
}

export async function testConnection() {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT 1 AS ok");
    console.log("Test Query Successful:", result.recordset);
  } catch (err) {
    console.error("Test Query Failed:", err);
  }
}

type DbParam = {
  name: string;
  type?: any;
  value: any;
};

export async function query(sqlText: string, params?: DbParam[]) {
  const pool = await getPool();
  const request = pool.request();

  if (params) {
    for (const p of params) {
      let sqlType = p.type;
      if (typeof sqlType === "string") {
        sqlType = (sql as any)[sqlType];
      }

      if (sqlType) {
        request.input(p.name, sqlType, p.value);
      } else {
        request.input(p.name, p.value);
      }
    }
  }

  return request.query(sqlText);
}

export default {
  getPool,
  testConnection,
  query,
};
