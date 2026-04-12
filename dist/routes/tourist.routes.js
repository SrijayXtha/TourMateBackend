"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const tourist_controller_1 = require("../controllers/tourist.controller");
const router = (0, express_1.Router)();
/**
 * All tourist routes require authentication and tourist role
 */
// Profile endpoints
router.get("/profile", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getTouristProfile);
router.patch("/profile", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.updateTouristProfile);
// Settings & preferences
router.get("/saved-places", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getSavedPlaces);
router.post("/saved-places", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.addSavedPlace);
router.delete("/saved-places/:placeId", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.removeSavedPlace);
router.get("/payment-methods", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getPaymentMethods);
router.post("/payment-methods", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.addPaymentMethod);
router.delete("/payment-methods/:methodId", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.removePaymentMethod);
router.patch("/privacy-settings", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.updatePrivacySettings);
// Notifications
router.get("/notifications", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getTouristNotifications);
router.patch("/notifications/read-all", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.markAllTouristNotificationsRead);
router.patch("/notifications/:notificationId/read", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.markTouristNotificationRead);
router.delete("/notifications/:notificationId", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.deleteTouristNotification);
// Messaging
router.get("/messages", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getTouristMessages);
router.post("/messages", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.sendTouristMessage);
// Dashboard
router.get("/dashboard", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getTouristDashboard);
// Bookings
router.get("/bookings", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getTouristBookings);
router.post("/bookings", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.createBooking);
// Reviews
router.get("/reviews", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.getTouristReviews);
router.post("/reviews", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.createReview);
// Emergencies
router.post("/sos", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.reportSOS);
router.post("/incidents", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["tourist"]), tourist_controller_1.reportIncident);
exports.default = router;
