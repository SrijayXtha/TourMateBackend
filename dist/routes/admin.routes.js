"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
/**
 * All admin routes require authentication and admin role
 */
// Dashboard
router.get("/dashboard", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getAdminDashboard);
// Users management
router.get("/users", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getUsers);
router.delete("/users/:userId", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.deleteUser);
router.get("/guides", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getGuides);
router.get("/hotels", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getHotels);
router.get("/bookings", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getBookings);
// Guide verification
router.get("/guides/pending-verification", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getPendingGuideVerifications);
router.patch("/guides/:guideId/verify", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.verifyGuide);
router.patch("/guides/:guideId/reject", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.rejectGuide);
// Hotel verification
router.get("/hotels/pending-verification", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getPendingHotelVerifications);
router.patch("/hotels/:hotelId/verify", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.verifyHotel);
router.patch("/hotels/:hotelId/reject", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.rejectHotel);
// Incident management
router.get("/incidents", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getIncidents);
router.patch("/incidents/:incidentId/resolve", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.resolveIncident);
// Activity logs
router.get("/activities", auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleGuard)(["admin"]), admin_controller_1.getActivityLogs);
exports.default = router;
