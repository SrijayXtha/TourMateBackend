import { Router } from "express";
import { register, login } from "../controllers/auth.controller";

const router = Router();

// POST /auth/register → calls register controller
router.post("/register", register);

// POST /auth/login → calls login controller
router.post("/login", login);

export default router;
