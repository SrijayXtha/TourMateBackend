import { Request, Response } from "express";
import { prisma } from "../prisma";
import { sendSuccess, sendError } from "../utils/response";

interface SavedPlace {
  id: string;
  name: string;
  location?: string;
  image?: string;
  notes?: string;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  label: string;
  brand?: string;
  last4: string;
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
  createdAt: string;
}

interface TouristPrivacySettings {
  profileVisibility: "public" | "private";
  shareLocation: boolean;
  twoFactorEnabled: boolean;
}

const parseOptionalId = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const parseDateInput = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parsePriceInput = (value: unknown): number | null => {
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

const toJsonString = (value: unknown): string => JSON.stringify(value);

const buildDefaultPrivacySettings = (): TouristPrivacySettings => ({
  profileVisibility: "public",
  shareLocation: true,
  twoFactorEnabled: false,
});

const parsePagination = (pageValue: unknown, limitValue: unknown) => {
  const page = Math.max(1, Number.parseInt(String(pageValue || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue || "20"), 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * GET /tourist/profile
 * Get tourist profile data
 */
export const getTouristProfile = async (req: Request, res: Response) => {
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
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    const tourist = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: {
        emergency_contact: true,
        preferences: true,
        saved_places: true,
        payment_methods: true,
        privacy_settings: true,
      },
    });

    const preferences = safeJsonParse<string[]>(tourist?.preferences, []);
    const savedPlaces = safeJsonParse<SavedPlace[]>(tourist?.saved_places, []);
    const paymentMethods = safeJsonParse<PaymentMethod[]>(tourist?.payment_methods, []);
    const privacySettings = safeJsonParse<TouristPrivacySettings>(
      tourist?.privacy_settings,
      buildDefaultPrivacySettings()
    );

    return sendSuccess(res, 200, "Profile retrieved", {
      ...user,
      emergencyContact: tourist?.emergency_contact,
      preferences,
      savedPlaces,
      paymentMethods,
      privacySettings,
    });
  } catch (error) {
    console.error("Error getting tourist profile:", error);
    return sendError(
      res,
      500,
      process.env.NODE_ENV === "development"
        ? (error as Error).message
        : "Failed to get profile"
    );
  }
};

/**
 * GET /tourist/dashboard
 * Get tourist dashboard with stats and quick info
 */
export const getTouristDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    // Get user info
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { full_name: true, email: true },
    });

    // Get active bookings
    const activeBookings = await prisma.booking.findMany({
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
    const totalBookings = await prisma.booking.count({
      where: { tourist_id: userId },
    });

    const totalReviews = await prisma.review.count({
      where: { tourist_id: userId },
    });

    const savedPlaces = totalReviews; // Mock: using reviews count as saved places

    return sendSuccess(res, 200, "Dashboard data retrieved", {
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
  } catch (error) {
    console.error("Error getting tourist dashboard:", error);
    return sendError(
      res,
      500,
      process.env.NODE_ENV === "development"
        ? (error as Error).message
        : "Failed to get dashboard"
    );
  }
};

/**
 * GET /tourist/bookings
 * Get all tourist bookings
 */
export const getTouristBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const bookings = await prisma.booking.findMany({
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

    return sendSuccess(res, 200, "Bookings retrieved", {
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
  } catch (error) {
    console.error("Error getting bookings:", error);
    return sendError(res, 500, "Failed to get bookings");
  }
};

/**
 * POST /tourist/bookings
 * Create a new booking
 */
export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { guideId, hotelId, startDate, endDate, totalPrice } = req.body;

    const parsedGuideId = parseOptionalId(guideId);
    const parsedHotelId = parseOptionalId(hotelId);

    if (Number.isNaN(parsedGuideId) || Number.isNaN(parsedHotelId)) {
      return sendError(res, 400, "Guide ID and hotel ID must be valid positive integers");
    }

    if (!startDate || !endDate) {
      return sendError(res, 400, "Start date and end date are required");
    }

    if (!parsedGuideId && !parsedHotelId) {
      return sendError(res, 400, "Either guide or hotel is required");
    }

    if (parsedGuideId && parsedHotelId) {
      return sendError(res, 400, "Booking must target either a guide or a hotel, not both");
    }

    const parsedStartDate = parseDateInput(startDate);
    const parsedEndDate = parseDateInput(endDate);

    if (!parsedStartDate || !parsedEndDate) {
      return sendError(res, 400, "Invalid booking dates provided");
    }

    if (parsedEndDate <= parsedStartDate) {
      return sendError(res, 400, "End date must be after start date");
    }

    const parsedPrice = parsePriceInput(totalPrice);
    if (Number.isNaN(parsedPrice)) {
      return sendError(res, 400, "Total price must be a valid non-negative number");
    }

    if (parsedGuideId) {
      const guide = await prisma.guide.findUnique({
        where: { guide_id: parsedGuideId },
        select: { guide_id: true, verified_status: true },
      });

      if (!guide) {
        return sendError(res, 404, "Guide not found");
      }

      if (guide.verified_status !== true) {
        return sendError(res, 400, "This guide is not yet verified for bookings");
      }
    }

    if (parsedHotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { hotel_id: parsedHotelId },
        select: { hotel_id: true },
      });

      if (!hotel) {
        return sendError(res, 404, "Hotel not found");
      }
    }

    const booking = await prisma.booking.create({
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
      await prisma.notification.create({
        data: {
          user_id: recipientUserId,
          title: "New booking request",
          message: `Booking request received for ${parsedStartDate.toDateString()} - ${parsedEndDate.toDateString()}.`,
          type: "booking",
          is_read: false,
        },
      });
    }

    await prisma.notification.create({
      data: {
        user_id: userId,
        title: "Booking submitted",
        message: "Your booking request has been submitted and is awaiting confirmation.",
        type: "booking",
        is_read: false,
      },
    });

    return sendSuccess(res, 201, "Booking created successfully", {
      bookingId: booking.booking_id,
      type: booking.guide_id ? "guide" : "hotel",
      status: booking.status,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return sendError(res, 500, "Failed to create booking");
  }
};

/**
 * GET /tourist/reviews
 * Get tourist's reviews
 */
export const getTouristReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const reviews = await prisma.review.findMany({
      where: { tourist_id: userId },
      orderBy: { created_at: "desc" },
    });

    return sendSuccess(res, 200, "Reviews retrieved", {
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Error getting reviews:", error);
    return sendError(res, 500, "Failed to get reviews");
  }
};

/**
 * POST /tourist/reviews
 * Create a review
 */
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { guideId, hotelId, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 400, "Rating must be between 1 and 5");
    }

    if (!guideId && !hotelId) {
      return sendError(res, 400, "Either guide or hotel is required");
    }

    const review = await prisma.review.create({
      data: {
        tourist_id: userId,
        guide_id: guideId || null,
        hotel_id: hotelId || null,
        rating,
        comment: comment || null,
      },
    });

    return sendSuccess(res, 201, "Review created successfully", {
      reviewId: review.review_id,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return sendError(res, 500, "Failed to create review");
  }
};

/**
 * POST /tourist/sos
 * Report SOS emergency
 */
export const reportSOS = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { location, description } = req.body;

    if (!location) {
      return sendError(res, 400, "Location is required");
    }

    const sosReport = await prisma.sos_report.create({
      data: {
        tourist_id: userId,
        location,
        description: description || null,
        status: "active",
      },
    });

    const admins = await prisma.users.findMany({
      where: { role: "admin" },
      select: { user_id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          user_id: admin.user_id,
          title: "SOS alert received",
          message: `Tourist #${userId} triggered an SOS at ${location}.`,
          type: "sos",
          is_read: false,
        })),
      });
    }

    await prisma.notification.create({
      data: {
        user_id: userId,
        title: "SOS alert sent",
        message: "Your SOS alert was successfully sent to emergency responders.",
        type: "sos",
        is_read: false,
      },
    });

    return sendSuccess(res, 201, "SOS report created", {
      reportId: sosReport.report_id,
      status: sosReport.status,
    });
  } catch (error) {
    console.error("Error creating SOS report:", error);
    return sendError(res, 500, "Failed to create SOS report");
  }
};

