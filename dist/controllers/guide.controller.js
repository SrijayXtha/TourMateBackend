"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGuideMessage = exports.getGuideMessages = exports.deleteGuideNotification = exports.markGuideNotificationRead = exports.getGuideNotifications = exports.getGuideAnalytics = exports.getUpcomingTours = exports.updateGuideAvailability = exports.getGuideReviews = exports.updateGuideProfile = exports.rejectBooking = exports.acceptBooking = exports.getGuideBookings = exports.getGuideDashboard = exports.getGuideProfile = void 0;
const prisma_1 = require("../prisma");
const response_1 = require("../utils/response");
const parsePagination = (pageValue, limitValue) => {
    const page = Math.max(1, Number.parseInt(String(pageValue || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue || "20"), 10) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
/**
 * GET /guide/profile
 * Get guide profile
 */
const getGuideProfile = async (req, res) => {
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
        const guide = await prisma_1.prisma.guide.findUnique({
            where: { guide_id: userId },
            include: {
                review: {
                    select: { rating: true },
                },
            },
        });
        if (!guide) {
            return (0, response_1.sendError)(res, 404, "Guide profile not found");
        }
        // Calculate average rating
        const avgRating = guide.review.length > 0
            ? (guide.review.reduce((sum, r) => sum + (r.rating || 0), 0) / guide.review.length).toFixed(2)
            : 0;
        return (0, response_1.sendSuccess)(res, 200, "Profile retrieved", {
            ...user,
            guide: {
                bio: guide.bio,
                experienceYears: guide.experience_years,
                licenseNumber: guide.license_number,
                verifiedStatus: guide.verified_status,
                isAvailable: guide.is_available,
                averageRating: avgRating,
                totalReviews: guide.review.length,
            },
        });
    }
    catch (error) {
        console.error("Error getting guide profile:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get profile");
    }
};
exports.getGuideProfile = getGuideProfile;
/**
 * GET /guide/dashboard
 * Get guide dashboard with bookings and stats
 */
const getGuideDashboard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const user = await prisma_1.prisma.users.findUnique({
            where: { user_id: userId },
            select: { full_name: true },
        });
        const guide = await prisma_1.prisma.guide.findUnique({
            where: { guide_id: userId },
            select: { verified_status: true, experience_years: true, is_available: true },
        });
        // Get pending bookings
        const pendingBookings = await prisma_1.prisma.booking.findMany({
            where: {
                guide_id: userId,
                status: "pending",
            },
            include: {
                tourist: { include: { users: { select: { full_name: true } } } },
            },
        });
        // Get confirmed bookings
        const confirmedBookings = await prisma_1.prisma.booking.findMany({
            where: {
                guide_id: userId,
                status: "confirmed",
            },
            include: {
                tourist: { include: { users: { select: { full_name: true } } } },
            },
        });
        // Calculate stats
        const totalBookings = await prisma_1.prisma.booking.count({
            where: { guide_id: userId },
        });
        const totalReviews = await prisma_1.prisma.review.findMany({
            where: { guide_id: userId },
        });
        const averageRating = totalReviews.length > 0
            ? (totalReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews.length).toFixed(2)
            : 0;
        const confirmedRevenue = await prisma_1.prisma.booking.aggregate({
            where: { guide_id: userId, status: "confirmed" },
            _sum: { total_price: true },
        });
        const pendingRevenue = await prisma_1.prisma.booking.aggregate({
            where: { guide_id: userId, status: "pending" },
            _sum: { total_price: true },
        });
        const notificationsUnread = await prisma_1.prisma.notification.count({
            where: { user_id: userId, is_read: false },
        });
        return (0, response_1.sendSuccess)(res, 200, "Dashboard data retrieved", {
            user,
            guide,
            stats: {
                totalBookings,
                pendingRequests: pendingBookings.length,
                confirmedBookings: confirmedBookings.length,
                totalReviews: totalReviews.length,
                averageRating,
                confirmedRevenue: confirmedRevenue._sum.total_price || 0,
                pendingRevenue: pendingRevenue._sum.total_price || 0,
                notificationsUnread,
            },
            pendingBookings: pendingBookings.map((b) => ({
                id: b.booking_id,
                touristName: b.tourist?.users?.full_name || "Tourist",
                startDate: b.start_date,
                endDate: b.end_date,
                totalPrice: b.total_price,
            })),
        });
    }
    catch (error) {
        console.error("Error getting guide dashboard:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get dashboard");
    }
};
exports.getGuideDashboard = getGuideDashboard;
/**
 * GET /guide/bookings
 * Get guide's bookings
 */
const getGuideBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const bookings = await prisma_1.prisma.booking.findMany({
            where: { guide_id: userId },
            include: {
                tourist: { include: { users: { select: { full_name: true, phone: true } } } },
            },
            orderBy: { start_date: "desc" },
        });
        return (0, response_1.sendSuccess)(res, 200, "Bookings retrieved", {
            count: bookings.length,
            bookings: bookings.map((b) => ({
                id: b.booking_id,
                touristName: b.tourist?.users?.full_name || "Tourist",
                touristPhone: b.tourist?.users?.phone,
                startDate: b.start_date,
                endDate: b.end_date,
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
exports.getGuideBookings = getGuideBookings;
/**
 * PATCH /guide/bookings/:bookingId/accept
 * Accept a booking request
 */
const acceptBooking = async (req, res) => {
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
        if (booking.guide_id !== userId) {
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
                    title: "Booking confirmed",
                    message: "Your guide booking request has been accepted.",
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
exports.acceptBooking = acceptBooking;
/**
 * PATCH /guide/bookings/:bookingId/reject
 * Reject a booking request
 */
const rejectBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        const { reason } = req.body;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: parseInt(bookingId) },
        });
        if (!booking) {
            return (0, response_1.sendError)(res, 404, "Booking not found");
        }
        if (booking.guide_id !== userId) {
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
                    title: "Booking update",
                    message: reason
                        ? `Your guide booking request was rejected: ${reason}`
                        : "Your guide booking request was rejected.",
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
exports.rejectBooking = rejectBooking;
/**
 * PATCH /guide/profile
 * Update guide profile
 */
const updateGuideProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const { bio, experienceYears, isAvailable } = req.body;
        const updated = await prisma_1.prisma.guide.update({
            where: { guide_id: userId },
            data: {
                bio: bio || undefined,
                experience_years: experienceYears !== undefined ? parseInt(experienceYears) : undefined,
                is_available: typeof isAvailable === "boolean" ? isAvailable : undefined,
            },
        });
        return (0, response_1.sendSuccess)(res, 200, "Profile updated", {
            bio: updated.bio,
            experienceYears: updated.experience_years,
            isAvailable: updated.is_available,
            verifiedStatus: updated.verified_status,
        });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update profile");
    }
};
exports.updateGuideProfile = updateGuideProfile;
/**
 * GET /guide/reviews
 * Get reviews for guide
 */
const getGuideReviews = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const reviews = await prisma_1.prisma.review.findMany({
            where: { guide_id: userId },
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
exports.getGuideReviews = getGuideReviews;
/**
 * PATCH /guide/availability
 * Toggle guide availability
 */
const updateGuideAvailability = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { isAvailable } = req.body;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        if (typeof isAvailable !== "boolean") {
            return (0, response_1.sendError)(res, 400, "isAvailable must be a boolean");
        }
        const guide = await prisma_1.prisma.guide.update({
            where: { guide_id: userId },
            data: { is_available: isAvailable },
            select: { is_available: true },
        });
        return (0, response_1.sendSuccess)(res, 200, "Availability updated", {
            isAvailable: guide.is_available,
        });
    }
    catch (error) {
        console.error("Error updating guide availability:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update availability");
    }
};
exports.updateGuideAvailability = updateGuideAvailability;
/**
 * GET /guide/upcoming-tours
 * Get upcoming confirmed tours
 */
const getUpcomingTours = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const now = new Date();
        const tours = await prisma_1.prisma.booking.findMany({
            where: {
                guide_id: userId,
                status: "confirmed",
                start_date: { gte: now },
            },
            include: {
                tourist: {
                    include: { users: { select: { full_name: true, phone: true, email: true } } },
                },
            },
            orderBy: { start_date: "asc" },
        });
        return (0, response_1.sendSuccess)(res, 200, "Upcoming tours retrieved", {
            count: tours.length,
            tours: tours.map((tour) => ({
                bookingId: tour.booking_id,
                touristName: tour.tourist?.users?.full_name || "Tourist",
                touristPhone: tour.tourist?.users?.phone,
                touristEmail: tour.tourist?.users?.email,
                startDate: tour.start_date,
                endDate: tour.end_date,
                totalPrice: tour.total_price,
            })),
        });
    }
    catch (error) {
        console.error("Error getting upcoming tours:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get upcoming tours");
    }
};
exports.getUpcomingTours = getUpcomingTours;
/**
 * GET /guide/analytics
 * Get earnings and booking analytics
 */
const getGuideAnalytics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const [confirmed, pending, totalCount, monthlyBookings] = await Promise.all([
            prisma_1.prisma.booking.aggregate({
                where: { guide_id: userId, status: "confirmed" },
                _sum: { total_price: true },
            }),
            prisma_1.prisma.booking.aggregate({
                where: { guide_id: userId, status: "pending" },
                _sum: { total_price: true },
            }),
            prisma_1.prisma.booking.count({ where: { guide_id: userId } }),
            prisma_1.prisma.booking.findMany({
                where: { guide_id: userId },
                select: { booking_id: true, start_date: true, status: true, total_price: true },
                orderBy: { start_date: "desc" },
                take: 60,
            }),
        ]);
        const trendMap = {};
        for (const booking of monthlyBookings) {
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
        return (0, response_1.sendSuccess)(res, 200, "Guide analytics retrieved", {
            earnings: {
                confirmedRevenue: confirmed._sum.total_price || 0,
                pendingRevenue: pending._sum.total_price || 0,
            },
            totalBookings: totalCount,
            trends,
        });
    }
    catch (error) {
        console.error("Error getting guide analytics:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get analytics");
    }
};
exports.getGuideAnalytics = getGuideAnalytics;
/**
 * GET /guide/notifications
 * Get guide notifications
 */
