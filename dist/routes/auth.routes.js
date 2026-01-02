"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Replace with your actual Prisma client import
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
const router = (0, express_1.Router)();
// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
// =====================
// REGISTER ROUTE
// =====================
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Save user to DB (replace with Prisma code)
        // const user = await prisma.user.create({
        //   data: { username, email, password: hashedPassword },
        // });
        // Mock response for now
        const user = { id: 1, username, email };
        res.status(201).json({
            message: "User registered successfully",
            user,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// =====================
// LOGIN ROUTE
// =====================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }
        // Find user in DB (replace with Prisma code)
        // const user = await prisma.user.findUnique({ where: { email } });
        // Mock user for now
        const user = {
            id: 1,
            username: "demo",
            email,
            password: await bcryptjs_1.default.hash("demo123", 10), // demo password
        };
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Compare password
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
        res.json({
            message: "Login successful",
            token,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
