// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../prisma";
import {
  sendSuccess,
  sendError,
  validateRequired,
  validateEmail,
  validatePassword,
  validateRole,
} from "../utils/response";

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const requireJwtSecret = (res: Response): string | null => {
  if (!JWT_SECRET) {
    sendError(res, 500, "JWT_SECRET is not configured on server");
    return null;
  }

  return JWT_SECRET;
};

/**
 * POST /auth/register
 * Register a new user (tourist, guide, or hotel only)
 */
export const register = async (req: Request, res: Response) => {
  try {
    const jwtSecret = requireJwtSecret(res);
    if (!jwtSecret) {
      return;
    }

    const { fullName, email, password, phone, role, experienceYears, businessName } = req.body;

    // Validate required fields
    const validationError = validateRequired(
      { fullName, email, password, phone, role },
      ["fullName", "email", "password", "phone", "role"]
    );
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    // Reject admin role during registration
    if (role.toLowerCase() === "admin") {
      return sendError(res, 403, "Admin registration is not allowed via API");
    }

    // Validate role
    if (!validateRole(role)) {
      return sendError(res, 400, "Invalid role. Must be tourist, guide, or hotel");
    }

    // Validate email format
    if (!validateEmail(email)) {
      return sendError(res, 400, "Invalid email format");
    }

    // Validate password strength
    if (!validatePassword(password)) {
      return sendError(res, 400, "Password must be at least 6 characters long");
    }

    // Check if user already exists by email
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return sendError(res, 409, "Account with this email already exists");
    }

    // Check if phone number already exists (if provided)
    if (phone) {
      const existingPhone = await prisma.users.findFirst({ where: { phone } });
      if (existingPhone) {
        return sendError(res, 409, "Account with this phone number already exists");
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in DB
    const user = await prisma.users.create({
      data: {
        full_name: fullName,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: role.toLowerCase(),
      },
    });

    // Create role-specific entries
    try {
      if (role.toLowerCase() === "tourist") {
        await prisma.tourist.create({
          data: {
            tourist_id: user.user_id,
            emergency_contact: phone || null,
            preferences: null,
          },
        });
      } else if (role.toLowerCase() === "guide") {
        const expYears = parseInt(experienceYears || "0", 10) || 0;
        await prisma.guide.create({
          data: {
            guide_id: user.user_id,
            bio: null,
            experience_years: expYears,
            license_number: null,
            verified_status: false,
            is_available: true,
          },
        });
      } else if (role.toLowerCase() === "hotel") {
        await prisma.hotel.create({
          data: {
            hotel_id: user.user_id,
            hotel_name: businessName || fullName,
            location: null,
            description: null,
            rating: null,
            verified_status: false,
          },
        });
      }
    } catch (roleError) {
      console.error("Error creating role-specific data:", roleError);
      // If role-specific creation fails, delete the user to maintain consistency
      await prisma.users.delete({ where: { user_id: user.user_id } });
      return sendError(res, 500, "Error creating user profile");
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      jwtSecret,
      { expiresIn: "24h" }
    );

    return sendSuccess(res, 201, "User registered successfully", {
      token,
      user: {
        id: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return sendError(
      res,
      500,
      process.env.NODE_ENV === "development"
        ? (error as Error).message
        : "Server error during registration"
    );
  }
};

/**
 * POST /auth/login
 * Login an existing user (any role)
 */
export const login = async (req: Request, res: Response) => {
  try {
    const jwtSecret = requireJwtSecret(res);
    if (!jwtSecret) {
      return;
    }

    const { email, password } = req.body;

    // Validate required fields
    const validationError = validateRequired({ email, password }, ["email", "password"]);
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    // Find user by email
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 401, "Invalid credentials");
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 401, "Invalid credentials");
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      jwtSecret,
      { expiresIn: "24h" }
    );

    return sendSuccess(res, 200, "Login successful", {
      token,
      user: {
        id: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return sendError(
      res,
      500,
      process.env.NODE_ENV === "development"
        ? (error as Error).message
        : "Server error during login"
    );
  }
};

/**
 * POST /auth/google
 * Google OAuth login/registration
 */
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const jwtSecret = requireJwtSecret(res);
    if (!jwtSecret) {
      return;
    }

    const { idToken, role } = req.body as { idToken?: string; role?: string };

    // Validate idToken
    if (!idToken) {
      return sendError(res, 400, "Google idToken is required");
    }

    // Verify Google client is configured
    if (!GOOGLE_CLIENT_ID || !googleClient) {
      return sendError(res, 500, "GOOGLE_CLIENT_ID is not configured on server");
    }

    // Verify Google token
    let payload;
    try {
      const loginTicket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = loginTicket.getPayload();
    } catch (tokenError) {
      console.error("Google token verification failed:", tokenError);
      return sendError(res, 401, "Invalid Google token");
    }

    // Validate email and verification status
    if (!payload?.email) {
      return sendError(res, 401, "Google token does not include email");
    }

    if (!payload.email_verified) {
      return sendError(res, 401, "Google email is not verified");
    }

    // Default role to tourist if not provided
    const userRole = (role || "tourist").toLowerCase();

    // Validate role (cannot be admin via Google)
    if (userRole === "admin" || !validateRole(userRole)) {
      return sendError(res, 400, "Invalid role. Must be tourist, guide, or hotel");
    }

    // Find or create user
    let user = await prisma.users.findUnique({ where: { email: payload.email } });

    if (!user) {
      // Generate a secure random password for Google users
      const generatedPassword = await bcrypt.hash(
        `google_${Date.now()}_${Math.random()}`,
        10
      );
      const fullName =
        payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || "Google User";

      try {
        user = await prisma.users.create({
          data: {
            full_name: fullName,
            email: payload.email,
            password: generatedPassword,
            role: userRole,
            phone: null,
          },
        });

        // Create role-specific entry
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
              experience_years: 1,
              license_number: null,
              verified_status: false,
              is_available: true,
            },
          });
        } else if (userRole === "hotel") {
          await prisma.hotel.create({
            data: {
              hotel_id: user.user_id,
              hotel_name: payload.name || "New Hotel",
              location: null,
              description: null,
              rating: null,
              verified_status: false,
            },
          });
        }
      } catch (createError: any) {
        if (createError?.code === "P2002") {
          // User was created by another request, fetch it
          user = await prisma.users.findUnique({ where: { email: payload.email } });
        } else {
          console.error("Error creating Google user or role profile:", createError);
          throw createError;
        }
      }
    }

    if (!user) {
      return sendError(res, 500, "Unable to resolve Google user");
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      jwtSecret,
      { expiresIn: "24h" }
    );

    return sendSuccess(res, 200, "Google login successful", {
      token,
      user: {
        id: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    return sendError(
      res,
      500,
      process.env.NODE_ENV === "development"
        ? (error as Error).message
        : "Server error during Google login"
    );
  }
};
