"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const guide_controller_1 = require("../controllers/guide.controller");
const router = (0, express_1.Router)();
/**
 * All guide routes require authentication and guide role
 */
// Profile endpoints
router.get("/profile", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getGuideProfile);
router.patch("/profile", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.updateGuideProfile);
// Dashboard
router.get("/dashboard", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getGuideDashboard);
router.get("/analytics", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getGuideAnalytics);
router.get("/upcoming-tours", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getUpcomingTours);
// Bookings
router.get("/bookings", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getGuideBookings);
router.patch("/bookings/:bookingId/accept", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.acceptBooking);
router.patch("/bookings/:bookingId/reject", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.rejectBooking);
router.patch("/availability", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.updateGuideAvailability);
// Reviews
router.get("/reviews", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getGuideReviews);
// Notifications
router.get("/notifications", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getGuideNotifications);
router.patch("/notifications/:notificationId/read", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.markGuideNotificationRead);
router.delete("/notifications/:notificationId", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.deleteGuideNotification);
// Messaging
router.get("/messages", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.getGuideMessages);
router.post("/messages", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["guide"]), guide_controller_1.sendGuideMessage);
exports.default = router;