const getGuideNotifications = async (req, res) => {
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
        return (0, response_1.sendSuccess)(res, 200, "Guide notifications retrieved", {
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
        console.error("Error getting guide notifications:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get notifications");
    }
};
exports.getGuideNotifications = getGuideNotifications;
/**
 * PATCH /guide/notifications/:notificationId/read
 * Mark guide notification as read
 */
const markGuideNotificationRead = async (req, res) => {
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
        console.error("Error marking guide notification as read:", error);
        return (0, response_1.sendError)(res, 500, "Failed to update notification");
    }
};
exports.markGuideNotificationRead = markGuideNotificationRead;
/**
 * DELETE /guide/notifications/:notificationId
 * Delete guide notification
 */
const deleteGuideNotification = async (req, res) => {
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
        console.error("Error deleting guide notification:", error);
        return (0, response_1.sendError)(res, 500, "Failed to delete notification");
    }
};
exports.deleteGuideNotification = deleteGuideNotification;
/**
 * GET /guide/messages
 * Get guide messages
 */
const getGuideMessages = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                OR: [{ sender_id: userId }, { receiver_id: userId }],
            },
            include: {
                users_message_sender: { select: { user_id: true, full_name: true, role: true } },
                users_message_receiver: { select: { user_id: true, full_name: true, role: true } },
            },
            orderBy: { sent_at: "desc" },
            take: 100,
        });
        return (0, response_1.sendSuccess)(res, 200, "Messages retrieved", {
            count: messages.length,
            messages: messages.map((message) => ({
                id: message.message_id,
                sender: message.users_message_sender,
                receiver: message.users_message_receiver,
                content: message.content,
                isRead: message.is_read,
                sentAt: message.sent_at,
            })),
        });
    }
    catch (error) {
        console.error("Error getting guide messages:", error);
        return (0, response_1.sendError)(res, 500, "Failed to get messages");
    }
};
exports.getGuideMessages = getGuideMessages;
/**
 * POST /guide/messages
 * Send message from guide
 */
const sendGuideMessage = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { receiverId, content } = req.body;
        if (!userId) {
            return (0, response_1.sendError)(res, 401, "Unauthorized");
        }
        if (!receiverId || !Number.isInteger(Number(receiverId))) {
            return (0, response_1.sendError)(res, 400, "receiverId is required");
        }
        if (!content || !content.trim()) {
            return (0, response_1.sendError)(res, 400, "Message content is required");
        }
        const receiver = await prisma_1.prisma.users.findUnique({
            where: { user_id: Number(receiverId) },
            select: { user_id: true },
        });
        if (!receiver) {
            return (0, response_1.sendError)(res, 404, "Receiver not found");
        }
        const message = await prisma_1.prisma.message.create({
            data: {
                sender_id: userId,
                receiver_id: receiver.user_id,
                content: content.trim(),
            },
        });
        await prisma_1.prisma.notification.create({
            data: {
                user_id: receiver.user_id,
                title: "New message",
                message: "You received a new message from your guide.",
                type: "message",
                is_read: false,
            },
        });
        return (0, response_1.sendSuccess)(res, 201, "Message sent", {
            messageId: message.message_id,
            sentAt: message.sent_at,
        });
    }
    catch (error) {
        console.error("Error sending guide message:", error);
        return (0, response_1.sendError)(res, 500, "Failed to send message");
    }
};
exports.sendGuideMessage = sendGuideMessage;
