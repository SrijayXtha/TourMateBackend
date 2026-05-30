import { Request, Response } from "express";
import { prisma } from "../prisma";
import { sendSuccess, sendError } from "../utils/response";

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const parseOptionalCoordinate = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStringList = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeText(item)).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const mapDestination = (destination: any) => ({
  destinationId: destination.destination_id,
  name: destination.name,
  location: destination.location,
  latitude:
    destination.latitude === null || destination.latitude === undefined
      ? null
      : Number(destination.latitude),
  longitude:
    destination.longitude === null || destination.longitude === undefined
      ? null
      : Number(destination.longitude),
  description: destination.description,
  image: destination.image,
  category: destination.category,
  popularityScore: destination.popularity_score,
  difficulty: destination.difficulty,
  duration: destination.duration,
  bestTime: destination.best_time,
  pricePerDayNpr:
    destination.price_per_day_npr === null || destination.price_per_day_npr === undefined
      ? null
      : Number(destination.price_per_day_npr),
  activities: parseStringList(destination.activities),
  highlights: parseStringList(destination.highlights),
  createdAt: destination.created_at,
  updatedAt: destination.updated_at,
});

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
 * GET /admin/destinations
 * List all destinations for admin management
 */
export const getDestinations = async (req: Request, res: Response) => {
  try {
    const destinations = await prisma.destination.findMany({
      orderBy: [{ name: "asc" }],
    });

    return sendSuccess(res, 200, "Destinations retrieved", {
      count: destinations.length,
      destinations: destinations.map(mapDestination),
    });
  } catch (error) {
    console.error("Error getting destinations:", error);
    return sendError(res, 500, "Failed to get destinations");
  }
};

/**
 * POST /admin/destinations
 * Create a destination
 */
export const createDestination = async (req: Request, res: Response) => {
  try {
    const name = normalizeText(req.body.name);
    const location = normalizeText(req.body.location ?? req.body.address);
    const description = normalizeText(req.body.description) || null;
    const image = normalizeText(req.body.image) || null;
    const category = normalizeText(req.body.category ?? req.body.type) || null;
    const latitude = parseOptionalCoordinate(req.body.latitude);
    const longitude = parseOptionalCoordinate(req.body.longitude);
    const popularityScore = parseOptionalCoordinate(
      req.body.popularityScore ?? req.body.safetyRating
    );
    const difficulty = normalizeText(req.body.difficulty) || null;
    const duration = normalizeText(req.body.duration) || null;
    const bestTime = normalizeText(req.body.bestTime) || null;
    const pricePerDayNpr = parseOptionalCoordinate(req.body.pricePerDayNpr);
    const activities = parseStringList(req.body.activities);
    const highlights = parseStringList(req.body.highlights);

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Destination name is required.";
    if (!location) errors.location = "Destination location is required.";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Destination validation failed",
        errors,
      });
    }

    const destination = await prisma.destination.create({
      data: {
        name,
        location,
        latitude,
        longitude,
        description,
        image,
        category,
        popularity_score: popularityScore,
        difficulty,
        duration,
        best_time: bestTime,
        price_per_day_npr: pricePerDayNpr === null ? null : Math.round(pricePerDayNpr),
        activities: activities.length > 0 ? JSON.stringify(activities) : null,
        highlights: highlights.length > 0 ? JSON.stringify(highlights) : null,
      },
    });

    await prisma.admin_action.create({
      data: {
        admin_id: req.user?.id,
        action_type: "destination_created",
        action_description: `Destination ${destination.name} created.`,
      },
    });

    return sendSuccess(res, 201, "Destination created", {
      destination: mapDestination(destination),
    });
  } catch (error) {
    console.error("Error creating destination:", error);
    return sendError(res, 500, "Failed to create destination");
  }
};

/**
 * PUT /admin/destinations/:id
 * Update a destination
 */