/**
 * POST /tourist/incidents
 * Report an incident
 */
export const reportIncident = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { bookingId, incidentType, details, location } = req.body;

    const parsedBookingId = parseOptionalId(bookingId);
    if (Number.isNaN(parsedBookingId)) {
      return sendError(res, 400, "Booking ID must be a valid positive integer");
    }

    if (!incidentType || !details) {
      return sendError(res, 400, "Incident type and details are required");
    }

    if (parsedBookingId) {
      const booking = await prisma.booking.findUnique({
        where: { booking_id: parsedBookingId },
        select: { booking_id: true, tourist_id: true },
      });

      if (!booking) {
        return sendError(res, 404, "Booking not found");
      }

      if (booking.tourist_id !== userId) {
        return sendError(res, 403, "You can only report incidents for your own bookings");
      }
    }

    const trimmedIncidentType = String(incidentType).trim();
    const trimmedDetails = String(details).trim();

    if (!trimmedIncidentType || !trimmedDetails) {
      return sendError(res, 400, "Incident type and details are required");
    }

    const incident = await prisma.incident_report.create({
      data: {
        tourist_id: userId,
        booking_id: parsedBookingId,
        incident_type: trimmedIncidentType,
        details: trimmedDetails,
        location: location ? String(location).trim() : null,
      },
    });

    const admins = await prisma.users.findMany({
      where: { role: "admin" },
      select: { user_id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          user_id: admin.user_id,
          title: "New incident report",
          message: `Incident type: ${trimmedIncidentType}. Tourist ID: ${userId}.`,
          type: "incident",
          is_read: false,
        })),
      });
    }

    await prisma.notification.create({
      data: {
        user_id: userId,
        title: "Incident submitted",
        message: "Your incident report has been submitted for review.",
        type: "incident",
        is_read: false,
      },
    });

    return sendSuccess(res, 201, "Incident reported", {
      incidentId: incident.incident_id,
    });
  } catch (error) {
    console.error("Error reporting incident:", error);
    return sendError(res, 500, "Failed to report incident");
  }
};

