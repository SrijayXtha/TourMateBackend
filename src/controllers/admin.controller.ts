import { Request, Response } from "express";
import { prisma } from "../prisma";
import { sendSuccess, sendError } from "../utils/response";

/**
 * GET /admin/dashboard
 * Get admin dashboard with platform statistics
 */
export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    // Get user statistics
    const totalUsers = await prisma.users.count();
    const tourists = await prisma.users.count({ where: { role: "tourist" } });
    const guides = await prisma.users.count({ where: { role: "guide" } });
    const hotels = await prisma.users.count({ where: { role: "hotel" } });

    // Get booking statistics
    const totalBookings = await prisma.booking.count();
    const pendingBookings = await prisma.booking.count({ where: { status: "pending" } });
    const confirmedBookings = await prisma.booking.count({ where: { status: "confirmed" } });
    const cancelledBookings = await prisma.booking.count({ where: { status: "cancelled" } });

    // Get verification statistics
    const pendingGuideVerifications = await prisma.guide.count({
      where: { verified_status: false },
    });
    const pendingHotelVerifications = await prisma.hotel.count({
      where: { verified_status: false },
    });
    const verifiedGuides = await prisma.guide.count({
      where: { verified_status: true },
    });
    const verifiedHotels = await prisma.hotel.count({
      where: { verified_status: true },
    });

    // Get incident/SOS statistics
    const activeIncidents = await prisma.incident_report.count({});
    const activeSOSReports = await prisma.sos_report.count({
      where: { status: "active" },
    });

    // Get review statistics
    const totalReviews = await prisma.review.count();

    // Calculate growth (mock data for now)
    const userGrowthWeek = 12; // mock
    const bookingGrowthWeek = 8; // mock

    return sendSuccess(res, 200, "Admin dashboard retrieved", {
      overview: {
        totalUsers,
        usersByRole: {
          tourists,
          guides,
          hotels,
        },
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
      },
      verifications: {
        pendingGuideVerifications,
        pendingHotelVerifications,
        verifiedGuides,
        verifiedHotels,
      },
      incidents: {
        activeIncidents,
        activeSOSReports,
      },
      reviews: {
        total: totalReviews,
      },
      growth: {
        userGrowthWeek: `+${userGrowthWeek}%`,
        bookingGrowthWeek: `+${bookingGrowthWeek}%`,
      },
    });
  } catch (error) {
    console.error("Error getting admin dashboard:", error);
    return sendError(res, 500, "Failed to get dashboard");
  }
};

/**
 * GET /admin/users
 * Get all users with filtering and pagination
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role, page = "1", limit = "10" } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where = role ? { role: role as string } : {};

    const users = await prisma.users.findMany({
      where,
      select: {
        user_id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
      },
      skip,
      take,
      orderBy: { created_at: "desc" },
    });

    const total = await prisma.users.count({ where });

    return sendSuccess(res, 200, "Users retrieved", {
      users,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return sendError(res, 500, "Failed to get users");
  }
};

/**
 * GET /admin/guides/pending-verification
 * Get guides pending verification
 */
export const getPendingGuideVerifications = async (req: Request, res: Response) => {
  try {
    const guides = await prisma.guide.findMany({
      where: { verified_status: false },
      include: {
        users: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
      },
      orderBy: { users: { created_at: "desc" } },
    });

    return sendSuccess(res, 200, "Pending guides retrieved", {
      count: guides.length,
      guides: guides.map((g) => ({
        guideId: g.guide_id,
        name: g.users.full_name,
        email: g.users.email,
        phone: g.users.phone,
        bio: g.bio,
        experienceYears: g.experience_years,
        licenseNumber: g.license_number,
        createdAt: g.users.created_at,
      })),
    });
  } catch (error) {
    console.error("Error getting pending guides:", error);
    return sendError(res, 500, "Failed to get pending guides");
  }
};

/**
 * GET /admin/hotels/pending-verification
 * Get hotels pending verification
 */
