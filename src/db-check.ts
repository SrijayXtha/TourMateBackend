import { Client } from "pg";

export async function checkDatabaseConnection(): Promise<{ ok: boolean; message?: string }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return { ok: false, message: "DATABASE_URL not configured" };
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return { ok: true };
  } catch (err: any) {
    try {
      await client.end();
    } catch {}
    return { ok: false, message: err?.message || String(err) };
  }
}
