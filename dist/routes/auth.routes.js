"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
// POST /auth/register → calls register controller
router.post("/register", auth_controller_1.register);
// POST /auth/login → calls login controller
router.post("/login", auth_controller_1.login);
// POST /auth/google → calls Google login controller
router.post("/google", auth_controller_1.googleLogin);
exports.default = router;
