import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import touristRoutes from "./routes/tourist.routes";
import guideRoutes from "./routes/guide.routes";
import hotelRoutes from "./routes/hotel.routes";
import adminRoutes from "./routes/admin.routes";
import publicRoutes from "./routes/public.routes";
import { checkDatabaseConnection } from "./db-check";
// Note: Prisma client import is intentionally avoided here to allow a lightweight DB connectivity check
// without causing the server to crash if the generated Prisma client requires special adapter configuration.

const app = express();

// MIDDLEWARE
// Enable CORS with proper configuration
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

console.log("📝 Environment Configuration:");
console.log("  PORT:", process.env.PORT || 4000);
console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "✅ Configured" : "❌ Not configured");
console.log("  GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Configured" : "❌ Not configured");

// ROUTES
app.use("/auth", authRoutes);
app.use("/public", publicRoutes);
app.use("/tourist", touristRoutes);
app.use("/guide", guideRoutes);
app.use("/hotel", hotelRoutes);
app.use("/admin", adminRoutes);

// DEFAULT ROUTE
app.get("/", (req, res) => {
  res.send("🚀 TourMate Backend Running...");
});

// HEALTH CHECK ROUTE (uses lightweight PG check to avoid crashing on Prisma import issues)
app.get("/health", async (req, res) => {
  const result = await checkDatabaseConnection();
  if (result.ok) {
    res.json({ status: "✅ Healthy", database: "✅ Connected" });
  } else {
    res.status(500).json({ status: "❌ Unhealthy", database: "❌ Disconnected", error: result.message });
  }
});

// START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
