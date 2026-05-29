// src/controllers/auth.controller.ts

import { Request, Response } from "express";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import { OAuth2Client } from "google-auth-library";

import { prisma } from "../prisma";



const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;



export const register = async (req: Request, res: Response) => {

  try {

    const { full_name, email, password, phone, role } = req.body;



    // Validation

    if (!full_name || !email || !password || !role) {

      return res.status(400).json({ 

        message: "All required fields must be provided",

        required: ["full_name", "email", "password", "role"]

      });

    }



    // Validate role

    const validRoles = ["tourist", "guide", "hotel", "admin"];

    if (!validRoles.includes(role.toLowerCase())) {

      return res.status(400).json({ 

        message: "Invalid role",

        validRoles: validRoles

      });

    }



    // Validate email format

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {

      return res.status(400).json({ message: "Invalid email format" });

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



    // Hash password

    const hashedPassword = await bcrypt.hash(password, 10);



    // Create user in DB with role-specific data

    const user = await prisma.users.create({

      data: {

        full_name,

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

        await prisma.guide.create({

          data: {

            guide_id: user.user_id,

            bio: null,

            experience_years: 0,

            license_number: null,

            verified_status: false,

          },

        });

      } else if (role.toLowerCase() === "hotel") {

        await prisma.hotel.create({

          data: {

            hotel_id: user.user_id,

            hotel_name: full_name,

            location: null,

            description: null,

            rating: null,

          },

        });

      }

    } catch (roleError) {

      console.error("Error creating role-specific data:", roleError);

      // If role-specific creation fails, delete the user to maintain consistency

      await prisma.users.delete({ where: { user_id: user.user_id } });

      return res.status(500).json({ message: "Error creating user profile" });

    }



    // Generate JWT token for immediate login

    const token = jwt.sign(

      { userId: user.user_id, role: user.role },

      JWT_SECRET,

      { expiresIn: "24h" }

    );



    res.status(201).json({

      message: "User registered successfully",

      token,

      user: {

        user_id: user.user_id,

        full_name: user.full_name,

        email: user.email,

        role: user.role,

        phone: user.phone,

      },

    });

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



    res.json({

      message: "Login successful",

      token,

      user: {

        user_id: user.user_id,

        full_name: user.full_name,

        email: user.email,

        role: user.role,

      },

    });

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



    const userRole = (role || "tourist").toLowerCase();

    const validRoles = ["tourist", "guide", "hotel", "admin"];

    if (!validRoles.includes(userRole)) {

      return res.status(400).json({ message: "Invalid role" });

    }



    let user = await prisma.users.findUnique({ where: { email: payload.email } });



    if (!user) {

      const generatedPassword = await bcrypt.hash(`google_${Date.now()}_${Math.random()}`, 10);

      const fullName = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || "Google User";



      try {

        user = await prisma.users.create({

          data: {

            full_name: fullName,

            email: payload.email,

            password: generatedPassword,

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



    res.json({

      message: "Google login successful",

      token,

      user: {

        user_id: user.user_id,

        full_name: user.full_name,

        email: user.email,

        role: user.role,

      },

    });

  } catch (error) {

    console.error("Google login error:", error);

    res.status(500).json({

      message: "Server error during Google login",

      error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,

    });

  }

};

