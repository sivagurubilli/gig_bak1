import express, { Express, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { MongoStorage } from "./mongoStorage";

const storage = new MongoStorage();
import { insertUserSchema, User } from "../shared/schema";
import { FirestoreService } from "./firebase";

import twoFactorAPI from "./utils/twoFactorAPI.js";
import { notificationService } from "./utils/notificationService";
import { cacheService } from "./utils/cacheService";
import { monitoringService, performanceMiddleware } from "./utils/monitoring";
import { fcmNotificationService } from "./utils/fcmNotifications";
import axios from "axios";
import CallSession from "./models/CallSession";
// CallTransaction model will be created inline since import is missing
import { v4 as uuidv4 } from "uuid";

// Cashfree Configuration - supports both production and sandbox
//const CASHFREE_ENVIRONMENT = 'sandbox'; // Switched to sandbox mode as requested
const CASHFREE_ENVIRONMENT = "production"; // Switched to sandbox mode as requested

const CASHFREE_CREDENTIALS = {
  production: {
    appId: process.env.CASHFREE_APP_ID || "",
    secretKey: process.env.CASHFREE_SECRET_KEY || "",
    apiUrl: "https://api.cashfree.com",
  },
  sandbox: {
    appId: "TEST10729899d689890fed5ed40670e099892701",
    secretKey: process.env.CASHFREE_SECRET_KEY || "",
    apiUrl: "https://sandbox.cashfree.com",
  },
};

const CASHFREE_CONFIG = {
  ...CASHFREE_CREDENTIALS[CASHFREE_ENVIRONMENT],
  apiVersion: "2023-08-01",
  environment: CASHFREE_ENVIRONMENT,
};

// Cashfree API Helper
class CashfreeAPI {
  private headers: any;

  constructor() {
    this.headers = {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-version": CASHFREE_CONFIG.apiVersion,
      "x-client-id": CASHFREE_CONFIG.appId,
      "x-client-secret": CASHFREE_CONFIG.secretKey,
    };
  }

  async createOrder(orderData: any) {
    try {
      const response = await axios.post(
        `${CASHFREE_CONFIG.apiUrl}/pg/orders`,
        orderData,
        { headers: this.headers },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "Cashfree Create Order Error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async fetchOrder(orderId: string) {
    try {
      const response = await axios.get(
        `${CASHFREE_CONFIG.apiUrl}/pg/orders/${orderId}`,
        { headers: this.headers },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "Cashfree Fetch Order Error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}

const cashfreeAPI = new CashfreeAPI();
console.log(
  `Cashfree API initialized successfully in ${CASHFREE_CONFIG.environment.toUpperCase()} mode`,
);
console.log(`Using App ID: ${CASHFREE_CONFIG.appId}`);
console.log(`API URL: ${CASHFREE_CONFIG.apiUrl}`);

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Temporary storage for OTP sessions
const otpSessions = new Map<
  string,
  { phoneNumber: string; sessionId: string; expiresAt: Date }
>();

// Bypass phone numbers for OTP verification (for testing purposes)
const BYPASS_PHONE_NUMBERS = ["+918520025559", "8520025559", "918520025559"];

// Multer configuration for profile picture uploads
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads", "profiles");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Validation schemas
const phoneNumberSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format"),
});

const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  sessionId: z.string(),
  deviceToken: z.string().optional(), // Optional FCM device token for push notifications
});

const completeProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  language: z.string().default("en"),
  dob: z.string().optional().nullable(),
  interests: z.array(z.string()).default([]),
  aboutMe: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  gender: z.enum(["male", "female"]).optional(),
  language: z.string().optional(),
  dob: z.string().optional().nullable(),
  interests: z.array(z.string()).optional(),
  aboutMe: z.string().optional().nullable(),
});

// Helper function to get approved avatar for a user
async function getApprovedAvatar(
  userId: string | number,
): Promise<string | null> {
  try {
    // Get all profile picture requests for the user
    const allRequests = await storage.getAllProfilePictureRequests();

    // Find the most recent approved request for this user
    const approvedRequest = allRequests
      .filter(
        (req) => req.userId === userId.toString() && req.status === "approved",
      )
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      )[0];

    return approvedRequest ? approvedRequest.imageUrl : null;
  } catch (error) {
    console.error("Error getting approved avatar:", error);
    return null;
  }
}

// Middleware to authenticate mobile users
const authenticateMobileUser = async (
  req: Request,
  res: Response,
  next: Function,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        error: "Authentication token required",
        errorCode: "INVALID_TOKEN",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "77ab346ffe91751557cbebdabe5f70232158444821b383d6e256a475d4b0ecd70a14e49b561e645474eace8720db55db0f78bcd316cf55bea9708df9d0cb7326",
    ) as any;
    // Handle both string and numeric user IDs for compatibility
    const userId =
      typeof decoded.userId === "string"
        ? decoded.userId
        : decoded.userId.toString();
    console.log("Mobile auth - Decoded JWT:", {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
    });
    console.log(
      "Mobile auth - Storage instance:",
      typeof storage,
      Object.getPrototypeOf(storage).constructor.name,
    );
    console.log("Mobile auth - Looking up user:", userId);
    const user = await storage.getUser(userId);
    console.log(
      "Mobile auth - User found:",
      user ? "Yes" : "No",
      user
        ? { id: user.id, username: user.username, isBlocked: user.isBlocked }
        : "null",
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid authentication token",
        errorCode: "INVALID_TOKEN",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        error:
          "Your account has been blocked. Please contact support for assistance.",
        errorCode: "ACCOUNT_BLOCKED",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid authentication token",
      errorCode: "INVALID_TOKEN",
    });
  }
};