export const updateDestination = async (req: Request, res: Response) => {
  try {
    const destinationId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(destinationId) || destinationId <= 0) {
      return sendError(res, 400, "Invalid destination id");
    }

    const name = normalizeText(req.body.name);
    const location = normalizeText(req.body.location ?? req.body.address);
    const description = normalizeText(req.body.description) || null;
    const image = normalizeText(req.body.image) || null;
    const category = normalizeText(req.body.category ?? req.body.type) || null;
    const latitude = parseOptionalCoordinate(req.body.latitude);
    const longitude = parseOptionalCoordinate(req.body.longitude);
    const popularityScore = parseOptionalCoordinate(
      req.body.popularityScore ?? req.body.safetyRating
    );
    const difficulty = normalizeText(req.body.difficulty) || null;
    const duration = normalizeText(req.body.duration) || null;
    const bestTime = normalizeText(req.body.bestTime) || null;
    const pricePerDayNpr = parseOptionalCoordinate(req.body.pricePerDayNpr);
    const activities = parseStringList(req.body.activities);
    const highlights = parseStringList(req.body.highlights);

    const existing = await prisma.destination.findUnique({
      where: { destination_id: destinationId },
    });

    if (!existing) {
      return sendError(res, 404, "Destination not found");
    }

    const destination = await prisma.destination.update({
      where: { destination_id: destinationId },
      data: {
        name: name || existing.name,
        location: location || existing.location,
        description,
        image,
        category,
        latitude,
        longitude,
        popularity_score: popularityScore,
        difficulty,
        duration,
        best_time: bestTime,
        price_per_day_npr: pricePerDayNpr === null ? null : Math.round(pricePerDayNpr),
        activities: activities.length > 0 ? JSON.stringify(activities) : null,
        highlights: highlights.length > 0 ? JSON.stringify(highlights) : null,
      },
    });

    await prisma.admin_action.create({
      data: {
        admin_id: req.user?.id,
        action_type: "destination_updated",
        action_description: `Destination ${destination.name} updated.`,
      },
    });

    return sendSuccess(res, 200, "Destination updated", {
      destination: mapDestination(destination),
    });
  } catch (error) {
    console.error("Error updating destination:", error);
    return sendError(res, 500, "Failed to update destination");
  }
};

/**
 * DELETE /admin/destinations/:id
 * Delete a destination
 */
export const deleteDestination = async (req: Request, res: Response) => {
  try {
    const destinationId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(destinationId) || destinationId <= 0) {
      return sendError(res, 400, "Invalid destination id");
    }

    const destination = await prisma.destination.findUnique({
      where: { destination_id: destinationId },
    });

    if (!destination) {
      return sendError(res, 404, "Destination not found");
    }

    await prisma.destination.delete({
      where: { destination_id: destinationId },
    });

    await prisma.admin_action.create({
      data: {
        admin_id: req.user?.id,
        action_type: "destination_deleted",
        action_description: `Destination ${destination.name} deleted.`,
      },
    });

    return sendSuccess(res, 200, "Destination deleted", {
      destinationId,
    });
  } catch (error) {
    console.error("Error deleting destination:", error);
    return sendError(res, 500, "Failed to delete destination");
  }
};

/**
 * GET /admin/destination-requests
 * List guide destination requests
 */
export const getDestinationRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.destination_request.findMany({
      include: {
        guide: {
          include: {
            users: {
              select: {
                full_name: true,
                email: true,
              },
            },
          },
        },
        destination_approved: true,
      },
      orderBy: [{ created_at: "desc" }],
    });

    return sendSuccess(res, 200, "Destination requests retrieved", {
      count: requests.length,
      requests: requests.map((request) => ({
        requestId: request.request_id,
        guideId: request.guide_id,
        guideName: request.guide?.users?.full_name || request.requester_name || "Guide",
        guideEmail: request.guide?.users?.email || request.requester_email || null,
        destinationName: request.destination_name,
        location: request.location,
        reason: request.reason,
        image: request.image,
        latitude:
          request.latitude === null || request.latitude === undefined
            ? null
            : Number(request.latitude),
        longitude:
          request.longitude === null || request.longitude === undefined
            ? null
            : Number(request.longitude),
        status: request.status,
        rejectionReason: request.rejection_reason,
        approvedDestinationId: request.approved_destination_id,
        approvedDestinationName: request.destination_approved?.name || null,
        createdAt: request.created_at,
        reviewedAt: request.reviewed_at,
      })),
    });
  } catch (error) {
    console.error("Error getting destination requests:", error);
    return sendError(res, 500, "Failed to get destination requests");
  }
};