/**
 * PATCH /tourist/profile
 * Update tourist profile settings
 */
export const updateTouristProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const {
      fullName,
      phone,
      emergencyContact,
      preferences,
    }: {
      fullName?: string;
      phone?: string;
      emergencyContact?: string;
      preferences?: string[];
    } = req.body;

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        full_name: fullName?.trim() || undefined,
        phone: phone?.trim() || undefined,
      },
    });

    const updatedTourist = await prisma.tourist.update({
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

    return sendSuccess(res, 200, "Tourist profile updated", {
      emergencyContact: updatedTourist.emergency_contact,
      preferences: safeJsonParse<string[]>(updatedTourist.preferences, []),
    });
  } catch (error) {
    console.error("Error updating tourist profile:", error);
    return sendError(res, 500, "Failed to update tourist profile");
  }
};

/**
 * GET /tourist/saved-places
 * Get tourist saved places
 */
export const getSavedPlaces = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const tourist = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: { saved_places: true },
    });

    const savedPlaces = safeJsonParse<SavedPlace[]>(tourist?.saved_places, []);

    return sendSuccess(res, 200, "Saved places retrieved", {
      count: savedPlaces.length,
      places: savedPlaces,
    });
  } catch (error) {
    console.error("Error getting saved places:", error);
    return sendError(res, 500, "Failed to get saved places");
  }
};

/**
 * POST /tourist/saved-places
 * Add a place to saved places
 */