async function registerMobileRoutes(app: Express) {
  // Apply performance monitoring to all mobile routes
  app.use("/api/v1/app", performanceMiddleware);
  /**
   * @swagger
   * /api/v1/app/auth/request-otp:
   *   post:
   *     tags: [Mobile Auth]
   *     summary: Request OTP for phone number verification
   *     description: Sends OTP to the provided phone number using 2Factor API
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OTPRequest'
   *     responses:
   *       200:
   *         description: OTP sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "OTP sent successfully"
   *                 sessionKey:
   *                   type: string
   *                   example: "session-key-123"
   *                 sessionId:
   *                   type: string
   *                   example: "2factor-session-id-456"
   *                   description: "2Factor API session ID for OTP verification"
   *                 expiresIn:
   *                   type: integer
   *                   example: 600
   *       400:
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: OTP service not configured
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/auth/request-otp",
    async (req: Request, res: Response) => {
      try {
        // Check for bypass phone numbers before validation
        let { phoneNumber } = req.body;

        // Handle different format variations for bypass
        const normalizePhoneNumber = (phone: string) => {
          // Remove any spaces or special characters except +
          phone = phone.replace(/[\s\-\(\)]/g, "");
          // Convert to standard format
          if (phone === "8520025559") return "+918520025559";
          if (phone === "918520025559") return "+918520025559";
          if (phone === "+918520025559") return "+918520025559";
          return phone;
        };

        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        // Check for bypass phone numbers (before validation)
        if (
          BYPASS_PHONE_NUMBERS.includes(phoneNumber) ||
          BYPASS_PHONE_NUMBERS.includes(normalizedPhone)
        ) {
          console.log(
            `OTP bypass activated for phone number: ${phoneNumber} (normalized: ${normalizedPhone})`,
          );

          // Use the normalized format for consistency
          const standardPhone = "+918520025559";

          // Create a bypass session
          const sessionKey = `${standardPhone}_${Date.now()}_bypass`;
          const mockSessionId = `bypass_${Date.now()}`;

          otpSessions.set(sessionKey, {
            phoneNumber: standardPhone,
            sessionId: mockSessionId,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          });

          return res.json({
            success: true,
            message: "OTP sent successfully (bypass mode)",
            sessionKey,
            sessionId: mockSessionId,
            expiresIn: 600,
            bypass: true, // Indicator for testing
          });
        }

        // Now validate the phone number normally
        const validatedData = phoneNumberSchema.parse(req.body);
        phoneNumber = validatedData.phoneNumber;

        // Check if TWO_FACTOR_API_KEY is configured
        if (!process.env.TWO_FACTOR_API_KEY) {
          return res.status(500).json({
            error: "OTP service not configured. Please contact support.",
          });
        }

        // Send OTP using 2Factor API
        const otpResult = await twoFactorAPI.sendOTP(phoneNumber);

        // Store session temporarily (expires in 10 minutes)
        const sessionKey = `${phoneNumber}_${Date.now()}`;
        otpSessions.set(sessionKey, {
          phoneNumber,
          sessionId: otpResult.sessionId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        // Clean up expired sessions
        Array.from(otpSessions.entries()).forEach(([key, session]) => {
          if (session.expiresAt < new Date()) {
            otpSessions.delete(key);
          }
        });

        res.json({
          success: true,
          message: "OTP sent successfully",
          sessionKey,
          sessionId: otpResult.sessionId, // Include the actual 2Factor API session ID
          expiresIn: 600, // 10 minutes in seconds
        });
      } catch (error: any) {
        console.error("Request OTP error:", error);
        res.status(400).json({ error: error.message || "Failed to send OTP" });
      }
    },
  );

  // 2. Verify OTP
  /**
   * @swagger
   * /api/v1/app/auth/verify-otp:
   *   post:
   *     tags: [Mobile Auth]
   *     summary: Verify OTP and get session token
   *     description: Verifies the OTP sent to user's phone number and returns a session token for profile completion
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OTPVerification'
   *     responses:
   *       200:
   *         description: OTP verified successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "OTP verified successfully"
   *                 sessionKey:
   *                   type: string
   *                   example: "verified-session-key-456"
   *                 token:
   *                   type: string
   *                   example: "jwt-token-here"
   *                   description: "JWT token for authentication"
   *                 user:
   *                   allOf:
   *                     - $ref: '#/components/schemas/User'
   *                     - type: object
   *                       properties:
   *                         wallet:
   *                           $ref: '#/components/schemas/Wallet'
   *                 isNewUser:
   *                   type: boolean
   *                   example: true
   *                   description: "Indicates if this is a newly created user"
   *       400:
   *         description: Invalid OTP or expired session
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/auth/verify-otp",
    async (req: Request, res: Response) => {
      try {
        // Handle bypass phone numbers before validation
        let { phoneNumber, otp, sessionId, deviceToken } = req.body;

        // Normalize phone number for bypass check
        const normalizePhoneNumber = (phone: string) => {
          phone = phone.replace(/[\s\-\(\)]/g, "");
          if (phone === "8520025559") return "+918520025559";
          if (phone === "918520025559") return "+918520025559";
          if (phone === "+918520025559") return "+918520025559";
          return phone;
        };

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const isBypassNumber =
          BYPASS_PHONE_NUMBERS.includes(phoneNumber) ||
          BYPASS_PHONE_NUMBERS.includes(normalizedPhone);

        if (isBypassNumber) {
          // For bypass numbers, use the standard format consistently
          phoneNumber = "+918520025559";
          console.log(
            `OTP verification bypass activated for phone number: ${req.body.phoneNumber} (normalized: ${phoneNumber})`,
          );
        } else {
          // Validate normally for non-bypass numbers
          const validatedData = verifyOtpSchema.parse(req.body);
          phoneNumber = validatedData.phoneNumber;
          otp = validatedData.otp;
          sessionId = validatedData.sessionId;
          deviceToken = validatedData.deviceToken;
        }

        // Find the session
        let sessionData: {
          phoneNumber: string;
          sessionId: string;
          expiresAt: Date;
        } | null = null;
        let sessionKey: string | null = null;

        for (const [key, session] of Array.from(otpSessions.entries())) {
          if (
            session.phoneNumber === phoneNumber &&
            session.sessionId === sessionId
          ) {
            if (session.expiresAt < new Date()) {
              otpSessions.delete(key);
              return res.status(400).json({ error: "OTP session expired" });
            }
            sessionData = session;
            sessionKey = key;
            break;
          }
        }

        if (!sessionData) {
          return res.status(400).json({ error: "Invalid session" });
        }

        // Check for bypass phone numbers - accept any OTP for bypass numbers
        if (isBypassNumber) {
          console.log(
            `OTP verification bypass: accepting any OTP for ${phoneNumber}`,
          );
          // Skip actual OTP verification for bypass numbers
        } else {
          // Verify OTP with 2Factor API for regular numbers
          await twoFactorAPI.verifyOTP(sessionData!.sessionId, otp);
        }

        // Check if user already exists
        const existingUsers = await storage.getUsers();
        let user = existingUsers.find((u) => u.username === phoneNumber);

        if (user) {
          // Check if user is blocked
          if (user.isBlocked) {
            // Clean up session
            if (sessionKey) otpSessions.delete(sessionKey);

            return res.status(403).json({
              error:
                "Your account has been blocked. Please contact support for assistance.",
              errorCode: "ACCOUNT_BLOCKED",
            });
          }
          // Existing user login
          // Clean up session
          if (sessionKey) otpSessions.delete(sessionKey);

          // Generate JWT token
          const token = jwt.sign(
            { userId: user.id, phoneNumber },
            process.env.JWT_SECRET || "77ab346ffe91751557cbebdabe5f70232158444821b383d6e256a475d4b0ecd70a14e49b561e645474eace8720db55db0f78bcd316cf55bea9708df9d0cb7326",
            { expiresIn: "30d" },
          );

          // Update last active and device token if provided
          const updateData: any = {
            lastActive: new Date(),
            isOnline: true,
          };
          
          // Update device token if provided
          if (deviceToken) {
            updateData.fcmToken = deviceToken;
            console.log(`Updated FCM token for existing user ${user.id}`);
          }
          
          await storage.updateUser(user.id, updateData);

          // Get existing wallet
          let wallet = await storage.getWallet(user.id);
          if (!wallet) {
            // Create wallet if it doesn't exist
            wallet = await storage.createWallet(user.id);
          }

          res.json({
            success: true,
            message: "Login successful. Welcome back!",
            token,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              avatar: await getApprovedAvatar(user.id),
              gender: user.gender,
              profileType: user.profileType,
              badgeLevel: user.badgeLevel,
              language: user.language,
              dob: user.dob,
              interests: user.interests,
              aboutMe: user.aboutMe,
              isOnline: user.isOnline,
              lastActive: user.lastActive,
              wallet: {
                coinBalance: wallet.coinBalance,
                totalEarned: wallet.totalEarned,
                totalSpent: wallet.totalSpent,
              },
            },
            isNewUser: false,
          });
        } else {
          // Create new user immediately after OTP verification
          let newUser;
          let wallet;

          try {
            newUser = await storage.createUser({
              username: phoneNumber,
              name: `User_${phoneNumber.slice(-4)}`, // Default name using last 4 digits
              email: `${phoneNumber.replace("+", "")}@gigglebuz.com`, // Default email
              gender: "male", // Default gender
              profileType: "basic",
              badgeLevel: 1,
              language: "en",
              dob: null,
              interests: [],
              aboutMe: null,
              isBlocked: false,
              isOnline: true,
              lastActive: new Date(),
              fcmToken: deviceToken || null, // Set device token if provided
            });
            
            if (deviceToken) {
              console.log(`Set FCM token for new user ${newUser.id}`);
            }

            // Create wallet for new user
            wallet = await storage.createWallet(newUser.id);
          } catch (createError: any) {
            // If user creation fails due to duplicate name or other constraints
            if (
              createError.message &&
              (createError.message.includes("E11000") ||
                createError.message.includes("already exists"))
            ) {
              console.log(
                "User already exists, attempting to find existing user",
              );
              const users = await storage.getUsers();
              const existingUser = users.find(
                (u) => u.username === phoneNumber,
              );

              if (existingUser) {
                // Check if user is blocked
                if (existingUser.isBlocked) {
                  // Clean up session
                  if (sessionKey) otpSessions.delete(sessionKey);

                  return res.status(403).json({
                    error:
                      "Your account has been blocked. Please contact support for assistance.",
                    errorCode: "ACCOUNT_BLOCKED",
                  });
                }

                // Clean up session
                if (sessionKey) otpSessions.delete(sessionKey);

                // Generate JWT token
                const token = jwt.sign(
                  { userId: existingUser.id, phoneNumber },
                  process.env.JWT_SECRET || "77ab346ffe91751557cbebdabe5f70232158444821b383d6e256a475d4b0ecd70a14e49b561e645474eace8720db55db0f78bcd316cf55bea9708df9d0cb7326",
                  { expiresIn: "30d" },
                );

                // Update last active and device token if provided
                const updateData: any = {
                  lastActive: new Date(),
                  isOnline: true,
                };
                
                // Update device token if provided
                if (deviceToken) {
                  updateData.fcmToken = deviceToken;
                  console.log(`Updated FCM token for existing user ${existingUser.id} (duplicate handling)`);
                }
                
                await storage.updateUser(existingUser.id, updateData);

                // Get existing wallet or create if missing
                let existingWallet = await storage.getWallet(existingUser.id);
                if (!existingWallet) {
                  existingWallet = await storage.createWallet(existingUser.id);
                }

                return res.json({
                  success: true,
                  message: "Login successful. Welcome back!",
                  token,
                  user: {
                    id: existingUser.id,
                    username: existingUser.username,
                    name: existingUser.name,
                    email: existingUser.email,
                    avatar: existingUser.avatar,
                    gender: existingUser.gender,
                    profileType: existingUser.profileType,
                    badgeLevel: existingUser.badgeLevel,
                    language: existingUser.language,
                    dob: existingUser.dob,
                    interests: existingUser.interests,
                    aboutMe: existingUser.aboutMe,
                    isOnline: existingUser.isOnline,
                    lastActive: existingUser.lastActive,
                    wallet: {
                      coinBalance: existingWallet.coinBalance,
                      totalEarned: existingWallet.totalEarned,
                      totalSpent: existingWallet.totalSpent,
                    },
                  },
                  isNewUser: false,
                });
              }
            }
            throw createError; // Re-throw if not a duplicate error
          }

          // Clean up session
          if (sessionKey) otpSessions.delete(sessionKey);

          // Generate JWT token for immediate login
          const token = jwt.sign(
            { userId: newUser.id, phoneNumber },
            process.env.JWT_SECRET || "77ab346ffe91751557cbebdabe5f70232158444821b383d6e256a475d4b0ecd70a14e49b561e645474eace8720db55db0f78bcd316cf55bea9708df9d0cb7326",
            { expiresIn: "30d" },
          );

          // Sync user profile to Firebase Firestore for real-time access
          await FirestoreService.syncUserProfile(
            newUser.id.toString(),
            newUser,
          );

          // Store wallet info in Firebase for mobile app real-time updates
          await FirestoreService.updateUserWallet(newUser.id.toString(), {
            userId: newUser.id,
            coinBalance: wallet.coinBalance,
            totalEarned: wallet.totalEarned,
            totalSpent: wallet.totalSpent,
          });

          res.json({
            success: true,
            message: "Account created successfully. You are now logged in.",
            token,
            user: {
              id: newUser.id,
              username: newUser.username,
              name: newUser.name,
              email: newUser.email,
              avatar: await getApprovedAvatar(newUser.id),
              gender: newUser.gender,
              profileType: newUser.profileType,
              badgeLevel: newUser.badgeLevel,
              language: newUser.language,
              dob: newUser.dob,
              interests: newUser.interests,
              aboutMe: newUser.aboutMe,
              isOnline: newUser.isOnline,
              lastActive: newUser.lastActive,
              wallet: {
                coinBalance: wallet.coinBalance,
                totalEarned: wallet.totalEarned,
                totalSpent: wallet.totalSpent,
              },
            },
            isNewUser: true,
          });
        }
      } catch (error: any) {
        console.error("Verify OTP error:", error);
        res.status(400).json({ error: error.message || "Invalid OTP" });
      }
    },
  );

  // 3. Complete Profile (update authenticated user profile)
  /**
   * @swagger
   * /api/v1/app/auth/complete-profile:
   *   post:
   *     tags: [Mobile Auth]
   *     summary: Update user profile with JWT authentication
   *     description: Updates profile information for authenticated users using JWT token
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CompleteProfile'
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Profile updated successfully"
   *                 user:
   *                   allOf:
   *                     - $ref: '#/components/schemas/User'
   *                     - type: object
   *                       properties:
   *                         isProfileComplete:
   *                           type: boolean
   *                           example: true
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/auth/complete-profile",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const profileData = completeProfileSchema.parse(req.body);
        const user = req.user!;

        // Handle avatar submission through admin approval workflow if provided
        if (profileData.avatar) {
          // Create a profile picture request for admin approval
          await storage.createProfilePictureRequest({
            userId: user.id,
            imageUrl: profileData.avatar,
            userDetails: {
              name: profileData.name || user.username,
              username: user.username,
              email: profileData.email || user.email,
              gender: profileData.gender || user.gender,
            },
          });
        }

        // Update user profile (excluding avatar which goes through approval)
        // Set profile type to 'gicon' for female users if not already set to a specific type
        const profileType =
          profileData.gender === "female" && user.profileType === "basic"
            ? "gicon"
            : user.profileType;

        const updatedUser = await storage.updateUser(user.id, {
          name: profileData.name,
          email: profileData.email,
          gender: profileData.gender,
          profileType: profileType,
          language: profileData.language,
          dob: profileData.dob ? new Date(profileData.dob) : null,
          interests: profileData.interests,
          aboutMe: profileData.aboutMe,
          lastActive: new Date(),
        });

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Get user's wallet
        let wallet = await storage.getWallet(user.id);
        if (!wallet) {
          wallet = await storage.createWallet(user.id);
        }

        // Sync updated profile to Firebase Firestore
        await FirestoreService.syncUserProfile(user.id.toString(), updatedUser);

        // Update wallet info in Firebase
        await FirestoreService.updateUserWallet(user.id.toString(), {
          userId: user.id,
          coinBalance: wallet.coinBalance,
          totalEarned: wallet.totalEarned,
          totalSpent: wallet.totalSpent,
        });

        res.json({
          success: true,
          message: "Profile updated successfully",
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: await getApprovedAvatar(updatedUser.id),
            gender: updatedUser.gender,
            profileType: updatedUser.profileType,
            badgeLevel: updatedUser.badgeLevel,
            language: updatedUser.language,
            dob: updatedUser.dob,
            interests: updatedUser.interests,
            aboutMe: updatedUser.aboutMe,
            isOnline: updatedUser.isOnline,
            lastActive: updatedUser.lastActive,
            wallet: {
              coinBalance: wallet.coinBalance,
              totalEarned: wallet.totalEarned,
              totalSpent: wallet.totalSpent,
            },
            isProfileComplete: !!(updatedUser.name && updatedUser.email),
          },
        });
      } catch (error: any) {
        console.error("Complete profile error:", error);

        // Handle duplicate name error specifically
        if (error.message && error.message.includes("already exists")) {
          return res.status(409).json({
            error: error.message,
            code: "DUPLICATE_NAME",
          });
        }

        res
          .status(400)
          .json({ error: error.message || "Failed to complete profile" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/auth/me:
   *   get:
   *     tags: [Mobile Auth]
   *     summary: Get current authenticated user profile
   *     description: Returns the profile information of the currently authenticated user with wallet details and rating statistics
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully with rating statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 user:
   *                   $ref: '#/components/schemas/UserProfileWithRating'
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // 4. Get current user profile
  app.get(
    "/api/v1/app/auth/me",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        // Get wallet information, create if not exists
        let wallet = await storage.getWallet(user.id);
        if (!wallet) {
          console.log(
            `Creating wallet for user ${user.id} (auth/me) as it doesn't exist`,
          );
          wallet = await storage.createWallet(user.id);
        }

        // Get user rating statistics
        const ratingStats = await storage.getUserRatingStats(user.id);

        // Get approved avatar only
        const approvedAvatar = await getApprovedAvatar(user.id);

        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatar: approvedAvatar,
            gender: user.gender,
            profileType: user.profileType,
            badgeLevel: user.badgeLevel,
            language: user.language,
            dob: user.dob,
            interests: user.interests,
            aboutMe: user.aboutMe,
            isOnline: user.isOnline,
            isBlocked: user.isBlocked,
            lastActive: user.lastActive,
            createdAt: user.createdAt,
            averageRating: ratingStats.averageRating,
            totalRatings: ratingStats.totalRatings,
            ratingStats: {
              callQuality: ratingStats.averageCallQuality,
              userExperience: ratingStats.averageUserExperience,
              communication: ratingStats.averageCommunication,
              distribution: ratingStats.ratingDistribution,
            },
            wallet: {
              coinBalance: wallet.coinBalance,
              totalEarned: wallet.totalEarned,
              totalSpent: wallet.totalSpent,
            },
          },
        });
      } catch (error: any) {
        console.error("Get profile error:", error);
        res.status(500).json({ error: "Failed to get profile" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/auth/delete-account:
   *   post:
   *     tags: [Mobile Auth]
   *     summary: User self-delete account
   *     description: Allows authenticated users to soft-delete their own account, making them unable to login
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Account deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Your account has been deleted successfully. You will no longer be able to login."
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/auth/delete-account",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        console.log(
          `User ${user.id} (${user.username}) is deleting their own account`,
        );

        // Soft delete by blocking the account and updating status
        await storage.updateUser(user.id, {
          isBlocked: true,
          isOnline: false,
          lastActive: new Date(), // Mark when the account was deleted
        });

        // Sync the updated status to Firebase
        try {
          await FirestoreService.updateUserInFirestore(user.id.toString(), {
            isBlocked: true,
            isOnline: false,
            lastActive: new Date(),
            deletedAt: new Date(),
            deletedBy: "self", // Indicates self-deletion
          });
          console.log(
            `Firebase sync completed for self-deleted user: ${user.id}`,
          );
        } catch (firebaseError) {
          console.warn(
            "Firebase sync failed for self-deletion (non-critical):",
            firebaseError,
          );
        }

        res.json({
          success: true,
          message:
            "Your account has been deleted successfully. You will no longer be able to login.",
        });
      } catch (error: any) {
        console.error("Delete account error:", error);
        res.status(500).json({ error: "Failed to delete account" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/profile:
   *   get:
   *     tags: [Mobile Profile]
   *     summary: Get user profile (dedicated endpoint)
   *     description: Returns the complete user profile with wallet information and rating statistics
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Profile retrieved successfully with rating statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 user:
   *                   $ref: '#/components/schemas/UserProfileWithRating'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // 5. Get user profile (dedicated endpoint)
  app.get(
    "/api/v1/app/profile",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        // Get wallet information, create if not exists
        let wallet = await storage.getWallet(user.id);
        if (!wallet) {
          console.log(
            `Creating wallet for user ${user.id} (profile) as it doesn't exist`,
          );
          wallet = await storage.createWallet(user.id);
        }

        // Get user rating statistics
        const ratingStats = await storage.getUserRatingStats(user.id);

        // Get approved avatar only
        const approvedAvatar = await getApprovedAvatar(user.id);

        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatar: approvedAvatar,
            gender: user.gender,
            profileType: user.profileType,
            badgeLevel: user.badgeLevel,
            language: user.language,
            dob: user.dob,
            interests: user.interests,
            aboutMe: user.aboutMe,
            isOnline: user.isOnline,
            isBlocked: user.isBlocked,
            lastActive: user.lastActive,
            createdAt: user.createdAt,
            averageRating: ratingStats.averageRating,
            totalRatings: ratingStats.totalRatings,
            ratingStats: {
              callQuality: ratingStats.averageCallQuality,
              userExperience: ratingStats.averageUserExperience,
              communication: ratingStats.averageCommunication,
              distribution: ratingStats.ratingDistribution,
            },
            wallet: {
              coinBalance: wallet.coinBalance,
              totalEarned: wallet.totalEarned,
              totalSpent: wallet.totalSpent,
            },
          },
        });
      } catch (error: any) {
        console.error("Get profile error:", error);
        res.status(500).json({ error: "Failed to get profile" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/auth/update-profile-picture:
   *   post:
   *     tags: [Mobile Profile]
   *     summary: Update user profile picture
   *     description: Upload and update the user's profile picture
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               profilePicture:
   *                 type: string
   *                 format: binary
   *                 description: Profile picture image file
   *             required:
   *               - profilePicture
   *     responses:
   *       200:
   *         description: Profile picture updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Profile picture updated successfully"
   *                 avatar:
   *                   type: string
   *                   example: "/uploads/profiles/profile-123.jpg"
   *       400:
   *         description: No image file provided
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Failed to update profile picture
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // 6. Update profile picture (now requires admin approval)
  app.post(
    "/api/v1/app/auth/update-profile-picture",
    authenticateMobileUser,
    (req: Request, res: Response, next: Function) => {
      // Check if it's a JSON request with profilePicture URL
      if (
        req.headers["content-type"]?.includes("application/json") &&
        req.body.profilePicture
      ) {
        // Skip multer for JSON requests
        next();
      } else {
        // Use multer for file uploads
        profileUpload.single("profilePicture")(req, res, next);
      }
    },
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        let imageUrl: string;

        // Handle JSON request with profilePicture URL
        if (
          req.headers["content-type"]?.includes("application/json") &&
          req.body.profilePicture
        ) {
          const { profilePicture } = req.body;

          if (!profilePicture || typeof profilePicture !== "string") {
            return res
              .status(400)
              .json({ error: "Profile picture URL is required" });
          }

          // Validate URL format
          try {
            new URL(profilePicture);
          } catch (e) {
            return res
              .status(400)
              .json({ error: "Invalid profile picture URL format" });
          }

          imageUrl = profilePicture;

          // Check if user already has a pending profile picture request
          const hasPendingRequest =
            await storage.hasUserPendingProfilePictureRequest(user.id);
          if (hasPendingRequest) {
            return res.status(400).json({
              error:
                "You already have a pending profile picture request. Please wait for admin approval before submitting a new one.",
            });
          }

          // Create a profile picture request for admin approval (same as file uploads)
          const profilePictureRequest =
            await storage.createProfilePictureRequest({
              userId: user.id,
              imageUrl: imageUrl,
              userDetails: {
                name: user.name || user.username,
                username: user.username,
                email: user.email,
                gender: user.gender,
              },
            });

          res.json({
            success: true,
            message:
              "Profile picture submitted successfully. It will be visible after admin approval.",
            requestId: profilePictureRequest.id,
            status: "pending_approval",
          });
          return;
        }

        // Handle file upload request
        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        // Generate URL for the uploaded file
        imageUrl = `/uploads/profiles/${req.file.filename}`;

        // Check if user already has a pending profile picture request
        const hasPendingRequest =
          await storage.hasUserPendingProfilePictureRequest(user.id);
        if (hasPendingRequest) {
          return res.status(400).json({
            error:
              "You already have a pending profile picture request. Please wait for admin approval before submitting a new one.",
          });
        }

        // Create a profile picture request for admin approval
        const profilePictureRequest = await storage.createProfilePictureRequest(
          {
            userId: user.id,
            imageUrl: imageUrl,
            userDetails: {
              name: user.name || user.username,
              username: user.username,
              email: user.email,
              gender: user.gender,
            },
          },
        );

        res.json({
          success: true,
          message:
            "Profile picture uploaded successfully. It will be visible after admin approval.",
          requestId: profilePictureRequest.id,
          status: "pending_approval",
        });
      } catch (error: any) {
        console.error("Update profile picture error:", error);
        res.status(500).json({ error: "Failed to upload profile picture" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/auth/update-avatar:
   *   post:
   *     tags: [Mobile Profile]
   *     summary: Update user avatar with URL
   *     description: Update the user's avatar using a URL (no file upload required)
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               avatar:
   *                 type: string
   *                 format: uri
   *                 description: Avatar image URL
   *                 example: "https://firebasestorage.googleapis.com/v0/b/giggles-16518.firebasestorage.app/o/static_profiles%2FF82E9A4B-3541-49CA-A8FD-792D82658D67.PNG?alt=media&token=714b770a-782f-4a3e-95e8-9b4a930c54de"
   *             required:
   *               - avatar
   *     responses:
   *       200:
   *         description: Avatar updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Avatar updated successfully"
   *                 user:
   *                   type: object
   *                   properties:
   *                     avatar:
   *                       type: string
   *                       example: "https://firebasestorage.googleapis.com/..."
   *       400:
   *         description: Invalid avatar URL
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/v1/app/auth/update-avatar",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { avatar } = req.body;

        if (!avatar || typeof avatar !== "string") {
          return res.status(400).json({ error: "Avatar URL is required" });
        }

        // Validate URL format
        try {
          new URL(avatar);
        } catch (e) {
          return res.status(400).json({ error: "Invalid avatar URL format" });
        }

        const user = req.user!;

        // Update user avatar directly
        const updatedUser = await storage.updateUser(user.id, {
          avatar: avatar,
          lastActive: new Date(),
        });

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Sync updated profile to Firebase Firestore
        await FirestoreService.syncUserProfile(user.id.toString(), updatedUser);

        res.json({
          success: true,
          message: "Avatar updated successfully",
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            name: updatedUser.name,
            avatar: await getApprovedAvatar(updatedUser.id),
            email: updatedUser.email,
            gender: updatedUser.gender,
            language: updatedUser.language,
            isOnline: updatedUser.isOnline,
          },
        });
      } catch (error: any) {
        console.error("Update avatar error:", error);
        res.status(500).json({ error: "Failed to update avatar" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/profile/update:
   *   put:
   *     tags: [Mobile Profile]
   *     summary: Update user profile information
   *     description: Updates user profile data and syncs with Firebase Firestore for real-time updates
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateProfile'
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Profile updated successfully"
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "685317a6c62884c2426f8bee"
   *                     username:
   *                       type: string
   *                       example: "+919876543210"
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     email:
   *                       type: string
   *                       example: "john@example.com"
   *                     avatar:
   *                       type: string
   *                       nullable: true
   *                       example: null
   *                     gender:
   *                       type: string
   *                       example: "male"
   *                     profileType:
   *                       type: string
   *                       example: "basic"
   *                     badgeLevel:
   *                       type: integer
   *                       example: 1
   *                     language:
   *                       type: string
   *                       example: "en"
   *                     dob:
   *                       type: string
   *                       format: date
   *                       nullable: true
   *                       example: null
   *                     interests:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ["technology", "gaming"]
   *                     aboutMe:
   *                       type: string
   *                       example: "Updated profile information"
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // 7. Update user profile
  app.put(
    "/api/v1/app/profile/update",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const updateData = updateProfileSchema.parse(req.body);

        // Convert dob string to Date if provided
        const updates: any = { ...updateData };
        if (updates.dob) {
          updates.dob = new Date(updates.dob);
        }

        // Set profile type to 'gicon' for female users if not already set to a specific type
        if (updates.gender === "female" && user.profileType === "basic") {
          updates.profileType = "gicon";
        }

        // Update user profile
        const updatedUser = await storage.updateUser(user.id, updates);

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Sync updated profile to Firebase Firestore for real-time updates
        await FirestoreService.syncUserProfile(
          updatedUser.id.toString(),
          updatedUser,
        );

        res.json({
          success: true,
          message: "Profile updated successfully",
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: await getApprovedAvatar(updatedUser.id),
            gender: updatedUser.gender,
            profileType: updatedUser.profileType,
            badgeLevel: updatedUser.badgeLevel,
            language: updatedUser.language,
            dob: updatedUser.dob,
            interests: updatedUser.interests,
            aboutMe: updatedUser.aboutMe,
          },
        });
      } catch (error: any) {
        console.error("Update profile error:", error);

        // Handle duplicate name error specifically
        if (error.message && error.message.includes("already exists")) {
          return res.status(409).json({
            error: error.message,
            code: "DUPLICATE_NAME",
          });
        }

        res
          .status(400)
          .json({ error: error.message || "Failed to update profile" });
      }
    },
  );

  // ============= WALLET MANAGEMENT APIs =============

  /**
   * @swagger
   * /api/v1/app/wallet:
   *   get:
   *     tags: [Mobile Wallet]
   *     summary: Get user wallet details
   *     description: Returns wallet information including balance and transaction history
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Wallet details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 wallet:
   *                   type: object
   *                   properties:
   *                     coinBalance:
   *                       type: number
   *                       example: 150
   *                     totalEarned:
   *                       type: string
   *                       example: "500.00"
   *                     totalSpent:
   *                       type: string
   *                       example: "350.00"
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get(
    "/api/v1/app/wallet",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        let wallet = await storage.getWallet(user.id);
        if (!wallet) {
          wallet = await storage.createWallet(user.id);
        }

        res.json({
          success: true,
          wallet: {
            coinBalance: wallet.coinBalance,
            totalEarned: wallet.totalEarned,
            totalSpent: wallet.totalSpent,
          },
        });
      } catch (error: any) {
        console.error("Get wallet error:", error);
        res.status(500).json({ error: "Failed to retrieve wallet details" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/fcm/register:
   *   post:
   *     tags: [Mobile Notifications]
   *     summary: Register FCM token for push notifications
   *     description: Register user's FCM token to receive push notifications
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [fcmToken]
   *             properties:
   *               fcmToken:
   *                 type: string
   *                 example: "dXJ2ZzRkNm..."
   *                 description: Firebase Cloud Messaging token
   *     responses:
   *       200:
   *         description: FCM token registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "FCM token registered successfully"
   */
  app.post(
    "/api/v1/app/fcm/register",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { fcmToken } = req.body;

        if (!fcmToken) {
          return res.status(400).json({ error: "FCM token is required" });
        }

        // Update user's FCM token in Firestore
        await FirestoreService.updateUserInFirestore(user.id.toString(), {
          fcmToken: fcmToken,
          fcmTokenUpdatedAt: new Date(),
        });

        res.json({
          success: true,
          message: "FCM token registered successfully",
        });
      } catch (error: any) {
        console.error("FCM token registration error:", error);
        res.status(500).json({ error: "Failed to register FCM token" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/call/missed:
   *   post:
   *     tags: [Mobile Call Management]
   *     summary: Record a missed call
   *     description: Record when a call was not answered by the receiver
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [callId, receiverUserId, callType, missedReason]
   *             properties:
   *               callId:
   *                 type: string
   *                 example: "call_1234567890_abc123"
   *               receiverUserId:
   *                 type: number
   *                 example: 456
   *               callType:
   *                 type: string
   *                 enum: [video, audio, message]
   *                 example: "video"
   *               missedReason:
   *                 type: string
   *                 enum: [no_answer, declined, busy, offline, timeout]
   *                 example: "no_answer"
   *               initiatedAt:
   *                 type: string
   *                 format: date-time
   *                 example: "2024-01-15T10:30:00Z"
   *     responses:
   *       200:
   *         description: Missed call recorded successfully
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Failed to record missed call
   */
  app.post(
    "/api/v1/app/call/missed",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const callerUserId = req.user?.id;
        const { callId, receiverUserId, callType, missedReason, initiatedAt } =
          req.body;

        if (!callId || !receiverUserId || !callType || !missedReason) {
          return res.status(400).json({
            success: false,
            error:
              "Call ID, receiver user ID, call type, and missed reason are required",
          });
        }

        // Record missed call
        const missedCall = await storage.createMissedCall({
          callId,
          callerUserId,
          receiverUserId,
          callType,
          initiatedAt: initiatedAt ? new Date(initiatedAt) : new Date(),
          missedReason,
        });

        // Get caller details for notification
        const caller = await storage.getUserById(callerUserId);

        if (caller) {
          // Send missed call notification to receiver
          await FirestoreService.sendCallNotification(
            receiverUserId.toString(),
            caller.name || caller.username,
            "call_missed",
            {
              callId,
              callerUserId,
              callType,
              missedReason,
              callerName: caller.name || caller.username,
            },
          );

          // Update notification status
          await storage.updateMissedCallNotificationStatus(callId, true);
        }

        res.json({
          success: true,
          message: "Missed call recorded successfully",
          missedCall: {
            id: missedCall._id,
            callId: missedCall.callId,
            callType: missedCall.callType,
            missedReason: missedCall.missedReason,
            initiatedAt: missedCall.initiatedAt,
            notificationSent: true,
          },
        });
      } catch (error: any) {
        console.error("Record missed call error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to record missed call",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/call/missed/list:
   *   get:
   *     tags: [Mobile Call Management]
   *     summary: Get user's missed calls
   *     description: Retrieve list of missed calls for the authenticated user
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: List of missed calls retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 missedCalls:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       callId:
   *                         type: string
   *                         example: "call_1234567890_abc123"
   *                       caller:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: number
   *                           name:
   *                             type: string
   *                           username:
   *                             type: string
   *                           avatar:
   *                             type: string
   *                       callType:
   *                         type: string
   *                         example: "video"
   *                       missedReason:
   *                         type: string
   *                         example: "no_answer"
   *                       initiatedAt:
   *                         type: string
   *                         format: date-time
   *                       viewed:
   *                         type: boolean
   *                         example: false
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   *                     unread:
   *                       type: integer
   *                     hasMore:
   *                       type: boolean
   */
  app.get(
    "/api/v1/app/call/missed/list",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id!;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await storage.getMissedCalls(userId, page, limit);

        res.json({
          success: true,
          missedCalls: result.missedCalls,
          pagination: result.pagination,
        });
      } catch (error: any) {
        console.error("Get missed calls error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to retrieve missed calls",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/call/missed/mark-viewed:
   *   post:
   *     tags: [Mobile Call Management]
   *     summary: Mark missed call as viewed
   *     description: Mark a specific missed call as viewed by the user
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [callId]
   *             properties:
   *               callId:
   *                 type: string
   *                 example: "call_1234567890_abc123"
   *     responses:
   *       200:
   *         description: Missed call marked as viewed successfully
   *       400:
   *         description: Call ID is required
   *       500:
   *         description: Failed to mark missed call as viewed
   */
  app.post(
    "/api/v1/app/call/missed/mark-viewed",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id!;
        const { callId } = req.body;

        if (!callId) {
          return res.status(400).json({
            success: false,
            error: "Call ID is required",
          });
        }

        const success = await storage.markMissedCallAsViewed(callId, userId);

        res.json({
          success,
          message: success
            ? "Missed call marked as viewed"
            : "Failed to mark missed call as viewed",
        });
      } catch (error: any) {
        console.error("Mark missed call as viewed error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to mark missed call as viewed",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/call/missed/mark-all-viewed:
   *   post:
   *     tags: [Mobile Call Management]
   *     summary: Mark all missed calls as viewed
   *     description: Mark all missed calls as viewed for the authenticated user
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: All missed calls marked as viewed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "5 missed calls marked as viewed"
   *                 updatedCount:
   *                   type: integer
   *                   example: 5
   */
  app.post(
    "/api/v1/app/call/missed/mark-all-viewed",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id!;

        const updatedCount = await storage.markAllMissedCallsAsViewed(userId);

        res.json({
          success: true,
          message: `${updatedCount} missed calls marked as viewed`,
          updatedCount,
        });
      } catch (error: any) {
        console.error("Mark all missed calls as viewed error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to mark all missed calls as viewed",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/wallet/recharge:
   *   post:
   *     tags: [Mobile Wallet]
   *     summary: Recharge wallet with coins
   *     description: Adds coins to user wallet and creates transaction record
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [amount, paymentMethod]
   *             properties:
   *               amount:
   *                 type: number
   *                 example: 100
   *                 description: Number of coins to add
   *               paymentMethod:
   *                 type: string
   *                 example: "UPI"
   *                 description: Payment method used
   *               transactionId:
   *                 type: string
   *                 example: "TXN123456789"
   *                 description: External payment transaction ID
   *     responses:
   *       200:
   *         description: Wallet recharged successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Wallet recharged successfully"
   *                 wallet:
   *                   type: object
   *                   properties:
   *                     coinBalance:
   *                       type: number
   *                       example: 250
   *                     totalEarned:
   *                       type: string
   *                       example: "600.00"
   *                 transaction:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: number
   *                       example: 123
   *                     amount:
   *                       type: number
   *                       example: 100
   *                     type:
   *                       type: string
   *                       example: "credit"
   */
  app.post(
    "/api/v1/app/wallet/recharge",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { amount, paymentMethod, transactionId } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).json({ error: "Invalid amount" });
        }

        if (!paymentMethod) {
          return res.status(400).json({ error: "Payment method is required" });
        }

        // Get or create wallet
        let wallet = await storage.getWallet(user.id);
        if (!wallet) {
          wallet = await storage.createWallet(user.id);
        }

        // Create wallet transaction record
        const transaction = await storage.createWalletTransaction({
          userId: user.id,
          amount: amount,
          type: "credit",
          description: `Wallet recharge via ${paymentMethod}`,
          status: "completed",
          transactionId: transactionId || `RECHARGE_${Date.now()}`,
        });

        // Update wallet balance
        await storage.updateWalletBalance(user.id, wallet.coinBalance + amount);

        // Get updated wallet
        const updatedWallet = await storage.getWallet(user.id);

        // Sync wallet update to Firebase
        await FirestoreService.updateUserWallet(user.id.toString(), {
          userId: user.id,
          coinBalance: updatedWallet!.coinBalance,
          totalEarned: updatedWallet!.totalEarned,
          totalSpent: updatedWallet!.totalSpent,
        });

        // Store transaction in Firebase
        await FirestoreService.storeWalletTransaction({
          userId: user.id.toString(),
          amount: amount,
          type: "credit",
          description: transaction.description,
          transactionId: transaction.transactionId,
          timestamp: new Date(),
        });

        // Send wallet recharge notification
        await FirestoreService.sendWalletNotification(
          user.id.toString(),
          "recharge",
          amount,
        );

        res.json({
          success: true,
          message: "Wallet recharged successfully",
          wallet: {
            coinBalance: updatedWallet!.coinBalance,
            totalEarned: updatedWallet!.totalEarned,
            totalSpent: updatedWallet!.totalSpent,
          },
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description,
            transactionId: transaction.transactionId,
          },
        });
      } catch (error: any) {
        console.error("Wallet recharge error:", error);
        res.status(500).json({ error: "Failed to recharge wallet" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/wallet/debit:
   *   post:
   *     tags: [Mobile Wallet]
   *     summary: Debit coins from wallet
   *     description: Deducts coins from user wallet for purchases or activities
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [amount, description]
   *             properties:
   *               amount:
   *                 type: number
   *                 example: 50
   *                 description: Number of coins to deduct
   *               description:
   *                 type: string
   *                 example: "Gift purchase"
   *                 description: Reason for debit
   *               itemId:
   *                 type: string
   *                 example: "GIFT_123"
   *                 description: Item or service ID
   *     responses:
   *       200:
   *         description: Coins debited successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Coins debited successfully"
   *                 wallet:
   *                   type: object
   *                   properties:
   *                     coinBalance:
   *                       type: number
   *                       example: 200
   *       400:
   *         description: Insufficient balance
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/wallet/debit",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { amount, description, itemId } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).json({ error: "Invalid amount" });
        }

        if (!description) {
          return res.status(400).json({ error: "Description is required" });
        }

        // Get wallet
        const wallet = await storage.getWallet(user.id);
        if (!wallet) {
          return res.status(404).json({ error: "Wallet not found" });
        }

        // Check sufficient balance
        if (wallet.coinBalance < amount) {
          return res.status(400).json({ error: "Insufficient balance" });
        }

        // Create wallet transaction record
        const transaction = await storage.createWalletTransaction({
          userId: user.id,
          amount: amount,
          type: "debit",
          description: description,
          status: "completed",
          transactionId: `DEBIT_${Date.now()}`,
        });

        // Update wallet balance
        await storage.updateWalletBalance(user.id, wallet.coinBalance - amount);

        // Get updated wallet
        const updatedWallet = await storage.getWallet(user.id);

        // Sync wallet update to Firebase
        await FirestoreService.updateUserWallet(user.id.toString(), {
          userId: user.id,
          coinBalance: updatedWallet!.coinBalance,
          totalEarned: updatedWallet!.totalEarned,
          totalSpent: updatedWallet!.totalSpent,
        });

        // Store transaction in Firebase
        await FirestoreService.storeWalletTransaction({
          userId: user.id.toString(),
          amount: amount,
          type: "debit",
          description: description,
          transactionId: transaction.transactionId,
          timestamp: new Date(),
        });

        res.json({
          success: true,
          message: "Coins debited successfully",
          wallet: {
            coinBalance: updatedWallet!.coinBalance,
            totalEarned: updatedWallet!.totalEarned,
            totalSpent: updatedWallet!.totalSpent,
          },
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description,
            transactionId: transaction.transactionId,
          },
        });
      } catch (error: any) {
        console.error("Wallet debit error:", error);
        res.status(500).json({ error: "Failed to debit coins" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/wallet/transactions:
   *   get:
   *     tags: [Mobile Wallet]
   *     summary: Get wallet transaction history
   *     description: Returns paginated list of user's wallet transactions
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of transactions per page
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [credit, debit]
   *         description: Filter by transaction type
   *     responses:
   *       200:
   *         description: Transaction history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 transactions:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                         example: 123
   *                       amount:
   *                         type: number
   *                         example: 100
   *                       type:
   *                         type: string
   *                         example: "credit"
   *                       description:
   *                         type: string
   *                         example: "Wallet recharge"
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   */
  app.get(
    "/api/v1/app/wallet/transactions",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as string;

        // Get all transactions for user
        const allTransactions = await storage.getWalletTransactions(user.id);

        // Filter by type if specified
        let filteredTransactions = allTransactions;
        if (type && (type === "credit" || type === "debit")) {
          filteredTransactions = allTransactions.filter((t) => t.type === type);
        }

        // Sort by createdAt descending
        filteredTransactions.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedTransactions = filteredTransactions.slice(
          startIndex,
          endIndex,
        );

        res.json({
          success: true,
          transactions: paginatedTransactions.map((t) => ({
            id: t.id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            status: t.status,
            transactionId: t.transactionId,
            createdAt: t.createdAt,
          })),
          pagination: {
            page,
            limit,
            total: filteredTransactions.length,
            totalPages: Math.ceil(filteredTransactions.length / limit),
          },
        });
      } catch (error: any) {
        console.error("Get transactions error:", error);
        res.status(500).json({ error: "Failed to retrieve transactions" });
      }
    },
  );

  // ============= WITHDRAWAL APIs =============

  /**
   * @swagger
   * /api/v1/app/wallet/withdraw:
   *   post:
   *     tags: [Mobile Wallet]
   *     summary: Request coin withdrawal
   *     description: Creates a withdrawal request for converting coins to real money
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [amount, accountType, accountDetails]
   *             properties:
   *               amount:
   *                 type: number
   *                 example: 1000
   *                 description: Number of coins to withdraw
   *               accountType:
   *                 type: string
   *                 enum: [bank, upi, paytm]
   *                 example: "upi"
   *               accountDetails:
   *                 type: object
   *                 properties:
   *                   upiId:
   *                     type: string
   *                     example: "user@paytm"
   *                   accountNumber:
   *                     type: string
   *                     example: "1234567890"
   *                   ifscCode:
   *                     type: string
   *                     example: "SBIN0001234"
   *                   accountHolder:
   *                     type: string
   *                     example: "John Doe"
   *     responses:
   *       200:
   *         description: Withdrawal request created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Withdrawal request submitted successfully"
   *                 withdrawalId:
   *                   type: number
   *                   example: 123
   *       400:
   *         description: Invalid request or insufficient balance
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/wallet/withdraw",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { coinAmount, accountType, accountDetails } = req.body;

        if (!coinAmount || coinAmount <= 0) {
          return res.status(400).json({ error: "Invalid coin amount" });
        }

        if (!accountType || !["bank", "upi", "paytm"].includes(accountType)) {
          return res.status(400).json({
            error: "Invalid account type. Use 'bank', 'upi', or 'paytm'",
          });
        }

        if (!accountDetails) {
          return res
            .status(400)
            .json({ error: "Account details are required" });
        }

        // Get admin-configurable conversion ratio first
        const callConfig = await storage.getCallConfig();
        const coinToRupeeRatio = callConfig?.coinToRupeeRatio || 10;

        // Minimum withdrawal amount (coinToRupeeRatio coins = 1 rupee)
        const minWithdrawalCoins = coinToRupeeRatio;
        if (coinAmount < minWithdrawalCoins) {
          return res.status(400).json({
            error: `Minimum withdrawal is ${minWithdrawalCoins} coins (₹1)`,
          });
        }

        // Coins must be multiple of coinToRupeeRatio for clean conversion
        if (coinAmount % coinToRupeeRatio !== 0) {
          return res.status(400).json({
            error: `Coin amount must be multiple of ${coinToRupeeRatio} for withdrawal (${coinToRupeeRatio} coins = ₹1)`,
          });
        }

        // Get wallet
        const wallet = await storage.getWallet(user.id);
        if (!wallet) {
          return res.status(404).json({ error: "Wallet not found" });
        }

        // Check sufficient balance
        if (wallet.coinBalance < coinAmount) {
          return res.status(400).json({
            error: "Insufficient balance",
            available: wallet.coinBalance,
            requested: coinAmount,
          });
        }

        // Calculate rupee conversion using admin-configured ratio
        const rupeeAmount = (coinAmount / coinToRupeeRatio).toFixed(2);

        // Create withdrawal request with new schema
        const withdrawal = await storage.createWithdrawalRequest({
          userId: user.id,
          coinAmount: coinAmount,
          rupeeAmount: rupeeAmount,
          status: "pending",
          accountType,
          accountDetails: JSON.stringify(accountDetails),
        });

        // Deduct coins from wallet (hold them until approval)
        await storage.updateWalletBalance(user.id, -coinAmount); // Negative amount for deduction

        // Create transaction record
        await storage.createWalletTransaction({
          userId: user.id,
          amount: coinAmount,
          type: "debit",
          description: `Withdrawal request - ${coinAmount} coins (₹${rupeeAmount}) via ${accountType}`,
          status: "pending",
          transactionId: `WITHDRAW_${withdrawal.id}`,
        });

        // Sync wallet update to Firebase
        const updatedWallet = await storage.getWallet(user.id);
        await FirestoreService.updateUserWallet(user.id.toString(), {
          userId: user.id,
          coinBalance: updatedWallet!.coinBalance,
          totalEarned: updatedWallet!.totalEarned,
          totalSpent: updatedWallet!.totalSpent,
        });

        res.json({
          success: true,
          message: "Withdrawal request submitted successfully",
          withdrawal: {
            id: withdrawal.id,
            coinAmount: coinAmount,
            rupeeAmount: rupeeAmount,
            conversionRate: `${coinToRupeeRatio} coins = ₹1`,
            accountType: accountType,
            status: "pending",
          },
          remainingBalance: updatedWallet!.coinBalance,
          estimatedProcessingTime: "2-3 business days",
        });
      } catch (error: any) {
        console.error("Withdrawal request error:", error);
        res.status(500).json({ error: "Failed to create withdrawal request" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/wallet/withdrawals:
   *   get:
   *     tags: [Mobile Wallet]
   *     summary: Get withdrawal history
   *     description: Returns list of user's withdrawal requests and their status
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Withdrawal history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 withdrawals:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                         example: 123
   *                       amount:
   *                         type: string
   *                         example: "1000"
   *                       status:
   *                         type: string
   *                         example: "pending"
   *                       accountType:
   *                         type: string
   *                         example: "upi"
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   */
  app.get(
    "/api/v1/app/wallet/withdrawals",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        // Get admin-configurable conversion ratio
        const callConfig = await storage.getCallConfig();

        // Get all withdrawal requests
        const allWithdrawals = await storage.getWithdrawalRequests();

        // Filter for current user
        const userWithdrawals = allWithdrawals.filter(
          (w) => w.userId === user.id,
        );

        // Sort by createdAt descending
        userWithdrawals.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        res.json({
          success: true,
          withdrawals: userWithdrawals.map((w) => ({
            id: w.id,
            coinAmount: w.coinAmount || parseInt(w.amount || "0"), // Legacy support
            rupeeAmount:
              w.rupeeAmount || (parseFloat(w.amount || "0") / 10).toFixed(2),
            conversionRate: `${callConfig?.coinToRupeeRatio || 10} coins = ₹1`,
            status: w.status,
            accountType: w.accountType,
            accountDetails: w.accountDetails
              ? JSON.parse(w.accountDetails)
              : null,
            createdAt: w.createdAt,
            processedAt: w.processedAt,
            remarks: w.remarks,
          })),
        });
      } catch (error: any) {
        console.error("Get withdrawals error:", error);
        res
          .status(500)
          .json({ error: "Failed to retrieve withdrawal history" });
      }
    },
  );

  // ============= COIN PACKAGES APIs =============

  /**
   * @swagger
   * /api/v1/app/coin-packages:
   *   get:
   *     tags: [Mobile Coin Packages]
   *     summary: Get available coin packages
   *     description: Returns list of coin packages available for purchase
   *     responses:
   *       200:
   *         description: Coin packages retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 packages:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                         example: 1
   *                       name:
   *                         type: string
   *                         example: "Starter Pack"
   *                       coinAmount:
   *                         type: number
   *                         example: 100
   *                       price:
   *                         type: string
   *                         example: "99.00"
   *                       description:
   *                         type: string
   *                         example: "Perfect for beginners"
   *                       isActive:
   *                         type: boolean
   *                         example: true
   */
  app.get("/api/v1/app/coin-packages", async (req: Request, res: Response) => {
    try {
      const packages = await storage.getCoinPackages();

      // Filter only active packages for mobile app
      const activePackages = packages.filter((pkg) => pkg.isActive);

      // Transform packages to include offer price and original price with INR currency
      const transformedPackages = activePackages.map((pkg) => {
        const originalPrice = parseFloat(pkg.price);
        const discountPercentage = pkg.discount || 0;
        const offerPrice =
          originalPrice - (originalPrice * discountPercentage) / 100;

        return {
          id: pkg.id,
          name: pkg.name,
          coinAmount: pkg.coinAmount,
          originalPrice: `₹${originalPrice.toFixed(2)}`,
          offerPrice: `₹${offerPrice.toFixed(2)}`,
          description: pkg.description,
          isActive: pkg.isActive,
        };
      });

      res.json({
        success: true,
        packages: transformedPackages,
      });
    } catch (error: any) {
      console.error("Get coin packages error:", error);
      res.status(500).json({ error: "Failed to retrieve coin packages" });
    }
  });

  /**
   * @swagger
   * /api/v1/app/purchase/coin-package:
   *   post:
   *     tags: [Mobile Coin Packages]
   *     summary: Purchase coin package with Cashfree payment gateway
   *     description: Creates a Cashfree payment order for coin package purchase
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [packageId, customerPhone, customerEmail]
   *             properties:
   *               packageId:
   *                 type: string
   *                 example: "6853cfbc79aaa9d4c2b1ee5d"
   *                 description: Coin package ID
   *               customerPhone:
   *                 type: string
   *                 example: "+917696457890"
   *                 description: Customer phone number
   *               customerEmail:
   *                 type: string
   *                 example: "user@example.com"
   *                 description: Customer email address
   *               returnUrl:
   *                 type: string
   *                 example: "https://your-app.com/payment-success"
   *                 description: URL to redirect after payment completion
   *     responses:
   *       200:
   *         description: Payment order created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Payment order created successfully"
   *                 orderId:
   *                   type: string
   *                   example: "order_123456789"
   *                 paymentSessionId:
   *                   type: string
   *                   example: "session_abc123"
   *                 paymentLinks:
   *                   type: object
   *                   properties:
   *                     web:
   *                       type: string
   *                       example: "https://payments.cashfree.com/order/..."
   *                     mobile:
   *                       type: string
   *                       example: "https://payments.cashfree.com/mobile/..."
   *                 package:
   *                   type: object
   *                   properties:
   *                     name:
   *                       type: string
   *                       example: "Popular Pack"
   *                     coinAmount:
   *                       type: number
   *                       example: 1500
   *                     price:
   *                       type: string
   *                       example: "99.00"
   *       400:
   *         description: Invalid request data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Package not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/purchase/coin-package",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { packageId, customerPhone, customerEmail, returnUrl } = req.body;

        // Validate required fields
        if (!packageId || !customerPhone || !customerEmail) {
          return res.status(400).json({
            error: "Package ID, customer phone, and email are required",
          });
        }

        // Validate Cashfree credentials
        if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
          return res.status(500).json({
            error: "Payment gateway not configured. Please contact support.",
          });
        }

        // Get package details
        const coinPackage = await storage.getCoinPackage(packageId);
        if (!coinPackage) {
          return res.status(404).json({ error: "Coin package not found" });
        }

        if (!coinPackage.isActive) {
          return res
            .status(400)
            .json({ error: "This package is no longer available" });
        }

        // Generate unique order ID
        const orderId = `CF_ORDER_${Date.now()}_${user.id}`;

        // Calculate the actual price to charge (offer price if discount available, otherwise original price)
        const originalPrice = parseFloat(coinPackage.price);
        const discountPercentage = coinPackage.discount || 0;
        const offerPrice = originalPrice - (originalPrice * discountPercentage) / 100;
        const actualPrice = discountPercentage > 0 ? offerPrice : originalPrice;

        console.log(`Pricing calculation: Original: ₹${originalPrice}, Discount: ${discountPercentage}%, Offer: ₹${offerPrice.toFixed(2)}, Charging: ₹${actualPrice.toFixed(2)}`);

        // Create Cashfree order request
        const orderRequest = {
          order_id: orderId,
          order_amount: parseFloat(actualPrice.toFixed(2)),
          order_currency: "INR",
          customer_details: {
            customer_id: user.id.toString(),
            customer_name: user.name,
            customer_email: customerEmail,
            customer_phone: customerPhone,
          },
          order_meta: {
            return_url:
              returnUrl || `https://${req.get("host")}/payment-success`,
            notify_url:
              process.env.WEBHOOK_URL ||
              `https://${req.get("host")}/api/v1/app/payment/webhook`,
            payment_methods: "cc,dc,nb,upi,paylater,emi,app",
          },
          order_note: `Coin package purchase: ${coinPackage.name} - ${coinPackage.coinAmount} coins`,
        };

        console.log("Creating Cashfree order:", orderRequest);

        // Create order with Cashfree REST API
        console.log("Creating Cashfree order via REST API...");
        const orderResponse = await cashfreeAPI.createOrder(orderRequest);

        if (!orderResponse || !orderResponse.payment_session_id) {
          console.error("Cashfree order creation failed:", orderResponse);
          return res.status(500).json({
            error: "Failed to create payment order. Please try again.",
          });
        }

        console.log("Cashfree order created successfully:", orderResponse);

        // Store pending transaction
        const pendingTransaction = await storage.createWalletTransaction({
          userId: user.id,
          amount: coinPackage.coinAmount,
          type: "credit",
          description: `Pending: ${coinPackage.name} package purchase`,
          status: "pending",
          transactionId: orderId,
        });

        res.json({
          success: true,
          message: "Payment order created successfully",
          orderId: orderResponse.order_id,
          paymentSessionId: orderResponse.payment_session_id,
          paymentLinks: {
            web: orderResponse.payment_link,
            mobile: orderResponse.payment_link,
          },
          package: {
            id: coinPackage.id,
            name: coinPackage.name,
            coinAmount: coinPackage.coinAmount,
            price: coinPackage.price,
            description: coinPackage.description,
          },
          pendingTransactionId: pendingTransaction.id,
        });
      } catch (error: any) {
        console.error("Coin package purchase error:", error);
        res.status(500).json({
          error: "Failed to create payment order",
          details: error.message,
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/payment/webhook:
   *   post:
   *     tags: [Mobile Coin Packages]
   *     summary: Cashfree payment webhook
   *     description: Handles payment completion notifications from Cashfree
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               type:
   *                 type: string
   *                 example: "PAYMENT_SUCCESS_WEBHOOK"
   *               data:
   *                 type: object
   *     responses:
   *       200:
   *         description: Webhook processed successfully
   */
  app.post(
    "/api/v1/app/payment/webhook",
    async (req: Request, res: Response) => {
      try {
        const { type, data } = req.body;

        console.log("Cashfree webhook received:", { type, data });

        if (type === "PAYMENT_SUCCESS_WEBHOOK" && data) {
          const { order_id, payment_id, payment_status } = data.order;

          if (payment_status === "PAID") {
            // Find pending transaction
            const allTransactions = await storage.getWalletTransactions();
            const pendingTransaction = allTransactions.find(
              (t) => t.transactionId === order_id && t.status === "pending",
            );

            if (pendingTransaction) {
              // Update transaction status to completed
              await storage.updateWalletTransaction(pendingTransaction.id, {
                status: "completed",
                transactionId: `${order_id}_${payment_id}`,
              });

              // Get user wallet
              const wallet = await storage.getWallet(pendingTransaction.userId);
              if (wallet) {
                // Credit coins to user wallet
                await storage.updateWalletBalance(
                  pendingTransaction.userId,
                  wallet.coinBalance + pendingTransaction.amount,
                );

                // Update Firebase
                const updatedWallet = await storage.getWallet(
                  pendingTransaction.userId,
                );
                if (updatedWallet) {
                  await FirestoreService.updateUserWallet(
                    pendingTransaction.userId.toString(),
                    {
                      userId: pendingTransaction.userId,
                      coinBalance: updatedWallet.coinBalance,
                      totalEarned: updatedWallet.totalEarned,
                      totalSpent: updatedWallet.totalSpent,
                    },
                  );

                  // Store completed transaction in Firebase
                  await FirestoreService.storeWalletTransaction({
                    userId: pendingTransaction.userId.toString(),
                    amount: pendingTransaction.amount,
                    type: "credit",
                    description: pendingTransaction.description.replace(
                      "Pending: ",
                      "",
                    ),
                    transactionId: `${order_id}_${payment_id}`,
                    timestamp: new Date(),
                  });
                }

                console.log(
                  `Payment successful: ${payment_id}, coins credited to user ${pendingTransaction.userId}`,
                );
              }
            }
          }
        }

        res.status(200).json({ success: true });
      } catch (error: any) {
        console.error("Payment webhook error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/payment/verify:
   *   post:
   *     tags: [Mobile Coin Packages]
   *     summary: Verify payment status
   *     description: Verifies payment status with Cashfree and updates wallet
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [orderId]
   *             properties:
   *               orderId:
   *                 type: string
   *                 example: "CF_ORDER_1234567890_123"
   *     responses:
   *       200:
   *         description: Payment verified successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 status:
   *                   type: string
   *                   example: "PAID"
   *                 wallet:
   *                   type: object
   *                   properties:
   *                     coinBalance:
   *                       type: number
   *                       example: 500
   */
  app.post(
    "/api/v1/app/payment/verify",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { orderId } = req.body;

        if (!orderId) {
          return res.status(400).json({ error: "Order ID is required" });
        }

        // Get order status from Cashfree REST API
        console.log("Fetching order status from Cashfree...");
        const orderResponse = await cashfreeAPI.fetchOrder(orderId);

        if (!orderResponse) {
          return res.status(404).json({ error: "Order not found" });
        }

        const paymentStatus = orderResponse.order_status;

        // If payment is successful, update wallet
        if (paymentStatus === "PAID") {
          // Find pending or completed transaction for this order
          const allTransactions = await storage.getWalletTransactions();
          let pendingTransaction = allTransactions.find(
            (t) =>
              t.transactionId === orderId &&
              t.status === "pending" &&
              t.userId === user.id,
          );

          // Check if transaction was already completed (coins already credited)
          const completedTransaction = allTransactions.find(
            (t) =>
              t.transactionId === orderId &&
              t.status === "completed" &&
              t.userId === user.id,
          );

          if (completedTransaction) {
            // Transaction already processed, coins already credited - just return current wallet
            const currentWallet = await storage.getWallet(user.id);
            return res.json({
              success: true,
              status: paymentStatus,
              message: "Payment already verified and coins already credited",
              coinsAlreadyCredited: true,
              wallet: {
                coinBalance: currentWallet!.coinBalance,
                totalEarned: currentWallet!.totalEarned,
                totalSpent: currentWallet!.totalSpent,
              },
            });
          }

          if (pendingTransaction) {
            console.log(
              `Found pending transaction: ${JSON.stringify(pendingTransaction)}`,
            );

            // Update transaction status
            await storage.updateWalletTransaction(pendingTransaction.id, {
              status: "completed",
            });

            // Get current wallet and ensure it exists
            let wallet = await storage.getWallet(user.id);
            if (!wallet) {
              console.log(`Creating missing wallet for user ${user.id}`);
              wallet = await storage.createWallet(user.id);
            }

            // Credit coins - updateWalletBalance adds the amount to current balance
            console.log(
              `🪙 PAYMENT VERIFICATION: Crediting ${pendingTransaction.amount} coins to user ${user.id}`,
            );
            console.log(
              `🪙 Current balance: ${wallet.coinBalance}, Adding: ${pendingTransaction.amount}, Expected final: ${wallet.coinBalance + pendingTransaction.amount}`,
            );
            await storage.updateWalletBalance(
              user.id,
              pendingTransaction.amount,
            );

            // Update Firebase
            const updatedWallet = await storage.getWallet(user.id);
            if (updatedWallet) {
              await FirestoreService.updateUserWallet(user.id.toString(), {
                userId: user.id,
                coinBalance: updatedWallet.coinBalance,
                totalEarned: updatedWallet.totalEarned,
                totalSpent: updatedWallet.totalSpent,
              });

              // Store completed transaction in Firebase
              await FirestoreService.storeWalletTransaction({
                userId: user.id.toString(),
                amount: pendingTransaction.amount,
                type: "credit",
                description: pendingTransaction.description.replace(
                  "Pending: ",
                  "",
                ),
                transactionId: orderId,
                timestamp: new Date(),
              });
            }

            console.log(
              `Payment verification successful: ${orderId}, ${pendingTransaction.amount} coins credited to user ${user.id}`,
            );

            return res.json({
              success: true,
              status: paymentStatus,
              message: "Payment verified and coins credited successfully",
              coinsAdded: pendingTransaction.amount,
              wallet: {
                coinBalance: updatedWallet!.coinBalance,
                totalEarned: updatedWallet!.totalEarned,
                totalSpent: updatedWallet!.totalSpent,
              },
            });
          } else {
            // No pending transaction found - payment might be completed via webhook
            // Try to find the order amount from Cashfree response and credit manually
            const orderAmount = orderResponse.order_amount;
            if (orderAmount) {
              // Create a completed transaction record
              const coinAmount = Math.floor(orderAmount); // Assuming 1 INR = 1 coin or adjust as needed

              // Check if we can determine coin package from order metadata
              let actualCoins = coinAmount;
              try {
                if (
                  orderResponse.order_note ||
                  orderResponse.customer_details?.customer_name
                ) {
                  // Try to extract coin amount from order details if available
                  const orderNote = orderResponse.order_note || "";
                  const coinMatch = orderNote.match(/(\d+)\s*coins?/i);
                  if (coinMatch) {
                    actualCoins = parseInt(coinMatch[1]);
                  }
                }
              } catch (e) {
                console.log(
                  "Could not parse coin amount from order details, using order amount:",
                  coinAmount,
                );
              }

              // Create transaction record
              const newTransaction = await storage.createWalletTransaction({
                userId: user.id,
                amount: actualCoins,
                type: "credit" as any,
                description: `Coin package purchase - Order ${orderId}`,
                transactionId: orderId,
                status: "completed" as any,
              });

              // Credit coins to wallet - updateWalletBalance adds the amount to current balance
              let wallet = await storage.getWallet(user.id);
              if (!wallet) {
                console.log(
                  `Creating missing wallet for user ${user.id} during payment verification`,
                );
                wallet = await storage.createWallet(user.id);
              }

              console.log(
                `🪙 MANUAL CREDIT (no pending tx): Adding ${actualCoins} coins to user ${user.id}`,
              );
              console.log(
                `🪙 Current balance: ${wallet.coinBalance}, Adding: ${actualCoins}, Expected final: ${wallet.coinBalance + actualCoins}`,
              );
              await storage.updateWalletBalance(user.id, actualCoins);

              // Update Firebase
              const updatedWallet = await storage.getWallet(user.id);
              if (updatedWallet) {
                await FirestoreService.updateUserWallet(user.id.toString(), {
                  userId: user.id,
                  coinBalance: updatedWallet.coinBalance,
                  totalEarned: updatedWallet.totalEarned,
                  totalSpent: updatedWallet.totalSpent,
                });

                await FirestoreService.storeWalletTransaction({
                  userId: user.id.toString(),
                  amount: actualCoins,
                  type: "credit",
                  description: `Coin package purchase - Order ${orderId}`,
                  transactionId: orderId,
                  timestamp: new Date(),
                });
              }

              console.log(
                `Payment verification (no pending tx): ${orderId}, ${actualCoins} coins credited to user ${user.id}`,
              );

              return res.json({
                success: true,
                status: paymentStatus,
                message: "Payment verified and coins credited successfully",
                coinsAdded: actualCoins,
                wallet: {
                  coinBalance: updatedWallet!.coinBalance,
                  totalEarned: updatedWallet!.totalEarned,
                  totalSpent: updatedWallet!.totalSpent,
                },
              });
            }
          }
        }

        res.json({
          success: true,
          status: paymentStatus,
          message: "Payment status retrieved",
        });
      } catch (error: any) {
        console.error("Payment verification error:", error);
        res.status(500).json({
          error: "Failed to verify payment",
          details: error.message,
        });
      }
    },
  );

  // ============= PAYMENT DEBUG & ADMIN ENDPOINTS =============

  /**
   * @swagger
   * /api/v1/app/payment/debug/pending:
   *   get:
   *     tags: [Mobile Coin Packages]
   *     summary: Get pending transactions for debugging
   *     description: Returns all pending payment transactions for the authenticated user
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Pending transactions retrieved successfully
   */
  app.get(
    "/api/v1/app/payment/debug/pending",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const allTransactions = await storage.getWalletTransactions();

        // Get user's pending transactions
        const pendingTransactions = allTransactions.filter(
          (t) => t.userId === user.id && t.status === "pending",
        );

        res.json({
          success: true,
          pendingTransactions: pendingTransactions.map((t) => ({
            id: t.id,
            orderId: t.transactionId,
            amount: t.amount,
            description: t.description,
            createdAt: t.createdAt,
            status: t.status,
          })),
          count: pendingTransactions.length,
          message:
            pendingTransactions.length > 0
              ? `Found ${pendingTransactions.length} pending transaction(s). Use /force-verify to credit coins manually.`
              : "No pending transactions found.",
        });
      } catch (error: any) {
        console.error("Get pending transactions error:", error);
        res
          .status(500)
          .json({ error: "Failed to retrieve pending transactions" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/payment/force-verify:
   *   post:
   *     tags: [Mobile Coin Packages]
   *     summary: Force verify and credit coins for sandbox payments
   *     description: Manually verifies payment and credits coins (useful for sandbox testing when webhooks don't work)
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [orderId]
   *             properties:
   *               orderId:
   *                 type: string
   *                 example: "CF_ORDER_1234567890_123"
   *     responses:
   *       200:
   *         description: Payment forcefully verified and coins credited
   */
  app.post(
    "/api/v1/app/payment/force-verify",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { orderId } = req.body;

        if (!orderId) {
          return res.status(400).json({ error: "Order ID is required" });
        }

        // Find pending transaction
        const allTransactions = await storage.getWalletTransactions();
        const pendingTransaction = allTransactions.find(
          (t) =>
            t.transactionId === orderId &&
            t.status === "pending" &&
            t.userId === user.id,
        );

        if (!pendingTransaction) {
          return res.status(404).json({
            error: "Pending transaction not found for this order ID",
            hint: "Check if the order ID is correct or if coins were already credited",
            suggestion:
              "Use /debug/pending to see all your pending transactions",
          });
        }

        // Update transaction status to completed
        await storage.updateWalletTransaction(pendingTransaction.id, {
          status: "completed",
          transactionId: `${orderId}_MANUAL_VERIFY_${Date.now()}`,
        });

        // Get current wallet
        const wallet = await storage.getWallet(user.id);
        if (!wallet) {
          return res.status(404).json({ error: "User wallet not found" });
        }

        // Credit coins to user wallet
        await storage.updateWalletBalance(
          user.id,
          wallet.coinBalance + pendingTransaction.amount,
        );

        // Get updated wallet
        const updatedWallet = await storage.getWallet(user.id);

        // Update Firebase
        if (updatedWallet) {
          await FirestoreService.updateUserWallet(user.id.toString(), {
            userId: user.id,
            coinBalance: updatedWallet.coinBalance,
            totalEarned: updatedWallet.totalEarned,
            totalSpent: updatedWallet.totalSpent,
          });

          // Store completed transaction in Firebase
          await FirestoreService.storeWalletTransaction({
            userId: user.id.toString(),
            amount: pendingTransaction.amount,
            type: "credit",
            description: pendingTransaction.description.replace(
              "Pending: ",
              "Manual Verification: ",
            ),
            transactionId: `${orderId}_MANUAL_VERIFY`,
            timestamp: new Date(),
          });
        }

        console.log(
          `Manual verification: ${orderId}, ${pendingTransaction.amount} coins credited to user ${user.id}`,
        );

        res.json({
          success: true,
          message:
            "🎉 Payment manually verified and coins credited successfully!",
          coinsAdded: pendingTransaction.amount,
          wallet: {
            coinBalance: updatedWallet!.coinBalance,
            totalEarned: updatedWallet!.totalEarned,
            totalSpent: updatedWallet!.totalSpent,
          },
          transaction: {
            orderId,
            amount: pendingTransaction.amount,
            description: pendingTransaction.description,
            status: "completed",
          },
        });
      } catch (error: any) {
        console.error("Force verify payment error:", error);
        res.status(500).json({
          error: "Failed to verify payment manually",
          details: error.message,
        });
      }
    },
  );

  // ============= LEADERBOARD APIs =============

  /**
   * @swagger
   * /api/v1/app/leaderboard:
   *   get:
   *     tags: [Mobile Leaderboard]
   *     summary: Get leaderboard data
   *     description: Returns leaderboard rankings based on various metrics
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [coins, gifts, activity]
   *           default: coins
   *         description: Leaderboard type
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [daily, weekly, monthly, all-time]
   *           default: weekly
   *         description: Time period for leaderboard
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Number of top users to return
   *     responses:
   *       200:
   *         description: Leaderboard retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 leaderboard:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       rank:
   *                         type: number
   *                         example: 1
   *                       userId:
   *                         type: string
   *                         example: "123"
   *                       username:
   *                         type: string
   *                         example: "User_1234"
   *                       name:
   *                         type: string
   *                         example: "John Doe"
   *                       avatar:
   *                         type: string
   *                         example: "https://example.com/avatar.jpg"
   *                       score:
   *                         type: number
   *                         example: 1500
   *                       badgeLevel:
   *                         type: number
   *                         example: 5
   *                 currentUser:
   *                   type: object
   *                   properties:
   *                     rank:
   *                       type: number
   *                       example: 25
   *                     score:
   *                       type: number
   *                       example: 750
   */
  app.get("/api/v1/app/leaderboard", async (req: Request, res: Response) => {
    try {
      const type = (req.query.type as string) || "coins";
      const period = (req.query.period as string) || "weekly";
      const limit = parseInt(req.query.limit as string) || 50;

      // Get leaderboard data
      const leaderboardData = await storage.getLeaderboard(type, period);

      // Sort by score descending and take top entries
      const sortedLeaderboard = leaderboardData
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Add rank to each entry
      const rankedLeaderboard = sortedLeaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId.toString(),
        username: entry.username,
        name: entry.name || entry.username,
        avatar: entry.avatar,
        score: entry.score,
        badgeLevel: entry.badgeLevel || 1,
      }));

      // Get current user rank if authenticated
      let currentUserRank = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "77ab346ffe91751557cbebdabe5f70232158444821b383d6e256a475d4b0ecd70a14e49b561e645474eace8720db55db0f78bcd316cf55bea9708df9d0cb7326",
          ) as any;
          const currentUserId = decoded.userId;

          const userIndex = sortedLeaderboard.findIndex(
            (entry) => entry.userId.toString() === currentUserId.toString(),
          );
          if (userIndex !== -1) {
            const userEntry = sortedLeaderboard[userIndex];
            currentUserRank = {
              rank: userIndex + 1,
              score: userEntry.score,
            };
          }
        } catch (error) {
          // Invalid token, ignore
        }
      }

      res.json({
        success: true,
        leaderboard: rankedLeaderboard,
        currentUser: currentUserRank,
        meta: {
          type,
          period,
          totalEntries: leaderboardData.length,
        },
      });
    } catch (error: any) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to retrieve leaderboard" });
    }
  });

  /**
   * @swagger
   * /api/v1/app/leaderboard/my-rank:
   *   get:
   *     tags: [Mobile Leaderboard]
   *     summary: Get current user's leaderboard rank
   *     description: Returns authenticated user's current position in leaderboard
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [coins, gifts, activity]
   *           default: coins
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [daily, weekly, monthly, all-time]
   *           default: weekly
   *     responses:
   *       200:
   *         description: User rank retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 rank:
   *                   type: number
   *                   example: 15
   *                 score:
   *                   type: number
   *                   example: 850
   *                 totalUsers:
   *                   type: number
   *                   example: 1000
   *                 percentile:
   *                   type: number
   *                   example: 85
   */
  app.get(
    "/api/v1/app/leaderboard/my-rank",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const type = (req.query.type as string) || "coins";
        const period = (req.query.period as string) || "weekly";

        // Get leaderboard data
        const leaderboardData = await storage.getLeaderboard(type, period);

        // Sort by score descending
        const sortedLeaderboard = leaderboardData.sort(
          (a, b) => b.score - a.score,
        );

        // Find user's position
        const userIndex = sortedLeaderboard.findIndex(
          (entry) => entry.userId.toString() === user.id.toString(),
        );

        if (userIndex === -1) {
          return res.json({
            success: true,
            rank: null,
            score: 0,
            totalUsers: sortedLeaderboard.length,
            message: "You are not yet ranked in this leaderboard",
          });
        }

        const userEntry = sortedLeaderboard[userIndex];
        const rank = userIndex + 1;
        const totalUsers = sortedLeaderboard.length;
        const percentile = Math.round(((totalUsers - rank) / totalUsers) * 100);

        res.json({
          success: true,
          rank,
          score: userEntry.score,
          totalUsers,
          percentile,
          type,
          period,
        });
      } catch (error: any) {
        console.error("Get user rank error:", error);
        res.status(500).json({ error: "Failed to retrieve user rank" });
      }
    },
  );

  // ============= GIFTS APIs =============

  /**
   * @swagger
   * /api/v1/app/gifts:
   *   get:
   *     tags: [Mobile Gifts]
   *     summary: Get available gifts
   *     description: Returns list of gifts that can be purchased with coins
   *     responses:
   *       200:
   *         description: Gifts retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 gifts:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                         example: 1
   *                       name:
   *                         type: string
   *                         example: "Heart"
   *                       coinCost:
   *                         type: number
   *                         example: 10
   *                       icon:
   *                         type: string
   *                         example: "❤️"
   *                       category:
   *                         type: string
   *                         example: "emotions"
   *                       isActive:
   *                         type: boolean
   *                         example: true
   */
  app.get("/api/v1/app/gifts", async (req: Request, res: Response) => {
    try {
      const gifts = await storage.getGifts();

      // Filter only active gifts
      const activeGifts = gifts.filter((gift) => gift.isActive);

      res.json({
        success: true,
        gifts: activeGifts.map((gift) => ({
          id: gift.id,
          name: gift.name,
          coinCost: gift.coinValue,
          image: gift.image,
          isActive: gift.isActive,
        })),
      });
    } catch (error: any) {
      console.error("Get gifts error:", error);
      res.status(500).json({ error: "Failed to retrieve gifts" });
    }
  });

  /**
   * @swagger
   * /api/v1/app/gifts/{id}/send:
   *   post:
   *     tags: [Mobile Gifts]
   *     summary: Send a gift to another user
   *     description: Purchase and send a gift to another user using coins
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Gift ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [recipientId]
   *             properties:
   *               recipientId:
   *                 type: string
   *                 example: "456"
   *                 description: ID of user receiving the gift
   *               quantity:
   *                 type: number
   *                 example: 1
   *                 default: 1
   *                 description: Number of gifts to send
   *               message:
   *                 type: string
   *                 example: "Hope you like this!"
   *                 description: Optional message with the gift
   *     responses:
   *       200:
   *         description: Gift sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Gift sent successfully"
   *                 wallet:
   *                   type: object
   *                   properties:
   *                     coinBalance:
   *                       type: number
   *                       example: 190
   *       400:
   *         description: Insufficient coins or invalid request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/gifts/:id/send",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const giftId = req.params.id; // Use string ID directly
        console.log(
          "DEBUG - Gift ID received:",
          giftId,
          "Length:",
          giftId?.length,
        );
        const { recipientId, quantity = 1, message } = req.body;

        if (!recipientId) {
          return res.status(400).json({ error: "Recipient ID is required" });
        }

        if (recipientId === user.id.toString()) {
          return res
            .status(400)
            .json({ error: "Cannot send gift to yourself" });
        }

        // Get gift details
        const gift = await storage.getGift(giftId);
        if (!gift) {
          return res.status(404).json({ error: "Gift not found" });
        }

        if (!gift.isActive) {
          return res
            .status(400)
            .json({ error: "This gift is no longer available" });
        }

        // Check if recipient exists
        const recipient = await storage.getUser(recipientId);
        if (!recipient) {
          return res.status(404).json({ error: "Recipient not found" });
        }

        // Calculate total cost
        const totalCost = gift.coinValue * quantity;

        // Get sender's wallet
        const wallet = await storage.getWallet(user.id);
        if (!wallet) {
          return res.status(404).json({ error: "Wallet not found" });
        }

        // Check sufficient balance
        if (wallet.coinBalance < totalCost) {
          return res.status(400).json({ error: "Insufficient coins" });
        }

        // Deduct coins from sender
        await storage.updateWalletBalance(user.id, -totalCost, {
          type: "debit",
          description: `Sent ${quantity}x ${gift.name} to ${recipient.name || recipient.username}`,
        });

        // Transaction is automatically created by updateWalletBalance

        // Store gift transaction in Firebase
        await FirestoreService.storeGiftTransaction({
          senderId: user.id.toString(),
          recipientId: recipientId,
          giftId: giftId,
          giftName: gift.name,
          quantity: quantity,
          totalCost: totalCost,
          message: message || "",
          timestamp: new Date(),
        });

        // Get updated wallet
        const updatedWallet = await storage.getWallet(user.id);

        // Sync wallet update to Firebase
        await FirestoreService.updateUserWallet(user.id.toString(), {
          userId: user.id,
          coinBalance: updatedWallet!.coinBalance,
          totalEarned: updatedWallet!.totalEarned,
          totalSpent: updatedWallet!.totalSpent,
        });

        // Send FCM notification to recipient if they have a token
        try {
          if (recipient.fcmToken) {
            const notificationSent =
              await fcmNotificationService.sendGiftReceivedNotification(
                recipient.fcmToken,
                gift.name,
                user.name || user.username,
              );
            console.log(
              `FCM notification sent to recipient ${recipient.id}:`,
              notificationSent,
            );
          } else {
            console.log(
              `No FCM token found for recipient ${recipient.id}, skipping notification`,
            );
          }
        } catch (fcmError) {
          console.error("Failed to send FCM notification for gift:", fcmError);
          // Don't fail the gift sending if notification fails
        }

        res.json({
          success: true,
          message: "Gift sent successfully",
          gift: {
            name: gift.name,
            quantity: quantity,
            totalCost: totalCost,
          },
          recipient: {
            name: recipient.name || recipient.username,
          },
          wallet: {
            coinBalance: updatedWallet!.coinBalance,
            totalEarned: updatedWallet!.totalEarned,
            totalSpent: updatedWallet!.totalSpent,
          },
          transaction: {
            id: transaction.id,
            transactionId: transaction.transactionId,
          },
        });
      } catch (error: any) {
        console.error("Send gift error:", error);
        res.status(500).json({ error: "Failed to send gift" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/notifications:
   *   get:
   *     tags: [Mobile Notifications]
   *     summary: Get user notifications
   *     description: Returns paginated list of user's notifications
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of notifications per page
   *       - in: query
   *         name: unreadOnly
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Return only unread notifications
   *     responses:
   *       200:
   *         description: Notifications retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 notifications:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "notif_123"
   *                       title:
   *                         type: string
   *                         example: "🎁 Gift Received!"
   *                       body:
   *                         type: string
   *                         example: "You received a Rose from John!"
   *                       isRead:
   *                         type: boolean
   *                         example: false
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                       data:
   *                         type: object
   */
  app.get(
    "/api/v1/app/notifications",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
        const unreadOnly = req.query.unreadOnly === "true";

        const notifications = await notificationService.getUserNotifications(
          req.user.id.toString(),
          limit,
        );

        res.json({
          success: true,
          notifications,
          unreadCount: notifications.filter((n) => !n.isRead).length,
        });
      } catch (error: any) {
        console.error("Get notifications error:", error);
        res.status(500).json({ error: "Failed to get notifications" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/notifications/{id}/read:
   *   put:
   *     tags: [Mobile Notifications]
   *     summary: Mark notification as read
   *     description: Marks a specific notification as read
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Notification ID
   *     responses:
   *       200:
   *         description: Notification marked as read
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Notification marked as read"
   */
  app.put(
    "/api/v1/app/notifications/:id/read",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const success = await notificationService.markNotificationAsRead(id);

        if (!success) {
          return res.status(404).json({ error: "Notification not found" });
        }

        res.json({
          success: true,
          message: "Notification marked as read",
        });
      } catch (error: any) {
        console.error("Mark notification read error:", error);
        res.status(500).json({ error: "Failed to mark notification as read" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/device/register:
   *   post:
   *     tags: [Mobile Device]
   *     summary: Register device for push notifications
   *     description: Registers device FCM token for push notifications
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [fcmToken, platform]
   *             properties:
   *               fcmToken:
   *                 type: string
   *                 example: "fcm_token_abc123"
   *                 description: Firebase Cloud Messaging token
   *               platform:
   *                 type: string
   *                 enum: [android, ios]
   *                 example: "android"
   *               deviceId:
   *                 type: string
   *                 example: "device_123"
   *                 description: Unique device identifier
   *     responses:
   *       200:
   *         description: Device registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Device registered for notifications"
   */
  app.post(
    "/api/v1/app/device/register",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { fcmToken, platform, deviceId } = req.body;

        if (!fcmToken || !platform) {
          return res
            .status(400)
            .json({ error: "FCM token and platform are required" });
        }

        // Store device registration (in production, save to database)
        console.log("📱 Device registered:", {
          userId: req.user!.id,
          fcmToken: fcmToken.substring(0, 20) + "...",
          platform,
          deviceId,
          timestamp: new Date().toISOString(),
        });

        res.json({
          success: true,
          message: "Device registered for notifications",
        });
      } catch (error: any) {
        console.error("Device registration error:", error);
        res.status(500).json({ error: "Failed to register device" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/system/health:
   *   get:
   *     tags: [Mobile System]
   *     summary: Get system health metrics
   *     description: Returns system performance and health information
   *     responses:
   *       200:
   *         description: System health data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "healthy"
   *                 uptime:
   *                   type: number
   *                   example: 3600000
   *                 memory:
   *                   type: object
   *                 performance:
   *                   type: object
   */
  app.get("/api/v1/app/system/health", async (req: Request, res: Response) => {
    try {
      const systemHealth = monitoringService.getSystemHealth();
      const cacheStats = await cacheService.getStats();

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: systemHealth.uptime,
        memory: {
          used: Math.round(systemHealth.memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(systemHealth.memoryUsage.external / 1024 / 1024),
        },
        performance: {
          avgResponseTime: Math.round(systemHealth.avgResponseTime),
          requestsPerMinute: systemHealth.requestsPerMinute,
          errorRate: (systemHealth.errorRate * 100).toFixed(2) + "%",
          activeConnections: systemHealth.activeConnections,
        },
        cache: {
          hitRate: (cacheStats.hitRate * 100).toFixed(2) + "%",
          totalItems: cacheStats.totalItems,
          memoryUsage: Math.round(cacheStats.memoryUsage / 1024) + "KB",
        },
      });
    } catch (error: any) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  });

  /**
   * @swagger
   * /api/v1/app/system/stats:
   *   get:
   *     tags: [Mobile System]
   *     summary: Get detailed system statistics
   *     description: Returns comprehensive performance analytics
   *     parameters:
   *       - in: query
   *         name: timeframe
   *         schema:
   *           type: integer
   *           default: 60
   *         description: Timeframe in minutes
   *     responses:
   *       200:
   *         description: System statistics
   */
  app.get("/api/v1/app/system/stats", async (req: Request, res: Response) => {
    try {
      const timeframe = parseInt(req.query.timeframe as string) || 60;
      const report = monitoringService.generateReport();
      const endpointStats = monitoringService.getEndpointStats(timeframe);

      res.json({
        success: true,
        timeframe: `${timeframe} minutes`,
        systemHealth: report.systemHealth,
        endpoints: endpointStats,
        alerts: report.alerts,
        recentErrors: report.recentErrors.slice(0, 5),
      });
    } catch (error: any) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  /**
   * @swagger
   * /api/v1/app/coin-packages/preview:
   *   get:
   *     tags: [Mobile Coin Packages]
   *     summary: Get interactive coin package previews with 3D animation data
   *     description: Returns enhanced coin package data optimized for 3D coin animations and interactive previews
   *     responses:
   *       200:
   *         description: Interactive coin package preview data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 packages:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       name:
   *                         type: string
   *                       coinAmount:
   *                         type: number
   *                       price:
   *                         type: string
   *                       description:
   *                         type: string
   *                       discount:
   *                         type: number
   *                       isActive:
   *                         type: boolean
   *                       valuePerDollar:
   *                         type: number
   *                       popularity:
   *                         type: string
   *                         enum: [standard, popular, premium]
   *                       animationConfig:
   *                         type: object
   */
  app.get(
    "/api/v1/app/coin-packages/preview",
    async (req: Request, res: Response) => {
      try {
        // Try cache first
        let packages = await cacheService.getCachedCoinPackages();

        if (!packages) {
          packages = await storage.getCoinPackages();
          await cacheService.cacheCoinPackages(packages, 3600);
        }

        // Enhance packages with interactive preview data
        const enhancedPackages = packages.map((pkg, index) => {
          const valuePerDollar = Math.round(
            pkg.coinAmount / parseFloat(pkg.price),
          );

          // Determine popularity based on coin amount and position
          let popularity = "standard";
          if (index === 1 || valuePerDollar > 25) popularity = "popular";
          if (index === packages.length - 1 || pkg.coinAmount >= 3000)
            popularity = "premium";

          return {
            id: pkg.id,
            name: pkg.name,
            coinAmount: pkg.coinAmount,
            price: pkg.price,
            description:
              pkg.description ||
              `Get ${pkg.coinAmount.toLocaleString()} coins instantly!`,
            discount: pkg.discount || 0,
            isActive: pkg.isActive,
            valuePerDollar,
            popularity,
            animationConfig: {
              spinDuration:
                popularity === "premium"
                  ? 3000
                  : popularity === "popular"
                    ? 2500
                    : 2000,
              sparkleCount:
                popularity === "premium" ? 8 : popularity === "popular" ? 6 : 4,
              glowIntensity:
                popularity === "premium"
                  ? "high"
                  : popularity === "popular"
                    ? "medium"
                    : "low",
              coinSize:
                pkg.coinAmount >= 3000
                  ? "xl"
                  : pkg.coinAmount >= 1000
                    ? "lg"
                    : "md",
            },
            features: [
              "Instant delivery",
              "Secure payment",
              "24/7 support",
              ...(popularity === "premium"
                ? ["Premium support", "Bonus rewards"]
                : []),
              ...(popularity === "popular" ? ["Best value"] : []),
            ],
          };
        });

        res.json({
          success: true,
          packages: enhancedPackages,
          meta: {
            totalPackages: enhancedPackages.length,
            popularPackages: enhancedPackages.filter(
              (p) => p.popularity === "popular",
            ).length,
            premiumPackages: enhancedPackages.filter(
              (p) => p.popularity === "premium",
            ).length,
            averageValue: Math.round(
              enhancedPackages.reduce((sum, p) => sum + p.valuePerDollar, 0) /
                enhancedPackages.length,
            ),
          },
        });
      } catch (error: any) {
        monitoringService.logError(error, req.path, undefined, {
          method: req.method,
        });
        res.status(500).json({ error: "Failed to get coin package previews" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/fcm/register:
   *   post:
   *     tags: [Mobile FCM Notifications]
   *     summary: Register FCM token for push notifications
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fcmToken:
   *                 type: string
   *                 description: Firebase Cloud Messaging token
   *               topics:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Topics to subscribe to
   *     responses:
   *       200:
   *         description: FCM token registered successfully
   */
  app.post(
    "/api/v1/app/fcm/register",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { fcmToken, topics = [] } = req.body;
        const userId = req.user!.id;

        if (!fcmToken) {
          return res.status(400).json({ error: "FCM token is required" });
        }

        // Store FCM token in user profile (you might want to add this to your schema)
        // For now, we'll just subscribe to topics
        const subscriptionResults = [];

        for (const topic of topics) {
          const success = await fcmNotificationService.subscribeToTopic(
            fcmToken,
            topic,
          );
          subscriptionResults.push({ topic, success });
        }

        res.json({
          success: true,
          message: "FCM token registered successfully",
          userId,
          subscriptions: subscriptionResults,
        });
      } catch (error: any) {
        monitoringService.logError(error, req.path, req.user?.id?.toString(), {
          method: req.method,
        });
        res.status(500).json({ error: "Failed to register FCM token" });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/gifts/send:
   *   post:
   *     tags: [Mobile Gifts]
   *     summary: Send gift with FCM notification
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               recipientId:
   *                 type: string
   *               giftId:
   *                 type: string
   *               message:
   *                 type: string
   *               recipientFcmToken:
   *                 type: string
   *                 description: Recipient's FCM token (optional)
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Gift sent successfully with notification
   */
  app.post(
    "/api/v1/app/gifts/send",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { recipientId, giftId, message = "", quantity = 1 } = req.body;
        const senderId = req.user!.id;

        // Basic validation
        if (!recipientId || !giftId) {
          return res.status(400).json({
            success: false,
            error: "Recipient ID and Gift ID are required",
          });
        }

        // Get users
        const [sender, receiver] = await Promise.all([
          storage.getUserById(senderId),
          storage.getUserById(recipientId),
        ]);

        if (!sender || !receiver) {
          return res.status(400).json({
            success: false,
            error: "Invalid sender or receiver",
          });
        }

        // Gender validation
        if (sender.gender !== "male") {
          return res.status(400).json({
            success: false,
            error: "Only male users can send gifts",
          });
        }

        if (receiver.gender !== "female") {
          return res.status(400).json({
            success: false,
            error: "Gifts can only be sent to female users",
          });
        }

        // Get gift
        const gift = await storage.getGiftById(giftId);
        if (!gift) {
          return res.status(400).json({
            success: false,
            error: "Invalid gift ID",
          });
        }

        // Calculate cost
        const totalCost = gift.coinValue * quantity;
        if (totalCost <= 0) {
          return res.status(400).json({
            success: false,
            error: "Invalid gift price",
          });
        }

        // Check balance
        const senderWallet = await storage.getWalletByUserId(senderId);
        if (!senderWallet || senderWallet.coinBalance < totalCost) {
          return res.status(400).json({
            success: false,
            error: "Insufficient balance",
          });
        }

        // Calculate earnings (80% to receiver, 20% admin commission)
        const adminCommission = Math.floor(totalCost * 0.2);
        const receiverEarning = totalCost - adminCommission;

        // Process transaction
        await storage.updateWalletBalance(senderId, -totalCost);
        await storage.updateWalletBalance(recipientId, receiverEarning);

        // Create transaction record
        await storage.createGiftTransaction({
          giftId: giftId,
          senderId: senderId,
          receiverId: recipientId,
          coinValue: totalCost,
        });

        res.json({
          success: true,
          message: "Gift sent successfully",
          data: {
            giftId,
            recipientId,
            totalCost,
            receiverEarning,
            adminCommission,
          },
        });
      } catch (error: any) {
        console.error("Gift send error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to send gift",
          details: error.message,
        });
      }
    },
  );

  // Enhanced gifts endpoint with caching
  app.get("/api/v1/app/gifts", async (req: Request, res: Response) => {
    try {
      // Try cache first
      let gifts = await cacheService.getCachedGifts();

      if (!gifts) {
        gifts = await storage.getGifts();
        await cacheService.cacheGifts(gifts, 1800); // Cache for 30 minutes
      }

      res.json({
        success: true,
        gifts: gifts.map((gift) => ({
          id: gift.id,
          name: gift.name,
          coinCost: gift.coinCost,
          image: gift.image,
          isActive: gift.isActive,
        })),
      });
    } catch (error: any) {
      monitoringService.logError(error, req.path, undefined, {
        method: req.method,
      });
      res.status(500).json({ error: "Failed to get gifts" });
    }
  });

  // ============= CALL CONFIGURATION API =============

  /**
   * @swagger
   * /api/v1/app/call-config:
   *   get:
   *     tags: [Mobile Configuration]
   *     summary: Get call configuration settings
   *     description: Returns current call pricing and commission configuration for mobile app
   *     responses:
   *       200:
   *         description: Call configuration retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 config:
   *                   type: object
   *                   properties:
   *                     videoCallCoinsPerMin:
   *                       type: number
   *                       example: 25
   *                       description: Coins charged per minute for video calls
   *                     audioCallCoinsPerMin:
   *                       type: number
   *                       example: 15
   *                       description: Coins charged per minute for audio calls
   *                     messageCoins:
   *                       type: number
   *                       example: 4
   *                       description: Coins charged per message sent
   *                     adminCommissionPercent:
   *                       type: number
   *                       example: 35
   *                       description: Platform commission percentage on transactions
   *                 lastUpdated:
   *                   type: string
   *                   format: date-time
   *                   description: When configuration was last updated
   */
  app.get("/api/v1/app/call-config", async (req: Request, res: Response) => {
    try {
      // Get configuration from MongoDB
      const config = await storage.getCallConfig();

      if (!config) {
        // Return default configuration if none exists
        return res.json({
          success: true,
          config: {
            videoCallCoinsPerMin: 10,
            audioCallCoinsPerMin: 5,
            gStarAudioCoinsPerMin: 8,
            gStarVideoCoinsPerMin: 15,
            messageCoins: 1,
            adminCommissionPercent: 20,
          },
          lastUpdated: null,
          message: "Using default configuration",
        });
      }

      res.json({
        success: true,
        config: {
          videoCallCoinsPerMin: config.videoCallCoinsPerMin,
          audioCallCoinsPerMin: config.audioCallCoinsPerMin,
          gStarAudioCoinsPerMin: config.gStarAudioCoinsPerMin,
          gStarVideoCoinsPerMin: config.gStarVideoCoinsPerMin,
          messageCoins: config.messageCoins,
          adminCommissionPercent: config.adminCommissionPercent,
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Get mobile call config error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve call configuration",
      });
    }
  });

  // ==================== CALL MANAGEMENT APIs ====================

  // Check call feasibility - validates if user has enough coins for the call
  /**
   * @swagger
   * /api/v1/app/call/check-feasibility:
   *   post:
   *     tags: [Mobile Calls]
   *     summary: Check if user can make a call
   *     description: Validates if the user has enough coins for the requested call type and calculates maximum call duration
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [receiverUserId, callType]
   *             properties:
   *               receiverUserId:
   *                 type: string
   *                 example: "6852f8ac18ae486409c606d0"
   *                 description: ID of the user to call
   *               callType:
   *                 type: string
   *                 enum: [video, audio, message]
   *                 example: "video"
   *                 description: Type of call to make
   *     responses:
   *       200:
   *         description: Call feasibility check successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     canMakeCall:
   *                       type: boolean
   *                       example: true
   *                     callerBalance:
   *                       type: integer
   *                       example: 1000
   *                     coinsPerMinute:
   *                       type: integer
   *                       example: 109
   *                     maxDurationMinutes:
   *                       type: integer
   *                       example: 9
   *                     callType:
   *                       type: string
   *                       example: "Video Call"
   *                     receiverName:
   *                       type: string
   *                       example: "Jane Doe"
   *                     receiverGender:
   *                       type: string
   *                       example: "female"
   *                     adminCommissionPercent:
   *                       type: integer
   *                       example: 20
   *       400:
   *         description: Invalid request parameters
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       404:
   *         description: User or receiver not found
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/v1/app/call/check-feasibility",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { receiverUserId, callType } = req.body;
        const callerUserId = req.user?.id;

        if (!receiverUserId || !callType) {
          return res.status(400).json({
            success: false,
            error: "Receiver user ID and call type are required",
          });
        }

        // Get call configuration
        const config = await storage.getCallConfig();
        if (!config) {
          return res.status(500).json({
            success: false,
            error: "Call configuration not found",
          });
        }

        // Get caller's wallet balance
        const callerWallet = await storage.getWalletByUserId(callerUserId);
        if (!callerWallet) {
          return res.status(404).json({
            success: false,
            error: "Caller wallet not found",
          });
        }

        // Get receiver details to ensure they exist
        const receiver = await storage.getUserById(receiverUserId);
        if (!receiver) {
          return res.status(404).json({
            success: false,
            error: "Receiver not found",
          });
        }

        // Calculate coins per minute based on call type and receiver's profile type
        let coinsPerMinute = 0;
        let callTypeStr = "";
        
        // Use profile-based pricing
        const receiverProfileType = receiver.profileType || "gicon"; // Default to gicon if not set

        switch (callType) {
          case "video":
            if (receiverProfileType === "gstar") {
              coinsPerMinute = config.gStarVideoCoinsPerMin;
            } else {
              coinsPerMinute = config.videoCallCoinsPerMin; // gicon pricing
            }
            callTypeStr = "Video Call";
            break;
          case "audio":
            if (receiverProfileType === "gstar") {
              coinsPerMinute = config.gStarAudioCoinsPerMin;
            } else {
              coinsPerMinute = config.audioCallCoinsPerMin; // gicon pricing
            }
            callTypeStr = "Audio Call";
            break;
          case "message":
            coinsPerMinute = config.messageCoins; // Same for all profile types
            callTypeStr = "Message";
            break;
          default:
            return res.status(400).json({
              success: false,
              error:
                "Invalid call type. Must be 'video', 'audio', or 'message'",
            });
        }
        
        console.log(`💰 Pricing calculation - Receiver: ${receiver.username}, ProfileType: ${receiverProfileType}, CallType: ${callType}, CoinsPerMin: ${coinsPerMinute}`);

        // Calculate maximum call duration based on available coins
        const maxDurationMinutes =
          callType === "message"
            ? 1
            : Math.floor(callerWallet.coinBalance / coinsPerMinute);
        const canMakeCall = callerWallet.coinBalance >= coinsPerMinute;

        res.json({
          success: true,
          data: {
            canMakeCall,
            callerBalance: callerWallet.coinBalance,
            coinsPerMinute,
            maxDurationMinutes,
            callType: callTypeStr,
            receiverName: receiver.name || receiver.username,
            receiverGender: receiver.gender,
            adminCommissionPercent: config.adminCommissionPercent,
            gstarAdminCommission: config.gstarAdminCommission,
            giconAdminCommission: config.giconAdminCommission,
          },
        });
      } catch (error: any) {
        console.error("Check call feasibility error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to check call feasibility",
        });
      }
    },
  );

  // Start call session
  /**
   * @swagger
   * /api/v1/app/call/start:
   *   post:
   *     tags: [Mobile Calls]
   *     summary: Start a new call session
   *     description: Initiates a new call session with payment validation and creates a CallSession record
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [receiverUserId, callType]
   *             properties:
   *               receiverUserId:
   *                 type: string
   *                 example: "6852f8ac18ae486409c606d0"
   *                 description: ID of the user to call
   *               callType:
   *                 type: string
   *                 enum: [video, audio, message]
   *                 example: "video"
   *                 description: Type of call to start
   *     responses:
   *       200:
   *         description: Call session started successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     callId:
   *                       type: string
   *                       example: "call_1756321234567_abc123def"
   *                       description: Unique call ID for this session
   *                     callSession:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "64f8c9e123456789abcdef01"
   *                         callId:
   *                           type: string
   *                           example: "call_1756321234567_abc123def"
   *                         callType:
   *                           type: string
   *                           example: "video"
   *                         coinsPerMinute:
   *                           type: integer
   *                           example: 109
   *                         startTime:
   *                           type: string
   *                           format: date-time
   *                         status:
   *                           type: string
   *                           example: "initiated"
   *       400:
   *         description: Invalid request or insufficient coins
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       404:
   *         description: User wallet not found
   *       500:
   *         description: Server error
   */

  /**
   * @swagger
   * /api/v1/app/call/check-time:
   *   post:
   *     summary: Check remaining time during active call
   *     description: Get current remaining time for an active call session. Used to update call timer after gifts are sent.
   *     tags: [Call Management]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - callId
   *             properties:
   *               callId:
   *                 type: string
   *                 example: "call_1756321234567_abc123def"
   *                 description: ID of the active call session
   *     responses:
   *       200:
   *         description: Call time information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     callId:
   *                       type: string
   *                       example: "call_1756321234567_abc123def"
   *                     remainingMinutes:
   *                       type: number
   *                       example: 8.5
   *                       description: Current remaining minutes for the call
   *                     maxAllowedMinutes:
   *                       type: number
   *                       example: 11
   *                       description: Maximum allowed minutes when call started
   *                     elapsedMinutes:
   *                       type: number
   *                       example: 2.5
   *                       description: Minutes elapsed since call started
   *                     status:
   *                       type: string
   *                       example: "active"
   *                     coinsPerMinute:
   *                       type: integer
   *                       example: 30
   *       400:
   *         description: Invalid request or call ended
   *       403:
   *         description: Unauthorized to check this call
   *       404:
   *         description: Call session not found
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/v1/app/call/check-time",
    async (req: Request, res: Response) => {
      try {
        const { callId } = req.body;

        if (!callId) {
          return res.status(400).json({
            success: false,
            error: "Call ID is required",
          });
        }

        // Get call session details
        const callSession = await storage.getCallSessionByCallId(callId);
        if (!callSession) {
          return res.status(404).json({
            success: false,
            error: "Call session not found",
          });
        }

        // Check if call is still active
        if (callSession.status === "ended") {
          return res.status(400).json({
            success: false,
            error: "Call has already ended",
          });
        }

        // Get caller's wallet (male user who pays for the call)
        const callerWallet = await storage.getWalletByUserId(
          callSession.callerUserId,
        );
        if (!callerWallet) {
          return res.status(404).json({
            success: false,
            error: "Caller wallet not found",
          });
        }

        // Calculate available time based only on caller's coin balance
        const coinsPerMinute = callSession.coinsPerMinute || 1;
        const availableMinutesFromCoins = Math.floor(
          callerWallet.coinBalance / coinsPerMinute,
        );

        // Calculate elapsed time since call started
        const startTime = new Date(callSession.startTime);
        const currentTime = new Date();
        const elapsedMinutes =
          (currentTime.getTime() - startTime.getTime()) / (1000 * 60);

        // Calculate remaining time based on caller's current coin balance
        const remainingMinutesFromCoins = Math.max(
          0,
          availableMinutesFromCoins - elapsedMinutes,
        );

        // Also consider the originally allowed max time (whichever is less)
        const remainingFromElapsed = Math.max(
          0,
          callSession.maxAllowedMinutes - elapsedMinutes,
        );
        const actualRemainingTime = Math.min(
          remainingMinutesFromCoins,
          remainingFromElapsed,
        );

        console.log(
          `🕐 CHECK TIME (Caller-based) - Call: ${callId}, Caller Coins: ${callerWallet.coinBalance}, Available Minutes: ${availableMinutesFromCoins}, Elapsed: ${elapsedMinutes.toFixed(2)}min, Remaining: ${actualRemainingTime.toFixed(2)}min`,
        );

        // If time has run out, end the call automatically
        if (actualRemainingTime <= 0) {
          // Mark call as ended when time runs out
          try {
            await storage.endCallSession(callId, "time_expired");
            console.log(
              `⏰ Call ${callId} automatically ended due to time expiry`,
            );
          } catch (endError) {
            console.warn(`Failed to end call session ${callId}:`, endError);
          }

          return res.json({
            success: true,
            data: {
              callId: callId,
              remainingMinutes: 0,
              maxAllowedMinutes: callSession.maxAllowedMinutes,
              availableMinutesFromCoins: availableMinutesFromCoins,
              callerCoins: callerWallet.coinBalance,
              status: "ended",
              message: "Call time expired",
            },
          });
        }

        res.json({
          success: true,
          data: {
            callId: callId,
            remainingMinutes: parseFloat(actualRemainingTime.toFixed(2)),
            maxAllowedMinutes: callSession.maxAllowedMinutes,
            availableMinutesFromCoins: availableMinutesFromCoins,
            elapsedMinutes: parseFloat(elapsedMinutes.toFixed(2)),
            callerCoins: callerWallet.coinBalance,
            status: callSession.status,
            coinsPerMinute: callSession.coinsPerMinute,
          },
        });
      } catch (error: any) {
        console.error("Error checking call time:", error);
        res.status(500).json({
          success: false,
          error: "Failed to check call time",
        });
      }
    },
  );

  app.post(
    "/api/v1/app/call/start",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { receiverUserId, callType } = req.body;
        const callerUserId = req.user?.id;

        if (!callerUserId) {
          return res.status(401).json({
            success: false,
            error: "User authentication required",
          });
        }

        if (!receiverUserId || !callType) {
          return res.status(400).json({
            success: false,
            error: "Receiver user ID and call type are required",
          });
        }

        // Get call configuration
        const config = await storage.getCallConfig();
        if (!config) {
          return res.status(500).json({
            success: false,
            error: "Call configuration not found",
          });
        }

        // Get receiver details to check profile type
        const receiver = await storage.getUserById(receiverUserId);
        if (!receiver) {
          return res.status(404).json({
            success: false,
            error: "Receiver not found",
          });
        }
        
        // Validate caller has enough coins
        const callerWallet = await storage.getWalletByUserId(callerUserId);
        if (!callerWallet) {
          return res.status(404).json({
            success: false,
            error: "Caller wallet not found",
          });
        }

        // Determine coins per minute based on receiver's profile type
        let coinsPerMinute = 0;
        const receiverProfileType = receiver.profileType || "gicon"; // Default to gicon if not set
        
        switch (callType) {
          case "video":
            if (receiverProfileType === "gstar") {
              coinsPerMinute = config.gStarVideoCoinsPerMin;
            } else {
              coinsPerMinute = config.videoCallCoinsPerMin; // gicon pricing
            }
            break;
          case "audio":
            if (receiverProfileType === "gstar") {
              coinsPerMinute = config.gStarAudioCoinsPerMin;
            } else {
              coinsPerMinute = config.audioCallCoinsPerMin; // gicon pricing
            }
            break;
          case "message":
            coinsPerMinute = config.messageCoins; // Same for all profile types
            break;
          default:
            return res.status(400).json({
              success: false,
              error: "Invalid call type",
            });
        }
        
        console.log(`🚀 Start Call - Receiver: ${receiver.username}, ProfileType: ${receiverProfileType}, CallType: ${callType}, CoinsPerMin: ${coinsPerMinute}`);

        // Check if caller has enough coins for at least 1 minute/message
        if (callerWallet.coinBalance < coinsPerMinute) {
          return res.status(400).json({
            success: false,
            error: "Insufficient coins for this call",
          });
        }

        // Calculate maximum call time based on available balance
        const maxAllowedMinutes =
          callType === "message"
            ? 1
            : Math.floor(callerWallet.coinBalance / coinsPerMinute);

        console.log(
          `📞 Call time calculation: Balance=${callerWallet.coinBalance}, CoinsPerMin=${coinsPerMinute}, MaxTime=${maxAllowedMinutes} minutes`,
        );

        // Generate unique call ID
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create call session with dynamic time management
        const callSession = new CallSession({
          callId,
          callerUserId,
          receiverUserId,
          callType,
          coinsPerMinute,
          adminCommissionPercent: config.adminCommissionPercent,
          status: "initiated",
          startTime: new Date(),
          maxAllowedMinutes,
          remainingMinutes: maxAllowedMinutes,
          lastUpdated: new Date(),
        });

        await callSession.save();

        // Get caller details for notifications (receiver already retrieved above)
        const caller = await storage.getUserById(callerUserId);

        // Process call for all online users (simplified availability check)
        if (caller && receiver) {
          console.log(
            `📞 Call from ${caller.name || caller.username} to ${receiver.name || receiver.username}`,
          );
          console.log(`- Receiver online: ${receiver.isOnline}`);
          console.log(`- Proceeding with call setup...`);

          // Only block calls if receiver is completely offline
          if (!receiver.isOnline) {
            const missedCall = await storage.createMissedCall({
              callId,
              callerUserId: callerUserId.toString(),
              receiverUserId: receiverUserId.toString(),
              callType,
              initiatedAt: new Date(),
              missedReason: "offline",
            });

            await FirestoreService.sendCallNotification(
              receiverUserId.toString(),
              caller.name || caller.username,
              "call_missed",
              {
                callId,
                callerUserId,
                callType,
                missedReason: "offline",
                callerName: caller.name || caller.username,
              },
            );

            await storage.updateMissedCallNotificationStatus(callId, true);

            return res.json({
              success: false,
              reason: "receiver_unavailable",
              message: "Call not initiated: Receiver is offline",
              missedCall: {
                id: missedCall._id,
                callId: missedCall.callId,
                callType: missedCall.callType,
                missedReason: missedCall.missedReason,
                initiatedAt: missedCall.initiatedAt,
                notificationSent: true,
              },
            });
          }

          // Receiver is available, send call notifications
          await FirestoreService.sendCallNotification(
            receiverUserId.toString(),
            caller.name || caller.username,
            "call_incoming",
            {
              callId,
              callerUserId,
              callType,
              callerName: caller.name || caller.username,
            },
          );

          // Also send notification to caller confirming call started
          await FirestoreService.sendCallNotification(
            callerUserId.toString(),
            receiver.name || receiver.username,
            "call_started",
            {
              callId,
              callType,
              receiverName: receiver.name || receiver.username,
            },
          );
        }

        res.json({
          success: true,
          data: {
            callId,
            callSession: {
              id: callSession._id,
              callId: callSession.callId,
              callType: callSession.callType,
              coinsPerMinute: callSession.coinsPerMinute,
              startTime: callSession.startTime,
              status: callSession.status,
              maxAllowedMinutes: callSession.maxAllowedMinutes,
              remainingMinutes: callSession.remainingMinutes,
            },
          },
        });
      } catch (error: any) {
        console.error("❌ Start call session error:", error);
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
        console.error("❌ Caller ID:", callerUserId);
        console.error("❌ Receiver ID:", receiverUserId);
        console.error("❌ Call type:", callType);
        res.status(500).json({
          success: false,
          error: "Failed to start call session",
          details: error.message,
          errorType: error.name,
        });
      }
    },
  );

  // Helper function to check receiver availability
  async function checkReceiverAvailability(
    receiver: any,
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    console.log(
      `🔍 Checking availability for ${receiver.name || receiver.username}:`,
    );
    console.log(`- isOnline: ${receiver.isOnline}`);

    // Check if receiver is online (primary check)
    if (!receiver.isOnline) {
      console.log(`❌ User offline`);
      return { isAvailable: false, reason: "offline" };
    }

    // Check last activity (consider inactive only after 30 minutes for better UX)
    if (receiver.lastActive) {
      const lastActiveTime = new Date(receiver.lastActive);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const minutesSinceActive =
        (Date.now() - lastActiveTime.getTime()) / (1000 * 60);

      console.log(`- Last active: ${lastActiveTime.toISOString()}`);
      console.log(
        `- Minutes since last active: ${minutesSinceActive.toFixed(2)}`,
      );
      console.log(
        `- 30-minute threshold: ${minutesSinceActive > 30 ? "EXCEEDED" : "OK"}`,
      );

      if (lastActiveTime < thirtyMinutesAgo) {
        console.log(`❌ User inactive (>30 minutes)`);
        return { isAvailable: false, reason: "inactive" };
      }
    }

    // Check if user is currently in another call
    const existingCalls = await CallSession.find({
      $or: [
        {
          callerUserId: receiver.id,
          status: { $in: ["initiated", "connected"] },
        },
        {
          receiverUserId: receiver.id,
          status: { $in: ["initiated", "connected"] },
        },
      ],
    });

    if (existingCalls.length > 0) {
      return { isAvailable: false, reason: "busy" };
    }

    // Check if receiver has Do Not Disturb mode enabled (if implemented)
    if (receiver.doNotDisturb) {
      return { isAvailable: false, reason: "dnd" };
    }

    // Receiver is available
    return { isAvailable: true };
  }

  // Add endpoint to manually handle no-answer scenarios
  /**
   * @swagger
   * /api/v1/app/call/{callId}/no-answer:
   *   get:
   *     tags: [Mobile Calls]
   *     summary: Handle call no-answer scenario
   *     description: Records a missed call when receiver doesn't answer the call
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: callId
   *         required: true
   *         schema:
   *           type: string
   *         description: The call ID that wasn't answered
   *     responses:
   *       200:
   *         description: Missed call recorded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "No-answer missed call recorded"
   *                 missedCall:
   *                   type: object
   *       404:
   *         description: Call session not found
   *       403:
   *         description: Not authorized for this call
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/call/:callId/no-answer",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { callId } = req.params;
        const callerUserId = req.user?.id;

        // Find the call session
        const callSession = await CallSession.findOne({ callId });
        if (!callSession) {
          return res.status(404).json({
            success: false,
            error: "Call session not found",
          });
        }

        // Verify caller owns this call
        if (callSession.callerUserId.toString() !== callerUserId) {
          return res.status(403).json({
            success: false,
            error: "Not authorized for this call",
          });
        }

        // Update call session status to failed
        callSession.status = "failed";
        callSession.endTime = new Date();
        await callSession.save();

        // Record missed call with no-answer reason
        const missedCall = await storage.createMissedCall({
          callId,
          callerUserId,
          receiverUserId: callSession.receiverUserId,
          callType: callSession.callType,
          initiatedAt: callSession.startTime,
          missedReason: "no_answer",
        });

        // Get caller details for notification
        const caller = await storage.getUserById(callerUserId);

        if (caller) {
          // Send missed call notification to receiver
          await FirestoreService.sendCallNotification(
            callSession.receiverUserId.toString(),
            caller.name || caller.username,
            "call_missed",
            {
              callId,
              callerUserId,
              callType: callSession.callType,
              missedReason: "no_answer",
              callerName: caller.name || caller.username,
            },
          );

          // Update notification status
          await storage.updateMissedCallNotificationStatus(callId, true);
        }

        res.json({
          success: true,
          message: "No-answer missed call recorded",
          missedCall: {
            id: missedCall._id,
            callId: missedCall.callId,
            callType: missedCall.callType,
            missedReason: missedCall.missedReason,
            initiatedAt: missedCall.initiatedAt,
            notificationSent: true,
          },
        });
      } catch (error: any) {
        console.error("No-answer missed call error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to record no-answer missed call",
        });
      }
    },
  );

  // Send missed call status to receiver
  /**
   * @swagger
   * /api/v1/app/call/send-missed-status:
   *   post:
   *     tags: [Mobile Calls]
   *     summary: Send missed call status to receiver
   *     description: Allows caller to manually send missed call notification when receiver doesn't respond
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - receiverUserId
   *               - callType
   *               - missedReason
   *             properties:
   *               receiverUserId:
   *                 type: string
   *                 description: ID of the user who missed the call
   *                 example: "64f1b2c3d4e5f6g7h8i9j0k1"
   *               callType:
   *                 type: string
   *                 enum: [video, audio, message]
   *                 description: Type of call that was missed
   *                 example: "video"
   *               missedReason:
   *                 type: string
   *                 enum: [no_answer, declined, busy, offline, timeout]
   *                 description: Reason why the call was missed
   *                 example: "no_answer"
   *               waitTime:
   *                 type: number
   *                 description: How long caller waited (in seconds)
   *                 example: 30
   *               customMessage:
   *                 type: string
   *                 description: Optional custom message
   *                 example: "Tried calling you about the meeting"
   *     responses:
   *       200:
   *         description: Missed call status sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Missed call notification sent successfully"
   *                 missedCall:
   *                   type: object
   *                 callTransaction:
   *                   type: object
   *                   description: Call transaction record for tracking
   *       400:
   *         description: Invalid request parameters
   *       404:
   *         description: Receiver user not found
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/v1/app/call/send-missed-status",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const callerUserId = req.user?.id;
        const {
          receiverUserId,
          callType,
          missedReason,
          waitTime,
          customMessage,
        } = req.body;

        if (!receiverUserId || !callType || !missedReason) {
          return res.status(400).json({
            success: false,
            error:
              "Receiver user ID, call type, and missed reason are required",
          });
        }

        // Validate missed reason
        const validReasons = [
          "no_answer",
          "declined",
          "busy",
          "offline",
          "timeout",
        ];
        if (!validReasons.includes(missedReason)) {
          return res.status(400).json({
            success: false,
            error: "Invalid missed reason",
          });
        }

        // Generate unique call ID for this missed call
        const callId = `missed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Get caller and receiver details
        const caller = await storage.getUserById(callerUserId);
        const receiver = await storage.getUserById(receiverUserId);

        if (!caller || !receiver) {
          return res.status(404).json({
            success: false,
            error: "Caller or receiver not found",
          });
        }

        // Create missed call record
        const missedCall = await storage.createMissedCall({
          callId,
          callerUserId,
          receiverUserId,
          callType,
          initiatedAt: new Date(),
          missedReason,
        });

        // Create call transaction record for proper tracking
        const callTransaction = new CallTransaction({
          callId,
          callerUserId,
          callerName: caller.name || caller.username,
          callerGender: caller.gender,
          callerProfileType: caller.profileType || "basic",
          receiverUserId,
          receiverName: receiver.name || receiver.username,
          receiverGender: receiver.gender,
          receiverProfileType: receiver.profileType || "basic",
          callType,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0, // No duration for missed calls
          coinsPerMinute: 0, // No cost for missed calls
          totalCoins: 0,
          adminCommission: 0,
          adminCommissionPercent: 0,
          commissionType: "none",
          receiverEarnings: 0,
          status: "failed",
          paymentProcessed: false,
          paymentDetails: {
            callerPaid: 0,
            receiverEarned: 0,
            adminEarned: 0,
            isPayableCall: false,
          },
          missedReason,
          notes:
            customMessage ||
            `Missed call - ${missedReason}${waitTime ? ` (waited ${waitTime}s)` : ""}`,
        });

        await callTransaction.save();

        // Send enhanced missed call notification to receiver
        await FirestoreService.sendCallNotification(
          receiverUserId.toString(),
          caller.name || caller.username,
          "call_missed",
          {
            callId,
            callerUserId,
            callType,
            missedReason,
            callerName: caller.name || caller.username,
            callerGender: caller.gender,
            callerProfileType: caller.profileType || "basic",
            waitTime,
            customMessage,
            timestamp: new Date().toISOString(),
          },
        );

        // Update missed call notification status
        await storage.updateMissedCallNotificationStatus(callId, true);

        // Also update Firebase with call transaction for real-time updates
        await FirestoreService.syncUserData(receiverUserId.toString(), {
          lastMissedCall: {
            callId,
            callerName: caller.name || caller.username,
            callType,
            missedReason,
            timestamp: new Date().toISOString(),
          },
        });

        res.json({
          success: true,
          message: "Missed call notification sent successfully",
          missedCall: {
            id: missedCall._id,
            callId: missedCall.callId,
            callType: missedCall.callType,
            missedReason: missedCall.missedReason,
            initiatedAt: missedCall.initiatedAt,
            notificationSent: true,
          },
          callTransaction: {
            id: callTransaction._id,
            callId: callTransaction.callId,
            status: callTransaction.status,
            duration: callTransaction.duration,
            totalCoins: callTransaction.totalCoins,
            createdAt: callTransaction.createdAt,
          },
        });
      } catch (error: any) {
        console.error("Send missed call status error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to send missed call status",
        });
      }
    },
  );

  // Update call status with missed call handling
  /**
   * @swagger
   * /api/v1/app/call/{callId}/update-status:
   *   patch:
   *     tags: [Mobile Calls]
   *     summary: Update call status with comprehensive state management
   *     description: Updates call status including missed call scenarios and proper transaction recording
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: callId
   *         required: true
   *         schema:
   *           type: string
   *         description: The call ID to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [connected, ended, failed, missed]
   *                 description: New status for the call
   *                 example: "connected"
   *               missedReason:
   *                 type: string
   *                 enum: [no_answer, declined, busy, offline, timeout]
   *                 description: Required if status is 'missed' or 'failed'
   *                 example: "no_answer"
   *               endReason:
   *                 type: string
   *                 description: Reason for call ending (if status is 'ended')
   *                 example: "caller_ended"
   *               metadata:
   *                 type: object
   *                 description: Additional metadata about the call
   *     responses:
   *       200:
   *         description: Call status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Call status updated successfully"
   *                 callSession:
   *                   type: object
   *                 missedCall:
   *                   type: object
   *                   description: Included if status was changed to missed
   *       400:
   *         description: Invalid request parameters
   *       404:
   *         description: Call session not found
   *       403:
   *         description: Not authorized to update this call
   *       500:
   *         description: Server error
   */
  app.patch(
    "/api/v1/app/call/:callId/update-status",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { callId } = req.params;
        const { status, missedReason, endReason, metadata } = req.body;
        const userId = req.user?.id;

        if (!status) {
          return res.status(400).json({
            success: false,
            error: "Status is required",
          });
        }

        // Validate status values
        const validStatuses = ["connected", "ended", "failed", "missed"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: "Invalid status value",
          });
        }

        // Find the call session
        const callSession = await CallSession.findOne({ callId });
        if (!callSession) {
          return res.status(404).json({
            success: false,
            error: "Call session not found",
          });
        }

        // Verify user is part of this call
        if (
          callSession.callerUserId.toString() !== userId &&
          callSession.receiverUserId.toString() !== userId
        ) {
          return res.status(403).json({
            success: false,
            error: "Not authorized to update this call",
          });
        }

        // Get caller and receiver details
        const caller = await storage.getUserById(callSession.callerUserId);
        const receiver = await storage.getUserById(callSession.receiverUserId);

        let missedCallRecord = null;
        let responseData: any = {
          success: true,
          message: "Call status updated successfully",
          callSession: {
            id: callSession._id,
            callId: callSession.callId,
            status,
            updatedAt: new Date(),
          },
        };

        // Handle different status updates
        switch (status) {
          case "connected":
            callSession.status = "connected";
            callSession.connectedAt = new Date();

            // Send call connected notifications
            if (caller && receiver) {
              await FirestoreService.sendCallNotification(
                callSession.callerUserId.toString(),
                receiver.name || receiver.username,
                "call_connected",
                {
                  callId,
                  callType: callSession.callType,
                  connectedAt: new Date().toISOString(),
                },
              );

              await FirestoreService.sendCallNotification(
                callSession.receiverUserId.toString(),
                caller.name || caller.username,
                "call_connected",
                {
                  callId,
                  callType: callSession.callType,
                  connectedAt: new Date().toISOString(),
                },
              );
            }
            break;

          case "ended":
            callSession.status = "ended";
            callSession.endTime = new Date();
            if (endReason) callSession.endReason = endReason;

            // Calculate duration and process payment if call was connected
            if (callSession.connectedAt) {
              const durationMs =
                callSession.endTime.getTime() -
                callSession.connectedAt.getTime();
              callSession.duration = Math.ceil(durationMs / (1000 * 60)); // Round up to next minute
            }
            break;

          case "failed":
          case "missed":
            callSession.status = "failed";
            callSession.endTime = new Date();

            if (!missedReason) {
              return res.status(400).json({
                success: false,
                error: "Missed reason is required for failed/missed status",
              });
            }

            // Create missed call record
            missedCallRecord = await storage.createMissedCall({
              callId,
              callerUserId: callSession.callerUserId,
              receiverUserId: callSession.receiverUserId,
              callType: callSession.callType,
              initiatedAt: callSession.startTime,
              missedReason,
            });

            // Send missed call notification to receiver
            if (caller) {
              await FirestoreService.sendCallNotification(
                callSession.receiverUserId.toString(),
                caller.name || caller.username,
                "call_missed",
                {
                  callId,
                  callerUserId: callSession.callerUserId,
                  callType: callSession.callType,
                  missedReason,
                  callerName: caller.name || caller.username,
                },
              );

              await storage.updateMissedCallNotificationStatus(callId, true);
            }

            responseData.missedCall = {
              id: missedCallRecord._id,
              callId: missedCallRecord.callId,
              missedReason: missedCallRecord.missedReason,
              notificationSent: true,
            };
            break;
        }

        // Save additional metadata if provided
        if (metadata) {
          callSession.metadata = { ...callSession.metadata, ...metadata };
        }

        await callSession.save();

        res.json(responseData);
      } catch (error: any) {
        console.error("Update call status error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to update call status",
        });
      }
    },
  );

  // Update call status (when call gets connected)
  /**
   * @swagger
   * /api/v1/app/call/{callId}/status:
   *   patch:
   *     tags: [Mobile Calls]
   *     summary: Update call session status
   *     description: Updates the status of an ongoing call session (e.g., from initiated to connected)
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: callId
   *         required: true
   *         schema:
   *           type: string
   *         example: "call_1756321234567_abc123def"
   *         description: Unique call ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [initiated, connected, ended, failed]
   *                 example: "connected"
   *                 description: New status for the call session
   *     responses:
   *       200:
   *         description: Call status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     callId:
   *                       type: string
   *                       example: "call_1756321234567_abc123def"
   *                     status:
   *                       type: string
   *                       example: "connected"
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       403:
   *         description: Forbidden - user not part of this call
   *       404:
   *         description: Call session not found
   *       500:
   *         description: Server error
   */
  app.patch(
    "/api/v1/app/call/:callId/status",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { callId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;

        const callSession = await CallSession.findOne({ callId });
        if (!callSession) {
          return res.status(404).json({
            success: false,
            error: "Call session not found",
          });
        }

        // Verify user is part of this call
        if (
          callSession.callerUserId !== userId &&
          callSession.receiverUserId !== userId
        ) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized to update this call",
          });
        }

        callSession.status = status;
        await callSession.save();

        res.json({
          success: true,
          data: {
            callId,
            status: callSession.status,
          },
        });
      } catch (error: any) {
        console.error("Update call status error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to update call status",
        });
      }
    },
  );

  // End call session with payment processing
  /**
   * @swagger
   * /api/v1/app/gift/send:
   *   post:
   *     tags: [Mobile Gift System]
   *     summary: Send gift to another user
   *     description: Send gift from male to female user with commission-based wallet transactions
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [receiverId, giftId, quantity]
   *             properties:
   *               receiverId:
   *                 type: number
   *                 example: 456
   *                 description: ID of the user receiving the gift
   *               giftId:
   *                 type: string
   *                 example: "64f1b2c3d4e5f6g7h8i9j0k1"
   *                 description: MongoDB ObjectId of the gift
   *               quantity:
   *                 type: number
   *                 example: 1
   *                 description: Number of gifts to send
   *               message:
   *                 type: string
   *                 example: "Happy Birthday!"
   *                 description: Optional message with the gift
   *     responses:
   *       200:
   *         description: Gift sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Gift sent successfully"
   *                 transaction:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     giftName:
   *                       type: string
   *                     totalCost:
   *                       type: number
   *                     receiverEarning:
   *                       type: number
   *                     adminCommission:
   *                       type: number
   *                     commissionType:
   *                       type: string
   *       400:
   *         description: Insufficient balance or invalid parameters
   *       500:
   *         description: Failed to send gift
   */
  app.post(
    "/api/v1/app/gift/send",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const senderId = req.user?.id!;
        const { receiverId, giftId, quantity = 1, message } = req.body;

        if (!receiverId || !giftId) {
          return res.status(400).json({
            success: false,
            error: "Receiver ID and Gift ID are required",
          });
        }

        if (quantity <= 0) {
          return res.status(400).json({
            success: false,
            error: "Quantity must be greater than 0",
          });
        }

        // Get sender and receiver details
        const [sender, receiver] = await Promise.all([
          storage.getUserById(senderId),
          storage.getUserById(receiverId),
        ]);

        if (!sender || !receiver) {
          return res.status(400).json({
            success: false,
            error: "Invalid sender or receiver",
          });
        }

        // Check if sender is male (only males can send gifts)
        if (sender.gender !== "male") {
          return res.status(400).json({
            success: false,
            error: "Only male users can send gifts",
          });
        }

        // Check if receiver is female (only females can receive gifts)
        if (receiver.gender !== "female") {
          return res.status(400).json({
            success: false,
            error: "Gifts can only be sent to female users",
          });
        }

        // Get gift details
        console.log("GIFT SEND DEBUG - Before getting gift, giftId:", giftId);
        const gift = await storage.getGiftById(giftId);
        console.log("GIFT SEND DEBUG - Gift retrieval result:", {
          gift,
          giftExists: !!gift,
          giftType: typeof gift,
          giftKeys: gift ? Object.keys(gift) : "N/A",
        });

        if (!gift) {
          console.log("GIFT SEND DEBUG - Gift not found with ID:", giftId);
          return res.status(400).json({
            success: false,
            error: "Invalid gift ID",
          });
        }

        // Calculate total cost using coinValue field from Gift model
        const totalCost = gift.coinValue * quantity;
        console.log("GIFT SEND DEBUG - Cost calculation:", {
          giftCoinValue: gift.coinValue,
          quantity,
          totalCost,
          isNaN: isNaN(totalCost),
        });

        if (isNaN(totalCost) || totalCost <= 0) {
          console.log("GIFT SEND DEBUG - Invalid total cost calculation");
          return res.status(400).json({
            success: false,
            error: "Invalid gift price or quantity",
          });
        }

        // Check sender's wallet balance
        const senderWallet = await storage.getWalletByUserId(senderId);
        if (!senderWallet || senderWallet.coinBalance < totalCost) {
          return res.status(400).json({
            success: false,
            error: "Insufficient balance",
          });
        }

        // Get call configuration for commission rates
        const callConfig = await storage.getCallConfig();

        // Determine commission rate based on receiver's profile type
        let commissionRate = 0.2; // Default 20% for basic profiles
        let commissionType = "basic";

        if (receiver.profileType === "gstar") {
          commissionRate = (callConfig?.gstarAdminCommission || 25) / 100;
          commissionType = "gstar";
        } else if (receiver.profileType === "gicon") {
          commissionRate = (callConfig?.giconAdminCommission || 18) / 100;
          commissionType = "gicon";
        }

        // Calculate admin commission and receiver earning
        const adminCommission = Math.floor(totalCost * commissionRate);
        const receiverEarning = totalCost - adminCommission;

        // Start transaction
        try {
          // Deduct from sender's wallet
          await storage.updateWalletBalance(senderId, -totalCost, "gift_sent");

          // Add to receiver's wallet
          await storage.updateWalletBalance(
            receiverId,
            receiverEarning,
            "gift_received",
          );

          // Create gift transaction record (only fields that exist in the model)
          const giftTransaction = await storage.createGiftTransaction({
            giftId: giftId,
            senderId: senderId,
            receiverId: receiverId,
            coinValue: totalCost,
          });

          // Create wallet transactions for tracking
          await Promise.all([
            storage.createWalletTransaction({
              userId: senderId,
              type: "gift_sent",
              amount: -totalCost,
              description: `Sent ${gift.name} to ${receiver.name || receiver.username}`,
              transactionId: giftTransaction.id.toString(),
              status: "completed",
            }),
            storage.createWalletTransaction({
              userId: receiverId,
              type: "gift_received",
              amount: receiverEarning,
              description: `Received ${gift.name} from ${sender.name || sender.username}`,
              transactionId: giftTransaction.id.toString(),
              status: "completed",
            }),
          ]);

          // Send notification to receiver
          await FirestoreService.sendWalletNotification(
            receiverId.toString(),
            "gift_received",
            {
              amount: receiverEarning,
              giftName: gift.name,
              senderName: sender.name || sender.username,
              message: message,
            },
          );

          // Send notification to sender
          await FirestoreService.sendWalletNotification(
            senderId.toString(),
            "gift_sent",
            {
              amount: totalCost,
              giftName: gift.name,
              receiverName: receiver.name || receiver.username,
            },
          );

          res.json({
            success: true,
            message: "Gift sent successfully",
            transaction: {
              id: giftTransaction.id,
              giftName: gift.name,
              giftImage: gift.image,
              quantity: quantity,
              totalCost: totalCost,
              receiverEarning: receiverEarning,
              adminCommission: adminCommission,
              commissionType: commissionType,
              commissionRate: `${Math.round(commissionRate * 100)}%`,
              receiver: {
                id: receiver.id,
                name: receiver.name || receiver.username,
                avatar: receiver.avatar,
              },
              createdAt: new Date(),
            },
          });
        } catch (transactionError: any) {
          console.error("Gift transaction error:", transactionError);
          res.status(500).json({
            success: false,
            error: "Failed to process gift transaction",
          });
        }
      } catch (error: any) {
        console.error("Send gift error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to send gift",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/gift/list:
   *   get:
   *     tags: [Mobile Gift System]
   *     summary: Get available gifts
   *     description: Retrieve list of available gifts for purchase
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: List of available gifts
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 gifts:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       name:
   *                         type: string
   *                       image:
   *                         type: string
   *                       price:
   *                         type: number
   *                       category:
   *                         type: string
   *                       isActive:
   *                         type: boolean
   */
  app.get(
    "/api/v1/app/gift/list",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const gifts = await storage.getActiveGifts();

        res.json({
          success: true,
          gifts: gifts,
        });
      } catch (error: any) {
        console.error("Get gifts error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to retrieve gifts",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/gift/transactions:
   *   get:
   *     tags: [Mobile Gift System]
   *     summary: Get user's gift transactions
   *     description: Retrieve gift transactions (sent and received) for the authenticated user
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [sent, received, all]
   *           default: all
   *         description: Filter transactions by type
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: List of gift transactions retrieved successfully
   */
  app.get(
    "/api/v1/app/gift/transactions",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id!;
        const type = (req.query.type as string) || "all";
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await storage.getGiftTransactions(
          userId,
          type,
          page,
          limit,
        );

        res.json({
          success: true,
          transactions: result.transactions,
          pagination: result.pagination,
        });
      } catch (error: any) {
        console.error("Get gift transactions error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to retrieve gift transactions",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/call/end:
   *   post:
   *     tags: [Mobile Calls]
   *     summary: End a call session and process payment (Server-side Duration Calculation)
   *     description: Ends an active call session, calculates duration server-side from stored startTime for security, and processes coin transactions with admin commission. Duration is calculated server-side to prevent billing fraud.
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [callId]
   *             properties:
   *               callId:
   *                 type: string
   *                 example: "call_1756321234567_abc123def"
   *                 description: Unique call ID from the start call response
   *               durationMinutes:
   *                 type: number
   *                 format: float
   *                 example: 4.2
   *                 deprecated: true
   *                 description: "[DEPRECATED] Duration is now calculated server-side for security. This field is ignored for billing calculations but kept for backward compatibility."
   *     responses:
   *       200:
   *         description: Call ended and payment processed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     callId:
   *                       type: string
   *                       example: "call_1756321234567_abc123def"
   *                     durationMinutes:
   *                       type: number
   *                       example: 4.2
   *                     coinsDeducted:
   *                       type: integer
   *                       example: 458
   *                       description: Total coins deducted from caller
   *                     coinsToReceiver:
   *                       type: integer
   *                       example: 366
   *                       description: Coins credited to receiver (after commission)
   *                     adminCommission:
   *                       type: integer
   *                       example: 92
   *                       description: Admin commission earned
   *                     paymentProcessed:
   *                       type: boolean
   *                       example: true
   *                     callEnded:
   *                       type: boolean
   *                       example: true
   *       400:
   *         description: Invalid request or payment already processed
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       403:
   *         description: Forbidden - user not part of this call
   *       404:
   *         description: Call session not found
   *       500:
   *         description: Payment processing failed or server error
   */
  app.post(
    "/api/v1/app/call/end",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { callId, durationMinutes } = req.body; // durationMinutes ignored for billing security
        const userId = req.user?.id;

        if (!callId) {
          return res.status(400).json({
            success: false,
            error: "Call ID is required",
          });
        }

        // Find call session with atomic update to prevent double-processing
        const callSession = await CallSession.findOneAndUpdate(
          { 
            callId, 
            status: { $ne: "ended" }, // Only if not already ended
            paymentProcessed: false 
          },
          { 
            status: "ended",
            endTime: new Date() 
          },
          { new: true } // Return updated document
        );
        
        if (!callSession) {
          // Check if already processed
          const existingSession = await CallSession.findOne({ callId });
          if (existingSession?.paymentProcessed) {
            return res.status(200).json({
              success: true,
              message: "Call already ended and processed",
              data: {
                callId,
                coinsDeducted: existingSession.coinsDeducted || 0,
                coinsToReceiver: existingSession.coinsToReceiver || 0,
                adminCommission: existingSession.adminCommission || 0,
                paymentProcessed: true,
              }
            });
          }
          return res.status(404).json({
            success: false,
            error: "Call session not found or already ended",
          });
        }

        // Verify user is part of this call
        if (
          callSession.callerUserId !== userId &&
          callSession.receiverUserId !== userId
        ) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized to end this call",
          });
        }

        // SECURITY FIX: Calculate duration server-side using stored startTime
        const currentTime = new Date();
        const startTime = new Date(callSession.startTime);
        const durationSeconds = Math.max(0, (currentTime.getTime() - startTime.getTime()) / 1000);
        
        // Cap maximum call duration to prevent runaway billing (6 hours max)
        const MAX_CALL_SECONDS = 6 * 60 * 60; // 6 hours
        const cappedDurationSeconds = Math.min(durationSeconds, MAX_CALL_SECONDS);
        
        // Convert to minutes and calculate billing
        const serverCalculatedDuration = cappedDurationSeconds / 60;
        const actualDuration = Math.max(
          serverCalculatedDuration,
          callSession.callType === "message" ? 1 : 0, // Minimum 1 minute for message calls
        );
        
        const totalCoinsRequired = Math.ceil(
          actualDuration * callSession.coinsPerMinute,
        );
        
        console.log(`🔒 SECURE BILLING: CallId=${callId}, ServerDuration=${actualDuration.toFixed(2)}min, ClientDuration=${durationMinutes || 'not-provided'}min, CoinsRequired=${totalCoinsRequired}`);

        // Get caller's current wallet balance
        const callerWallet = await storage.getWalletByUserId(
          callSession.callerUserId,
        );
        if (!callerWallet) {
          return res.status(404).json({
            success: false,
            error: "Caller wallet not found",
          });
        }

        // Ensure caller has enough coins (use minimum of what they have or what's required)
        const coinsToDeduct = Math.min(
          totalCoinsRequired,
          callerWallet.coinBalance,
        );

        if (coinsToDeduct <= 0) {
          // Update call session with server-calculated duration but no payment
          callSession.durationMinutes = parseFloat(actualDuration.toFixed(2));
          callSession.coinsDeducted = 0;
          callSession.coinsToReceiver = 0;
          callSession.adminCommission = 0;
          callSession.paymentProcessed = true;
          await callSession.save();

          // Get caller and receiver details for notifications
          const caller = await storage.getUserById(callSession.callerUserId);
          const receiver = await storage.getUserById(
            callSession.receiverUserId,
          );

          // Send call end notifications even when no payment processed
          if (caller && receiver) {
            await FirestoreService.sendCallNotification(
              callSession.callerUserId.toString(),
              receiver.name || receiver.username,
              "call_ended",
              {
                callId,
                duration: parseFloat(actualDuration.toFixed(2)),
                coinsSpent: 0,
                receiverName: receiver.name || receiver.username,
              },
            );

            await FirestoreService.sendCallNotification(
              callSession.receiverUserId.toString(),
              caller.name || caller.username,
              "call_ended",
              {
                callId,
                duration: parseFloat(actualDuration.toFixed(2)),
                coinsSpent: 0,
                callerName: caller.name || caller.username,
              },
            );
          }

          return res.json({
            success: true,
            data: {
              callId,
              message: "Call ended but no coins available for payment",
              coinsDeducted: 0,
              coinsToReceiver: 0,
              adminCommission: 0,
            },
          });
        }

        // Get caller and receiver details
        const caller = await storage.getUserById(callSession.callerUserId);
        const receiver = await storage.getUserById(callSession.receiverUserId);

        if (!caller || !receiver) {
          return res.status(404).json({
            success: false,
            error: "Caller or receiver not found",
          });
        }

        // Only process payment when male user calls female user
        let adminCommission = 0;
        let coinsToReceiver = 0;
        let commissionType = "none";

        if (caller.gender === "male" && receiver.gender === "female") {
          // Get call configuration for commission rates
          const config = await storage.getCallConfig();
          if (!config) {
            return res.status(500).json({
              success: false,
              error: "Call configuration not found",
            });
          }

          // Determine commission rate based on receiver's profile type
          let commissionRate = config.adminCommissionPercent; // default
          commissionType = "admin";

          if (receiver.profileType === "gstar") {
            commissionRate = config.gstarAdminCommission;
            commissionType = "gstar";
          } else if (receiver.profileType === "gicon") {
            commissionRate = config.giconAdminCommission;
            commissionType = "gicon";
          }

          // Calculate commission and receiver payment
          adminCommission = Math.floor(coinsToDeduct * (commissionRate / 100));
          coinsToReceiver = coinsToDeduct - adminCommission;
        }

        // Process payment transactions
        try {
          // Deduct coins from caller
          await storage.updateWalletBalance(
            callSession.callerUserId,
            -coinsToDeduct,
            {
              type: "call_payment",
              description: `Coins debit for ${callSession.callType} call of ${actualDuration.toFixed(2)} mins with ${receiver.name || receiver.username}`,
              callId: callId,
              recipientId: callSession.receiverUserId,
            },
          );

          // Credit coins to receiver only for male → female calls
          if (
            caller.gender === "male" &&
            receiver.gender === "female" &&
            coinsToReceiver > 0
          ) {
            await storage.updateWalletBalance(
              callSession.receiverUserId,
              coinsToReceiver,
              {
                type: "call_earning",
                description: `Coins earning from ${callSession.callType} call of ${actualDuration.toFixed(2)} mins with ${caller.name || caller.username}`,
                callId: callId,
                senderId: callSession.callerUserId,
              },
            );
          }

          // Update call session with payment details (status and endTime already set atomically)
          callSession.durationMinutes = parseFloat(actualDuration.toFixed(2));
          callSession.coinsDeducted = coinsToDeduct;
          callSession.coinsToReceiver = coinsToReceiver;
          callSession.adminCommission = adminCommission;
          callSession.paymentProcessed = true;
          await callSession.save();

          // Send call end notifications to both users
          if (caller && receiver) {
            // Notify caller about call end and payment
            await FirestoreService.sendCallNotification(
              callSession.callerUserId.toString(),
              receiver.name || receiver.username,
              "call_ended",
              {
                callId,
                duration: parseFloat(actualDuration.toFixed(2)),
                coinsSpent: coinsToDeduct,
                receiverName: receiver.name || receiver.username,
              },
            );

            // Notify receiver about call end and earnings (if any)
            await FirestoreService.sendCallNotification(
              callSession.receiverUserId.toString(),
              caller.name || caller.username,
              "call_ended",
              {
                callId,
                duration: parseFloat(actualDuration.toFixed(2)),
                coinsSpent: coinsToReceiver,
                callerName: caller.name || caller.username,
              },
            );

            // Send wallet notifications for the transactions
            if (coinsToDeduct > 0) {
              await FirestoreService.sendWalletNotification(
                callSession.callerUserId.toString(),
                "debit",
                coinsToDeduct,
                `call with ${receiver.name || receiver.username}`,
              );
            }

            if (coinsToReceiver > 0) {
              await FirestoreService.sendWalletNotification(
                callSession.receiverUserId.toString(),
                "earning",
                coinsToReceiver,
                `call with ${caller.name || caller.username}`,
              );
            }
          }

          // Create admin wallet transaction for commission
          // Note: You might want to create an admin wallet or track commissions separately

          res.json({
            success: true,
            data: {
              callId,
              durationMinutes: parseFloat(actualDuration.toFixed(2)),
              coinsDeducted: coinsToDeduct,
              coinsToReceiver: coinsToReceiver,
              adminCommission,
              commissionType,
              callerGender: caller.gender,
              receiverGender: receiver.gender,
              receiverProfileType: receiver.profileType,
              paymentProcessed: true,
              callEnded: true,
            },
          });
        } catch (paymentError: any) {
          console.error("Payment processing error:", paymentError);

          // Mark call as ended but payment failed
          callSession.status = "failed";
          callSession.endTime = new Date();
          callSession.durationMinutes = parseFloat(actualDuration.toFixed(2));
          await callSession.save();

          res.status(500).json({
            success: false,
            error: "Payment processing failed",
            details: paymentError.message,
          });
        }
      } catch (error: any) {
        console.error("End call session error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to end call session",
        });
      }
    },
  );

  // Get call history for user
  /**
   * @swagger
   * /api/v1/app/call/history:
   *   get:
   *     tags: [Mobile Calls]
   *     summary: Get user's call history
   *     description: Retrieves paginated call history for the authenticated user, including both calls made and received
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of records per page
   *     responses:
   *       200:
   *         description: Call history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                         example: "64f8c9e123456789abcdef01"
   *                       callId:
   *                         type: string
   *                         example: "call_1756321234567_abc123def"
   *                       callType:
   *                         type: string
   *                         example: "video"
   *                       status:
   *                         type: string
   *                         example: "ended"
   *                       startTime:
   *                         type: string
   *                         format: date-time
   *                       endTime:
   *                         type: string
   *                         format: date-time
   *                       durationMinutes:
   *                         type: number
   *                         example: 4.2
   *                       totalCoinsDeducted:
   *                         type: integer
   *                         example: 458
   *                       role:
   *                         type: string
   *                         enum: [caller, receiver]
   *                         example: "caller"
   *                       otherUser:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           avatar:
   *                             type: string
   *                           gender:
   *                             type: string
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 20
   *                     hasMore:
   *                       type: boolean
   *                       example: false
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/call/history",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const callHistory = await CallSession.find({
          $or: [{ callerUserId: userId }, { receiverUserId: userId }],
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean();

        // Get user details for each call
        const enrichedHistory = await Promise.all(
          callHistory.map(async (call) => {
            const isCallerQuery = call.callerUserId === userId;
            const otherUserId = isCallerQuery
              ? call.receiverUserId
              : call.callerUserId;
            const otherUser = await storage.getUserById(otherUserId);

            return {
              ...call,
              role: isCallerQuery ? "caller" : "receiver",
              otherUser: {
                id: otherUser?.id,
                name: otherUser?.name || otherUser?.username,
                avatar: otherUser?.avatar,
                gender: otherUser?.gender,
              },
            };
          }),
        );

        res.json({
          success: true,
          data: enrichedHistory,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            hasMore: callHistory.length === Number(limit),
          },
        });
      } catch (error: any) {
        console.error("Get call history error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get call history",
        });
      }
    },
  );

  // Get comprehensive call transactions with gifts and detailed history
  /**
   * @swagger
   * /api/v1/app/call/transactions:
   *   get:
   *     tags: [Mobile Calls]
   *     summary: Get detailed call transactions with gifts and history
   *     description: Retrieves comprehensive call transaction history including call details, duration, type, coins spent/earned, gifts sent during calls, and date filtering
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of records per page
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         example: "2024-01-01"
   *         description: Filter transactions from this date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         example: "2024-12-31"
   *         description: Filter transactions up to this date
   *       - in: query
   *         name: callType
   *         schema:
   *           type: string
   *           enum: [video, audio, message]
   *         description: Filter by call type
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [initiated, connected, ended, failed]
   *         description: Filter by call status
   *     responses:
   *       200:
   *         description: Call transactions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                         example: "64f8c9e123456789abcdef01"
   *                       callId:
   *                         type: string
   *                         example: "call_1756321234567_abc123def"
   *                       callType:
   *                         type: string
   *                         enum: [video, audio, message]
   *                         example: "video"
   *                       status:
   *                         type: string
   *                         example: "ended"
   *                       startTime:
   *                         type: string
   *                         format: date-time
   *                       endTime:
   *                         type: string
   *                         format: date-time
   *                       durationMinutes:
   *                         type: number
   *                         example: 4.2
   *                       coinsPerMinute:
   *                         type: integer
   *                         example: 109
   *                       totalCoinsDeducted:
   *                         type: integer
   *                         example: 458
   *                       coinsToReceiver:
   *                         type: integer
   *                         example: 366
   *                       adminCommission:
   *                         type: integer
   *                         example: 92
   *                       role:
   *                         type: string
   *                         enum: [caller, receiver]
   *                         example: "caller"
   *                       otherUser:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           avatar:
   *                             type: string
   *                           gender:
   *                             type: string
   *                       gifts:
   *                         type: array
   *                         description: Gifts sent during this call
   *                         items:
   *                           type: object
   *                           properties:
   *                             giftId:
   *                               type: string
   *                             giftName:
   *                               type: string
   *                             giftIcon:
   *                               type: string
   *                             coins:
   *                               type: integer
   *                             quantity:
   *                               type: integer
   *                             sentAt:
   *                               type: string
   *                               format: date-time
   *                             sender:
   *                               type: string
   *                               enum: [me, other]
   *                       totalGiftsValue:
   *                         type: integer
   *                         description: Total value of gifts sent during call
   *                       earnings:
   *                         type: object
   *                         description: Earnings summary for this transaction
   *                         properties:
   *                           callEarnings:
   *                             type: integer
   *                             description: Coins earned from call (if receiver)
   *                           giftEarnings:
   *                             type: integer
   *                             description: Coins earned from gifts received
   *                           totalEarnings:
   *                             type: integer
   *                             description: Total earnings for this transaction
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 20
   *                     total:
   *                       type: integer
   *                       example: 150
   *                     hasMore:
   *                       type: boolean
   *                       example: true
   *                 summary:
   *                   type: object
   *                   description: Summary statistics for the filtered period
   *                   properties:
   *                     totalCalls:
   *                       type: integer
   *                       example: 25
   *                     totalMinutes:
   *                       type: number
   *                       example: 120.5
   *                     totalSpent:
   *                       type: integer
   *                       example: 2500
   *                     totalEarned:
   *                       type: integer
   *                       example: 1800
   *                     totalGiftsValue:
   *                       type: integer
   *                       example: 800
   *                     callsByType:
   *                       type: object
   *                       properties:
   *                         video:
   *                           type: integer
   *                           example: 15
   *                         audio:
   *                           type: integer
   *                           example: 8
   *                         message:
   *                           type: integer
   *                           example: 2
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/call/transactions",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const {
          page = 1,
          limit = 20,
          startDate,
          endDate,
          callType,
          status,
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        // Build filter query
        const filter: any = {
          $or: [{ callerUserId: userId }, { receiverUserId: userId }],
        };

        // Add date filters
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) {
            // Start of the day for startDate
            const startOfDay = new Date(startDate as string);
            startOfDay.setHours(0, 0, 0, 0);
            filter.createdAt.$gte = startOfDay;
          }
          if (endDate) {
            // End of the day for endDate
            const endOfDay = new Date(endDate as string);
            endOfDay.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = endOfDay;
          }
        }

        // Add type and status filters
        if (callType) {
          filter.callType = callType;
        }
        if (status) {
          filter.status = status;
        }

        // Get total count for pagination
        const totalCount = await CallSession.countDocuments(filter);

        // Get call sessions
        const callSessions = await CallSession.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean();

        // Enrich with user details and gifts
        const enrichedTransactions = await Promise.all(
          callSessions.map(async (call) => {
            const isCallerQuery = call.callerUserId === userId;
            const otherUserId = isCallerQuery
              ? call.receiverUserId
              : call.callerUserId;
            const otherUser = await storage.getUserById(otherUserId);

            // Get gifts sent during this call (if any)
            // Query gift transactions that occurred during the call timeframe
            const gifts =
              (await storage.getGiftTransactionsByCallId(call.callId)) || [];

            // Calculate earnings for this transaction
            const earnings = {
              callEarnings: isCallerQuery ? 0 : call.coinsToReceiver || 0,
              giftEarnings: 0, // Will be calculated when gift system is implemented
              totalEarnings: isCallerQuery ? 0 : call.coinsToReceiver || 0,
            };

            return {
              ...call,
              role: isCallerQuery ? "caller" : "receiver",
              otherUser: {
                id: otherUser?.id,
                name: otherUser?.name || otherUser?.username || "Unknown User",
                username: otherUser?.username,
                avatar: otherUser?.avatar || null,
                profilePicture: otherUser?.avatar
                  ? `${req.protocol}://${req.get("host")}${otherUser.avatar}`
                  : null,
                gender: otherUser?.gender || "unknown",
                profileType: otherUser?.profileType || "basic",
                isOnline: otherUser?.isOnline || false,
                lastActive: otherUser?.lastActive,
              },
              gifts,
              totalGiftsValue: gifts.reduce(
                (sum, gift) => sum + gift.coins * gift.quantity,
                0,
              ),
              earnings,
            };
          }),
        );

        // Calculate summary statistics
        const summary = {
          totalCalls: enrichedTransactions.length,
          totalMinutes: enrichedTransactions.reduce(
            (sum, call) => sum + (call.durationMinutes || 0),
            0,
          ),
          totalSpent: enrichedTransactions
            .filter((call) => call.role === "caller")
            .reduce((sum, call) => sum + (call.totalCoinsDeducted || 0), 0),
          totalEarned: enrichedTransactions
            .filter((call) => call.role === "receiver")
            .reduce((sum, call) => sum + (call.earnings.totalEarnings || 0), 0),
          totalGiftsValue: enrichedTransactions.reduce(
            (sum, call) => sum + call.totalGiftsValue,
            0,
          ),
          callsByType: {
            video: enrichedTransactions.filter(
              (call) => call.callType === "video",
            ).length,
            audio: enrichedTransactions.filter(
              (call) => call.callType === "audio",
            ).length,
            message: enrichedTransactions.filter(
              (call) => call.callType === "message",
            ).length,
          },
        };

        res.json({
          success: true,
          data: enrichedTransactions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            hasMore: skip + enrichedTransactions.length < totalCount,
          },
          summary,
        });
      } catch (error: any) {
        console.error("Get call transactions error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get call transactions",
        });
      }
    },
  );

  // Get active call sessions
  /**
   * @swagger
   * /api/v1/app/call/active:
   *   get:
   *     tags: [Mobile Calls]
   *     summary: Get active call sessions
   *     description: Retrieves all currently active call sessions for the authenticated user (both initiated and connected calls)
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Active call sessions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                         example: "64f8c9e123456789abcdef01"
   *                       callId:
   *                         type: string
   *                         example: "call_1756321234567_abc123def"
   *                       callerUserId:
   *                         type: string
   *                         example: "6895f4b1c037effd853c16bd"
   *                       receiverUserId:
   *                         type: string
   *                         example: "6852f8ac18ae486409c606d0"
   *                       callType:
   *                         type: string
   *                         example: "video"
   *                       status:
   *                         type: string
   *                         enum: [initiated, connected]
   *                         example: "connected"
   *                       startTime:
   *                         type: string
   *                         format: date-time
   *                       coinsPerMinute:
   *                         type: integer
   *                         example: 109
   *                       adminCommissionPercent:
   *                         type: integer
   *                         example: 20
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/call/active",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;

        const activeCalls = await CallSession.find({
          $or: [{ callerUserId: userId }, { receiverUserId: userId }],
          status: { $in: ["initiated", "connected"] },
        })
          .sort({ startTime: -1 })
          .lean();

        res.json({
          success: true,
          data: activeCalls,
        });
      } catch (error: any) {
        console.error("Get active calls error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get active calls",
        });
      }
    },
  );

  // Debug endpoint to test wallet balance updates
  app.post(
    "/api/v1/app/debug/add-coins",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).json({ error: "Valid amount is required" });
        }

        // Get current wallet
        const wallet = await storage.getWallet(user.id);
        if (!wallet) {
          return res.status(404).json({ error: "Wallet not found" });
        }

        // Update balance
        const newBalance = wallet.coinBalance + amount;
        console.log(
          `Debug: Adding ${amount} coins to user ${user.id}. Current: ${wallet.coinBalance}, New: ${newBalance}`,
        );

        await storage.updateWalletBalance(user.id, newBalance);

        // Get updated wallet
        const updatedWallet = await storage.getWallet(user.id);

        // Update Firebase
        if (updatedWallet) {
          await FirestoreService.updateUserWallet(user.id.toString(), {
            userId: user.id,
            coinBalance: updatedWallet.coinBalance,
            totalEarned: updatedWallet.totalEarned,
            totalSpent: updatedWallet.totalSpent,
          });
        }

        res.json({
          success: true,
          message: `${amount} coins added successfully`,
          wallet: {
            coinBalance: updatedWallet!.coinBalance,
            totalEarned: updatedWallet!.totalEarned,
            totalSpent: updatedWallet!.totalSpent,
          },
        });
      } catch (error: any) {
        console.error("Debug add coins error:", error);
        res
          .status(500)
          .json({ error: "Failed to add coins", details: error.message });
      }
    },
  );

  // Call Rating APIs
  /**
   * @swagger
   * /api/v1/app/call/rating/submit:
   *   post:
   *     tags: [Mobile Ratings]
   *     summary: Submit a rating for a completed call
   *     description: Submit a comprehensive rating for a call including overall rating, specific criteria, feedback, and optional issue reporting
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CallRatingRequest'
   *     responses:
   *       200:
   *         description: Rating submitted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CallRatingResponse'
   *       400:
   *         description: Invalid rating data or call not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/v1/app/call/rating/submit",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const {
          ratedUserId,
          overallRating,
          callQuality,
          userExperience,
          communication,
          feedback,
          tags,
          isAnonymous,
          reportIssue,
          issueType,
          issueDescription,
        } = req.body;
        let { callId } = req.body;

        // Normalize user IDs to strings
        const raterUserId = String(req.user?.id);
        const normalizedRatedUserId = String(ratedUserId);

        // Validate required fields (callId is now optional)
        if (!normalizedRatedUserId || !overallRating) {
          return res.status(400).json({
            success: false,
            error: "Rated user ID and overall rating are required",
          });
        }

        console.log(
          `📊 Rating submission attempt: Rater=${raterUserId}, Rated=${normalizedRatedUserId}, CallId=${callId || "not_provided"}`,
        );

        // Validate rating range
        if (overallRating < 1 || overallRating > 5) {
          return res.status(400).json({
            success: false,
            error: "Overall rating must be between 1 and 5",
          });
        }

        // Find the call session - either by callId or by participants (fallback)
        let callSession;

        if (callId) {
          // Primary path: Look up by callId and verify participant
          console.log(`🔍 Looking up call session by callId: ${callId}`);
          callSession = await CallSession.findOne({
            callId,
            $or: [
              { callerUserId: raterUserId },
              { receiverUserId: raterUserId },
            ],
          });
        }

        if (!callSession) {
          // Fallback: Find most recent ended call between these participants
          console.log(
            `🔄 Fallback: Looking up call by participants - Rater: ${raterUserId}, Rated: ${normalizedRatedUserId}`,
          );
          callSession = await CallSession.findOne({
            $or: [
              {
                callerUserId: raterUserId,
                receiverUserId: normalizedRatedUserId,
              },
              {
                callerUserId: normalizedRatedUserId,
                receiverUserId: raterUserId,
              },
            ],
            status: { $in: ["connected", "ended"] },
          }).sort({ endTime: -1, startTime: -1 });

          if (callSession) {
            console.log(
              `✅ Found fallback call session: ${callSession.callId}`,
            );
            // Update callId for rating record
            callId = callSession.callId;
          }
        }

        if (!callSession) {
          return res.status(404).json({
            success: false,
            error: "Call not found or you were not part of this call",
          });
        }

        // Verify the rated user was the other participant
        const expectedRatedUserId =
          String(callSession.callerUserId) === raterUserId
            ? String(callSession.receiverUserId)
            : String(callSession.callerUserId);

        if (normalizedRatedUserId !== expectedRatedUserId) {
          console.log(
            `❌ Invalid rated user ID: Expected ${expectedRatedUserId}, got ${normalizedRatedUserId}`,
          );
          return res.status(400).json({
            success: false,
            error: "Invalid rated user ID",
          });
        }

        console.log(
          `✅ Rating validation passed: ${raterUserId} rating ${normalizedRatedUserId} for call ${callSession.callId}`,
        );

        // Get call details for rating submission
        const callDuration = callSession.durationMinutes
          ? callSession.durationMinutes * 60
          : 0;
        const callType = callSession.callType;

        // Submit rating
        const rating = await storage.submitCallRating({
          callId,
          raterUserId,
          ratedUserId: normalizedRatedUserId,
          callType,
          overallRating,
          callQuality,
          userExperience,
          communication,
          feedback,
          tags,
          isAnonymous: isAnonymous || false,
          callDuration,
          reportIssue: reportIssue || false,
          issueType,
          issueDescription,
        });

        // Send notification to rated user (if not anonymous)
        if (!isAnonymous) {
          const rater = await storage.getUserById(raterUserId);
          const raterName = rater?.name || rater?.username || "A user";

          await FirestoreService.sendCallNotification(
            normalizedRatedUserId,
            raterName,
            "call_rated",
            {
              callId,
              rating: overallRating,
              feedback: feedback || "",
              raterName: isAnonymous ? "Anonymous" : raterName,
            },
          );
        }

        console.log(
          `📊 Call rating submitted: ${overallRating} stars for call ${callId} by user ${raterUserId}`,
        );

        res.json({
          success: true,
          message: "Rating submitted successfully",
          rating: {
            id: rating._id,
            callId: rating.callId,
            overallRating: rating.overallRating,
            feedback: rating.feedback,
            tags: rating.tags,
            isAnonymous: rating.isAnonymous,
            createdAt: rating.createdAt,
          },
        });
      } catch (error: any) {
        console.error("Submit rating error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to submit rating",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/call/rating/{callId}:
   *   get:
   *     tags: [Mobile Ratings]
   *     summary: Get rating for a specific call
   *     description: Retrieve the rating that the current user submitted for a specific call
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: callId
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique call ID
   *         example: "call_1756664123456_abc123"
   *     responses:
   *       200:
   *         description: Rating retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 rating:
   *                   type: object
   *                   nullable: true
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "64f1b2c3d4e5f6g7h8i9j0k1"
   *                     callId:
   *                       type: string
   *                       example: "call_1756664123456_abc123"
   *                     overallRating:
   *                       type: number
   *                       example: 4
   *                     callQuality:
   *                       type: number
   *                       example: 4
   *                     userExperience:
   *                       type: number
   *                       example: 5
   *                     communication:
   *                       type: number
   *                       example: 4
   *                     feedback:
   *                       type: string
   *                       example: "Great conversation!"
   *                     tags:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ["friendly", "professional"]
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       404:
   *         description: Rating not found for this call
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/call/rating/:callId",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const raterUserId = req.user?.id;
        const { callId } = req.params;

        const rating = await storage.getCallRating(callId, raterUserId);

        res.json({
          success: true,
          rating: rating || null,
        });
      } catch (error: any) {
        console.error("Get call rating error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get call rating",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/profile/ratings:
   *   get:
   *     tags: [Mobile Ratings]
   *     summary: Get user's received ratings with pagination
   *     description: Retrieve paginated list of ratings received by the current user from other users
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of ratings per page
   *     responses:
   *       200:
   *         description: User ratings retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     ratings:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "64f1b2c3d4e5f6g7h8i9j0k1"
   *                           callId:
   *                             type: string
   *                             example: "call_1756664123456_abc123"
   *                           overallRating:
   *                             type: number
   *                             example: 4
   *                           callQuality:
   *                             type: number
   *                             example: 4
   *                           userExperience:
   *                             type: number
   *                             example: 5
   *                           communication:
   *                             type: number
   *                             example: 4
   *                           feedback:
   *                             type: string
   *                             example: "Excellent call quality"
   *                           tags:
   *                             type: array
   *                             items:
   *                               type: string
   *                             example: ["professional", "helpful"]
   *                           isAnonymous:
   *                             type: boolean
   *                             example: false
   *                           raterName:
   *                             type: string
   *                             example: "John Doe"
   *                           callType:
   *                             type: string
   *                             example: "video"
   *                           callDuration:
   *                             type: number
   *                             example: 180
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: number
   *                           example: 1
   *                         limit:
   *                           type: number
   *                           example: 20
   *                         total:
   *                           type: number
   *                           example: 150
   *                         hasMore:
   *                           type: boolean
   *                           example: true
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/profile/ratings",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;

        const result = await storage.getUserRatings(
          userId,
          Number(page),
          Number(limit),
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        console.error("Get user ratings error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get user ratings",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/profile/rating-stats:
   *   get:
   *     tags: [Mobile Ratings]
   *     summary: Get comprehensive rating statistics for user
   *     description: Retrieve detailed rating statistics including averages, distribution, and total ratings count
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Rating statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RatingStatsResponse'
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get(
    "/api/v1/app/profile/rating-stats",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;

        const stats = await storage.getUserRatingStats(userId);

        res.json({
          success: true,
          stats,
        });
      } catch (error: any) {
        console.error("Get rating stats error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get rating statistics",
        });
      }
    },
  );

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // ============= USER PROFILE BLOCK MANAGEMENT APIs =============

  /**
   * @swagger
   * /api/v1/app/profile/block:
   *   post:
   *     tags: [Mobile Profile]
   *     summary: Block another user profile
   *     description: Block another user to prevent them from calling or messaging you
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [userId]
   *             properties:
   *               userId:
   *                 type: string
   *                 description: ID of the user to block
   *                 example: "68b2a35eb31115d3e464ab12"
   *               reason:
   *                 type: string
   *                 description: Optional reason for blocking
   *                 example: "Inappropriate behavior"
   *     responses:
   *       200:
   *         description: User blocked successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User blocked successfully"
   *                 blockedUserId:
   *                   type: string
   *                   example: "68b2a35eb31115d3e464ab12"
   *                 blockedAt:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid request or user already blocked
   *       404:
   *         description: User not found
   *       401:
   *         description: Unauthorized
   */
  app.post(
    "/api/v1/app/profile/block",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const blockerUserId = req.user?.id;
        const { userId: blockedUserId, reason } = req.body;

        if (!blockedUserId) {
          return res.status(400).json({
            success: false,
            error: "User ID is required",
          });
        }

        if (blockerUserId === blockedUserId) {
          return res.status(400).json({
            success: false,
            error: "Cannot block yourself",
          });
        }

        // Check if user exists
        const userToBlock = await storage.getUserById(blockedUserId);
        if (!userToBlock) {
          return res.status(404).json({
            success: false,
            error: "User not found",
          });
        }

        // Check if already blocked
        const isAlreadyBlocked = await storage.isUserBlocked(
          blockerUserId,
          blockedUserId,
        );
        if (isAlreadyBlocked) {
          return res.status(400).json({
            success: false,
            error: "User is already blocked",
          });
        }

        // Block the user
        await storage.blockUserProfile(blockerUserId, blockedUserId, reason);

        res.json({
          success: true,
          message: "User blocked successfully",
          blockedUserId,
          blockedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("Block user profile error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to block user",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/profile/unblock:
   *   post:
   *     tags: [Mobile Profile]
   *     summary: Unblock a user profile
   *     description: Unblock a previously blocked user to allow communication again
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [userId]
   *             properties:
   *               userId:
   *                 type: string
   *                 description: ID of the user to unblock
   *                 example: "68b2a35eb31115d3e464ab12"
   *     responses:
   *       200:
   *         description: User unblocked successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User unblocked successfully"
   *                 unblockedUserId:
   *                   type: string
   *                   example: "68b2a35eb31115d3e464ab12"
   *                 unblockedAt:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid request or user not blocked
   *       404:
   *         description: User not found
   *       401:
   *         description: Unauthorized
   */
  app.post(
    "/api/v1/app/profile/unblock",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const blockerUserId = req.user?.id;
        const { userId: blockedUserId } = req.body;

        if (!blockedUserId) {
          return res.status(400).json({
            success: false,
            error: "User ID is required",
          });
        }

        // Check if user exists
        const userToUnblock = await storage.getUserById(blockedUserId);
        if (!userToUnblock) {
          return res.status(404).json({
            success: false,
            error: "User not found",
          });
        }

        // Check if actually blocked
        const isBlocked = await storage.isUserBlocked(
          blockerUserId,
          blockedUserId,
        );
        if (!isBlocked) {
          return res.status(400).json({
            success: false,
            error: "User is not blocked",
          });
        }

        // Unblock the user
        await storage.unblockUserProfile(blockerUserId, blockedUserId);

        res.json({
          success: true,
          message: "User unblocked successfully",
          unblockedUserId: blockedUserId,
          unblockedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("Unblock user profile error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to unblock user",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/profile/blocked:
   *   get:
   *     tags: [Mobile Profile]
   *     summary: Get list of blocked users
   *     description: Get paginated list of users that the current user has blocked
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of blocked users per page
   *     responses:
   *       200:
   *         description: List of blocked users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       userId:
   *                         type: string
   *                         example: "68b2a35eb31115d3e464ab12"
   *                       name:
   *                         type: string
   *                         example: "John Doe"
   *                       username:
   *                         type: string
   *                         example: "+919876543210"
   *                       avatar:
   *                         type: string
   *                         nullable: true
   *                         example: "/uploads/profiles/profile-123.jpg"
   *                       blockedAt:
   *                         type: string
   *                         format: date-time
   *                       reason:
   *                         type: string
   *                         nullable: true
   *                         example: "Inappropriate behavior"
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 20
   *                     total:
   *                       type: integer
   *                       example: 5
   *                     hasMore:
   *                       type: boolean
   *                       example: false
   *       401:
   *         description: Unauthorized
   */
  app.get(
    "/api/v1/app/profile/blocked",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        // Validate pagination parameters
        if (limit > 100) {
          return res.status(400).json({
            success: false,
            error: "Limit cannot exceed 100",
          });
        }

        const blockedUsers = await storage.getBlockedUserProfiles(
          userId,
          page,
          limit,
        );

        res.json({
          success: true,
          data: blockedUsers.users,
          pagination: {
            page,
            limit,
            total: blockedUsers.total,
            hasMore: page * limit < blockedUsers.total,
          },
        });
      } catch (error: any) {
        console.error("Get blocked users error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to retrieve blocked users",
        });
      }
    },
  );

  // ============= FOLLOW/FOLLOWING SYSTEM APIs =============

  /**
   * @swagger
   * /api/v1/app/follow:
   *   post:
   *     tags: [Mobile Social]
   *     summary: Follow another user
   *     description: Creates a follow relationship between the authenticated user and target user
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *             properties:
   *               userId:
   *                 type: string
   *                 example: "6852f8ac18ae486409c606d0"
   *                 description: ID of the user to follow
   *     responses:
   *       200:
   *         description: Successfully followed user
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Successfully followed user"
   *       400:
   *         description: Invalid request (already following, cannot follow self, etc.)
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/v1/app/follow",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const followerId = req.user?.id;
        const { userId: followingId } = req.body;

        if (!followingId) {
          return res.status(400).json({
            success: false,
            error: "User ID is required",
          });
        }

        const result = await storage.followUser(followerId, followingId);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.message,
          });
        }

        res.json({
          success: true,
          message: result.message,
        });
      } catch (error: any) {
        console.error("Follow user error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to follow user",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/unfollow:
   *   post:
   *     tags: [Mobile Social]
   *     summary: Unfollow a user
   *     description: Removes the follow relationship between authenticated user and target user
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *             properties:
   *               userId:
   *                 type: string
   *                 example: "6852f8ac18ae486409c606d0"
   *                 description: ID of the user to unfollow
   *     responses:
   *       200:
   *         description: Successfully unfollowed user
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Successfully unfollowed user"
   *       400:
   *         description: Invalid request (not following user)
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/v1/app/unfollow",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const followerId = req.user?.id;
        const { userId: followingId } = req.body;

        if (!followingId) {
          return res.status(400).json({
            success: false,
            error: "User ID is required",
          });
        }

        const result = await storage.unfollowUser(followerId, followingId);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.message,
          });
        }

        res.json({
          success: true,
          message: result.message,
        });
      } catch (error: any) {
        console.error("Unfollow user error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to unfollow user",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/follow/status/{userId}:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Check if following a user
   *     description: Returns whether the authenticated user is following the specified user
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the user to check follow status
   *     responses:
   *       200:
   *         description: Follow status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 isFollowing:
   *                   type: boolean
   *                   example: true
   *                 followCounts:
   *                   type: object
   *                   properties:
   *                     followersCount:
   *                       type: integer
   *                       example: 150
   *                     followingCount:
   *                       type: integer
   *                       example: 89
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/follow/status/:userId",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const followerId = req.user?.id;
        const { userId } = req.params;

        const [isFollowing, followCounts] = await Promise.all([
          storage.isFollowing(followerId, userId),
          storage.getFollowCounts(userId),
        ]);

        res.json({
          success: true,
          isFollowing,
          followCounts,
        });
      } catch (error: any) {
        console.error("Get follow status error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get follow status",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/followers:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get followers list
   *     description: Returns paginated list of users following the authenticated user
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 50
   *         description: Number of followers per page
   *     responses:
   *       200:
   *         description: Followers retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 followers:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "6852f8ac18ae486409c606d0"
   *                       username:
   *                         type: string
   *                         example: "john_doe"
   *                       name:
   *                         type: string
   *                         example: "John Doe"
   *                       avatar:
   *                         type: string
   *                         example: "https://example.com/avatar.jpg"
   *                       gender:
   *                         type: string
   *                         example: "male"
   *                       profileType:
   *                         type: string
   *                         example: "gstar"
   *                       badgeLevel:
   *                         type: integer
   *                         example: 3
   *                       isOnline:
   *                         type: boolean
   *                         example: true
   *                       followedAt:
   *                         type: string
   *                         format: date-time
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/followers",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const result = await storage.getFollowers(userId, page, limit);

        res.json({
          success: true,
          followers: result.followers,
          pagination: result.pagination,
        });
      } catch (error: any) {
        console.error("Get followers error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get followers",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/following:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get following list
   *     description: Returns paginated list of users that the authenticated user is following
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 50
   *         description: Number of following per page
   *     responses:
   *       200:
   *         description: Following list retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 following:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "6852f8ac18ae486409c606d0"
   *                       username:
   *                         type: string
   *                         example: "jane_smith"
   *                       name:
   *                         type: string
   *                         example: "Jane Smith"
   *                       avatar:
   *                         type: string
   *                         example: "https://example.com/avatar.jpg"
   *                       gender:
   *                         type: string
   *                         example: "female"
   *                       profileType:
   *                         type: string
   *                         example: "gicon"
   *                       badgeLevel:
   *                         type: integer
   *                         example: 5
   *                       isOnline:
   *                         type: boolean
   *                         example: false
   *                       followedAt:
   *                         type: string
   *                         format: date-time
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/following",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const result = await storage.getFollowing(userId, page, limit);

        res.json({
          success: true,
          following: result.following,
          pagination: result.pagination,
        });
      } catch (error: any) {
        console.error("Get following error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get following list",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/follow/counts:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get follow counts for current user
   *     description: Returns follower and following counts for the authenticated user
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Follow counts retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 followersCount:
   *                   type: integer
   *                   example: 245
   *                 followingCount:
   *                   type: integer
   *                   example: 180
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/follow/counts",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;

        const counts = await storage.getFollowCounts(userId);

        res.json({
          success: true,
          followersCount: counts.followersCount,
          followingCount: counts.followingCount,
        });
      } catch (error: any) {
        console.error("Get follow counts error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get follow counts",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/follow/mutual/{userId}:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get mutual follows with another user
   *     description: Returns users that both the authenticated user and specified user follow
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the user to find mutual follows with
   *     responses:
   *       200:
   *         description: Mutual follows retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 mutualFollows:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "6852f8ac18ae486409c606d0"
   *                       username:
   *                         type: string
   *                         example: "alex_wong"
   *                       name:
   *                         type: string
   *                         example: "Alex Wong"
   *                       avatar:
   *                         type: string
   *                         example: "https://example.com/avatar.jpg"
   *                       gender:
   *                         type: string
   *                         example: "male"
   *                       profileType:
   *                         type: string
   *                         example: "basic"
   *                       badgeLevel:
   *                         type: integer
   *                         example: 2
   *                       isOnline:
   *                         type: boolean
   *                         example: true
   *                 count:
   *                   type: integer
   *                   example: 12
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/follow/mutual/:userId",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const currentUserId = req.user?.id;
        const { userId } = req.params;

        const mutualFollows = await storage.getMutualFollows(
          currentUserId,
          userId,
        );

        res.json({
          success: true,
          mutualFollows,
          count: mutualFollows.length,
        });
      } catch (error: any) {
        console.error("Get mutual follows error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get mutual follows",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/follow/suggestions:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get suggested users to follow
   *     description: Returns personalized suggestions of users to follow based on interests and activity
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *           maximum: 20
   *         description: Number of suggestions to return
   *     responses:
   *       200:
   *         description: Suggested users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 suggestions:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "6852f8ac18ae486409c606d0"
   *                       username:
   *                         type: string
   *                         example: "maria_garcia"
   *                       name:
   *                         type: string
   *                         example: "Maria Garcia"
   *                       avatar:
   *                         type: string
   *                         example: "https://example.com/avatar.jpg"
   *                       gender:
   *                         type: string
   *                         example: "female"
   *                       profileType:
   *                         type: string
   *                         example: "gstar"
   *                       badgeLevel:
   *                         type: integer
   *                         example: 7
   *                       isOnline:
   *                         type: boolean
   *                         example: true
   *                       commonInterests:
   *                         type: array
   *                         items:
   *                           type: string
   *                         example: ["music", "travel"]
   *                 count:
   *                   type: integer
   *                   example: 8
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/follow/suggestions",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

        const suggestions = await storage.getSuggestedUsers(userId, limit);

        res.json({
          success: true,
          suggestions,
          count: suggestions.length,
        });
      } catch (error: any) {
        console.error("Get follow suggestions error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get follow suggestions",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/follow/search:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Search users to follow
   *     description: Search for users by username, name, or email to follow
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: query
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query (username, name, or email)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 50
   *         description: Number of results to return
   *     responses:
   *       200:
   *         description: Search results retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "6852f8ac18ae486409c606d0"
   *                       username:
   *                         type: string
   *                         example: "david_kim"
   *                       name:
   *                         type: string
   *                         example: "David Kim"
   *                       avatar:
   *                         type: string
   *                         example: "https://example.com/avatar.jpg"
   *                       gender:
   *                         type: string
   *                         example: "male"
   *                       profileType:
   *                         type: string
   *                         example: "gicon"
   *                       badgeLevel:
   *                         type: integer
   *                         example: 4
   *                       isOnline:
   *                         type: boolean
   *                         example: false
   *                 count:
   *                   type: integer
   *                   example: 5
   *                 query:
   *                   type: string
   *                   example: "david"
   *       400:
   *         description: Missing search query
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/follow/search",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const query = req.query.query as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        if (!query || query.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: "Search query is required",
          });
        }

        const users = await storage.searchUsersToFollow(
          userId,
          query.trim(),
          limit,
        );

        res.json({
          success: true,
          users,
          count: users.length,
          query: query.trim(),
        });
      } catch (error: any) {
        console.error("Search users to follow error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to search users",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/followers/{userId}:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get followers of a specific user
   *     description: Returns paginated list of users following the specified user
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the user whose followers to retrieve
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 50
   *         description: Number of followers per page
   *     responses:
   *       200:
   *         description: Followers retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 followers:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       username:
   *                         type: string
   *                       name:
   *                         type: string
   *                       avatar:
   *                         type: string
   *                       gender:
   *                         type: string
   *                       profileType:
   *                         type: string
   *                       badgeLevel:
   *                         type: integer
   *                       isOnline:
   *                         type: boolean
   *                       followedAt:
   *                         type: string
   *                         format: date-time
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/followers/:userId",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const result = await storage.getFollowers(userId, page, limit);

        res.json({
          success: true,
          followers: result.followers,
          pagination: result.pagination,
        });
      } catch (error: any) {
        console.error("Get user followers error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get user followers",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/following/{userId}:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get following list of a specific user
   *     description: Returns paginated list of users that the specified user is following
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the user whose following list to retrieve
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 50
   *         description: Number of following per page
   *     responses:
   *       200:
   *         description: Following list retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 following:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       username:
   *                         type: string
   *                       name:
   *                         type: string
   *                       avatar:
   *                         type: string
   *                       gender:
   *                         type: string
   *                       profileType:
   *                         type: string
   *                       badgeLevel:
   *                         type: integer
   *                       isOnline:
   *                         type: boolean
   *                       followedAt:
   *                         type: string
   *                         format: date-time
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/following/:userId",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const result = await storage.getFollowing(userId, page, limit);

        res.json({
          success: true,
          following: result.following,
          pagination: result.pagination,
        });
      } catch (error: any) {
        console.error("Get user following error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get user following list",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/follow/counts/{userId}:
   *   get:
   *     tags: [Mobile Social]
   *     summary: Get follow counts for a specific user
   *     description: Returns follower and following counts for the specified user
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the user whose follow counts to retrieve
   *     responses:
   *       200:
   *         description: Follow counts retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 followersCount:
   *                   type: integer
   *                   example: 89
   *                 followingCount:
   *                   type: integer
   *                   example: 156
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/v1/app/follow/counts/:userId",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;

        const counts = await storage.getFollowCounts(userId);

        res.json({
          success: true,
          followersCount: counts.followersCount,
          followingCount: counts.followingCount,
        });
      } catch (error: any) {
        console.error("Get user follow counts error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to get user follow counts",
        });
      }
    },
  );

  /**
   * @swagger
   * /api/v1/app/message/send:
   *   post:
   *     summary: Send a message with coin deduction
   *     description: Send a message to another user and automatically deduct coins based on configuration
   *     tags: [Messaging]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - receiverId
   *               - message
   *             properties:
   *               receiverId:
   *                 type: string
   *                 example: "6855046a4fe9aacd9c8721a3"
   *                 description: ID of the user receiving the message
   *               message:
   *                 type: string
   *                 example: "Hello! How are you?"
   *                 description: The message content to send
   *               messageType:
   *                 type: string
   *                 enum: [text, image, emoji]
   *                 default: text
   *                 example: "text"
   *                 description: Type of message being sent
   *     responses:
   *       200:
   *         description: Message sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Message sent successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     messageId:
   *                       type: string
   *                       example: "msg_1757329999999_abc123"
   *                     coinsDeducted:
   *                       type: integer
   *                       example: 1
   *                     remainingBalance:
   *                       type: integer
   *                       example: 349
   *                     receiver:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *       400:
   *         description: Invalid request or insufficient coins
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       404:
   *         description: Receiver not found
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/v1/app/message/send",
    authenticateMobileUser,
    async (req: Request, res: Response) => {
      try {
        const { receiverId, message, messageType = "text" } = req.body;
        const senderId = req.user?.id;

        if (!receiverId || !message) {
          return res.status(400).json({
            success: false,
            error: "Receiver ID and message are required",
          });
        }

        if (message.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: "Message cannot be empty",
          });
        }

        // Get configuration for message cost
        const config = await storage.getCallConfig();
        if (!config) {
          return res.status(500).json({
            success: false,
            error: "System configuration not found",
          });
        }

        const messageCost = config.messageCoins || 1;

        // Get sender's wallet balance
        const senderWallet = await storage.getWalletByUserId(senderId);
        if (!senderWallet) {
          return res.status(404).json({
            success: false,
            error: "Sender wallet not found",
          });
        }

        // Check if sender has sufficient balance
        if ((senderWallet.coinBalance || 0) < messageCost) {
          return res.status(400).json({
            success: false,
            error: `Insufficient balance. Need ${messageCost} coins to send message.`,
            data: {
              required: messageCost,
              available: senderWallet.coinBalance || 0,
            },
          });
        }

        // Verify receiver exists
        const receiver = await storage.getUserById(receiverId);
        if (!receiver) {
          return res.status(404).json({
            success: false,
            error: "Receiver not found",
          });
        }

        // Check if receiver is blocked
        if (receiver.isBlocked) {
          return res.status(400).json({
            success: false,
            error: "Cannot send message to blocked user",
          });
        }

        // Generate unique message ID
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        try {
          // Get call configuration for commission rates
          const callConfig = await storage.getCallConfig();

          // Determine commission rate based on receiver's profile type
          let commissionRate = 0.2; // Default 20% for basic profiles
          let commissionType = "basic";

          if (receiver.profileType === "gstar") {
            commissionRate = (callConfig?.gstarAdminCommission || 25) / 100;
            commissionType = "gstar";
          } else if (receiver.profileType === "gicon") {
            commissionRate = (callConfig?.giconAdminCommission || 18) / 100;
            commissionType = "gicon";
          }

          // Calculate admin commission and receiver earning
          const adminCommission = Math.floor(messageCost * commissionRate);
          const receiverEarning = messageCost - adminCommission;

          // Deduct coins from sender's wallet
          await storage.updateWalletBalance(senderId, -messageCost);

          // Add to receiver's wallet (if receiver is female and sender is male)
          const sender = await storage.getUserById(senderId);
          if (sender?.gender === "male" && receiver.gender === "female") {
            await storage.updateWalletBalance(receiverId, receiverEarning);

            // Create receiver transaction record
            await storage.createWalletTransaction({
              userId: receiverId,
              type: "credit",
              amount: receiverEarning,
              description: `Message received from ${sender.name || sender.username}`,
              status: "completed",
            });
          }

          // Create sender wallet transaction record
          await storage.createWalletTransaction({
            userId: senderId,
            type: "debit",
            amount: messageCost,
            description: `Message sent to ${receiver.name || receiver.username}`,
            status: "completed",
          });

          // Store message in Firebase for real-time chat (if implemented)
          try {
            if (FirestoreService.storeMessage) {
              await FirestoreService.storeMessage({
                messageId,
                senderId: senderId.toString(),
                receiverId: receiverId.toString(),
                message: message.trim(),
                messageType,
                coinsDeducted: messageCost,
                timestamp: new Date(),
                status: "sent",
              });
            }

            // Send notification to receiver (if implemented)
            if (FirestoreService.sendMessageNotification) {
              await FirestoreService.sendMessageNotification(
                receiverId.toString(),
                "message_received",
                {
                  senderId: senderId.toString(),
                  senderName: req.user?.name || req.user?.username || "User",
                  message: message.trim(),
                  messageType,
                  timestamp: new Date(),
                },
              );
            }
          } catch (firebaseError) {
            console.warn(
              "Firebase message operations not available:",
              firebaseError,
            );
          }

          // Get updated wallet balance
          const updatedWallet = await storage.getWalletByUserId(senderId);

          console.log(
            `💬 Message sent: ${senderId} → ${receiverId}, Cost: ${messageCost} coins`,
          );

          res.json({
            success: true,
            message: "Message sent successfully",
            data: {
              messageId,
              coinsDeducted: messageCost,
              remainingBalance: updatedWallet?.coinBalance || 0,
              receiver: {
                id: receiverId,
                name: receiver.name || receiver.username,
              },
              messageType,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (walletError: any) {
          console.error("Message wallet transaction failed:", walletError);
          return res.status(500).json({
            success: false,
            error: "Failed to process message transaction",
          });
        }
      } catch (error: any) {
        console.error("Send message error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to send message",
        });
      }
    },
  );

  // ============= BANNER APIs =============

  /**
   * @swagger
   * /api/v1/app/banners:
   *   get:
   *     tags: [Mobile Banners]
   *     summary: Get active banners for mobile app
   *     description: Returns all active banners ordered by display order for mobile app display
   *     responses:
   *       200:
   *         description: Active banners retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 banners:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                         example: 1
   *                       title:
   *                         type: string
   *                         example: "Welcome Bonus"
   *                       imageUrl:
   *                         type: string
   *                         example: "https://example.com/banner.jpg"
   *                       linkUrl:
   *                         type: string
   *                         example: "https://example.com/offer"
   *                       displayOrder:
   *                         type: integer
   *                         example: 1
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                         example: "2025-01-11T10:30:00Z"
   *                 meta:
   *                   type: object
   *                   properties:
   *                     totalBanners:
   *                       type: integer
   *                       example: 3
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/v1/app/banners", async (req: Request, res: Response) => {
    try {
      // Get all banners from storage
      const allBanners = await storage.getBanners();

      // Filter active banners and sort by display order
      const activeBanners = allBanners
        .filter((banner) => banner.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((banner) => ({
          id: banner.id,
          title: banner.title,
          imageUrl: banner.imageUrl,
          linkUrl: banner.linkUrl,
          displayOrder: banner.displayOrder,
          createdAt: banner.createdAt,
        }));

      console.log(
        `📱 Mobile banners request: ${activeBanners.length} active banners returned`,
      );

      res.json({
        success: true,
        banners: activeBanners,
        meta: {
          totalBanners: activeBanners.length,
        },
      });
    } catch (error: any) {
      console.error("Get mobile banners error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve banners",
      });
    }
  });
}

export { registerMobileRoutes };
