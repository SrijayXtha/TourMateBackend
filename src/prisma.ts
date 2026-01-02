import { PrismaClient } from "../generated/prisma/client";

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

let prisma: InstanceType<typeof PrismaClient>;

if (!global.prisma) {
  console.log("🔧 Initializing Prisma Client...");
  console.log("📍 Database URL:", process.env.DATABASE_URL ? "✅ Configured" : "❌ Not configured");
  
  global.prisma = new PrismaClient({} as any);
  
  console.log("✅ Prisma Client initialized");
}
prisma = global.prisma;

// Test database connection on startup
setTimeout(() => {
  prisma.$connect()
    .then(() => {
      console.log("✅ Database connection successful!");
    })
    .catch((err) => {
      console.error("❌ Database connection failed:", err.message);
    });
}, 100);

export { prisma };






