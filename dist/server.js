"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// ROUTES
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const app = (0, express_1.default)();
// MIDDLEWARES
app.use((0, cors_1.default)());
app.use(express_1.default.json()); // For JSON body parsing
// API ROUTES
app.use("/auth", auth_routes_1.default);
// DEFAULT ROUTE (Optional)
app.get("/", (req, res) => {
    res.send("🚀 TourMate Backend Running...");
});
// START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
