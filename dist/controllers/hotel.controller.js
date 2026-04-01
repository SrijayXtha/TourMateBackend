"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHotelNotification = exports.markHotelNotificationRead = exports.getHotelNotifications = exports.getHotelAnalytics = exports.updateHotelBookingStatus = exports.getHotelReviews = exports.updateHotelProfile = exports.handleCancellationRequest = exports.rejectHotelBooking = exports.acceptHotelBooking = exports.getHotelBookings = exports.getHotelDashboard = exports.getHotelProfile = void 0;
const prisma_1 = require("../prisma");
const response_1 = require("../utils/response");
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
const parsePagination = (pageValue, limitValue) => {
    const page = Math.max(1, Number.parseInt(String(pageValue || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue || "20"), 10) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
const buildBookingFilter = (hotelId, query) => {
    const filter = { hotel_id: hotelId };
    if (typeof query.status === "string" && query.status.trim()) {
        filter.status = query.status.trim().toLowerCase();
    }
    if (typeof query.fromDate === "string" || typeof query.toDate === "string") {
        filter.start_date = {};
        if (typeof query.fromDate === "string" && query.fromDate.trim()) {
            const fromDate = new Date(query.fromDate);
            if (!Number.isNaN(fromDate.getTime())) {
                filter.start_date.gte = fromDate;
            }
        }
        if (typeof query.toDate === "string" && query.toDate.trim()) {
            const toDate = new Date(query.toDate);
            if (!Number.isNaN(toDate.getTime())) {
                filter.start_date.lte = toDate;
            }
        }
        if (Object.keys(filter.start_date).length === 0) {
            delete filter.start_date;
        }
    }
    return filter;
};
/**
 * GET /hotel/profile
 * Get hotel profile
 */
const getHotelProfile = async (req, res) => {
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
                created_at: true,
            },
        });
        if (!user) {
            return (0, response_1.sendError)(res, 404, "User not found");
        }
        const hotel = await prisma_1.prisma.hotel.findUnique({
            where: { hotel_id: userId },
            include: {
                review: {
                    select: { rating: true },
                },
            },
        });
        if (!hotel) {
            return (0, response_1.sendError)(res, 404, "Hotel profile not found");
        }
        // Calculate average rating
        const avgRating = hotel.review.length > 0
            ? (hotel.review.reduce((sum, r) => sum + (r.rating || 0), 0) / hotel.review.length).toFixed(2)
            : hotel.rating || 0;
        return (0, response_1.sendSuccess)(res, 200, "Profile retrieved", {
            ...user,
            hotel: {
                hotelName: hotel.hotel_name,
                location: hotel.location,
                description: hotel.description,
                rating: avgRating,
                verifiedStatus: hotel.verified_status,
                basePrice: hotel.base_price,
                images: safeJsonParse(hotel.images, []),
                roomDetails: safeJsonParse(hotel.room_details, {}),
                facilities: safeJsonParse(hotel.facilities, []),
                totalReviews: hotel.review.length,
            },
        });
    }
    catch (error) {
        console.error("Error getting hotel profile:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get profile");
    }
};
exports.getHotelProfile = getHotelProfile;
/**
 * GET /hotel/dashboard
 * Get hotel dashboard with bookings and stats
 */
