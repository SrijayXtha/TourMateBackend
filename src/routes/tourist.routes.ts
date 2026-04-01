import { Router } from "express";
import { authMiddleware, roleGuard } from "../middlewares/auth.middleware";
import {
  getTouristProfile,
  updateTouristProfile,
  getTouristDashboard,
  getTouristBookings,
  createBooking,
  getTouristReviews,
  createReview,
  reportSOS,
  reportIncident,
  getSavedPlaces,
  addSavedPlace,
  removeSavedPlace,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  updatePrivacySettings,
  getTouristNotifications,
  markTouristNotificationRead,
  markAllTouristNotificationsRead,
  deleteTouristNotification,
} from "../controllers/tourist.controller";

const router = Router();

/**
 * All tourist routes require authentication and tourist role
 */

// Profile endpoints
router.get("/profile", authMiddleware, roleGuard(["tourist"]), getTouristProfile);
router.patch("/profile", authMiddleware, roleGuard(["tourist"]), updateTouristProfile);

// Settings & preferences
router.get("/saved-places", authMiddleware, roleGuard(["tourist"]), getSavedPlaces);
router.post("/saved-places", authMiddleware, roleGuard(["tourist"]), addSavedPlace);
router.delete("/saved-places/:placeId", authMiddleware, roleGuard(["tourist"]), removeSavedPlace);

router.get("/payment-methods", authMiddleware, roleGuard(["tourist"]), getPaymentMethods);
router.post("/payment-methods", authMiddleware, roleGuard(["tourist"]), addPaymentMethod);
router.delete("/payment-methods/:methodId", authMiddleware, roleGuard(["tourist"]), removePaymentMethod);

router.patch("/privacy-settings", authMiddleware, roleGuard(["tourist"]), updatePrivacySettings);

// Notifications
router.get("/notifications", authMiddleware, roleGuard(["tourist"]), getTouristNotifications);
router.patch("/notifications/read-all", authMiddleware, roleGuard(["tourist"]), markAllTouristNotificationsRead);
router.patch("/notifications/:notificationId/read", authMiddleware, roleGuard(["tourist"]), markTouristNotificationRead);
router.delete("/notifications/:notificationId", authMiddleware, roleGuard(["tourist"]), deleteTouristNotification);

// Dashboard
router.get("/dashboard", authMiddleware, roleGuard(["tourist"]), getTouristDashboard);

// Bookings
router.get("/bookings", authMiddleware, roleGuard(["tourist"]), getTouristBookings);
router.post("/bookings", authMiddleware, roleGuard(["tourist"]), createBooking);

// Reviews
router.get("/reviews", authMiddleware, roleGuard(["tourist"]), getTouristReviews);
router.post("/reviews", authMiddleware, roleGuard(["tourist"]), createReview);

// Emergencies
router.post("/sos", authMiddleware, roleGuard(["tourist"]), reportSOS);
router.post("/incidents", authMiddleware, roleGuard(["tourist"]), reportIncident);

export default router;
