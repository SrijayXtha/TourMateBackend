// src/controllers/auth.controller.ts

import { Request, Response } from "express";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import { OAuth2Client } from "google-auth-library";

import { prisma } from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const validRoles = ["tourist", "guide", "hotel", "admin"];

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const normalizePreferences = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const normalizeIdArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item ?? ""), 10))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
};

const normalizeDocument = (
  value: unknown
): { name: string; uri: string } | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const name = normalizeText((value as Record<string, unknown>).name);
  const uri = normalizeText((value as Record<string, unknown>).uri);

  if (!name || !uri) {
    return null;
  }

  return { name, uri };
};

const normalizeHotelLocation = (
  value: unknown
): { latitude: number; longitude: number; address: string } | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const rawLatitude = Number((value as Record<string, unknown>).latitude);
  const rawLongitude = Number((value as Record<string, unknown>).longitude);
  const address = normalizeText((value as Record<string, unknown>).address);

  if (!Number.isFinite(rawLatitude) || !Number.isFinite(rawLongitude) || !address) {
    return null;
  }

  return {
    latitude: rawLatitude,
    longitude: rawLongitude,
    address,
  };
};

const normalizeExperienceYears = (value: unknown): number | null => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const match = normalized.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
};

const validationError = (errors: Record<string, string>) => ({
  message: "Registration validation failed",
  errors,
});

const normalizeProfilePhoto = (value: unknown): string | null => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalized)) {
    return normalized;
  }

  if (/^https?:\/\//.test(normalized)) {
    return normalized;
  }

  return null;
};

const buildAuthUser = (user: {
  user_id: number;
  full_name: string;
  username?: string | null;
  email: string;
  role: string;
  profile_photo?: string | null;
  phone?: string | null;
}) => ({
  user_id: user.user_id,
  full_name: user.full_name,
  username: user.username || null,
  email: user.email,
  role: user.role,
  profile_photo: user.profile_photo || null,
  phone: user.phone || null,
});

const buildAuthResponse = (params: {
  message: string;
  token: string;
  user: {
    user_id: number;
    full_name: string;
    username?: string | null;
    email: string;
    role: string;
    profile_photo?: string | null;
    phone?: string | null;
  };
  needsOnboarding?: boolean;
}) => {
  const { message, token, user, needsOnboarding = false } = params;
  const mappedUser = buildAuthUser(user);

  return {
    status: "success",
    message,
    data: {
      token,
      user: mappedUser,
      needsOnboarding,
    },
    token,
    user: mappedUser,
    needsOnboarding,
  };
};