export const addSavedPlace = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { name, location, image, notes } = req.body as {
      name?: string;
      location?: string;
      image?: string;
      notes?: string;
    };

    if (!name || !name.trim()) {
      return sendError(res, 400, "Place name is required");
    }

    const tourist = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: { saved_places: true },
    });

    const savedPlaces = safeJsonParse<SavedPlace[]>(tourist?.saved_places, []);
    const newPlace: SavedPlace = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      location: location?.trim(),
      image: image?.trim(),
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedPlaces = [newPlace, ...savedPlaces];

    await prisma.tourist.update({
      where: { tourist_id: userId },
      data: {
        saved_places: toJsonString(updatedPlaces),
      },
    });

    return sendSuccess(res, 201, "Place saved", {
      place: newPlace,
      count: updatedPlaces.length,
    });
  } catch (error) {
    console.error("Error adding saved place:", error);
    return sendError(res, 500, "Failed to save place");
  }
};

/**
 * DELETE /tourist/saved-places/:placeId
 * Remove a saved place
 */
export const removeSavedPlace = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.params;

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const tourist = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: { saved_places: true },
    });

    const savedPlaces = safeJsonParse<SavedPlace[]>(tourist?.saved_places, []);
    const updatedPlaces = savedPlaces.filter((place) => place.id !== placeId);

    await prisma.tourist.update({
      where: { tourist_id: userId },
      data: {
        saved_places: toJsonString(updatedPlaces),
      },
    });

    return sendSuccess(res, 200, "Saved place removed", {
      count: updatedPlaces.length,
    });
  } catch (error) {
    console.error("Error removing saved place:", error);
    return sendError(res, 500, "Failed to remove saved place");
  }
};

/**
 * GET /tourist/payment-methods
 * Get payment methods for tourist
 */
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const tourist = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: { payment_methods: true },
    });

    const methods = safeJsonParse<PaymentMethod[]>(tourist?.payment_methods, []);

    return sendSuccess(res, 200, "Payment methods retrieved", {
      count: methods.length,
      methods,
    });
  } catch (error) {
    console.error("Error getting payment methods:", error);
    return sendError(res, 500, "Failed to get payment methods");
  }
};

/**
 * POST /tourist/payment-methods
 * Add payment method
 */
export const addPaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { label, brand, last4, expiryMonth, expiryYear, isDefault } = req.body as {
      label?: string;
      brand?: string;
      last4?: string;
      expiryMonth?: string;
      expiryYear?: string;
      isDefault?: boolean;
    };

    if (!label || !last4) {
      return sendError(res, 400, "Payment method label and last4 are required");
    }

    const tourist = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: { payment_methods: true },
    });

    const methods = safeJsonParse<PaymentMethod[]>(tourist?.payment_methods, []);
    const newMethod: PaymentMethod = {
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

    await prisma.tourist.update({
      where: { tourist_id: userId },
      data: {
        payment_methods: toJsonString(updatedMethods),
      },
    });

    return sendSuccess(res, 201, "Payment method added", {
      method: newMethod,
      count: updatedMethods.length,
    });
  } catch (error) {
    console.error("Error adding payment method:", error);
    return sendError(res, 500, "Failed to add payment method");
  }
};

/**
 * DELETE /tourist/payment-methods/:methodId
 * Remove payment method
 */
export const removePaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { methodId } = req.params;

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const tourist = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: { payment_methods: true },
    });

    const methods = safeJsonParse<PaymentMethod[]>(tourist?.payment_methods, []);
    const updatedMethods = methods.filter((method) => method.id !== methodId);

    if (updatedMethods.length > 0 && !updatedMethods.some((method) => method.isDefault)) {
      updatedMethods[0] = {
        ...updatedMethods[0],
        isDefault: true,
      };
    }

    await prisma.tourist.update({
      where: { tourist_id: userId },
      data: {
        payment_methods: toJsonString(updatedMethods),
      },
    });

    return sendSuccess(res, 200, "Payment method removed", {
      count: updatedMethods.length,
    });
  } catch (error) {
    console.error("Error removing payment method:", error);
    return sendError(res, 500, "Failed to remove payment method");
  }
};

/**
 * PATCH /tourist/privacy-settings
 * Update privacy and security preferences
 */
