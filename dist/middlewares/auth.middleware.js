"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleGuard = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
/**
 * Verify JWT token and attach user to request
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ status: "error", message: "Unauthorized - missing token" });
    }
    const token = authHeader.substring(7);
    try {
        if (!JWT_SECRET) {
            return res.status(500).json({ status: "error", message: "Server configuration error" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ status: "error", message: "Invalid token" });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Check if user has required role
 */
const roleGuard = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: "error",
                message: `Forbidden - requires one of: ${allowedRoles.join(", ")}`,
            });
        }
        next();
    };
};
exports.roleGuard = roleGuard;
