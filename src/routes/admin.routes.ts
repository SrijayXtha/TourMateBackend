import { Router } from "express";
import { authMiddleware, roleGuard } from "../middlewares/auth.middleware";
import {
  getAdminDashboard,
  getUsers,
  getGuides,
  getHotels,
  getBookings,
  getPendingGuideVerifications,
  getPendingHotelVerifications,
  verifyGuide,
  rejectGuide,
  verifyHotel,
  rejectHotel,
  getIncidents,
  resolveIncident,
  getActivityLogs,
  deleteUser,
} from "../controllers/admin.controller";

const router = Router();

/**
 * All admin routes require authentication and admin role
 */

// Dashboard
router.get("/dashboard", authMiddleware, roleGuard(["admin"]), getAdminDashboard);

// Users management
router.get("/users", authMiddleware, roleGuard(["admin"]), getUsers);
router.delete("/users/:userId", authMiddleware, roleGuard(["admin"]), deleteUser);
router.get("/guides", authMiddleware, roleGuard(["admin"]), getGuides);
router.get("/hotels", authMiddleware, roleGuard(["admin"]), getHotels);
router.get("/bookings", authMiddleware, roleGuard(["admin"]), getBookings);

// Guide verification
router.get(
  "/guides/pending-verification",
  authMiddleware,
  roleGuard(["admin"]),
  getPendingGuideVerifications
);
router.patch("/guides/:guideId/verify", authMiddleware, roleGuard(["admin"]), verifyGuide);
router.patch("/guides/:guideId/reject", authMiddleware, roleGuard(["admin"]), rejectGuide);

// Hotel verification
router.get(
  "/hotels/pending-verification",
  authMiddleware,
  roleGuard(["admin"]),
  getPendingHotelVerifications
);
router.patch("/hotels/:hotelId/verify", authMiddleware, roleGuard(["admin"]), verifyHotel);
router.patch("/hotels/:hotelId/reject", authMiddleware, roleGuard(["admin"]), rejectHotel);

// Incident management
router.get("/incidents", authMiddleware, roleGuard(["admin"]), getIncidents);
router.patch("/incidents/:incidentId/resolve", authMiddleware, roleGuard(["admin"]), resolveIncident);

// Activity logs
router.get("/activities", authMiddleware, roleGuard(["admin"]), getActivityLogs);

export default router;