export const updatePrivacySettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const current = await prisma.tourist.findUnique({
      where: { tourist_id: userId },
      select: { privacy_settings: true },
    });

    const existing = safeJsonParse<TouristPrivacySettings>(
      current?.privacy_settings,
      buildDefaultPrivacySettings()
    );

    const updates = req.body as Partial<TouristPrivacySettings>;
    const merged: TouristPrivacySettings = {
      profileVisibility:
        updates.profileVisibility === "private" ? "private" : updates.profileVisibility === "public" ? "public" : existing.profileVisibility,
      shareLocation:
        typeof updates.shareLocation === "boolean" ? updates.shareLocation : existing.shareLocation,
      twoFactorEnabled:
        typeof updates.twoFactorEnabled === "boolean"
          ? updates.twoFactorEnabled
          : existing.twoFactorEnabled,
    };

    await prisma.tourist.update({
      where: { tourist_id: userId },
      data: {
        privacy_settings: toJsonString(merged),
      },
    });

    return sendSuccess(res, 200, "Privacy settings updated", {
      privacySettings: merged,
    });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return sendError(res, 500, "Failed to update privacy settings");
  }
};

/**
 * GET /tourist/notifications
 * Get tourist notifications
 */
export const getTouristNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { user_id: userId } }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });

    return sendSuccess(res, 200, "Notifications retrieved", {
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
    console.error("Error getting tourist notifications:", error);
    return sendError(res, 500, "Failed to get notifications");
  }
};

/**
 * PATCH /tourist/notifications/:notificationId/read
 * Mark a notification as read
 */
export const markTouristNotificationRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number.parseInt(req.params.notificationId, 10);

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return sendError(res, 400, "Invalid notification id");
    }

    const existing = await prisma.notification.findUnique({
      where: { notification_id: notificationId },
      select: { notification_id: true, user_id: true },
    });

    if (!existing || existing.user_id !== userId) {
      return sendError(res, 404, "Notification not found");
    }

    await prisma.notification.update({
      where: { notification_id: notificationId },
      data: { is_read: true },
    });

    return sendSuccess(res, 200, "Notification marked as read");
  } catch (error) {
    console.error("Error marking tourist notification as read:", error);
    return sendError(res, 500, "Failed to update notification");
  }
};

/**
 * PATCH /tourist/notifications/read-all
 * Mark all notifications as read
 */
export const markAllTouristNotificationsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const result = await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    return sendSuccess(res, 200, "All notifications marked as read", {
      updated: result.count,
    });
  } catch (error) {
    console.error("Error marking all tourist notifications as read:", error);
    return sendError(res, 500, "Failed to update notifications");
  }
};

/**
 * DELETE /tourist/notifications/:notificationId
 * Delete notification
 */
export const deleteTouristNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number.parseInt(req.params.notificationId, 10);

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return sendError(res, 400, "Invalid notification id");
    }

    const existing = await prisma.notification.findUnique({
      where: { notification_id: notificationId },
      select: { notification_id: true, user_id: true },
    });

    if (!existing || existing.user_id !== userId) {
      return sendError(res, 404, "Notification not found");
    }

    await prisma.notification.delete({
      where: { notification_id: notificationId },
    });

    return sendSuccess(res, 200, "Notification deleted");
  } catch (error) {
    console.error("Error deleting tourist notification:", error);
    return sendError(res, 500, "Failed to delete notification");
  }
};

/**
 * GET /tourist/messages
 * Get tourist messages with guides from confirmed bookings
 */
