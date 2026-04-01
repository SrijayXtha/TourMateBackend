import { Request, Response } from "express";
import { prisma } from "../prisma";
import { sendSuccess, sendError } from "../utils/response";

const safeJsonParse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const parsePagination = (pageValue: unknown, limitValue: unknown) => {
  const page = Math.max(1, Number.parseInt(String(pageValue || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue || "20"), 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildBookingFilter = (hotelId: number, query: Request["query"]) => {
  const filter: any = { hotel_id: hotelId };

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
export const getHotelProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const user = await prisma.users.findUnique({
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
      return sendError(res, 404, "User not found");
    }

    const hotel = await prisma.hotel.findUnique({
      where: { hotel_id: userId },
      include: {
        review: {
          select: { rating: true },
        },
      },
    });

    if (!hotel) {
      return sendError(res, 404, "Hotel profile not found");
    }

    // Calculate average rating
    const avgRating =
      hotel.review.length > 0
        ? (hotel.review.reduce((sum, r) => sum + (r.rating || 0), 0) / hotel.review.length).toFixed(2)
        : hotel.rating || 0;

    return sendSuccess(res, 200, "Profile retrieved", {
      ...user,
      hotel: {
        hotelName: hotel.hotel_name,
        location: hotel.location,
        description: hotel.description,
        rating: avgRating,
        verifiedStatus: hotel.verified_status,
        basePrice: hotel.base_price,
        images: safeJsonParse<string[]>(hotel.images, []),
        roomDetails: safeJsonParse<Record<string, unknown>>(hotel.room_details, {}),
        facilities: safeJsonParse<string[]>(hotel.facilities, []),
        totalReviews: hotel.review.length,
      },
    });
  } catch (error) {
    console.error("Error getting hotel profile:", error);
    return sendError(res, 500, "Failed to get profile");
  }
};

/**
 * GET /hotel/dashboard
 * Get hotel dashboard with bookings and stats
 */
export const getHotelDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { full_name: true },
    });

    const hotel = await prisma.hotel.findUnique({
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
    const pendingBookings = await prisma.booking.findMany({
      where: {
        hotel_id: userId,
        status: "pending",
      },
      include: {
        tourist: { include: { users: { select: { full_name: true } } } },
      },
    });

    // Get confirmed bookings
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        hotel_id: userId,
        status: "confirmed",
      },
      include: {
        tourist: { include: { users: { select: { full_name: true } } } },
      },
    });

    // Get cancellation requests (mock status)
    const cancelRequests = await prisma.booking.findMany({
      where: {
        hotel_id: userId,
        status: "pending_cancellation",
      },
    });

    // Calculate stats
    const totalBookings = await prisma.booking.count({
      where: { hotel_id: userId },
    });

    const totalReviews = await prisma.review.findMany({
      where: { hotel_id: userId },
    });

    const averageRating =
      totalReviews.length > 0
        ? (totalReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews.length).toFixed(2)
        : hotel?.rating || 0;

    const roomDetails = safeJsonParse<{ roomsAvailable?: number; totalRooms?: number }>(hotel?.room_details, {});
    const roomsAvailable = roomDetails.roomsAvailable ?? 12;
    const totalRooms = roomDetails.totalRooms ?? 25;

    const revenueSummary = await prisma.booking.aggregate({
      where: { hotel_id: userId, status: { in: ["confirmed", "completed"] } },
      _sum: { total_price: true },
    });

    const pendingRevenue = await prisma.booking.aggregate({
      where: { hotel_id: userId, status: "pending" },
      _sum: { total_price: true },
    });

    return sendSuccess(res, 200, "Dashboard data retrieved", {
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
  } catch (error) {
    console.error("Error getting hotel dashboard:", error);
    return sendError(res, 500, "Failed to get dashboard");
  }
};

/**
 * GET /hotel/bookings
 * Get hotel's bookings
 */
export const getHotelBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const where = buildBookingFilter(userId, req.query);
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
      where,
      include: {
        tourist: { include: { users: { select: { full_name: true, phone: true, email: true } } } },
      },
      orderBy: { start_date: "desc" },
      skip,
      take: limit,
    }),
      prisma.booking.count({ where }),
    ]);

    return sendSuccess(res, 200, "Bookings retrieved", {
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
  } catch (error) {
    console.error("Error getting bookings:", error);
    return sendError(res, 500, "Failed to get bookings");
  }
};

