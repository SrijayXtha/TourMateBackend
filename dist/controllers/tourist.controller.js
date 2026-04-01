"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTouristNotification = exports.markAllTouristNotificationsRead = exports.markTouristNotificationRead = exports.getTouristNotifications = exports.updatePrivacySettings = exports.removePaymentMethod = exports.addPaymentMethod = exports.getPaymentMethods = exports.removeSavedPlace = exports.addSavedPlace = exports.getSavedPlaces = exports.updateTouristProfile = exports.reportIncident = exports.reportSOS = exports.createReview = exports.getTouristReviews = exports.createBooking = exports.getTouristBookings = exports.getTouristDashboard = exports.getTouristProfile = void 0;
const prisma_1 = require("../prisma");
const response_1 = require("../utils/response");
const parseOptionalId = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const parsed = Number.parseInt(String(value), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};
const parseDateInput = (value) => {
    if (!value) {
        return null;
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const parsePriceInput = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (typeof value === "number") {
        return Number.isFinite(value) && value >= 0 ? value : NaN;
    }
    const normalized = String(value).replace(/[^0-9.]/g, "");
    if (!normalized) {
        return NaN;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
};
const safeJsonParse = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
};
const toJsonString = (value) => JSON.stringify(value);
const buildDefaultPrivacySettings = () => ({
    profileVisibility: "public",
    shareLocation: true,
    twoFactorEnabled: false,
});
const parsePagination = (pageValue, limitValue) => {
    const page = Math.max(1, Number.parseInt(String(pageValue || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue || "20"), 10) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
/**
 * GET /tourist/profile
 * Get tourist profile data
 */
const getTouristProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const user = await prisma_1.prisma.users.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                full_name: true,
                email: true,
                phone: true,
                role: true,
                created_at: true,
            },
        });
        if (!user) {
            return (0, response_1.sendError)(res, 404, "User not found");
        }
        const tourist = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: {
                emergency_contact: true,
                preferences: true,
                saved_places: true,
                payment_methods: true,
                privacy_settings: true,
            },
        });
        const preferences = safeJsonParse(tourist?.preferences, []);
        const savedPlaces = safeJsonParse(tourist?.saved_places, []);
        const paymentMethods = safeJsonParse(tourist?.payment_methods, []);
        const privacySettings = safeJsonParse(tourist?.privacy_settings, buildDefaultPrivacySettings());
        return (0, response_1.sendSuccess)(res, 200, "Profile retrieved", {
            ...user,
            emergencyContact: tourist?.emergency_contact,
            preferences,
            savedPlaces,
            paymentMethods,
            privacySettings,
        });
    }
    catch (error) {
        console.error("Error getting tourist profile:", error);
        return (0, response_1.sendError)(res, 500, process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to get profile");
    }
};
exports.getTouristProfile = getTouristProfile;
/**
 * GET /tourist/dashboard
 * Get tourist dashboard with stats and quick info
 */
const getTouristDashboard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        // Get user info
        const user = await prisma_1.prisma.users.findUnique({
            where: { user_id: userId },
            select: { full_name: true, email: true },
        });
        // Get active bookings
        const activeBookings = await prisma_1.prisma.booking.findMany({
            where: {
                tourist_id: userId,
                status: { in: ["confirmed", "ongoing"] },
            },
            select: {
                booking_id: true,
                start_date: true,
                end_date: true,
                status: true,
                total_price: true,
                guide: { select: { users: { select: { full_name: true } } } },
                hotel: { select: { hotel_name: true } },
            },
            take: 5,
        });
        // Count statistics
        const totalBookings = await prisma_1.prisma.booking.count({
            where: { tourist_id: userId },
        });
        const totalReviews = await prisma_1.prisma.review.count({
            where: { tourist_id: userId },
        });
        const savedPlaces = totalReviews; // Mock: using reviews count as saved places
        return (0, response_1.sendSuccess)(res, 200, "Dashboard data retrieved", {
            user,
            stats: {
                activeTrips: activeBookings.length,
                totalBookings,
                totalReviews,
                savedPlaces,
            },
            activeBookings: activeBookings.map((b) => ({
                id: b.booking_id,
                startDate: b.start_date,
                endDate: b.end_date,
                status: b.status,
                totalPrice: b.total_price,
                guideName: b.guide?.users?.full_name || "Guide",
                hotelName: b.hotel?.hotel_name || "Hotel",
            })),
        });
    }
    catch (error) {
        console.error("Error getting tourist dashboard:", error);
        return (0, response_1.sendError)(res, 500, process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to get dashboard");
    }
};
exports.getTouristDashboard = getTouristDashboard;
/**
 * GET /tourist/bookings
 * Get all tourist bookings
 */
const getTouristBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const bookings = await prisma_1.prisma.booking.findMany({
            where: { tourist_id: userId },
            include: {
                guide: { include: { users: { select: { full_name: true } } } },
                hotel: {
                    select: {
                        hotel_id: true,
                        hotel_name: true,
                        location: true,
                        rating: true,
                    },
                },
            },
            orderBy: { start_date: "desc" },
        });
        return (0, response_1.sendSuccess)(res, 200, "Bookings retrieved", {
            count: bookings.length,
            bookings: bookings.map((b) => ({
                id: b.booking_id,
                type: b.guide_id ? "guide" : "hotel",
                startDate: b.start_date,
                endDate: b.end_date,
                status: b.status,
                totalPrice: b.total_price,
                guide: b.guide
                    ? { name: b.guide.users.full_name, id: b.guide.guide_id }
                    : null,
                hotel: b.hotel
                    ? {
                        name: b.hotel.hotel_name,
                        id: b.hotel.hotel_id,
                        location: b.hotel.location,
                        rating: b.hotel.rating,
                    }
                    : null,
            })),
        });
    }
    catch (error) {
        console.error("Error getting bookings:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get bookings");
    }
};
exports.getTouristBookings = getTouristBookings;
/**
 * POST /tourist/bookings
 * Create a new booking
 */
const createBooking = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { guideId, hotelId, startDate, endDate, totalPrice } = req.body;
        const parsedGuideId = parseOptionalId(guideId);
        const parsedHotelId = parseOptionalId(hotelId);
        if (Number.isNaN(parsedGuideId) || Number.isNaN(parsedHotelId)) {
            return (0, response_1.sendError)(res, 400, "Guide ID and hotel ID must be valid positive integers");
        }
        if (!startDate || !endDate) {
            return (0, response_1.sendError)(res, 400, "Start date and end date are required");
        }
        if (!parsedGuideId && !parsedHotelId) {
            return (0, response_1.sendError)(res, 400, "Either guide or hotel is required");
        }
        if (parsedGuideId && parsedHotelId) {
            return (0, response_1.sendError)(res, 400, "Booking must target either a guide or a hotel, not both");
        }
        const parsedStartDate = parseDateInput(startDate);
        const parsedEndDate = parseDateInput(endDate);
        if (!parsedStartDate || !parsedEndDate) {
            return (0, response_1.sendError)(res, 400, "Invalid booking dates provided");
        }
        if (parsedEndDate <= parsedStartDate) {
            return (0, response_1.sendError)(res, 400, "End date must be after start date");
        }
        const parsedPrice = parsePriceInput(totalPrice);
        if (Number.isNaN(parsedPrice)) {
            return (0, response_1.sendError)(res, 400, "Total price must be a valid non-negative number");
        }
        if (parsedGuideId) {
            const guide = await prisma_1.prisma.guide.findUnique({
                where: { guide_id: parsedGuideId },
                select: { guide_id: true, verified_status: true },
            });
            if (!guide) {
                return (0, response_1.sendError)(res, 404, "Guide not found");
            }
            if (guide.verified_status === false) {
                return (0, response_1.sendError)(res, 400, "This guide is not yet verified for bookings");
            }
        }
        if (parsedHotelId) {
            const hotel = await prisma_1.prisma.hotel.findUnique({
                where: { hotel_id: parsedHotelId },
                select: { hotel_id: true },
            });
            if (!hotel) {
                return (0, response_1.sendError)(res, 404, "Hotel not found");
            }
        }
        const booking = await prisma_1.prisma.booking.create({
            data: {
                tourist_id: userId,
                guide_id: parsedGuideId,
                hotel_id: parsedHotelId,
                start_date: parsedStartDate,
                end_date: parsedEndDate,
                status: "pending",
                total_price: parsedPrice,
            },
        });
        const recipientUserId = booking.guide_id || booking.hotel_id;
        if (recipientUserId) {
            await prisma_1.prisma.notification.create({
                data: {
                    user_id: recipientUserId,
                    title: "New booking request",
                    message: `Booking request received for ${parsedStartDate.toDateString()} - ${parsedEndDate.toDateString()}.`,
                    type: "booking",
                    is_read: false,
                },
            });
        }
        await prisma_1.prisma.notification.create({
            data: {
                user_id: userId,
                title: "Booking submitted",
                message: "Your booking request has been submitted and is awaiting confirmation.",
                type: "booking",
                is_read: false,
            },
        });
        return (0, response_1.sendSuccess)(res, 201, "Booking created successfully", {
            bookingId: booking.booking_id,
            type: booking.guide_id ? "guide" : "hotel",
            status: booking.status,
        });
    }
    catch (error) {
        console.error("Error creating booking:", error);
        return (0, response_1.sendError)(res, 500, "Failed to create booking");
    }
};
exports.createBooking = createBooking;
/**
 * GET /tourist/reviews
 * Get tourist's reviews
 */