export const getPendingHotelVerifications = async (req: Request, res: Response) => {
  try {
    const hotels = await prisma.hotel.findMany({
      where: { verified_status: false },
      include: {
        users: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
      },
      orderBy: { users: { created_at: "desc" } },
    });

    return sendSuccess(res, 200, "Pending hotels retrieved", {
      count: hotels.length,
      hotels: hotels.map((hotel) => ({
        hotelId: hotel.hotel_id,
        name: hotel.hotel_name,
        ownerName: hotel.users.full_name,
        email: hotel.users.email,
        phone: hotel.users.phone,
        location: hotel.location,
        description: hotel.description,
        createdAt: hotel.users.created_at,
      })),
    });
  } catch (error) {
    console.error("Error getting pending hotels:", error);
    return sendError(res, 500, "Failed to get pending hotels");
  }
};

/**
 * PATCH /admin/guides/:guideId/verify
 * Approve a guide for verification
 */
export const verifyGuide = async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;

    const guide = await prisma.guide.findUnique({
      where: { guide_id: parseInt(guideId) },
    });

    if (!guide) {
      return sendError(res, 404, "Guide not found");
    }

    const updated = await prisma.guide.update({
      where: { guide_id: parseInt(guideId) },
      data: { verified_status: true },
    });

    // Log admin action
    await prisma.admin_action.create({
      data: {
        action_type: "guide_verified",
        target_user_id: parseInt(guideId),
        action_description: `Guide ${guide.guide_id} verified`,
      },
    });

    return sendSuccess(res, 200, "Guide verified successfully", {
      guideId: updated.guide_id,
      verifiedStatus: updated.verified_status,
    });
  } catch (error) {
    console.error("Error verifying guide:", error);
    return sendError(res, 500, "Failed to verify guide");
  }
};

/**
 * PATCH /admin/guides/:guideId/reject
 * Reject a guide
 */
export const rejectGuide = async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;
    const { reason } = req.body;
    const parsedId = Number.parseInt(guideId, 10);

    const guide = await prisma.guide.findUnique({
      where: { guide_id: parsedId },
    });

    if (!guide) {
      return sendError(res, 404, "Guide not found");
    }

    const updated = await prisma.guide.update({
      where: { guide_id: parsedId },
      data: { verified_status: null },
    });

    await prisma.notification.create({
      data: {
        user_id: parsedId,
        title: "Guide verification update",
        message: reason
          ? `Your guide verification was rejected: ${reason}`
          : "Your guide verification was rejected.",
        type: "verification",
        is_read: false,
      },
    });

    // Log admin action
    await prisma.admin_action.create({
      data: {
        action_type: "guide_rejected",
        target_user_id: parsedId,
        action_description: `Guide ${guide.guide_id} rejected. Reason: ${reason || "N/A"}`,
      },
    });

    return sendSuccess(res, 200, "Guide rejected", {
      guideId: updated.guide_id,
      verifiedStatus: updated.verified_status,
      reason: reason || "No reason provided",
    });
  } catch (error) {
    console.error("Error rejecting guide:", error);
    return sendError(res, 500, "Failed to reject guide");
  }
};

/**
 * PATCH /admin/hotels/:hotelId/verify
 * Verify hotel listing
 */
export const verifyHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const parsedId = Number.parseInt(hotelId, 10);

    const hotel = await prisma.hotel.findUnique({
      where: { hotel_id: parsedId },
      select: { hotel_id: true },
    });

    if (!hotel) {
      return sendError(res, 404, "Hotel not found");
    }

    await prisma.hotel.update({
      where: { hotel_id: parsedId },
      data: { verified_status: true },
    });

    await prisma.notification.create({
      data: {
        user_id: parsedId,
        title: "Hotel verified",
        message: "Your hotel profile has been verified by admin.",
        type: "verification",
        is_read: false,
      },
    });

    await prisma.admin_action.create({
      data: {
        action_type: "hotel_verified",
        target_user_id: parsedId,
        action_description: `Hotel ${parsedId} verified`,
      },
    });

    return sendSuccess(res, 200, "Hotel verified successfully", {
      hotelId: parsedId,
      verifiedStatus: true,
    });
  } catch (error) {
    console.error("Error verifying hotel:", error);
    return sendError(res, 500, "Failed to verify hotel");
  }
};

/**
 * PATCH /admin/hotels/:hotelId/reject
 * Reject hotel listing
 */