export const register = async (req: Request, res: Response) => {

  try {

    const fullName = normalizeText(req.body.full_name ?? req.body.fullName);
    const username = normalizeText(req.body.username);
    const email = normalizeText(req.body.email).toLowerCase();
    const password = String(req.body.password ?? "");
    const phone = normalizeText(req.body.phone);
    const role = normalizeText(req.body.role).toLowerCase();
    const emergencyContact = normalizeText(req.body.emergencyContact);
    const preferences = normalizePreferences(req.body.preferences);
    const profilePhoto = normalizeProfilePhoto(req.body.profilePhoto);
    const specialization = normalizeText(req.body.specialization);
    const languages = normalizeStringArray(req.body.languages);
    const destinationIds = normalizeIdArray(req.body.destinations);
    const licenseDocument = normalizeDocument(req.body.licenseDocument);
    const experienceLabel = normalizeText(req.body.experienceYears);
    const experienceYears = normalizeExperienceYears(req.body.experienceYears);
    const businessName = normalizeText(req.body.businessName);
    const registrationNumber = normalizeText(req.body.registrationNumber);
    const hotelLicense = normalizeDocument(req.body.hotelLicense);
    const hotelLocation = normalizeHotelLocation(req.body.hotelLocation);

    const errors: Record<string, string> = {};

    if (!fullName) errors.fullName = "Full name is required.";
    if (!username) errors.username = "Username is required.";
    if (!email) errors.email = "Email is required.";
    if (!password) errors.password = "Password is required.";
    if (!phone) errors.phone = "Phone number is required.";
    if (!role) errors.role = "Role is required.";

    if (role && !validRoles.includes(role)) {
      errors.role = "Invalid role.";
    }

    if (role === "tourist" && !emergencyContact) {
      errors.emergencyContact = "Emergency contact is required for tourist registration.";
    }

    if (role === "guide") {
      if (!licenseDocument) {
        errors.licenseDocument = "Guide license upload is required.";
      }

      if (!specialization) {
        errors.specialization = "Guide specialization is required.";
      }

      if (!experienceLabel || experienceYears === null) {
        errors.experienceYears = "Guide experience details are required.";
      }

      if (destinationIds.length === 0) {
        errors.destinations = "Please select at least one destination you guide for.";
      }

      if (languages.length === 0) {
        errors.languages = "Please select at least one language.";
      }
    }

    if (role === "hotel") {
      if (!businessName) {
        errors.businessName = "Business name is required.";
      }

      if (!registrationNumber) {
        errors.registrationNumber = "Registration number is required.";
      }

      if (!hotelLicense) {
        errors.hotelLicense = "Hotel license upload is required.";
      }

      if (!hotelLocation) {
        errors.hotelLocation = "Please select your hotel location on the map.";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json(validationError(errors));
    }

    if (role === "guide") {
      const destinations = await prisma.destination.findMany({
        where: {
          destination_id: { in: destinationIds },
        },
        select: { destination_id: true },
      });

      if (destinations.length !== destinationIds.length) {
        return res.status(400).json(
          validationError({
            destinations: "One or more selected destinations are no longer available.",
          })
        );
      }
    }



    // Validate email format

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {

      return res.status(400).json(validationError({ email: "Invalid email format." }));

    }



    // Validate password strength (minimum 6 characters)

    if (password.length < 6) {

      return res.status(400).json({ message: "Password must be at least 6 characters long" });

    }



    // Check if user already exists

    const existingUser = await prisma.users.findUnique({ where: { email } });

    if (existingUser) {

      return res.status(409).json({ message: "User with this email already exists" });

    }

    if (username) {
      const existingUsername = await prisma.users.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ message: "Username is already taken" });
      }
    }



    // Hash password

    const hashedPassword = await bcrypt.hash(password, 10);



    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.users.create({
        data: {
          full_name: fullName,
          username: username || null,
          email,
          password: hashedPassword,
          profile_photo: profilePhoto,
          phone: phone || null,
          role,
        },
      });

      if (role === "tourist") {
        await tx.tourist.create({
          data: {
            tourist_id: createdUser.user_id,
            emergency_contact: emergencyContact || phone || null,
            preferences: preferences.length > 0 ? JSON.stringify(preferences) : null,
          },
        });
      } else if (role === "guide") {
        await tx.guide.create({
          data: {
            guide_id: createdUser.user_id,
            bio: null,
            experience_years: experienceYears,
            experience_label: experienceLabel || null,
            specialization: specialization || null,
            languages: languages.length > 0 ? JSON.stringify(languages) : null,
            license_number: licenseDocument?.name || null,
            license_document: licenseDocument ? JSON.stringify(licenseDocument) : null,
            verified_status: false,
          },
        });

        if (destinationIds.length > 0) {
          await tx.guide_destination.createMany({
            data: destinationIds.map((destinationId) => ({
              guide_id: createdUser.user_id,
              destination_id: destinationId,
            })),
          });
        }
      } else if (role === "hotel") {
        await tx.hotel.create({
          data: {
            hotel_id: createdUser.user_id,
            hotel_name: businessName || fullName,
            location: hotelLocation?.address || null,
            latitude: hotelLocation?.latitude,
            longitude: hotelLocation?.longitude,
            registration_number: registrationNumber || null,
            license_document: hotelLicense ? JSON.stringify(hotelLicense) : null,
            description: null,
            rating: null,
            verified_status: false,
          },
        });
      }

      return createdUser;
    });



    // Generate JWT token for immediate login

    const token = jwt.sign(

      { userId: user.user_id, role: user.role },

      JWT_SECRET,

      { expiresIn: "24h" }

    );



    res.status(201).json(
      buildAuthResponse({
        message: "User registered successfully",
        token,
        user,
      })
    );

  } catch (error) {

    console.error("Registration error:", error);

    res.status(500).json({ 

      message: "Server error during registration",

      error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined

    });

  }

};



