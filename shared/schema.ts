import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin Users
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// App Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().unique(),
  gender: text("gender").notNull(), // 'male' | 'female'
  avatar: text("avatar"),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  profileType: text("profile_type").default("basic").notNull(), // 'basic' | 'gicon' | 'gstar' | 'both'
  badgeLevel: integer("badge_level").default(1).notNull(), // Level assigned by admin
  language: text("language").default("en").notNull(), // User's preferred language
  dob: timestamp("dob"), // Date of birth
  interests: text("interests").array(), // Array of user interests
  aboutMe: text("about_me"), // User's about me description
  isOnline: boolean("is_online").default(false).notNull(),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Wallet
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  coinBalance: integer("coin_balance").default(0).notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet Transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'credit' | 'debit'
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  status: text("status").default("completed").notNull(), // 'completed' | 'pending' | 'failed'
  transactionId: text("transaction_id"),
  adminId: integer("admin_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Withdrawal Requests
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  coinAmount: integer("coin_amount").notNull(), // Original coin amount requested for withdrawal
  rupeeAmount: text("rupee_amount").notNull(), // Converted rupee amount (coinAmount / 10)
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  accountType: text("account_type"), // 'bank' | 'upi' | 'paytm'
  accountDetails: text("account_details"), // JSON string of account details
  remarks: text("remarks"),
  processedBy: integer("processed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// Coin Packages
export const coinPackages = pgTable("coin_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  coinAmount: integer("coin_amount").notNull(), // Changed from coinCount to coinAmount
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"), // Added description field
  discount: integer("discount").default(0), // Added discount field
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Gifts
export const gifts = pgTable("gifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  coinValue: integer("coin_value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Gift Transactions
export const giftTransactions = pgTable("gift_transactions", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  giftId: integer("gift_id").notNull(),
  coinValue: integer("coin_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  reportedUserId: integer("reported_user_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // 'pending' | 'resolved' | 'dismissed'
  action: text("action"), // 'warning' | 'suspension' | 'permanent_block'
  processedBy: integer("processed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// Payment Logs
export const paymentLogs = pgTable("payment_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  packageId: integer("package_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // 'success' | 'pending' | 'failed'
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bonus Rules
export const bonusRules = pgTable("bonus_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'daily_login' | 'online_time' | 'first_purchase'
  coinReward: integer("coin_reward").notNull(),
  conditions: jsonb("conditions").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'nda' | 'terms' | 'scope'
  content: text("content").notNull(),
  version: text("version").notNull().default("1.0"),
  updatedBy: integer("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leaderboard
export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'gifter' | 'earner'
  period: text("period").notNull(), // 'weekly' | 'monthly' | 'yearly'
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  rank: integer("rank").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
});

// Banners
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertCoinPackageSchema = createInsertSchema(coinPackages).omit({
  id: true,
  createdAt: true,
});

export const insertGiftSchema = createInsertSchema(gifts).omit({
  id: true,
  createdAt: true,
});


export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertBonusRuleSchema = createInsertSchema(bonusRules).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  updatedAt: true,
});

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Wallet = typeof wallets.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;

export type CoinPackage = typeof coinPackages.$inferSelect;
export type InsertCoinPackage = z.infer<typeof insertCoinPackageSchema>;

export type Gift = typeof gifts.$inferSelect;
export type InsertGift = z.infer<typeof insertGiftSchema>;

export type GiftTransaction = typeof giftTransactions.$inferSelect;


export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type PaymentLog = typeof paymentLogs.$inferSelect;

export type BonusRule = typeof bonusRules.$inferSelect;
export type InsertBonusRule = z.infer<typeof insertBonusRuleSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type LeaderboardEntry = typeof leaderboard.$inferSelect;

export type Banner = typeof banners.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
