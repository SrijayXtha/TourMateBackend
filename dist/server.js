"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const tourist_routes_1 = __importDefault(require("./routes/tourist.routes"));
const guide_routes_1 = __importDefault(require("./routes/guide.routes"));
const hotel_routes_1 = __importDefault(require("./routes/hotel.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const db_check_1 = require("./db-check");
// Note: Prisma client import is intentionally avoided here to allow a lightweight DB connectivity check
// without causing the server to crash if the generated Prisma client requires special adapter configuration.
const app = (0, express_1.default)();
// MIDDLEWARE
// Enable CORS with proper configuration
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
console.log("📝 Environment Configuration:");
console.log("  PORT:", process.env.PORT || 4000);
console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "✅ Configured" : "❌ Not configured");
console.log("  GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Configured" : "❌ Not configured");
// ROUTES
app.use("/auth", auth_routes_1.default);
app.use("/public", public_routes_1.default);
app.use("/tourist", tourist_routes_1.default);
app.use("/guide", guide_routes_1.default);
app.use("/hotel", hotel_routes_1.default);
app.use("/admin", admin_routes_1.default);
// DEFAULT ROUTE
app.get("/", (req, res) => {
    res.send("🚀 TourMate Backend Running...");
});
// HEALTH CHECK ROUTE (uses lightweight PG check to avoid crashing on Prisma import issues)
app.get("/health", async (req, res) => {
    const result = await (0, db_check_1.checkDatabaseConnection)();
    if (result.ok) {
        res.json({ status: "✅ Healthy", database: "✅ Connected" });
    }
    else {
        res.status(500).json({ status: "❌ Unhealthy", database: "❌ Disconnected", error: result.message });
    }
});
// START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