const getTouristReviews = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const reviews = await prisma_1.prisma.review.findMany({
            where: { tourist_id: userId },
            orderBy: { created_at: "desc" },
        });
        return (0, response_1.sendSuccess)(res, 200, "Reviews retrieved", {
            count: reviews.length,
            reviews,
        });
    }
    catch (error) {
        console.error("Error getting reviews:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get reviews");
    }
};
exports.getTouristReviews = getTouristReviews;
/**
 * POST /tourist/reviews
 * Create a review
 */
const createReview = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { guideId, hotelId, rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return (0, response_1.sendError)(res, 400, "Rating must be between 1 and 5");
        }
        if (!guideId && !hotelId) {
            return (0, response_1.sendError)(res, 400, "Either guide or hotel is required");
        }
        const review = await prisma_1.prisma.review.create({
            data: {
                tourist_id: userId,
                guide_id: guideId || null,
                hotel_id: hotelId || null,
                rating,
                comment: comment || null,
            },
        });
        return (0, response_1.sendSuccess)(res, 201, "Review created successfully", {
            reviewId: review.review_id,
        });
    }
    catch (error) {
        console.error("Error creating review:", error);
        return (0, response_1.sendError)(res, 500, "Failed to create review");
    }
};
exports.createReview = createReview;
/**
 * POST /tourist/sos
 * Report SOS emergency
 */
const reportSOS = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { location, description } = req.body;
        if (!location) {
            return (0, response_1.sendError)(res, 400, "Location is required");
        }
        const sosReport = await prisma_1.prisma.sos_report.create({
            data: {
                tourist_id: userId,
                location,
                description: description || null,
                status: "active",
            },
        });
        const admins = await prisma_1.prisma.users.findMany({
            where: { role: "admin" },
            select: { user_id: true },
        });
        if (admins.length > 0) {
            await prisma_1.prisma.notification.createMany({
                data: admins.map((admin) => ({
                    user_id: admin.user_id,
                    title: "SOS alert received",
                    message: `Tourist #${userId} triggered an SOS at ${location}.`,
                    type: "sos",
                    is_read: false,
                })),
            });
        }
        await prisma_1.prisma.notification.create({
            data: {
                user_id: userId,
                title: "SOS alert sent",
                message: "Your SOS alert was successfully sent to emergency responders.",
                type: "sos",
                is_read: false,
            },
        });
        return (0, response_1.sendSuccess)(res, 201, "SOS report created", {
            reportId: sosReport.report_id,
            status: sosReport.status,
        });
    }
    catch (error) {
        console.error("Error creating SOS report:", error);
        return (0, response_1.sendError)(res, 500, "Failed to create SOS report");
    }
};
exports.reportSOS = reportSOS;
/**
 * POST /tourist/incidents
 * Report an incident
 */