export const getTouristMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const parsedBookingId = parseOptionalId(req.query.bookingId);
    if (Number.isNaN(parsedBookingId)) {
      return sendError(res, 400, "bookingId must be a valid positive integer");
    }

    let allowedGuideIds: number[] = [];

    if (parsedBookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          booking_id: parsedBookingId,
          tourist_id: userId,
          status: "confirmed",
          guide_id: { not: null },
        },
        select: { guide_id: true },
      });

      if (!booking?.guide_id) {
        return sendSuccess(res, 200, "Messages retrieved", {
          count: 0,
          messages: [],
        });
      }

      allowedGuideIds = [booking.guide_id];
    } else {
      const confirmedBookings = await prisma.booking.findMany({
        where: {
          tourist_id: userId,
          status: "confirmed",
          guide_id: { not: null },
        },
        select: { guide_id: true },
      });

      allowedGuideIds = Array.from(
        new Set(
          confirmedBookings
            .map((item) => item.guide_id)
            .filter((value): value is number => Number.isInteger(value))
        )
      );
    }

    if (allowedGuideIds.length === 0) {
      return sendSuccess(res, 200, "Messages retrieved", {
        count: 0,
        messages: [],
      });
    }

    const allowedMessagePairs = allowedGuideIds.flatMap((guideId) => [
      { sender_id: userId, receiver_id: guideId },
      { sender_id: guideId, receiver_id: userId },
    ]);

    const messages = await prisma.message.findMany({
      where: {
        OR: allowedMessagePairs,
      },
      include: {
        users_message_sender: { select: { user_id: true, full_name: true, role: true } },
        users_message_receiver: { select: { user_id: true, full_name: true, role: true } },
      },
      orderBy: { sent_at: "desc" },
      take: 100,
    });

    return sendSuccess(res, 200, "Messages retrieved", {
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
  } catch (error) {
    console.error("Error getting tourist messages:", error);
    return sendError(res, 500, "Failed to get messages");
  }
};

/**
 * POST /tourist/messages
 * Send message from tourist to a guide with confirmed booking
 */
export const sendTouristMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { receiverId, bookingId, content } = req.body as {
      receiverId?: number;
      bookingId?: number;
      content?: string;
    };

    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    if (!content || !content.trim()) {
      return sendError(res, 400, "Message content is required");
    }

    const parsedBookingId = parseOptionalId(bookingId);
    if (Number.isNaN(parsedBookingId)) {
      return sendError(res, 400, "bookingId must be a valid positive integer");
    }

    let resolvedReceiverId: number | null = null;

    if (parsedBookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          booking_id: parsedBookingId,
          tourist_id: userId,
          status: "confirmed",
          guide_id: { not: null },
        },
        select: { guide_id: true },
      });

      if (!booking?.guide_id) {
        return sendError(res, 403, "Chat is enabled only after booking is accepted");
      }

      resolvedReceiverId = booking.guide_id;
    }

    if (!resolvedReceiverId) {
      const parsedReceiverId = parseOptionalId(receiverId);
      if (!parsedReceiverId || Number.isNaN(parsedReceiverId)) {
        return sendError(res, 400, "bookingId or receiverId is required");
      }
      resolvedReceiverId = parsedReceiverId;
    }

    const hasConfirmedBooking = await prisma.booking.findFirst({
      where: {
        tourist_id: userId,
        guide_id: resolvedReceiverId,
        status: "confirmed",
      },
      select: { booking_id: true },
    });

    if (!hasConfirmedBooking) {
      return sendError(res, 403, "Chat is enabled only after booking is accepted");
    }

    const receiver = await prisma.users.findUnique({
      where: { user_id: resolvedReceiverId },
      select: { user_id: true },
    });

    if (!receiver) {
      return sendError(res, 404, "Receiver not found");
    }

    const message = await prisma.message.create({
      data: {
        sender_id: userId,
        receiver_id: receiver.user_id,
        content: content.trim(),
      },
    });

    await prisma.notification.create({
      data: {
        user_id: receiver.user_id,
        title: "New message",
        message: "You received a new message from your tourist.",
        type: "message",
        is_read: false,
      },
    });

    return sendSuccess(res, 201, "Message sent", {
      messageId: message.message_id,
      sentAt: message.sent_at,
      receiverId: resolvedReceiverId,
      bookingId: hasConfirmedBooking.booking_id,
    });
  } catch (error) {
    console.error("Error sending tourist message:", error);
    return sendError(res, 500, "Failed to send message");
  }
};