export const rejectHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { reason } = req.body;
    const parsedId = Number.parseInt(hotelId, 10);

    const hotel = await prisma.hotel.findUnique({
      where: { hotel_id: parsedId },
      select: { hotel_id: true },
    });

    if (!hotel) {
      return sendError(res, 404, "Hotel not found");
    }

    await prisma.hotel.update({
      where: { hotel_id: parsedId },
      data: { verified_status: null },
    });

    await prisma.notification.create({
      data: {
        user_id: parsedId,
        title: "Hotel verification update",
        message: reason
          ? `Your hotel verification was rejected: ${reason}`
          : "Your hotel verification was rejected.",
        type: "verification",
        is_read: false,
      },
    });

    await prisma.admin_action.create({
      data: {
        action_type: "hotel_rejected",
        target_user_id: parsedId,
        action_description: `Hotel ${parsedId} rejected. Reason: ${reason || "N/A"}`,
      },
    });

    return sendSuccess(res, 200, "Hotel rejected", {
      hotelId: parsedId,
      verifiedStatus: null,
      reason: reason || "No reason provided",
    });
  } catch (error) {
    console.error("Error rejecting hotel:", error);
    return sendError(res, 500, "Failed to reject hotel");
  }
};

/**
 * GET /admin/guides
 * Get all guides with profile info
 */
export const getGuides = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", verified } = req.query;
    const parsedPage = Math.max(1, Number.parseInt(page as string, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(limit as string, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {};
    if (typeof verified === "string") {
      where.verified_status = verified === "true";
    }

    const [guides, total] = await Promise.all([
      prisma.guide.findMany({
        where,
        include: {
          users: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              phone: true,
              created_at: true,
            },
          },
        },
        orderBy: { users: { created_at: "desc" } },
        skip,
        take: parsedLimit,
      }),
      prisma.guide.count({ where }),
    ]);

    return sendSuccess(res, 200, "Guides retrieved", {
      guides: guides.map((guide) => ({
        guideId: guide.guide_id,
        name: guide.users.full_name,
        email: guide.users.email,
        phone: guide.users.phone,
        verifiedStatus: guide.verified_status,
        experienceYears: guide.experience_years,
        isAvailable: guide.is_available,
        createdAt: guide.users.created_at,
      })),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error("Error getting guides:", error);
    return sendError(res, 500, "Failed to get guides");
  }
};

/**
 * GET /admin/hotels
 * Get all hotels with profile info
 */
export const getHotels = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", verified } = req.query;
    const parsedPage = Math.max(1, Number.parseInt(page as string, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(limit as string, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {};
    if (typeof verified === "string") {
      where.verified_status = verified === "true";
    }

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        include: {
          users: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              phone: true,
              created_at: true,
            },
          },
        },
        orderBy: { users: { created_at: "desc" } },
        skip,
        take: parsedLimit,
      }),
      prisma.hotel.count({ where }),
    ]);

    return sendSuccess(res, 200, "Hotels retrieved", {
      hotels: hotels.map((hotel) => ({
        hotelId: hotel.hotel_id,
        name: hotel.hotel_name,
        ownerName: hotel.users.full_name,
        email: hotel.users.email,
        phone: hotel.users.phone,
        location: hotel.location,
        verifiedStatus: hotel.verified_status,
        basePrice: hotel.base_price,
        createdAt: hotel.users.created_at,
      })),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error("Error getting hotels:", error);
    return sendError(res, 500, "Failed to get hotels");
  }
};

/**
 * GET /admin/bookings
 * Get all bookings with filters
 */
export const getBookings = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "20", status } = req.query;
    const parsedPage = Math.max(1, Number.parseInt(page as string, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(limit as string, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {};
    if (typeof status === "string" && status.trim()) {
      where.status = status.trim().toLowerCase();
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          tourist: { include: { users: { select: { full_name: true, email: true } } } },
          guide: { include: { users: { select: { full_name: true, email: true } } } },
          hotel: { include: { users: { select: { full_name: true, email: true } } } },
        },
        orderBy: { start_date: "desc" },
        skip,
        take: parsedLimit,
      }),
      prisma.booking.count({ where }),
    ]);

    return sendSuccess(res, 200, "Bookings retrieved", {
      bookings: bookings.map((booking) => ({
        bookingId: booking.booking_id,
        status: booking.status,
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalPrice: booking.total_price,
        tourist: booking.tourist
          ? {
              id: booking.tourist.tourist_id,
              name: booking.tourist.users.full_name,
              email: booking.tourist.users.email,
            }
          : null,
        guide: booking.guide
          ? {
              id: booking.guide.guide_id,
              name: booking.guide.users.full_name,
              email: booking.guide.users.email,
            }
          : null,
        hotel: booking.hotel
          ? {
              id: booking.hotel.hotel_id,
              name: booking.hotel.hotel_name,
              email: booking.hotel.users.email,
            }
          : null,
      })),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error("Error getting bookings:", error);
    return sendError(res, 500, "Failed to get bookings");
  }
};