const reportIncident = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { bookingId, incidentType, details, location } = req.body;
        const parsedBookingId = parseOptionalId(bookingId);
        if (Number.isNaN(parsedBookingId)) {
            return (0, response_1.sendError)(res, 400, "Booking ID must be a valid positive integer");
        }
        if (!incidentType || !details) {
            return (0, response_1.sendError)(res, 400, "Incident type and details are required");
        }
        if (parsedBookingId) {
            const booking = await prisma_1.prisma.booking.findUnique({
                where: { booking_id: parsedBookingId },
                select: { booking_id: true, tourist_id: true },
            });
            if (!booking) {
                return (0, response_1.sendError)(res, 404, "Booking not found");
            }
            if (booking.tourist_id !== userId) {
                return (0, response_1.sendError)(res, 403, "You can only report incidents for your own bookings");
            }
        }
        const trimmedIncidentType = String(incidentType).trim();
        const trimmedDetails = String(details).trim();
        if (!trimmedIncidentType || !trimmedDetails) {
            return (0, response_1.sendError)(res, 400, "Incident type and details are required");
        }
        const incident = await prisma_1.prisma.incident_report.create({
            data: {
                tourist_id: userId,
                booking_id: parsedBookingId,
                incident_type: trimmedIncidentType,
                details: trimmedDetails,
                location: location ? String(location).trim() : null,
            },
        });
        const admins = await prisma_1.prisma.users.findMany({
            where: { role: "admin" },
            select: { user_id: true },
        });
        if (admins.length > 0) {
            await prisma_1.prisma.notification.createMany({
                data: admins.map((admin) => ({
                    user_id: admin.user_id,
                    title: "New incident report",
                    message: `Incident type: ${trimmedIncidentType}. Tourist ID: ${userId}.`,
                    type: "incident",
                    is_read: false,
                })),
            });
        }
        await prisma_1.prisma.notification.create({
            data: {
                user_id: userId,
                title: "Incident submitted",
                message: "Your incident report has been submitted for review.",
                type: "incident",
                is_read: false,
            },
        });
        return (0, response_1.sendSuccess)(res, 201, "Incident reported", {
            incidentId: incident.incident_id,
        });
    }
    catch (error) {
        console.error("Error reporting incident:", error);
        return (0, response_1.sendError)(res, 500, "Failed to report incident");
    }
};
exports.reportIncident = reportIncident;
/**
 * PATCH /tourist/profile
 * Update tourist profile settings
 */
const updateTouristProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { fullName, phone, emergencyContact, preferences, } = req.body;
        await prisma_1.prisma.users.update({
            where: { user_id: userId },
            data: {
                full_name: fullName?.trim() || undefined,
                phone: phone?.trim() || undefined,
            },
        });
        const updatedTourist = await prisma_1.prisma.tourist.update({
            where: { tourist_id: userId },
            data: {
                emergency_contact: emergencyContact?.trim() || undefined,
                preferences: Array.isArray(preferences) ? toJsonString(preferences) : undefined,
            },
            select: {
                emergency_contact: true,
                preferences: true,
            },
        });
        return (0, response_1.sendSuccess)(res, 200, "Tourist profile updated", {
            emergencyContact: updatedTourist.emergency_contact,
            preferences: safeJsonParse(updatedTourist.preferences, []),
        });
    }
    catch (error) {
        console.error("Error updating tourist profile:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update tourist profile");
    }
};
exports.updateTouristProfile = updateTouristProfile;
/**
 * GET /tourist/saved-places
 * Get tourist saved places
 */
const getSavedPlaces = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const tourist = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: { saved_places: true },
        });
        const savedPlaces = safeJsonParse(tourist?.saved_places, []);
        return (0, response_1.sendSuccess)(res, 200, "Saved places retrieved", {
            count: savedPlaces.length,
            places: savedPlaces,
        });
    }
    catch (error) {
        console.error("Error getting saved places:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get saved places");
    }
};
exports.getSavedPlaces = getSavedPlaces;
/**
 * POST /tourist/saved-places
 * Add a place to saved places
 */
