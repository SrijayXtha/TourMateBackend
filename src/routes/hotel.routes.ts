import { Router } from "express";
import { authMiddleware, roleGuard } from "../middlewares/auth.middleware";
import {
  getHotelProfile,
  getHotelDashboard,
  getHotelBookings,
  acceptHotelBooking,
  rejectHotelBooking,
  handleCancellationRequest,
  updateHotelProfile,
  getHotelReviews,
  getHotelAnalytics,
  updateHotelBookingStatus,
  getHotelNotifications,
  markHotelNotificationRead,
  deleteHotelNotification,
} from "../controllers/hotel.controller";

const router = Router();

/**
 * All hotel routes require authentication and hotel role
 */

// Profile endpoints
router.get("/profile", authMiddleware, roleGuard(["hotel"]), getHotelProfile);
router.patch("/profile", authMiddleware, roleGuard(["hotel"]), updateHotelProfile);

// Dashboard
router.get("/dashboard", authMiddleware, roleGuard(["hotel"]), getHotelDashboard);
router.get("/analytics", authMiddleware, roleGuard(["hotel"]), getHotelAnalytics);

// Bookings
router.get("/bookings", authMiddleware, roleGuard(["hotel"]), getHotelBookings);
router.patch("/bookings/:bookingId/accept", authMiddleware, roleGuard(["hotel"]), acceptHotelBooking);
router.patch("/bookings/:bookingId/reject", authMiddleware, roleGuard(["hotel"]), rejectHotelBooking);
router.patch("/bookings/:bookingId/status", authMiddleware, roleGuard(["hotel"]), updateHotelBookingStatus);
router.patch(
  "/bookings/:bookingId/cancel-request",
  authMiddleware,
  roleGuard(["hotel"]),
  handleCancellationRequest
);

// Reviews
router.get("/reviews", authMiddleware, roleGuard(["hotel"]), getHotelReviews);

// Notifications
router.get("/notifications", authMiddleware, roleGuard(["hotel"]), getHotelNotifications);
router.patch("/notifications/:notificationId/read", authMiddleware, roleGuard(["hotel"]), markHotelNotificationRead);
router.delete("/notifications/:notificationId", authMiddleware, roleGuard(["hotel"]), deleteHotelNotification);

export default router;
