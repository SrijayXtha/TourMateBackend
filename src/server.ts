import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import { prisma } from "./prisma";

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

console.log("📝 Environment Configuration:");
console.log("  PORT:", process.env.PORT || 4000);
console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "✅ Configured" : "❌ Not configured");

// ROUTES
app.use("/auth", authRoutes);

// DEFAULT ROUTE
app.get("/", (req, res) => {
  res.send("🚀 TourMate Backend Running...");
});

// HEALTH CHECK ROUTE
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "✅ Healthy", database: "✅ Connected" });
  } catch (error) {
    res.status(500).json({ status: "❌ Unhealthy", database: "❌ Disconnected", error: (error as Error).message });
  }
});

// START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