export const login = async (req: Request, res: Response) => {

  try {

    const { email, password } = req.body;



    if (!email || !password) {

      return res.status(400).json({ message: "Email and password required" });

    }



    // Find user in DB

    const user = await prisma.users.findUnique({ where: { email } });



    if (!user) {

      return res.status(401).json({ message: "Invalid credentials" });

    }



    // Compare password

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {

      return res.status(401).json({ message: "Invalid credentials" });

    }



    // Generate JWT

    const token = jwt.sign({ userId: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });



    res.json(
      buildAuthResponse({
        message: "Login successful",
        token,
        user,
      })
    );

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: "Server error" });

  }

};



export const googleLogin = async (req: Request, res: Response) => {

  try {

    const { idToken, role } = req.body as { idToken?: string; role?: string };



    if (!idToken) {

      return res.status(400).json({ message: "Google idToken is required" });

    }



    if (!GOOGLE_CLIENT_ID || !googleClient) {

      return res.status(500).json({ message: "GOOGLE_CLIENT_ID is not configured on server" });

    }



    let payload;

    try {

      const loginTicket = await googleClient.verifyIdToken({

        idToken,

        audience: GOOGLE_CLIENT_ID,

      });

      payload = loginTicket.getPayload();

    } catch {

      return res.status(401).json({ message: "Invalid Google token" });

    }



    if (!payload?.email) {

      return res.status(401).json({ message: "Google token does not include email" });

    }



    if (!payload.email_verified) {

      return res.status(401).json({ message: "Google email is not verified" });

    }



    const userRole = normalizeText(role || "tourist").toLowerCase();
    if (userRole !== "tourist") {
      return res.status(400).json({ message: "Google sign-in is only available for tourists" });
    }



    let user = await prisma.users.findUnique({ where: { email: payload.email } });

    if (user && user.role !== "tourist") {
      return res.status(403).json({
        message: "This email is already linked to a non-tourist account. Use email and password login instead.",
      });
    }



    if (!user) {

      const generatedPassword = await bcrypt.hash(`google_${Date.now()}_${Math.random()}`, 10);

      const fullName = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || "Google User";



      try {

        user = await prisma.users.create({

          data: {

            full_name: fullName,

            email: payload.email,

            password: generatedPassword,

            username: null,

            profile_photo: normalizeProfilePhoto(payload.picture),

            phone: null,

            role: userRole,

          },

        });



        if (userRole === "tourist") {

          await prisma.tourist.create({

            data: {

              tourist_id: user.user_id,

              emergency_contact: null,

              preferences: null,

            },

          });

        } else if (userRole === "guide") {

          await prisma.guide.create({

            data: {

              guide_id: user.user_id,

              bio: null,

              experience_years: 0,

              license_number: null,

              verified_status: false,

            },

          });

        } else if (userRole === "hotel") {

          await prisma.hotel.create({

            data: {

              hotel_id: user.user_id,

              hotel_name: fullName,

              location: null,

              description: null,

              rating: null,

            },

          });

        }

      } catch (createError: any) {

        if (createError?.code === "P2002") {

          user = await prisma.users.findUnique({ where: { email: payload.email } });

        } else {

          throw createError;

        }

      }

    }



    if (!user) {

      return res.status(500).json({ message: "Unable to resolve Google user" });

    }



    const token = jwt.sign({ userId: user.user_id, role: user.role }, JWT_SECRET, {

      expiresIn: "24h",

    });

    const needsOnboarding = !normalizeText(user.username) || !normalizeText(user.phone);

    res.json(
      buildAuthResponse({
        message: needsOnboarding
          ? "Google login successful. Complete your tourist profile to continue."
          : "Google login successful",
        token,
        user,
        needsOnboarding,
      })
    );

  } catch (error) {

    console.error("Google login error:", error);

    res.status(500).json({
      message: "Server error during Google login",
      error: process.env.NODE_ENV !== "production" ? (error as Error).message : undefined,
    });

  }

};