/**
 * PATCH /hotel/bookings/:bookingId/accept
 * Accept a booking request
 */
export const acceptHotelBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const booking = await prisma.booking.findUnique({
      where: { booking_id: parseInt(bookingId) },
    });

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (booking.hotel_id !== userId) {
      return sendError(res, 403, "You can only accept your own bookings");
    }

    const updated = await prisma.booking.update({
      where: { booking_id: parseInt(bookingId) },
      data: { status: "confirmed" },
    });

    if (updated.tourist_id) {
      await prisma.notification.create({
        data: {
          user_id: updated.tourist_id,
          title: "Hotel booking confirmed",
          message: "Your hotel booking request was accepted.",
          type: "booking",
          is_read: false,
        },
      });
    }

    return sendSuccess(res, 200, "Booking accepted", {
      bookingId: updated.booking_id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error accepting booking:", error);
    return sendError(res, 500, "Failed to accept booking");
  }
};

/**
 * PATCH /hotel/bookings/:bookingId/reject
 * Reject a booking request
 */
export const rejectHotelBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const booking = await prisma.booking.findUnique({
      where: { booking_id: parseInt(bookingId) },
    });

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (booking.hotel_id !== userId) {
      return sendError(res, 403, "You can only reject your own bookings");
    }

    const updated = await prisma.booking.update({
      where: { booking_id: parseInt(bookingId) },
      data: { status: "rejected" },
    });

    if (updated.tourist_id) {
      await prisma.notification.create({
        data: {
          user_id: updated.tourist_id,
          title: "Hotel booking update",
          message: "Your hotel booking request was rejected.",
          type: "booking",
          is_read: false,
        },
      });
    }

    return sendSuccess(res, 200, "Booking rejected", {
      bookingId: updated.booking_id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error rejecting booking:", error);
    return sendError(res, 500, "Failed to reject booking");
  }
};

/**
 * PATCH /hotel/bookings/:bookingId/cancel-request
 * Handle cancellation request
 */
