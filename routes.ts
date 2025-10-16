import type { Express } from "express";
import { createServer, type Server } from "http";
import { MongoStorage } from "./mongoStorage";
import { updateUserInFirestore } from "./firebase";
import { fcmNotificationService } from "./utils/fcmNotifications";

const storage = new MongoStorage();
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  insertUserSchema,
  insertWalletTransactionSchema,
  insertWithdrawalRequestSchema,
  insertCoinPackageSchema,
  insertGiftSchema,
  insertBonusRuleSchema,
  insertDocumentSchema,
  insertBannerSchema,
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "77ab346ffe91751557cbebdabe5f70232158444821b383d6e256a475d4b0ecd70a14e49b561e645474eace8720db55db0f78bcd316cf55bea9708df9d0cb7326";

// Middleware to verify admin token
const verifyAdmin = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const admin = await storage.getAdmin(decoded.id);
    
    if (!admin) {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Compare password with bcrypt
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: "7d" });
      
      res.json({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/auth/me", verifyAdmin, async (req: any, res) => {
    res.json({
      admin: {
        id: req.admin.id,
        username: req.admin.username,
        name: req.admin.name,
        role: req.admin.role,
      },
    });
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", verifyAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // User management routes
  app.get("/api/users", verifyAdmin, async (req, res) => {
    try {
      const { search } = req.query;
      let users;
      
      if (search) {
        users = await storage.searchUsers(search as string);
      } else {
        users = await storage.getUsers();
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/users/:id", verifyAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users", verifyAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/users/:id", verifyAdmin, async (req, res) => {
    try {
      console.log("PATCH /api/users/:id - Request data:", req.body);
      console.log("User ID:", req.params.id);
      // Use the string ID directly instead of parsing to integer
      const user = await storage.updateUser(req.params.id as any, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Sync critical updates to Firebase (status and profile type changes)
      if (req.body.isBlocked !== undefined || req.body.profileType !== undefined) {
        try {
          await updateUserInFirestore(user.id.toString(), {
            isBlocked: user.isBlocked,
            profileType: user.profileType,
            lastActive: new Date(),
            updatedAt: new Date()
          });
          console.log('User status/profile type synced to Firebase:', user.id);
        } catch (firebaseError) {
          console.error('Firebase sync error:', firebaseError);
          // Don't fail the request if Firebase sync fails
        }
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      
      // Handle duplicate name error specifically
      if (error.message && error.message.includes("already exists")) {
        return res.status(409).json({ 
          message: error.message,
          code: "DUPLICATE_NAME"
        });
      }
      
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users/:id/block", verifyAdmin, async (req, res) => {
    try {
      console.log("POST /api/users/:id/block - User ID:", req.params.id);
      const user = await storage.updateUser(req.params.id, { isBlocked: true });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Sync to Firebase (same as PATCH route)
      try {
        await updateUserInFirestore(user.id.toString(), {
          isBlocked: user.isBlocked,
          profileType: user.profileType,
          lastActive: new Date(),
          updatedAt: new Date()
        });
        console.log('User block status synced to Firebase:', user.id);
      } catch (firebaseError) {
        console.error('Firebase sync error:', firebaseError);
        // Don't fail the request if Firebase sync fails
      }
      
      res.json({ message: "User blocked successfully", user });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users/:id/unblock", verifyAdmin, async (req, res) => {
    try {
      console.log("POST /api/users/:id/unblock - User ID:", req.params.id);
      const user = await storage.updateUser(req.params.id, { isBlocked: false });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Sync to Firebase (same as PATCH route)
      try {
        await updateUserInFirestore(user.id.toString(), {
          isBlocked: user.isBlocked,
          profileType: user.profileType,
          lastActive: new Date(),
          updatedAt: new Date()
        });
        console.log('User unblock status synced to Firebase:', user.id);
      } catch (firebaseError) {
        console.error('Firebase sync error:', firebaseError);
        // Don't fail the request if Firebase sync fails
      }
      
      res.json({ message: "User unblocked successfully", user });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete user account and all associated data
  app.delete("/api/users/:id", verifyAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const admin = req.admin;
      
      console.log(`Admin ${admin.username} attempting to delete user ${userId}`);
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      // Try to clean up Firebase data (don't fail if Firebase isn't available)
      try {
        await updateUserInFirestore(userId, {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: admin.id
        });
        console.log(`Firebase cleanup completed for deleted user: ${userId}`);
      } catch (firebaseError) {
        console.warn('Firebase cleanup failed (non-critical):', firebaseError);
      }

      res.json({ 
        message: "User account and all associated data deleted successfully",
        deletedUserId: userId,
        deletedBy: admin.username 
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Database cleanup utility endpoint for fixing duplicate names
  app.post("/api/admin/cleanup-duplicate-names", verifyAdmin, async (req: any, res) => {
    try {
      const UserModel = require('./models/User').User;
      
      // Find duplicate names using aggregation
      const duplicates = await UserModel.aggregate([
        {
          $group: {
            _id: "$name",
            count: { $sum: 1 },
            users: { $push: { id: "$_id", username: "$username", createdAt: "$createdAt" } }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ]);

      let cleanupResults = [];
      
      for (const duplicate of duplicates) {
        const { _id: name, users } = duplicate;
        
        // Sort by creation date, keep the oldest, rename the newer ones
        users.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        for (let i = 1; i < users.length; i++) {
          const userToRename = users[i];
          const newName = `${name}_${i}`;
          
          await UserModel.updateOne(
            { _id: userToRename.id },
            { $set: { name: newName } }
          );
          
          cleanupResults.push({
            oldName: name,
            newName: newName,
            username: userToRename.username,
            userId: userToRename.id
          });
        }
      }

      // Create unique index on name field
      try {
        await UserModel.collection.createIndex({ name: 1 }, { unique: true });
      } catch (indexError) {
        console.log('Index might already exist:', indexError.message);
      }

      res.json({
        success: true,
        message: "Duplicate names cleaned up successfully",
        duplicatesFound: duplicates.length,
        usersRenamed: cleanupResults.length,
        cleanupResults: cleanupResults
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ 
        success: false,
        message: "Cleanup failed", 
        error: error.message 
      });
    }
  });

  // Wallet management routes
  app.get("/api/wallets", verifyAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const wallets = [];
      
      for (const user of users) {
        let wallet = await storage.getWallet(user.id);
        if (!wallet) {
          wallet = await storage.createWallet(user.id);
        }
        wallets.push(wallet);
      }
      
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/wallet/transactions", verifyAdmin, async (req, res) => {
    try {
      const { userId } = req.query;
      const transactions = await storage.getWalletTransactions(
        userId ? parseInt(userId as string) : undefined
      );
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/wallet/transactions", verifyAdmin, async (req: any, res) => {
    try {
      // Manual validation for wallet transactions to handle MongoDB ObjectIds
      if (!req.body.userId || !req.body.type || !req.body.amount || !req.body.description) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (!['credit', 'debit'].includes(req.body.type)) {
        return res.status(400).json({ message: "Invalid transaction type" });
      }
      
      const amount = parseInt(req.body.amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const transactionData = {
        userId: req.body.userId,
        type: req.body.type,
        amount: amount,
        description: req.body.description,
        adminId: req.admin.id,
      };
      
      const transaction = await storage.createWalletTransaction(transactionData as any);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Wallet transaction error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Withdrawal management routes
  app.get("/api/withdrawals", verifyAdmin, async (req, res) => {
    try {
      const withdrawals = await storage.getWithdrawalRequests();
      res.json(withdrawals);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/withdrawals/:id", verifyAdmin, async (req: any, res) => {
    try {
      const withdrawal = await storage.updateWithdrawalRequest(
        req.params.id, // Use the ID as string for MongoDB ObjectId
        {
          ...req.body,
          processedBy: req.admin.id,
        }
      );
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }
      res.json(withdrawal);
    } catch (error) {
      console.error("Withdrawal update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });


  // Gift management routes
  app.get("/api/gifts", verifyAdmin, async (req, res) => {
    try {
      const gifts = await storage.getGifts();
      res.json(gifts);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/gifts", verifyAdmin, async (req, res) => {
    try {
      const giftData = insertGiftSchema.parse(req.body);
      const gift = await storage.createGift(giftData);
      res.status(201).json(gift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/gifts/:id", verifyAdmin, async (req, res) => {
    try {
      const gift = await storage.updateGift(req.params.id, req.body);
      if (!gift) {
        return res.status(404).json({ message: "Gift not found" });
      }
      res.json(gift);
    } catch (error) {
      console.error("Update gift error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/gifts/:id", verifyAdmin, async (req, res) => {
    try {
      const success = await storage.deleteGift(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Gift not found" });
      }
      res.json({ message: "Gift deleted successfully" });
    } catch (error) {
      console.error("Delete gift error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/gifts/transactions", verifyAdmin, async (req, res) => {
    try {
      const transactions = await storage.getGiftTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });


  // Report routes
  app.get("/api/reports", verifyAdmin, async (req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/reports/:id", verifyAdmin, async (req: any, res) => {
    try {
      const report = await storage.updateReport(
        parseInt(req.params.id),
        {
          ...req.body,
          processedBy: req.admin.id,
        }
      );
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Profile Picture Approval Management
  app.get("/api/profile-picture-requests", verifyAdmin, async (req, res) => {
    try {
      const pendingRequests = await storage.getPendingProfilePictureRequests();
      res.json(pendingRequests);
    } catch (error: any) {
      console.error("Get profile picture requests error:", error);
      res.status(500).json({ error: "Failed to fetch profile picture requests" });
    }
  });

  app.post("/api/profile-picture-requests/:requestId/approve", verifyAdmin, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const admin = req.admin!;
      
      const result = await storage.approveProfilePictureRequest(requestId, admin.id);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error: any) {
      console.error("Approve profile picture error:", error);
      res.status(500).json({ error: "Failed to approve profile picture" });
    }
  });

  app.post("/api/profile-picture-requests/:requestId/reject", verifyAdmin, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;
      const admin = req.admin!;
      
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      const result = await storage.rejectProfilePictureRequest(requestId, admin.id, reason);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error: any) {
      console.error("Reject profile picture error:", error);
      res.status(500).json({ error: "Failed to reject profile picture" });
    }
  });

  // Get notification counts (specifically for profile approval requests)
  app.get("/api/notifications/count", verifyAdmin, async (req, res) => {
    try {
      const pendingRequests = await storage.getPendingProfilePictureRequests();
      res.json({ 
        profileApprovals: pendingRequests.length,
        total: pendingRequests.length 
      });
    } catch (error: any) {
      console.error("Get notification count error:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  // Payment log routes
  app.get("/api/payment-logs", verifyAdmin, async (req, res) => {
    try {
      const logs = await storage.getPaymentLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Bonus rule routes
  app.get("/api/bonus-rules", verifyAdmin, async (req, res) => {
    try {
      const rules = await storage.getBonusRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/bonus-rules", verifyAdmin, async (req, res) => {
    try {
      const ruleData = insertBonusRuleSchema.parse(req.body);
      const rule = await storage.createBonusRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/bonus-rules/:id", verifyAdmin, async (req, res) => {
    try {
      const rule = await storage.updateBonusRule(parseInt(req.params.id), req.body);
      if (!rule) {
        return res.status(404).json({ message: "Bonus rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/bonus-rules/:id", verifyAdmin, async (req, res) => {
    try {
      const success = await storage.deleteBonusRule(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Bonus rule not found" });
      }
      res.json({ message: "Bonus rule deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Document routes
  app.get("/api/documents", verifyAdmin, async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/documents", verifyAdmin, async (req: any, res) => {
    try {
      // Manual validation for documents to handle MongoDB ObjectIds
      if (!req.body.name || !req.body.type || !req.body.content) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const documentData = {
        name: req.body.name,
        type: req.body.type,
        content: req.body.content,
        version: req.body.version || "1.0",
        updatedBy: req.admin.id,
      };
      
      const document = await storage.createDocument(documentData as any);
      res.status(201).json(document);
    } catch (error) {
      console.error("Document creation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/documents/:id", verifyAdmin, async (req: any, res) => {
    try {
      const document = await storage.updateDocument(
        parseInt(req.params.id),
        {
          ...req.body,
          updatedBy: req.admin.id,
        }
      );
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/documents/:id", verifyAdmin, async (req, res) => {
    try {
      const success = await storage.deleteDocument(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // User Profile Block Management APIs
  
  // Block a user profile
  app.post("/api/users/:userId/block", verifyAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).admin.id;

      console.log('Admin blocking - userId:', userId, 'adminId:', adminId);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isBlocked) {
        return res.status(400).json({ message: "User is already blocked" });
      }

      // Block the user
      await storage.blockUser(adminId, userId, reason || "Blocked by admin");
      
      // Update Firebase to sync blocked status
      await updateUserInFirestore(userId, { isBlocked: true });

      // Log the action
      console.log(`Admin ${adminId} blocked user ${userId}. Reason: ${reason || "No reason provided"}`);

      res.json({
        success: true,
        message: "User blocked successfully",
        userId,
        blockedAt: new Date().toISOString(),
        reason: reason || "Blocked by admin"
      });

    } catch (error: any) {
      console.error("Block user error:", error);
      res.status(500).json({ message: "Failed to block user", error: error.message });
    }
  });

  // Unblock a user profile
  app.post("/api/users/:userId/unblock", verifyAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.admin.id;

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.isBlocked) {
        return res.status(400).json({ message: "User is not blocked" });
      }

      // Unblock the user
      await storage.unblockUser(userId);
      
      // Update Firebase to sync unblocked status
      await updateUserInFirestore(userId, { isBlocked: false });

      // Log the action
      console.log(`Admin ${adminId} unblocked user ${userId}`);

      res.json({
        success: true,
        message: "User unblocked successfully",
        userId,
        unblockedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Unblock user error:", error);
      res.status(500).json({ message: "Failed to unblock user", error: error.message });
    }
  });

  // Get list of blocked users
  app.get("/api/users/blocked", verifyAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const blockedUsers = await storage.getBlockedUsers(page, limit);
      
      res.json({
        success: true,
        data: blockedUsers.users,
        pagination: {
          page,
          limit,
          total: blockedUsers.total,
          totalPages: Math.ceil(blockedUsers.total / limit),
          hasMore: page * limit < blockedUsers.total
        }
      });

    } catch (error: any) {
      console.error("Get blocked users error:", error);
      res.status(500).json({ message: "Failed to fetch blocked users", error: error.message });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard", verifyAdmin, async (req, res) => {
    try {
      const { type = "gifter", period = "monthly" } = req.query;
      const leaderboard = await storage.getLeaderboard(type as string, period as string);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Cashfree Environment Management
  app.get("/api/system/cashfree-status", verifyAdmin, async (req, res) => {
    try {
      const currentEnvironment = process.env.CASHFREE_ENVIRONMENT || 'production';
      const isProduction = currentEnvironment === 'production';
      
      const status = {
        environment: currentEnvironment,
        isProduction,
        credentials: {
          production: {
            appId: process.env.CASHFREE_APP_ID,
            hasSecretKey: !!process.env.CASHFREE_SECRET_KEY,
            apiUrl: 'https://api.cashfree.com'
          },
          sandbox: {
            appId: 'TEST10729899d689890fed5ed40670e099892701',
            hasSecretKey: true,
            apiUrl: 'https://sandbox.cashfree.com'
          }
        },
        switchInstructions: {
          toSandbox: "Set CASHFREE_ENVIRONMENT=sandbox and restart the application",
          toProduction: "Set CASHFREE_ENVIRONMENT=production and restart the application",
          note: "Environment changes require application restart to take effect"
        }
      };
      
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/system/switch-cashfree-environment", verifyAdmin, async (req, res) => {
    try {
      const { environment } = req.body;
      
      if (!environment || !['production', 'sandbox'].includes(environment)) {
        return res.status(400).json({ 
          message: "Invalid environment. Must be 'production' or 'sandbox'" 
        });
      }
      
      // Note: In a real environment switcher, you would update environment variables
      // For now, we provide instructions
      res.json({
        message: `To switch to ${environment} environment:`,
        instructions: [
          `1. Set environment variable: CASHFREE_ENVIRONMENT=${environment}`,
          `2. Restart the application`,
          `3. Verify the switch using GET /api/system/cashfree-status`
        ],
        currentEnvironment: process.env.CASHFREE_ENVIRONMENT || 'production',
        requestedEnvironment: environment,
        note: "Environment changes require application restart. Use the terminal or restart workflow."
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Call Configuration endpoints
  app.get("/api/call-config", verifyAdmin, async (req, res) => {
    try {
      // Get configuration from storage or return defaults
      const config = await storage.getCallConfig() || {
        videoCallCoinsPerMin: 10,
        audioCallCoinsPerMin: 5,
        gStarAudioCoinsPerMin: 8,
        gStarVideoCoinsPerMin: 15,
        messageCoins: 1,
        adminCommissionPercent: 20,
        gstarAdminCommission: 15,
        giconAdminCommission: 10,
        coinToRupeeRatio: 10
      };
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching call config:", error);
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.put("/api/call-config", verifyAdmin, async (req, res) => {
    try {
      const configSchema = z.object({
        videoCallCoinsPerMin: z.number().min(0),
        audioCallCoinsPerMin: z.number().min(0),
        gStarAudioCoinsPerMin: z.number().min(0),
        gStarVideoCoinsPerMin: z.number().min(0),
        messageCoins: z.number().min(0),
        adminCommissionPercent: z.number().min(0).max(100),
        gstarAdminCommission: z.number().min(0).max(100),
        giconAdminCommission: z.number().min(0).max(100),
        coinToRupeeRatio: z.number().min(1).max(1000)
      });

      const config = configSchema.parse(req.body);
      
      // Update configuration in storage
      const updatedConfig = await storage.updateCallConfig(config);
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating call config:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  // Coin Packages Management Routes
  app.get("/api/coin-packages", verifyAdmin, async (req, res) => {
    try {
      const packages = await storage.getCoinPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching coin packages:", error);
      res.status(500).json({ message: "Failed to fetch coin packages" });
    }
  });

  app.get("/api/coin-packages/:id", verifyAdmin, async (req, res) => {
    try {
      const coinPackage = await storage.getCoinPackage(parseInt(req.params.id));
      if (!coinPackage) {
        return res.status(404).json({ message: "Coin package not found" });
      }
      res.json(coinPackage);
    } catch (error) {
      console.error("Error fetching coin package:", error);
      res.status(500).json({ message: "Failed to fetch coin package" });
    }
  });

  app.post("/api/coin-packages", verifyAdmin, async (req, res) => {
    try {
      const packageSchema = z.object({
        name: z.string().min(1),
        coinAmount: z.number().min(1),
        price: z.string().min(1),
        discount: z.number().min(0).max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().default(true)
      });

      const packageData = packageSchema.parse(req.body);
      const newPackage = await storage.createCoinPackage(packageData);
      
      res.status(201).json(newPackage);
    } catch (error) {
      console.error("Error creating coin package:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create coin package" });
    }
  });

  app.patch("/api/coin-packages/:id", verifyAdmin, async (req, res) => {
    try {
      const packageSchema = z.object({
        name: z.string().min(1).optional(),
        coinAmount: z.number().min(1).optional(),
        price: z.string().min(1).optional(),
        discount: z.number().min(0).max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional()
      });

      const packageData = packageSchema.parse(req.body);
      const updatedPackage = await storage.updateCoinPackage(req.params.id, packageData);
      
      if (!updatedPackage) {
        return res.status(404).json({ message: "Coin package not found" });
      }
      
      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating coin package:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update coin package" });
    }
  });

  app.delete("/api/coin-packages/:id", verifyAdmin, async (req, res) => {
    try {
      const success = await storage.deleteCoinPackage(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Coin package not found" });
      }
      res.json({ message: "Coin package deleted successfully" });
    } catch (error) {
      console.error("Error deleting coin package:", error);
      res.status(500).json({ message: "Failed to delete coin package" });
    }
  });

  // Call Transactions Management Routes
  app.get("/api/call-transactions", verifyAdmin, async (req, res) => {
    try {
      const transactions = await storage.getCallTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching call transactions:", error);
      res.status(500).json({ message: "Failed to fetch call transactions" });
    }
  });

  app.get("/api/call-transactions/stats", verifyAdmin, async (req, res) => {
    try {
      const stats = await storage.getCallTransactionStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching call transaction stats:", error);
      res.status(500).json({ message: "Failed to fetch call transaction stats" });
    }
  });

  // Clear demo call transactions and reset to real transactions only
  app.delete("/api/call-transactions/demo", verifyAdmin, async (req, res) => {
    try {
      await storage.clearDemoCallTransactions();
      res.json({ message: "Demo call transactions cleared successfully. Only real call transactions will now be shown." });
    } catch (error) {
      console.error("Error clearing demo call transactions:", error);
      res.status(500).json({ message: "Failed to clear demo call transactions" });
    }
  });

  // Banner management routes
  app.get("/api/banners", verifyAdmin, async (req, res) => {
    try {
      const banners = await storage.getBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/banners", verifyAdmin, async (req, res) => {
    try {
      const bannerData = insertBannerSchema.parse(req.body);
      const banner = await storage.createBanner(bannerData);
      res.status(201).json(banner);
    } catch (error) {
      console.error("Banner creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/banners/:id", verifyAdmin, async (req, res) => {
    try {
      const banner = await storage.updateBanner(req.params.id, req.body);
      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(banner);
    } catch (error) {
      console.error("Banner update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/banners/:id", verifyAdmin, async (req, res) => {
    try {
      const success = await storage.deleteBanner(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json({ message: "Banner deleted successfully" });
    } catch (error) {
      console.error("Banner deletion error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
