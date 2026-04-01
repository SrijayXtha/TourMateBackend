import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { sendSuccess, sendError } from "../utils/response";

const router = Router();

/**
 * Public endpoints - No authentication required
 */

/**
 * GET /public/guides
 * List all verified guides with ratings
 */
router.get("/guides", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", destination } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const guides = await prisma.guide.findMany({
      where: {
        verified_status: true,
      },
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
            phone: true,
          },
        },
        review: {
          select: {
            rating: true,
          },
        },
      },
      skip,
      take,
      orderBy: { experience_years: "desc" },
    });

    const total = await prisma.guide.count({
      where: { verified_status: true },
    });

    return sendSuccess(res, 200, "Guides retrieved", {
      guides: guides.map((g) => ({
        guideId: g.guide_id,
        name: g.users.full_name,
        email: g.users.email,
        phone: g.users.phone,
        bio: g.bio,
        experienceYears: g.experience_years,
        avgRating:
          g.review.length > 0
            ? (g.review.reduce((sum: number, r) => sum + (r.rating || 0), 0) / g.review.length).toFixed(2)
            : "N/A",
        reviewCount: g.review.length,
      })),
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error getting guides:", error);
    return sendError(res, 500, "Failed to get guides");
  }
});

/**
 * GET /public/guides/:guideId
 * Get guide details with reviews
 */
router.get("/guides/:guideId", async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;

    const guide = await prisma.guide.findUnique({
      where: { guide_id: parseInt(guideId) },
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
        review: {
          include: {
            tourist: {
              include: {
                users: {
                  select: { full_name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!guide) {
      return sendError(res, 404, "Guide not found");
    }

    const avgRating =
      guide.review.length > 0
        ? (guide.review.reduce((sum: number, r) => sum + (r.rating || 0), 0) / guide.review.length).toFixed(2)
        : "0";

    return sendSuccess(res, 200, "Guide details retrieved", {
      guideId: guide.guide_id,
      name: guide.users.full_name,
      email: guide.users.email,
      phone: guide.users.phone,
      bio: guide.bio,
      experienceYears: guide.experience_years,
      licenseNumber: guide.license_number,
      avgRating,
      reviews: guide.review.map((r) => ({
        id: r.review_id,
        rating: r.rating,
        comment: r.comment,
        touristName: r.tourist?.users?.full_name,
        createdAt: r.created_at,
      })),
      memberSince: guide.users.created_at,
    });
  } catch (error) {
    console.error("Error getting guide details:", error);
    return sendError(res, 500, "Failed to get guide details");
  }
});

/**
 * GET /public/hotels
 * List all hotels with ratings
 */
router.get("/hotels", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10" } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const hotels = await prisma.hotel.findMany({
      where: {
        verified_status: true,
      },
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
            phone: true,
          },
        },
        review: {
          select: {
            rating: true,
          },
        },
      },
      skip,
      take,
      orderBy: { hotel_id: "desc" },
    });

    const total = await prisma.hotel.count({ where: { verified_status: true } });

    return sendSuccess(res, 200, "Hotels retrieved", {
      hotels: hotels.map((h) => ({
        hotelId: h.hotel_id,
        name: h.hotel_name,
        location: h.location,
        description: h.description,
        avgRating:
          h.review.length > 0
            ? (h.review.reduce((sum: number, r) => sum + (r.rating || 0), 0) / h.review.length).toFixed(2)
            : "N/A",
        reviewCount: h.review.length,
      })),
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error getting hotels:", error);
    return sendError(res, 500, "Failed to get hotels");
  }
});

/**
 * GET /public/hotels/:hotelId
 * Get hotel details with reviews
 */
router.get("/hotels/:hotelId", async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;

    const hotel = await prisma.hotel.findUnique({
      where: { hotel_id: parseInt(hotelId) },
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
        review: {
          include: {
            tourist: {
              include: {
                users: {
                  select: { full_name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!hotel) {
      return sendError(res, 404, "Hotel not found");
    }

    if (!hotel.verified_status) {
      return sendError(res, 404, "Hotel not found");
    }

    const avgRating =
      hotel.review.length > 0
        ? (hotel.review.reduce((sum: number, r) => sum + (r.rating || 0), 0) / hotel.review.length).toFixed(2)
        : "0";

    return sendSuccess(res, 200, "Hotel details retrieved", {
      hotelId: hotel.hotel_id,
      name: hotel.hotel_name,
      location: hotel.location,
      description: hotel.description,
      avgRating,
      reviews: hotel.review.map((r) => ({
        id: r.review_id,
        rating: r.rating,
        comment: r.comment,
        touristName: r.tourist?.users?.full_name,
        createdAt: r.created_at,
      })),
      contact: {
        email: hotel.users.email,
        phone: hotel.users.phone,
      },
      memberSince: hotel.users.created_at,
    });
  } catch (error) {
    console.error("Error getting hotel details:", error);
    return sendError(res, 500, "Failed to get hotel details");
  }
});

/**
 * GET /public/search
 * Search guides/hotels by keywords
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, type = "all" } = req.query;

    if (!q) {
      return sendError(res, 400, "Search query required");
    }

    const searchQuery = (q as string).toLowerCase();
    let guides: any[] = [];
    let hotels: any[] = [];

    if (type === "guides" || type === "all") {
      guides = await prisma.guide.findMany({
        where: {
          verified_status: true,
          OR: [
            {
              bio: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              users: {
                full_name: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
        include: {
          users: { select: { full_name: true } },
          review: { select: { rating: true } },
        },
        take: 10,
      });
    }

    if (type === "hotels" || type === "all") {
      hotels = await prisma.hotel.findMany({
        where: {
          verified_status: true,
          OR: [
            {
              hotel_name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              location: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          users: { select: { full_name: true } },
          review: { select: { rating: true } },
        },
        take: 10,
      });
    }

    return sendSuccess(res, 200, "Search results", {
      guides: guides.map((g) => ({
        type: "guide",
        id: g.guide_id,
        name: g.users.full_name,
        bio: g.bio,
      })),
      hotels: hotels.map((h) => ({
        type: "hotel",
        id: h.hotel_id,
        name: h.hotel_name,
        location: h.location,
      })),
    });
  } catch (error) {
    console.error("Error searching:", error);
    return sendError(res, 500, "Search failed");
  }
});

export default router;
