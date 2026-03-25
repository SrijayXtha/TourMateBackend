import { Router } from "express";
import { register, login, googleLogin } from "../controllers/auth.controller";

const router = Router();

// POST /auth/register → calls register controller
router.post("/register", register);

// POST /auth/login → calls login controller
router.post("/login", login);

// POST /auth/google → calls Google login controller
router.post("/google", googleLogin);

export default router;
