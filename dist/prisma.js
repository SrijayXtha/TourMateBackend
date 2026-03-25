"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const prisma_1 = require("../generated/prisma");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
// Initialize PrismaClient with adapter for Prisma 7
exports.prisma = global.prisma || new prisma_1.PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
    global.prisma = exports.prisma;
}
// Connect to database
exports.prisma.$connect()
    .then(() => console.log("✅ Prisma connected to database"))
    .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Prisma connection error:", message);
});
