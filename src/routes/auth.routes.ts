import { Router } from "express";
import {
  register,
  login,
  googleLogin,
  completeGoogleOnboarding,
  createGuideDestinationRequest,
} from "../controllers/auth.controller";
import { authMiddleware, roleGuard } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.patch("/google/onboarding", authMiddleware, roleGuard(["tourist"]), completeGoogleOnboarding);
router.post("/guide-destination-requests", createGuideDestinationRequest);

export default router;
