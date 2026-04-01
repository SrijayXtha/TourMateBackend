"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const prisma_1 = require("../prisma");
const response_1 = require("../utils/response");
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID) : null;
const requireJwtSecret = (res) => {
    if (!JWT_SECRET) {
        (0, response_1.sendError)(res, 500, "JWT_SECRET is not configured on server");
        return null;
    }
    return JWT_SECRET;
};
/**
 * POST /auth/register
 * Register a new user (tourist, guide, or hotel only)
 */
const register = async (req, res) => {
    try {
        const jwtSecret = requireJwtSecret(res);
        if (!jwtSecret) {
            return;
        }
        const { fullName, email, password, phone, role, experienceYears, businessName } = req.body;
        // Validate required fields
        const validationError = (0, response_1.validateRequired)({ fullName, email, password, phone, role }, ["fullName", "email", "password", "phone", "role"]);
        if (validationError) {
            return (0, response_1.sendError)(res, 400, validationError);
        }
        // Reject admin role during registration
        if (role.toLowerCase() === "admin") {
            return (0, response_1.sendError)(res, 403, "Admin registration is not allowed via API");
        }
        // Validate role
        if (!(0, response_1.validateRole)(role)) {
            return (0, response_1.sendError)(res, 400, "Invalid role. Must be tourist, guide, or hotel");
        }
        // Validate email format
        if (!(0, response_1.validateEmail)(email)) {
            return (0, response_1.sendError)(res, 400, "Invalid email format");
        }
        // Validate password strength
        if (!(0, response_1.validatePassword)(password)) {
            return (0, response_1.sendError)(res, 400, "Password must be at least 6 characters long");
        }
        // Check if user already exists by email
        const existingUser = await prisma_1.prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return (0, response_1.sendError)(res, 409, "Account with this email already exists");
        }
        // Check if phone number already exists (if provided)
        if (phone) {
            const existingPhone = await prisma_1.prisma.users.findFirst({ where: { phone } });
            if (existingPhone) {
                return (0, response_1.sendError)(res, 409, "Account with this phone number already exists");
            }
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user in DB
        const user = await prisma_1.prisma.users.create({
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
                await prisma_1.prisma.tourist.create({
                    data: {
                        tourist_id: user.user_id,
                        emergency_contact: phone || null,
                        preferences: null,
                    },
                });
            }
            else if (role.toLowerCase() === "guide") {
                const expYears = parseInt(experienceYears || "0", 10) || 0;
                await prisma_1.prisma.guide.create({
                    data: {
                        guide_id: user.user_id,
                        bio: null,
                        experience_years: expYears,
                        license_number: null,
                        verified_status: false,
                        is_available: true,
                    },
                });
            }
            else if (role.toLowerCase() === "hotel") {
                await prisma_1.prisma.hotel.create({
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
        }
        catch (roleError) {
            console.error("Error creating role-specific data:", roleError);
            // If role-specific creation fails, delete the user to maintain consistency
            await prisma_1.prisma.users.delete({ where: { user_id: user.user_id } });
            return (0, response_1.sendError)(res, 500, "Error creating user profile");
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.user_id, role: user.role }, jwtSecret, { expiresIn: "24h" });
        return (0, response_1.sendSuccess)(res, 201, "User registered successfully", {
            token,
            user: {
                id: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        return (0, response_1.sendError)(res, 500, process.env.NODE_ENV === "development"
            ? error.message
            : "Server error during registration");
    }
};
exports.register = register;
/**
 * POST /auth/login
 * Login an existing user (any role)
 */
const login = async (req, res) => {
    try {
        const jwtSecret = requireJwtSecret(res);
        if (!jwtSecret) {
            return;
        }
        const { email, password } = req.body;
        // Validate required fields
        const validationError = (0, response_1.validateRequired)({ email, password }, ["email", "password"]);
        if (validationError) {
            return (0, response_1.sendError)(res, 400, validationError);
        }
        // Find user by email
        const user = await prisma_1.prisma.users.findUnique({ where: { email } });
        if (!user) {
            return (0, response_1.sendError)(res, 401, "Invalid credentials");
        }
        // Compare password with bcrypt
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return (0, response_1.sendError)(res, 401, "Invalid credentials");
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.user_id, role: user.role }, jwtSecret, { expiresIn: "24h" });
        return (0, response_1.sendSuccess)(res, 200, "Login successful", {
            token,
            user: {
                id: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return (0, response_1.sendError)(res, 500, process.env.NODE_ENV === "development"
            ? error.message
            : "Server error during login");
    }
};
exports.login = login;
/**
 * POST /auth/google
 * Google OAuth login/registration
 */
const googleLogin = async (req, res) => {
    try {
        const jwtSecret = requireJwtSecret(res);
        if (!jwtSecret) {
            return;
        }
        const { idToken, role } = req.body;
        // Validate idToken
        if (!idToken) {
            return (0, response_1.sendError)(res, 400, "Google idToken is required");
        }
        // Verify Google client is configured
        if (!GOOGLE_CLIENT_ID || !googleClient) {
            return (0, response_1.sendError)(res, 500, "GOOGLE_CLIENT_ID is not configured on server");
        }
        // Verify Google token
        let payload;
        try {
            const loginTicket = await googleClient.verifyIdToken({
                idToken,
                audience: GOOGLE_CLIENT_ID,
            });
            payload = loginTicket.getPayload();
        }
        catch (tokenError) {
            console.error("Google token verification failed:", tokenError);
            return (0, response_1.sendError)(res, 401, "Invalid Google token");
        }
        // Validate email and verification status
        if (!payload?.email) {
            return (0, response_1.sendError)(res, 401, "Google token does not include email");
        }
        if (!payload.email_verified) {
            return (0, response_1.sendError)(res, 401, "Google email is not verified");
        }
        // Default role to tourist if not provided
        const userRole = (role || "tourist").toLowerCase();
        // Validate role (cannot be admin via Google)
        if (userRole === "admin" || !(0, response_1.validateRole)(userRole)) {
            return (0, response_1.sendError)(res, 400, "Invalid role. Must be tourist, guide, or hotel");
        }
        // Find or create user
        let user = await prisma_1.prisma.users.findUnique({ where: { email: payload.email } });
        if (!user) {
            // Generate a secure random password for Google users
            const generatedPassword = await bcryptjs_1.default.hash(`google_${Date.now()}_${Math.random()}`, 10);
            const fullName = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || "Google User";
            try {
                user = await prisma_1.prisma.users.create({
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
                    await prisma_1.prisma.tourist.create({
                        data: {
                            tourist_id: user.user_id,
                            emergency_contact: null,
                            preferences: null,
                        },
                    });
                }
                else if (userRole === "guide") {
                    await prisma_1.prisma.guide.create({
                        data: {
                            guide_id: user.user_id,
                            bio: null,
                            experience_years: 1,
                            license_number: null,
                            verified_status: false,
                            is_available: true,
                        },
                    });
                }
                else if (userRole === "hotel") {
                    await prisma_1.prisma.hotel.create({
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
            }
            catch (createError) {
                if (createError?.code === "P2002") {
                    // User was created by another request, fetch it
                    user = await prisma_1.prisma.users.findUnique({ where: { email: payload.email } });
                }
                else {
                    console.error("Error creating Google user or role profile:", createError);
                    throw createError;
                }
            }
        }
        if (!user) {
            return (0, response_1.sendError)(res, 500, "Unable to resolve Google user");
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.user_id, role: user.role }, jwtSecret, { expiresIn: "24h" });
        return (0, response_1.sendSuccess)(res, 200, "Google login successful", {
            token,
            user: {
                id: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        console.error("Google login error:", error);
        return (0, response_1.sendError)(res, 500, process.env.NODE_ENV === "development"
            ? error.message
            : "Server error during Google login");
    }
};
exports.googleLogin = googleLogin;
