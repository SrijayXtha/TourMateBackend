import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { sendSuccess, sendError } from "../utils/response";

const router = Router();

const parsePagination = (pageValue: unknown, limitValue: unknown) => {
  const page = Math.max(1, Number.parseInt(String(pageValue || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue || "10"), 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const parseJsonArray = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
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

const averageRating = (ratings: Array<{ rating: number | null }>): string => {
  if (ratings.length === 0) {
    return "N/A";
  }

  const total = ratings.reduce((sum, item) => sum + Number(item.rating || 0), 0);
  return (total / ratings.length).toFixed(2);
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
  activities: parseJsonArray(destination.activities),
  highlights: parseJsonArray(destination.highlights),
});

const guideInclude = {
  users: {
    select: {
      full_name: true,
      email: true,
      phone: true,
      created_at: true,
      profile_photo: true,
    },
  },
  review: {
    select: {
      rating: true,
    },
  },
  guide_destination: {
    include: {
      destination: true,
    },
  },
} as const;

/**
 * GET /destinations
 * List official destinations
 */
router.get("/destinations", async (_req: Request, res: Response) => {
  try {
    const destinations = await prisma.destination.findMany({
      orderBy: [{ popularity_score: "desc" }, { name: "asc" }],
    });

    return sendSuccess(res, 200, "Destinations retrieved", {
      count: destinations.length,
      destinations: destinations.map(mapDestination),
    });
  } catch (error) {
    console.error("Error getting destinations:", error);
    return sendError(res, 500, "Failed to get destinations");
  }
});

/**
 * GET /guides
 * List all verified guides with destination/language filtering
 */
router.get("/guides", async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
    const search = String(req.query.search || "").trim();
    const destinationId = Number.parseInt(String(req.query.destinationId || ""), 10);
    const language = String(req.query.language || "").trim();
    const specialization = String(req.query.specialization || "").trim();

    const where: any = {
      verified_status: true,
    };

    if (destinationId > 0) {
      where.guide_destination = {
        some: {
          destination_id: destinationId,
        },
      };
    }

    if (specialization) {
      where.specialization = {
        contains: specialization,
        mode: "insensitive",
      };
    }

    const guides = await prisma.guide.findMany({
      where,
      include: guideInclude,
      skip,
      take: limit,
      orderBy: { experience_years: "desc" },
    });

    const normalizedSearch = search.toLowerCase();
    const normalizedLanguage = language.toLowerCase();

    const filteredGuides = guides.filter((guide) => {
      const languages = parseJsonArray(guide.languages);
      const destinations = guide.guide_destination.map((item) => item.destination);
      const destinationNames = destinations.map((item) => item.name);
      const haystack = [
        guide.users.full_name,
        guide.specialization || "",
        guide.bio || "",
        ...languages,
        ...destinationNames,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesLanguage =
        !normalizedLanguage ||
        languages.some((item) => item.toLowerCase().includes(normalizedLanguage));

      return matchesSearch && matchesLanguage;
    });

    return sendSuccess(res, 200, "Guides retrieved", {
      guides: filteredGuides.map((guide) => ({
        guideId: guide.guide_id,
        name: guide.users.full_name,
        email: guide.users.email,
        phone: guide.users.phone,
        photo: guide.users.profile_photo,
        bio: guide.bio,
        experienceYears: guide.experience_years,
        specialization: guide.specialization,
        languages: parseJsonArray(guide.languages),
        destinations: guide.guide_destination.map((item) => ({
          destinationId: item.destination.destination_id,
          name: item.destination.name,
          location: item.destination.location,
          category: item.destination.category,
        })),
        avgRating: averageRating(guide.review),
        reviewCount: guide.review.length,
      })),
      pagination: {
        page,
        limit,
        total: filteredGuides.length,
        pages: Math.max(1, Math.ceil(filteredGuides.length / limit)),
      },
    });
  } catch (error) {
    console.error("Error getting guides:", error);
    return sendError(res, 500, "Failed to get guides");
  }
});

/**
 * GET /guides/:guideId
 * Get guide details with reviews
 */
router.get("/guides/:guideId", async (req: Request, res: Response) => {
  try {
    const guideId = Number.parseInt(req.params.guideId, 10);

    const guide = await prisma.guide.findUnique({
      where: { guide_id: guideId },
      include: {
        users: guideInclude.users,
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
        guide_destination: guideInclude.guide_destination,
      },
    });

    if (!guide || !guide.verified_status) {
      return sendError(res, 404, "Guide not found");
    }

    return sendSuccess(res, 200, "Guide details retrieved", {
      guideId: guide.guide_id,
      name: guide.users.full_name,
      email: guide.users.email,
      phone: guide.users.phone,
      photo: guide.users.profile_photo,
      bio: guide.bio,
      experienceYears: guide.experience_years,
      specialization: guide.specialization,
      languages: parseJsonArray(guide.languages),
      destinations: guide.guide_destination.map((item) => ({
        destinationId: item.destination.destination_id,
        name: item.destination.name,
        location: item.destination.location,
        category: item.destination.category,
      })),
      licenseNumber: guide.license_number,
      avgRating: averageRating(guide.review),
      reviews: guide.review.map((item) => ({
        id: item.review_id,
        rating: item.rating,
        comment: item.comment,
        touristName: item.tourist?.users?.full_name,
        createdAt: item.created_at,
      })),
      memberSince: guide.users.created_at,
    });
  } catch (error) {
    console.error("Error getting guide details:", error);
    return sendError(res, 500, "Failed to get guide details");
  }
});

/**
 * GET /hotels
 * List all hotels with ratings
 */
router.get("/hotels", async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);

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
      take: limit,
      orderBy: { hotel_id: "desc" },
    });

    const total = await prisma.hotel.count({ where: { verified_status: true } });

    return sendSuccess(res, 200, "Hotels retrieved", {
      hotels: hotels.map((hotel) => ({
        hotelId: hotel.hotel_id,
        name: hotel.hotel_name,
        location: hotel.location,
        description: hotel.description,
        avgRating: averageRating(hotel.review),
        reviewCount: hotel.review.length,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting hotels:", error);
    return sendError(res, 500, "Failed to get hotels");
  }
});

/**
 * GET /hotels/:hotelId
 * Get hotel details with reviews
 */
router.get("/hotels/:hotelId", async (req: Request, res: Response) => {
  try {
    const hotelId = Number.parseInt(req.params.hotelId, 10);

    const hotel = await prisma.hotel.findUnique({
      where: { hotel_id: hotelId },
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

    if (!hotel || !hotel.verified_status) {
      return sendError(res, 404, "Hotel not found");
    }

    return sendSuccess(res, 200, "Hotel details retrieved", {
      hotelId: hotel.hotel_id,
      name: hotel.hotel_name,
      location: hotel.location,
      description: hotel.description,
      avgRating: averageRating(hotel.review),
      reviews: hotel.review.map((item) => ({
        id: item.review_id,
        rating: item.rating,
        comment: item.comment,
        touristName: item.tourist?.users?.full_name,
        createdAt: item.created_at,
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
 * GET /search
 * Search guides/hotels/destinations by keyword
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const searchQuery = String(req.query.q || "").trim();
    const type = String(req.query.type || "all").trim().toLowerCase();

    if (!searchQuery) {
      return sendError(res, 400, "Search query required");
    }

    const normalized = searchQuery.toLowerCase();
    let guides: any[] = [];
    let hotels: any[] = [];
    let destinations: any[] = [];

    if (type === "guides" || type === "all") {
      const guideResults = await prisma.guide.findMany({
        where: { verified_status: true },
        include: guideInclude,
        take: 25,
      });

      guides = guideResults
        .filter((guide) => {
          const languages = parseJsonArray(guide.languages);
          const destinationNames = guide.guide_destination.map((item) => item.destination.name);
          const haystack = [
            guide.users.full_name,
            guide.specialization || "",
            guide.bio || "",
            ...languages,
            ...destinationNames,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalized);
        })
        .map((guide) => ({
          type: "guide",
          id: guide.guide_id,
          name: guide.users.full_name,
          bio: guide.bio,
          languages: parseJsonArray(guide.languages),
          destinations: guide.guide_destination.map((item) => item.destination.name),
        }));
    }

    if (type === "hotels" || type === "all") {
      hotels = await prisma.hotel.findMany({
        where: {
          verified_status: true,
          OR: [
            { hotel_name: { contains: searchQuery, mode: "insensitive" } },
            { location: { contains: searchQuery, mode: "insensitive" } },
            { description: { contains: searchQuery, mode: "insensitive" } },
          ],
        },
        include: {
          review: { select: { rating: true } },
        },
        take: 10,
      });
    }

    if (type === "all") {
      destinations = await prisma.destination.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { location: { contains: searchQuery, mode: "insensitive" } },
            { description: { contains: searchQuery, mode: "insensitive" } },
            { category: { contains: searchQuery, mode: "insensitive" } },
          ],
        },
        take: 10,
      });
    }

    return sendSuccess(res, 200, "Search results", {
      guides,
      hotels: hotels.map((hotel: any) => ({
        type: "hotel",
        id: hotel.hotel_id,
        name: hotel.hotel_name,
        location: hotel.location,
      })),
      destinations: destinations.map((destination: any) => ({
        type: "destination",
        id: destination.destination_id,
        name: destination.name,
        location: destination.location,
      })),
    });
  } catch (error) {
    console.error("Error searching:", error);
    return sendError(res, 500, "Search failed");
  }
});

export default router;