/**
 * GET /admin/incidents
 * Get all incidents and SOS reports
 */
export const getIncidents = async (req: Request, res: Response) => {
  try {
    const incidents = await prisma.incident_report.findMany({
      include: {
        tourist: { include: { users: { select: { full_name: true } } } },
        booking: true,
      },
      orderBy: { created_at: "desc" },
    });

    const sosReports = await prisma.sos_report.findMany({
      include: {
        tourist: { include: { users: { select: { full_name: true } } } },
      },
      orderBy: { timestamp: "desc" },
    });

    return sendSuccess(res, 200, "Incidents retrieved", {
      incidents: {
        count: incidents.length,
        data: incidents.map((i) => ({
          id: i.incident_id,
          type: i.incident_type,
          touristName: i.tourist?.users?.full_name,
          details: i.details,
          location: i.location,
          createdAt: i.created_at,
        })),
      },
      sosReports: {
        count: sosReports.length,
        data: sosReports.map((s) => ({
          id: s.report_id,
          touristName: s.tourist?.users?.full_name,
          location: s.location,
          status: s.status,
          description: s.description,
          timestamp: s.timestamp,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting incidents:", error);
    return sendError(res, 500, "Failed to get incidents");
  }
};

/**
 * PATCH /admin/incidents/:incidentId/resolve
 * Mark incident as resolved
 */
export const resolveIncident = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { resolution } = req.body;

    const incident = await prisma.incident_report.findUnique({
      where: { incident_id: parseInt(incidentId) },
    });

    if (!incident) {
      return sendError(res, 404, "Incident not found");
    }

    // Log admin action
    await prisma.admin_action.create({
      data: {
        action_type: "incident_resolved",
        target_user_id: incident.tourist_id,
        action_description: `Incident ${incidentId} resolved. Resolution: ${resolution || "N/A"}`,
      },
    });

    return sendSuccess(res, 200, "Incident marked as resolved", {
      incidentId,
      resolution: resolution || "Resolved",
    });
  } catch (error) {
    console.error("Error resolving incident:", error);
    return sendError(res, 500, "Failed to resolve incident");
  }
};

/**
 * GET /admin/activities
 * Get admin activity logs
 */
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.admin_action.findMany({
      include: {
        users_admin_action_admin_idTousers: {
          select: { full_name: true },
        },
        users_admin_action_target_user_idTousers: {
          select: { full_name: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    return sendSuccess(res, 200, "Activity logs retrieved", {
      count: logs.length,
      logs: logs.map((l) => ({
        id: l.action_id,
        type: l.action_type,
        description: l.action_description,
        adminName: l.users_admin_action_admin_idTousers?.full_name || "System",
        targetName: l.users_admin_action_target_user_idTousers?.full_name || "N/A",
        timestamp: l.timestamp,
      })),
    });
  } catch (error) {
    console.error("Error getting activity logs:", error);
    return sendError(res, 500, "Failed to get activity logs");
  }
};

/**
 * DELETE /admin/users/:userId
 * Delete/suspend a user
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await prisma.users.findUnique({
      where: { user_id: parseInt(userId) },
    });

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    // Log action
    await prisma.admin_action.create({
      data: {
        action_type: "user_deleted",
        target_user_id: parseInt(userId),
        action_description: `User ${user.full_name} deleted. Reason: ${reason || "N/A"}`,
      },
    });

    // Delete user
    await prisma.users.delete({
      where: { user_id: parseInt(userId) },
    });

    return sendSuccess(res, 200, "User deleted successfully", {
      userId,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return sendError(res, 500, "Failed to delete user");
  }
};