export const completeGoogleOnboarding = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fullName = normalizeText(req.body.fullName ?? req.body.full_name);
    const username = normalizeText(req.body.username);
    const phone = normalizeText(req.body.phone);
    const password = String(req.body.password ?? "");
    const emergencyContact = normalizeText(req.body.emergencyContact);
    const preferences = normalizePreferences(req.body.preferences);

    if (!fullName || !username || !phone || !password || !emergencyContact) {
      return res.status(400).json({
        message: "Full name, username, phone, password, and emergency contact are required",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json(validationError({ password: "Password must be at least 6 characters long." }));
    }

    const currentUser = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        email: true,
        password: true,
        role: true,
        phone: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.role !== "tourist") {
      return res.status(403).json({ message: "Only tourist accounts can complete Google onboarding" });
    }

    const existingUsername = await prisma.users.findFirst({
      where: {
        username,
        user_id: { not: userId },
      },
      select: { user_id: true },
    });

    if (existingUsername) {
        return res.status(409).json(validationError({ username: "Username is already taken." }));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const savedUser = await tx.users.update({
        where: { user_id: userId },
        data: {
          full_name: fullName,
          username,
          phone,
          password: hashedPassword,
        },
      });

      await tx.tourist.update({
        where: { tourist_id: userId },
        data: {
          emergency_contact: emergencyContact,
          preferences: preferences.length > 0 ? JSON.stringify(preferences) : JSON.stringify([]),
        },
      });

      return savedUser;
    });

    return res.json(
      buildAuthResponse({
        message: "Tourist profile completed successfully",
        token: jwt.sign({ userId: updatedUser.user_id, role: updatedUser.role }, JWT_SECRET, {
          expiresIn: "24h",
        }),
        user: updatedUser,
        needsOnboarding: false,
      })
    );
  } catch (error) {
    console.error("Google onboarding error:", error);
    return res.status(500).json({
      message: "Server error during Google onboarding",
      error: process.env.NODE_ENV !== "production" ? (error as Error).message : undefined,
    });
  }
};

export const createGuideDestinationRequest = async (req: Request, res: Response) => {
  try {
    const requesterName = normalizeText(req.body.requesterName);
    const requesterEmail = normalizeText(req.body.requesterEmail).toLowerCase();
    const destinationName = normalizeText(req.body.destinationName ?? req.body.name);
    const location = normalizeText(req.body.location ?? req.body.address);
    const reason = normalizeText(req.body.reason);
    const image = normalizeProfilePhoto(req.body.image);
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    const errors: Record<string, string> = {};
    if (!requesterName) errors.requesterName = "Your name is required.";
    if (!requesterEmail) errors.requesterEmail = "Your email is required.";
    if (!destinationName) errors.destinationName = "Destination name is required.";
    if (!location) errors.location = "Destination location is required.";
    if (!reason) errors.reason = "Reason for request is required.";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Destination request validation failed",
        errors,
      });
    }

    const request = await prisma.destination_request.create({
      data: {
        requester_name: requesterName,
        requester_email: requesterEmail,
        destination_name: destinationName,
        location,
        reason,
        image,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Destination request submitted",
      data: {
        requestId: request.request_id,
        status: request.status,
      },
    });
  } catch (error) {
    console.error("Public destination request error:", error);
    return res.status(500).json({
      message: "Server error while submitting destination request",
      error: process.env.NODE_ENV !== "production" ? (error as Error).message : undefined,
    });
  }
};

