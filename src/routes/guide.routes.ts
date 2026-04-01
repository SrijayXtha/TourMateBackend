import { Router } from "express";
import { authMiddleware, roleGuard } from "../middlewares/auth.middleware";
import {
  getGuideProfile,
  getGuideDashboard,
  getGuideBookings,
  acceptBooking,
  rejectBooking,
  updateGuideProfile,
  getGuideReviews,
  updateGuideAvailability,
  getUpcomingTours,
  getGuideAnalytics,
  getGuideNotifications,
  markGuideNotificationRead,
  deleteGuideNotification,
  getGuideMessages,
  sendGuideMessage,
} from "../controllers/guide.controller";

const router = Router();

/**
 * All guide routes require authentication and guide role
 */

// Profile endpoints
router.get("/profile", authMiddleware, roleGuard(["guide"]), getGuideProfile);
router.patch("/profile", authMiddleware, roleGuard(["guide"]), updateGuideProfile);

// Dashboard
router.get("/dashboard", authMiddleware, roleGuard(["guide"]), getGuideDashboard);
router.get("/analytics", authMiddleware, roleGuard(["guide"]), getGuideAnalytics);
router.get("/upcoming-tours", authMiddleware, roleGuard(["guide"]), getUpcomingTours);

// Bookings
router.get("/bookings", authMiddleware, roleGuard(["guide"]), getGuideBookings);
router.patch("/bookings/:bookingId/accept", authMiddleware, roleGuard(["guide"]), acceptBooking);
router.patch("/bookings/:bookingId/reject", authMiddleware, roleGuard(["guide"]), rejectBooking);
router.patch("/availability", authMiddleware, roleGuard(["guide"]), updateGuideAvailability);

// Reviews
router.get("/reviews", authMiddleware, roleGuard(["guide"]), getGuideReviews);

// Notifications
router.get("/notifications", authMiddleware, roleGuard(["guide"]), getGuideNotifications);
router.patch("/notifications/:notificationId/read", authMiddleware, roleGuard(["guide"]), markGuideNotificationRead);
router.delete("/notifications/:notificationId", authMiddleware, roleGuard(["guide"]), deleteGuideNotification);

// Messaging
router.get("/messages", authMiddleware, roleGuard(["guide"]), getGuideMessages);
router.post("/messages", authMiddleware, roleGuard(["guide"]), sendGuideMessage);

export default router;
