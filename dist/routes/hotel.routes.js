"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const hotel_controller_1 = require("../controllers/hotel.controller");
const router = (0, express_1.Router)();
/**
 * All hotel routes require authentication and hotel role
 */
// Profile endpoints
router.get("/profile", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.getHotelProfile);
router.patch("/profile", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.updateHotelProfile);
// Dashboard
router.get("/dashboard", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.getHotelDashboard);
router.get("/analytics", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.getHotelAnalytics);
// Bookings
router.get("/bookings", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.getHotelBookings);
router.patch("/bookings/:bookingId/accept", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.acceptHotelBooking);
router.patch("/bookings/:bookingId/reject", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.rejectHotelBooking);
router.patch("/bookings/:bookingId/status", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.updateHotelBookingStatus);
router.patch("/bookings/:bookingId/cancel-request", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.handleCancellationRequest);
// Reviews
router.get("/reviews", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.getHotelReviews);
// Notifications
router.get("/notifications", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.getHotelNotifications);
router.patch("/notifications/:notificationId/read", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.markHotelNotificationRead);
router.delete("/notifications/:notificationId", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["hotel"]), hotel_controller_1.deleteHotelNotification);
exports.default = router;