const getHotelDashboard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const user = await prisma_1.prisma.users.findUnique({
            where: { user_id: userId },
            select: { full_name: true },
        });
        const hotel = await prisma_1.prisma.hotel.findUnique({
            where: { hotel_id: userId },
            select: {
                hotel_name: true,
                location: true,
                description: true,
                rating: true,
                room_details: true,
            },
        });
        // Get pending bookings
        const pendingBookings = await prisma_1.prisma.booking.findMany({
            where: {
                hotel_id: userId,
                status: "pending",
            },
            include: {
                tourist: { include: { users: { select: { full_name: true } } } },
            },
        });
        // Get confirmed bookings
        const confirmedBookings = await prisma_1.prisma.booking.findMany({
            where: {
                hotel_id: userId,
                status: "confirmed",
            },
            include: {
                tourist: { include: { users: { select: { full_name: true } } } },
            },
        });
        // Get cancellation requests (mock status)
        const cancelRequests = await prisma_1.prisma.booking.findMany({
            where: {
                hotel_id: userId,
                status: "pending_cancellation",
            },
        });
        // Calculate stats
        const totalBookings = await prisma_1.prisma.booking.count({
            where: { hotel_id: userId },
        });
        const totalReviews = await prisma_1.prisma.review.findMany({
            where: { hotel_id: userId },
        });
        const averageRating = totalReviews.length > 0
            ? (totalReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews.length).toFixed(2)
            : hotel?.rating || 0;
        const roomDetails = safeJsonParse(hotel?.room_details, {});
        const roomsAvailable = roomDetails.roomsAvailable ?? 12;
        const totalRooms = roomDetails.totalRooms ?? 25;
        const revenueSummary = await prisma_1.prisma.booking.aggregate({
            where: { hotel_id: userId, status: { in: ["confirmed", "completed"] } },
            _sum: { total_price: true },
        });
        const pendingRevenue = await prisma_1.prisma.booking.aggregate({
            where: { hotel_id: userId, status: "pending" },
            _sum: { total_price: true },
        });
        return (0, response_1.sendSuccess)(res, 200, "Dashboard data retrieved", {
            user,
            hotel,
            stats: {
                totalBookings,
                pendingRequests: pendingBookings.length,
                confirmedBookings: confirmedBookings.length,
                cancelRequests: cancelRequests.length,
                roomsAvailable,
                totalRooms,
                totalReviews: totalReviews.length,
                averageRating,
                confirmedRevenue: revenueSummary._sum.total_price || 0,
                pendingRevenue: pendingRevenue._sum.total_price || 0,
            },
            pendingBookings: pendingBookings.map((b) => ({
                id: b.booking_id,
                touristName: b.tourist?.users?.full_name || "Tourist",
                checkIn: b.start_date,
                checkOut: b.end_date,
                totalPrice: b.total_price,
            })),
        });
    }
    catch (error) {
        console.error("Error getting hotel dashboard:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get dashboard");
    }
};
exports.getHotelDashboard = getHotelDashboard;
/**
 * GET /hotel/bookings
 * Get hotel's bookings
 */
const getHotelBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const where = buildBookingFilter(userId, req.query);
        const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
        const [bookings, total] = await Promise.all([
            prisma_1.prisma.booking.findMany({
                where,
                include: {
                    tourist: { include: { users: { select: { full_name: true, phone: true, email: true } } } },
                },
                orderBy: { start_date: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.booking.count({ where }),
        ]);
        return (0, response_1.sendSuccess)(res, 200, "Bookings retrieved", {
            count: bookings.length,
            total,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            bookings: bookings.map((b) => ({
                id: b.booking_id,
                touristName: b.tourist?.users?.full_name || "Tourist",
                touristEmail: b.tourist?.users?.email,
                touristPhone: b.tourist?.users?.phone,
                checkIn: b.start_date,
                checkOut: b.end_date,
                status: b.status,
                totalPrice: b.total_price,
            })),
        });
    }
    catch (error) {
        console.error("Error getting bookings:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get bookings");
    }
};
exports.getHotelBookings = getHotelBookings;
/**
 * PATCH /hotel/bookings/:bookingId/accept
 * Accept a booking request
 */
const acceptHotelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: parseInt(bookingId) },
        });
        if (!booking) {
            return (0, response_1.sendError)(res, 404, "Booking not found");
        }
        if (booking.hotel_id !== userId) {
            return (0, response_1.sendError)(res, 403, "You can only accept your own bookings");
        }
        const updated = await prisma_1.prisma.booking.update({
            where: { booking_id: parseInt(bookingId) },
            data: { status: "confirmed" },
        });
        if (updated.tourist_id) {
            await prisma_1.prisma.notification.create({
                data: {
                    user_id: updated.tourist_id,
                    title: "Hotel booking confirmed",
                    message: "Your hotel booking request was accepted.",
                    type: "booking",
                    is_read: false,
                },
            });
        }
        return (0, response_1.sendSuccess)(res, 200, "Booking accepted", {
            bookingId: updated.booking_id,
            status: updated.status,
        });
    }
    catch (error) {
        console.error("Error accepting booking:", error);
        return (0, response_1.sendError)(res, 500, "Failed to accept booking");
    }
};
exports.acceptHotelBooking = acceptHotelBooking;
/**
 * PATCH /hotel/bookings/:bookingId/reject
 * Reject a booking request
 */
const rejectHotelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: parseInt(bookingId) },
        });
        if (!booking) {
            return (0, response_1.sendError)(res, 404, "Booking not found");
        }
        if (booking.hotel_id !== userId) {
            return (0, response_1.sendError)(res, 403, "You can only reject your own bookings");
        }
        const updated = await prisma_1.prisma.booking.update({
            where: { booking_id: parseInt(bookingId) },
            data: { status: "rejected" },
        });
        if (updated.tourist_id) {
            await prisma_1.prisma.notification.create({
                data: {
                    user_id: updated.tourist_id,
                    title: "Hotel booking update",
                    message: "Your hotel booking request was rejected.",
                    type: "booking",
                    is_read: false,
                },
            });
        }
        return (0, response_1.sendSuccess)(res, 200, "Booking rejected", {
            bookingId: updated.booking_id,
            status: updated.status,
        });
    }
    catch (error) {
        console.error("Error rejecting booking:", error);
        return (0, response_1.sendError)(res, 500, "Failed to reject booking");
    }
};
exports.rejectHotelBooking = rejectHotelBooking;
/**
 * PATCH /hotel/bookings/:bookingId/cancel-request
 * Handle cancellation request
 */
const handleCancellationRequest = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { approve } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: parseInt(bookingId) },
        });
        if (!booking) {
            return (0, response_1.sendError)(res, 404, "Booking not found");
        }
        if (booking.hotel_id !== userId) {
            return (0, response_1.sendError)(res, 403, "You can only handle your own bookings");
        }
        const status = approve ? "cancelled" : "confirmed";
        const updated = await prisma_1.prisma.booking.update({
            where: { booking_id: parseInt(bookingId) },
            data: { status },
        });
        if (updated.tourist_id) {
            await prisma_1.prisma.notification.create({
                data: {
                    user_id: updated.tourist_id,
                    title: "Cancellation request update",
                    message: approve
                        ? "Your booking cancellation request was approved."
                        : "Your booking cancellation request was declined.",
                    type: "booking",
                    is_read: false,
                },
            });
        }
        return (0, response_1.sendSuccess)(res, 200, `Cancellation ${approve ? "approved" : "rejected"}`, {
            bookingId: updated.booking_id,
            status: updated.status,
        });
    }
    catch (error) {
        console.error("Error handling cancellation:", error);
        return (0, response_1.sendError)(res, 500, "Failed to handle cancellation");
    }
};
exports.handleCancellationRequest = handleCancellationRequest;
/**
 * PATCH /hotel/profile
 * Update hotel profile
 */
const updateHotelProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { hotelName, location, description, basePrice, images, roomDetails, facilities, } = req.body;
        const updated = await prisma_1.prisma.hotel.update({
            where: { hotel_id: userId },
            data: {
                hotel_name: hotelName || undefined,
                location: location || undefined,
                description: description || undefined,
                base_price: basePrice !== undefined ? Number(basePrice) : undefined,
                images: Array.isArray(images) ? JSON.stringify(images) : undefined,
                room_details: roomDetails ? JSON.stringify(roomDetails) : undefined,
                facilities: Array.isArray(facilities) ? JSON.stringify(facilities) : undefined,
            },
        });
        return (0, response_1.sendSuccess)(res, 200, "Profile updated", {
            hotelName: updated.hotel_name,
            location: updated.location,
            description: updated.description,
            basePrice: updated.base_price,
            images: safeJsonParse(updated.images, []),
            roomDetails: safeJsonParse(updated.room_details, {}),
            facilities: safeJsonParse(updated.facilities, []),
        });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update profile");
    }
};
exports.updateHotelProfile = updateHotelProfile;
/**
 * GET /hotel/reviews
 * Get reviews for hotel
 */
const getHotelReviews = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const reviews = await prisma_1.prisma.review.findMany({
            where: { hotel_id: userId },
            include: {
                tourist: { include: { users: { select: { full_name: true } } } },
            },
            orderBy: { created_at: "desc" },
        });
        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(2)
            : 0;
        return (0, response_1.sendSuccess)(res, 200, "Reviews retrieved", {
            count: reviews.length,
            averageRating: avgRating,
            reviews: reviews.map((r) => ({
                id: r.review_id,
                rating: r.rating,
                comment: r.comment,
                touristName: r.tourist?.users?.full_name,
                createdAt: r.created_at,
            })),
        });
    }
    catch (error) {
        console.error("Error getting reviews:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get reviews");
    }
};
exports.getHotelReviews = getHotelReviews;
/**
 * PATCH /hotel/bookings/:bookingId/status
 * Update hotel booking status
 */
const updateHotelBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const allowedStatuses = ["pending", "confirmed", "rejected", "cancelled", "completed", "ongoing", "pending_cancellation"];
        if (!status || !allowedStatuses.includes(status)) {
            return (0, response_1.sendError)(res, 400, `Status must be one of: ${allowedStatuses.join(", ")}`);
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: parseInt(bookingId, 10) },
        });
        if (!booking) {
            return (0, response_1.sendError)(res, 404, "Booking not found");
        }
        if (booking.hotel_id !== userId) {
            return (0, response_1.sendError)(res, 403, "You can only update your own bookings");
        }
        const updated = await prisma_1.prisma.booking.update({
            where: { booking_id: parseInt(bookingId, 10) },
            data: { status },
        });
        if (updated.tourist_id) {
            await prisma_1.prisma.notification.create({
                data: {
                    user_id: updated.tourist_id,
                    title: "Hotel booking status updated",
                    message: `Your booking status is now: ${status}.`,
                    type: "booking",
                    is_read: false,
                },
            });
        }
        return (0, response_1.sendSuccess)(res, 200, "Booking status updated", {
            bookingId: updated.booking_id,
            status: updated.status,
        });
    }
    catch (error) {
        console.error("Error updating booking status:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update booking status");
    }
};
exports.updateHotelBookingStatus = updateHotelBookingStatus;
/**
 * GET /hotel/analytics
 * Get hotel analytics and booking trends
 */
const getHotelAnalytics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const [confirmedRevenue, totalBookings, recentBookings] = await Promise.all([
            prisma_1.prisma.booking.aggregate({
                where: { hotel_id: userId, status: { in: ["confirmed", "completed"] } },
                _sum: { total_price: true },
            }),
            prisma_1.prisma.booking.count({ where: { hotel_id: userId } }),
            prisma_1.prisma.booking.findMany({
                where: { hotel_id: userId },
                select: { booking_id: true, start_date: true, status: true, total_price: true },
                orderBy: { start_date: "desc" },
                take: 90,
            }),
        ]);
        const trendMap = {};
        for (const booking of recentBookings) {
            const date = booking.start_date ? new Date(booking.start_date) : null;
            if (!date || Number.isNaN(date.getTime()))
                continue;
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            if (!trendMap[month]) {
                trendMap[month] = { month, bookings: 0, revenue: 0 };
            }
            trendMap[month].bookings += 1;
            trendMap[month].revenue += Number(booking.total_price || 0);
        }
        const trends = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month));
        return (0, response_1.sendSuccess)(res, 200, "Hotel analytics retrieved", {
            totalBookings,
            totalRevenue: confirmedRevenue._sum.total_price || 0,
            trends,
        });
    }
    catch (error) {
        console.error("Error getting hotel analytics:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get analytics");
    }
};
exports.getHotelAnalytics = getHotelAnalytics;
/**
 * GET /hotel/notifications
 * Get hotel notifications
 */
const getHotelNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
        const [notifications, total, unreadCount] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.notification.count({ where: { user_id: userId } }),
            prisma_1.prisma.notification.count({ where: { user_id: userId, is_read: false } }),
        ]);
        return (0, response_1.sendSuccess)(res, 200, "Hotel notifications retrieved", {
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
        console.error("Error getting hotel notifications:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get notifications");
    }
};
exports.getHotelNotifications = getHotelNotifications;
/**
 * PATCH /hotel/notifications/:notificationId/read
 * Mark hotel notification as read
 */
const markHotelNotificationRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const notificationId = Number.parseInt(req.params.notificationId, 10);
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return (0, response_1.sendError)(res, 400, "Invalid notification id");
        }
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { notification_id: notificationId },
            select: { user_id: true },
        });
        if (!notification || notification.user_id !== userId) {
            return (0, response_1.sendError)(res, 404, "Notification not found");
        }
        await prisma_1.prisma.notification.update({
            where: { notification_id: notificationId },
            data: { is_read: true },
        });
        return (0, response_1.sendSuccess)(res, 200, "Notification marked as read");
    }
    catch (error) {
        console.error("Error marking hotel notification as read:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update notification");
    }
};
exports.markHotelNotificationRead = markHotelNotificationRead;
/**
 * DELETE /hotel/notifications/:notificationId
 * Delete hotel notification
 */
const deleteHotelNotification = async (req, res) => {
    try {
        const userId = req.user?.id;
        const notificationId = Number.parseInt(req.params.notificationId, 10);
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return (0, response_1.sendError)(res, 400, "Invalid notification id");
        }
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { notification_id: notificationId },
            select: { user_id: true },
        });
        if (!notification || notification.user_id !== userId) {
            return (0, response_1.sendError)(res, 404, "Notification not found");
        }
        await prisma_1.prisma.notification.delete({
            where: { notification_id: notificationId },
        });
        return (0, response_1.sendSuccess)(res, 200, "Notification deleted");
    }
    catch (error) {
        console.error("Error deleting hotel notification:", error);
        return (0, response_1.sendError)(res, 500, "Failed to delete notification");
    }
};
exports.deleteHotelNotification = deleteHotelNotification;