/**
 * PATCH /admin/destination-requests/:id/approve
 * Approve a destination request and create destination if needed
 */
export const approveDestinationRequest = async (req: Request, res: Response) => {
  try {
    const requestId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return sendError(res, 400, "Invalid destination request id");
    }

    const request = await prisma.destination_request.findUnique({
      where: { request_id: requestId },
    });

    if (!request) {
      return sendError(res, 404, "Destination request not found");
    }

    if (request.status === "approved") {
      return sendError(res, 400, "Destination request already approved");
    }

    const destination = await prisma.destination.create({
      data: {
        name: request.destination_name,
        location: request.location,
        latitude: request.latitude,
        longitude: request.longitude,
        image: request.image,
        description: request.reason,
        category: normalizeText(req.body.category) || "Requested",
        popularity_score: parseOptionalCoordinate(req.body.popularityScore),
      },
    });

    await prisma.destination_request.update({
      where: { request_id: requestId },
      data: {
        status: "approved",
        approved_destination_id: destination.destination_id,
        reviewed_at: new Date(),
        rejection_reason: null,
      },
    });

    if (request.guide_id) {
      await prisma.notification.create({
        data: {
          user_id: request.guide_id,
          title: "Destination request approved",
          message: `${request.destination_name} has been approved and added to TourMate.`,
          type: "destination_request",
          is_read: false,
        },
      });
    }

    await prisma.admin_action.create({
      data: {
        admin_id: req.user?.id,
        target_user_id: request.guide_id || undefined,
        action_type: "destination_request_approved",
        action_description: `Destination request ${request.destination_name} approved.`,
      },
    });

    return sendSuccess(res, 200, "Destination request approved", {
      requestId,
      destination: mapDestination(destination),
    });
  } catch (error) {
    console.error("Error approving destination request:", error);
    return sendError(res, 500, "Failed to approve destination request");
  }
};

/**
 * PATCH /admin/destination-requests/:id/reject
 * Reject a destination request
 */
export const rejectDestinationRequest = async (req: Request, res: Response) => {
  try {
    const requestId = Number.parseInt(req.params.id, 10);
    const reason = normalizeText(req.body.reason) || "Request rejected by admin.";
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return sendError(res, 400, "Invalid destination request id");
    }

    const request = await prisma.destination_request.findUnique({
      where: { request_id: requestId },
    });

    if (!request) {
      return sendError(res, 404, "Destination request not found");
    }

    await prisma.destination_request.update({
      where: { request_id: requestId },
      data: {
        status: "rejected",
        rejection_reason: reason,
        reviewed_at: new Date(),
      },
    });

    if (request.guide_id) {
      await prisma.notification.create({
        data: {
          user_id: request.guide_id,
          title: "Destination request rejected",
          message: `${request.destination_name} was rejected: ${reason}`,
          type: "destination_request",
          is_read: false,
        },
      });
    }

    await prisma.admin_action.create({
      data: {
        admin_id: req.user?.id,
        target_user_id: request.guide_id || undefined,
        action_type: "destination_request_rejected",
        action_description: `Destination request ${request.destination_name} rejected. Reason: ${reason}`,
      },
    });

    return sendSuccess(res, 200, "Destination request rejected", {
      requestId,
      reason,
    });
  } catch (error) {
    console.error("Error rejecting destination request:", error);
    return sendError(res, 500, "Failed to reject destination request");
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