const addSavedPlace = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { name, location, image, notes } = req.body;
        if (!name || !name.trim()) {
            return (0, response_1.sendError)(res, 400, "Place name is required");
        }
        const tourist = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: { saved_places: true },
        });
        const savedPlaces = safeJsonParse(tourist?.saved_places, []);
        const newPlace = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: name.trim(),
            location: location?.trim(),
            image: image?.trim(),
            notes: notes?.trim(),
            createdAt: new Date().toISOString(),
        };
        const updatedPlaces = [newPlace, ...savedPlaces];
        await prisma_1.prisma.tourist.update({
            where: { tourist_id: userId },
            data: {
                saved_places: toJsonString(updatedPlaces),
            },
        });
        return (0, response_1.sendSuccess)(res, 201, "Place saved", {
            place: newPlace,
            count: updatedPlaces.length,
        });
    }
    catch (error) {
        console.error("Error adding saved place:", error);
        return (0, response_1.sendError)(res, 500, "Failed to save place");
    }
};
exports.addSavedPlace = addSavedPlace;
/**
 * DELETE /tourist/saved-places/:placeId
 * Remove a saved place
 */
const removeSavedPlace = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { placeId } = req.params;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const tourist = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: { saved_places: true },
        });
        const savedPlaces = safeJsonParse(tourist?.saved_places, []);
        const updatedPlaces = savedPlaces.filter((place) => place.id !== placeId);
        await prisma_1.prisma.tourist.update({
            where: { tourist_id: userId },
            data: {
                saved_places: toJsonString(updatedPlaces),
            },
        });
        return (0, response_1.sendSuccess)(res, 200, "Saved place removed", {
            count: updatedPlaces.length,
        });
    }
    catch (error) {
        console.error("Error removing saved place:", error);
        return (0, response_1.sendError)(res, 500, "Failed to remove saved place");
    }
};
exports.removeSavedPlace = removeSavedPlace;
/**
 * GET /tourist/payment-methods
 * Get payment methods for tourist
 */
const getPaymentMethods = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const tourist = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: { payment_methods: true },
        });
        const methods = safeJsonParse(tourist?.payment_methods, []);
        return (0, response_1.sendSuccess)(res, 200, "Payment methods retrieved", {
            count: methods.length,
            methods,
        });
    }
    catch (error) {
        console.error("Error getting payment methods:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get payment methods");
    }
};
exports.getPaymentMethods = getPaymentMethods;
/**
 * POST /tourist/payment-methods
 * Add payment method
 */
const addPaymentMethod = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { label, brand, last4, expiryMonth, expiryYear, isDefault } = req.body;
        if (!label || !last4) {
            return (0, response_1.sendError)(res, 400, "Payment method label and last4 are required");
        }
        const tourist = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: { payment_methods: true },
        });
        const methods = safeJsonParse(tourist?.payment_methods, []);
        const newMethod = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            label: label.trim(),
            brand: brand?.trim(),
            last4: String(last4).slice(-4),
            expiryMonth: expiryMonth?.trim(),
            expiryYear: expiryYear?.trim(),
            isDefault: Boolean(isDefault),
            createdAt: new Date().toISOString(),
        };
        const updatedMethods = methods.map((method) => ({
            ...method,
            isDefault: newMethod.isDefault ? false : method.isDefault,
        }));
        updatedMethods.unshift(newMethod);
        await prisma_1.prisma.tourist.update({
            where: { tourist_id: userId },
            data: {
                payment_methods: toJsonString(updatedMethods),
            },
        });
        return (0, response_1.sendSuccess)(res, 201, "Payment method added", {
            method: newMethod,
            count: updatedMethods.length,
        });
    }
    catch (error) {
        console.error("Error adding payment method:", error);
        return (0, response_1.sendError)(res, 500, "Failed to add payment method");
    }
};
exports.addPaymentMethod = addPaymentMethod;
/**
 * DELETE /tourist/payment-methods/:methodId
 * Remove payment method
 */
const removePaymentMethod = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { methodId } = req.params;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const tourist = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: { payment_methods: true },
        });
        const methods = safeJsonParse(tourist?.payment_methods, []);
        const updatedMethods = methods.filter((method) => method.id !== methodId);
        if (updatedMethods.length > 0 && !updatedMethods.some((method) => method.isDefault)) {
            updatedMethods[0] = {
                ...updatedMethods[0],
                isDefault: true,
            };
        }
        await prisma_1.prisma.tourist.update({
            where: { tourist_id: userId },
            data: {
                payment_methods: toJsonString(updatedMethods),
            },
        });
        return (0, response_1.sendSuccess)(res, 200, "Payment method removed", {
            count: updatedMethods.length,
        });
    }
    catch (error) {
        console.error("Error removing payment method:", error);
        return (0, response_1.sendError)(res, 500, "Failed to remove payment method");
    }
};
exports.removePaymentMethod = removePaymentMethod;
/**
 * PATCH /tourist/privacy-settings
 * Update privacy and security preferences
 */
const updatePrivacySettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const current = await prisma_1.prisma.tourist.findUnique({
            where: { tourist_id: userId },
            select: { privacy_settings: true },
        });
        const existing = safeJsonParse(current?.privacy_settings, buildDefaultPrivacySettings());
        const updates = req.body;
        const merged = {
            profileVisibility: updates.profileVisibility === "private" ? "private" : updates.profileVisibility === "public" ? "public" : existing.profileVisibility,
            shareLocation: typeof updates.shareLocation === "boolean" ? updates.shareLocation : existing.shareLocation,
            twoFactorEnabled: typeof updates.twoFactorEnabled === "boolean"
                ? updates.twoFactorEnabled
                : existing.twoFactorEnabled,
        };
        await prisma_1.prisma.tourist.update({
            where: { tourist_id: userId },
            data: {
                privacy_settings: toJsonString(merged),
            },
        });
        return (0, response_1.sendSuccess)(res, 200, "Privacy settings updated", {
            privacySettings: merged,
        });
    }
    catch (error) {
        console.error("Error updating privacy settings:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update privacy settings");
    }
};
exports.updatePrivacySettings = updatePrivacySettings;
/**
 * GET /tourist/notifications
 * Get tourist notifications
 */
const getTouristNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
        const [notifications, total] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.notification.count({ where: { user_id: userId } }),
        ]);
        const unreadCount = await prisma_1.prisma.notification.count({
            where: { user_id: userId, is_read: false },
        });
        return (0, response_1.sendSuccess)(res, 200, "Notifications retrieved", {
            notifications,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Error getting tourist notifications:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get notifications");
    }
};
exports.getTouristNotifications = getTouristNotifications;
/**
 * PATCH /tourist/notifications/:notificationId/read
 * Mark a notification as read
 */
const markTouristNotificationRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const notificationId = Number.parseInt(req.params.notificationId, 10);
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return (0, response_1.sendError)(res, 400, "Invalid notification id");
        }
        const existing = await prisma_1.prisma.notification.findUnique({
            where: { notification_id: notificationId },
            select: { notification_id: true, user_id: true },
        });
        if (!existing || existing.user_id !== userId) {
            return (0, response_1.sendError)(res, 404, "Notification not found");
        }
        await prisma_1.prisma.notification.update({
            where: { notification_id: notificationId },
            data: { is_read: true },
        });
        return (0, response_1.sendSuccess)(res, 200, "Notification marked as read");
    }
    catch (error) {
        console.error("Error marking tourist notification as read:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update notification");
    }
};
exports.markTouristNotificationRead = markTouristNotificationRead;
/**
 * PATCH /tourist/notifications/read-all
 * Mark all notifications as read
 */
const markAllTouristNotificationsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const result = await prisma_1.prisma.notification.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true },
        });
        return (0, response_1.sendSuccess)(res, 200, "All notifications marked as read", {
            updated: result.count,
        });
    }
    catch (error) {
        console.error("Error marking all tourist notifications as read:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update notifications");
    }
};
exports.markAllTouristNotificationsRead = markAllTouristNotificationsRead;
/**
 * DELETE /tourist/notifications/:notificationId
 * Delete notification
 */
const deleteTouristNotification = async (req, res) => {
    try {
        const userId = req.user?.id;
        const notificationId = Number.parseInt(req.params.notificationId, 10);
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return (0, response_1.sendError)(res, 400, "Invalid notification id");
        }
        const existing = await prisma_1.prisma.notification.findUnique({
            where: { notification_id: notificationId },
            select: { notification_id: true, user_id: true },
        });
        if (!existing || existing.user_id !== userId) {
            return (0, response_1.sendError)(res, 404, "Notification not found");
        }
        await prisma_1.prisma.notification.delete({
            where: { notification_id: notificationId },
        });
        return (0, response_1.sendSuccess)(res, 200, "Notification deleted");
    }
    catch (error) {
        console.error("Error deleting tourist notification:", error);
        return (0, response_1.sendError)(res, 500, "Failed to delete notification");
    }
};
exports.deleteTouristNotification = deleteTouristNotification;