export const handleCancellationRequest = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { approve } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const booking = await prisma.booking.findUnique({
      where: { booking_id: parseInt(bookingId) },
    });

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (booking.hotel_id !== userId) {
      return sendError(res, 403, "You can only handle your own bookings");
    }

    const status = approve ? "cancelled" : "confirmed";
    const updated = await prisma.booking.update({
      where: { booking_id: parseInt(bookingId) },
      data: { status },
    });

    if (updated.tourist_id) {
      await prisma.notification.create({
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

    return sendSuccess(res, 200, `Cancellation ${approve ? "approved" : "rejected"}`, {
      bookingId: updated.booking_id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error handling cancellation:", error);
    return sendError(res, 500, "Failed to handle cancellation");
  }
};

/**
 * PATCH /hotel/profile
 * Update hotel profile
 */
export const updateHotelProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const {
      hotelName,
      location,
      description,
      basePrice,
      images,
      roomDetails,
      facilities,
    } = req.body;

    const updated = await prisma.hotel.update({
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

    return sendSuccess(res, 200, "Profile updated", {
      hotelName: updated.hotel_name,
      location: updated.location,
      description: updated.description,
      basePrice: updated.base_price,
      images: safeJsonParse<string[]>(updated.images, []),
      roomDetails: safeJsonParse<Record<string, unknown>>(updated.room_details, {}),
      facilities: safeJsonParse<string[]>(updated.facilities, []),
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return sendError(res, 500, "Failed to update profile");
  }
};

/**
 * GET /hotel/reviews
 * Get reviews for hotel
 */
export const getHotelReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const reviews = await prisma.review.findMany({
      where: { hotel_id: userId },
      include: {
        tourist: { include: { users: { select: { full_name: true } } } },
      },
      orderBy: { created_at: "desc" },
    });

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(2)
        : 0;

    return sendSuccess(res, 200, "Reviews retrieved", {
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
  } catch (error) {
    console.error("Error getting reviews:", error);
    return sendError(res, 500, "Failed to get reviews");
  }
};

/**
 * PATCH /hotel/bookings/:bookingId/status
 * Update hotel booking status
 */
export const updateHotelBookingStatus = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body as { status?: string };
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const allowedStatuses = ["pending", "confirmed", "rejected", "cancelled", "completed", "ongoing", "pending_cancellation"];
    if (!status || !allowedStatuses.includes(status)) {
      return sendError(res, 400, `Status must be one of: ${allowedStatuses.join(", ")}`);
    }

    const booking = await prisma.booking.findUnique({
      where: { booking_id: parseInt(bookingId, 10) },
    });

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (booking.hotel_id !== userId) {
      return sendError(res, 403, "You can only update your own bookings");
    }

    const updated = await prisma.booking.update({
      where: { booking_id: parseInt(bookingId, 10) },
      data: { status },
    });

    if (updated.tourist_id) {
      await prisma.notification.create({
        data: {
          user_id: updated.tourist_id,
          title: "Hotel booking status updated",
          message: `Your booking status is now: ${status}.`,
          type: "booking",
          is_read: false,
        },
      });
    }

    return sendSuccess(res, 200, "Booking status updated", {
      bookingId: updated.booking_id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    return sendError(res, 500, "Failed to update booking status");
  }
};

/**
 * GET /hotel/analytics
 * Get hotel analytics and booking trends
 */
export const getHotelAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const [confirmedRevenue, totalBookings, recentBookings] = await Promise.all([
      prisma.booking.aggregate({
        where: { hotel_id: userId, status: { in: ["confirmed", "completed"] } },
        _sum: { total_price: true },
      }),
      prisma.booking.count({ where: { hotel_id: userId } }),
      prisma.booking.findMany({
        where: { hotel_id: userId },
        select: { booking_id: true, start_date: true, status: true, total_price: true },
        orderBy: { start_date: "desc" },
        take: 90,
      }),
    ]);

    const trendMap: Record<string, { month: string; bookings: number; revenue: number }> = {};
    for (const booking of recentBookings) {
      const date = booking.start_date ? new Date(booking.start_date) : null;
      if (!date || Number.isNaN(date.getTime())) continue;

      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!trendMap[month]) {
        trendMap[month] = { month, bookings: 0, revenue: 0 };
      }

      trendMap[month].bookings += 1;
      trendMap[month].revenue += Number(booking.total_price || 0);
    }

    const trends = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month));

    return sendSuccess(res, 200, "Hotel analytics retrieved", {
      totalBookings,
      totalRevenue: confirmedRevenue._sum.total_price || 0,
      trends,
    });
  } catch (error) {
    console.error("Error getting hotel analytics:", error);
    return sendError(res, 500, "Failed to get analytics");
  }
};

/**
 * GET /hotel/notifications
 * Get hotel notifications
 */
export const getHotelNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { user_id: userId } }),
      prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    ]);

    return sendSuccess(res, 200, "Hotel notifications retrieved", {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting hotel notifications:", error);
    return sendError(res, 500, "Failed to get notifications");
  }
};

/**
 * PATCH /hotel/notifications/:notificationId/read
 * Mark hotel notification as read
 */
export const markHotelNotificationRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number.parseInt(req.params.notificationId, 10);

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return sendError(res, 400, "Invalid notification id");
    }

    const notification = await prisma.notification.findUnique({
      where: { notification_id: notificationId },
      select: { user_id: true },
    });

    if (!notification || notification.user_id !== userId) {
      return sendError(res, 404, "Notification not found");
    }

    await prisma.notification.update({
      where: { notification_id: notificationId },
      data: { is_read: true },
    });

    return sendSuccess(res, 200, "Notification marked as read");
  } catch (error) {
    console.error("Error marking hotel notification as read:", error);
    return sendError(res, 500, "Failed to update notification");
  }
};

/**
 * DELETE /hotel/notifications/:notificationId
 * Delete hotel notification
 */
export const deleteHotelNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number.parseInt(req.params.notificationId, 10);

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return sendError(res, 400, "Invalid notification id");
    }

    const notification = await prisma.notification.findUnique({
      where: { notification_id: notificationId },
      select: { user_id: true },
    });

    if (!notification || notification.user_id !== userId) {
      return sendError(res, 404, "Notification not found");
    }

    await prisma.notification.delete({
      where: { notification_id: notificationId },
    });

    return sendSuccess(res, 200, "Notification deleted");
  } catch (error) {
    console.error("Error deleting hotel notification:", error);
    return sendError(res, 500, "Failed to delete notification");
  }
};
