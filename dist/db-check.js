"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = checkDatabaseConnection;
const pg_1 = require("pg");
async function checkDatabaseConnection() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        return { ok: false, message: "DATABASE_URL not configured" };
    }
    const client = new pg_1.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        await client.query("SELECT 1");
        await client.end();
        return { ok: true };
    }
    catch (err) {
        try {
            await client.end();
        }
        catch { }
        return { ok: false, message: err?.message || String(err) };
    }
}
