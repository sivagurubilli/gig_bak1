import {
  admins, users, wallets, walletTransactions, withdrawalRequests, coinPackages,
  gifts, giftTransactions, reports, paymentLogs, bonusRules,
  documents, leaderboard, banners,
  type Admin, type InsertAdmin, type User, type InsertUser, type Wallet,
  type WalletTransaction, type InsertWalletTransaction, type WithdrawalRequest,
  type InsertWithdrawalRequest, type CoinPackage, type InsertCoinPackage,
  type Gift, type InsertGift, type GiftTransaction,
  type Report, type InsertReport, type PaymentLog,
  type BonusRule, type InsertBonusRule, type Document, type InsertDocument,
  type LeaderboardEntry, type Banner, type InsertBanner
} from "@shared/schema";

export interface IStorage {
  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number | string): Promise<User | undefined>;
  getUserById(id: number | string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number | string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string | number): Promise<boolean>;
  blockUser(id: string | number): Promise<boolean>;
  unblockUser(id: string | number): Promise<boolean>;
  searchUsers(query: string): Promise<User[]>;
  
  // Wallet operations
  getWallet(userId: number): Promise<Wallet | undefined>;
  getWalletByUserId(userId: number | string): Promise<Wallet | undefined>;
  createWallet(userId: number): Promise<Wallet>;
  updateWalletBalance(userId: number | string, amount: number, transaction?: any): Promise<void>;
  getWalletTransactions(userId?: number): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  updateWalletTransaction(id: number, updates: Partial<WalletTransaction>): Promise<WalletTransaction | undefined>;
  
  // Withdrawal operations
  getWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined>;
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  updateWithdrawalRequest(id: number, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined>;
  
  // Coin package operations
  getCoinPackages(): Promise<CoinPackage[]>;
  getCoinPackage(id: number | string): Promise<CoinPackage | undefined>;
  createCoinPackage(packageData: InsertCoinPackage): Promise<CoinPackage>;
  updateCoinPackage(id: number, updates: Partial<CoinPackage>): Promise<CoinPackage | undefined>;
  deleteCoinPackage(id: string | number): Promise<boolean>;
  
  // Gift operations
  getGifts(): Promise<Gift[]>;
  getGift(id: number | string): Promise<Gift | undefined>;
  createGift(gift: InsertGift): Promise<Gift>;
  updateGift(id: string | number, updates: Partial<Gift>): Promise<Gift | undefined>;
  deleteGift(id: string | number): Promise<boolean>;
  getGiftTransactions(): Promise<GiftTransaction[]>;
  
  
  // Report operations
  getReports(): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  updateReport(id: number, updates: Partial<Report>): Promise<Report | undefined>;
  
  // Payment log operations
  getPaymentLogs(): Promise<PaymentLog[]>;
  
  // Bonus rule operations
  getBonusRules(): Promise<BonusRule[]>;
  getBonusRule(id: number): Promise<BonusRule | undefined>;
  createBonusRule(rule: InsertBonusRule): Promise<BonusRule>;
  updateBonusRule(id: number, updates: Partial<BonusRule>): Promise<BonusRule | undefined>;
  deleteBonusRule(id: number): Promise<boolean>;
  
  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Leaderboard operations
  getLeaderboard(type: string, period: string): Promise<LeaderboardEntry[]>;
  
  // Banner operations
  getBanners(): Promise<Banner[]>;
  getBanner(id: number | string): Promise<Banner | undefined>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: number | string, updates: Partial<Banner>): Promise<Banner | undefined>;
  deleteBanner(id: number | string): Promise<boolean>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalRevenue: string;
    activeSessions: number;
    pendingWithdrawals: number;
  }>;

  // Call transactions management
  getCallTransactions(): Promise<any[]>;
  getCallTransactionStats(): Promise<any>;
  clearDemoCallTransactions(): Promise<void>;
  
  // Gift-Call integration
  getGiftTransactionsByCallId(callId: string): Promise<any[]>;

  // Profile picture approval system
  createProfilePictureRequest(data: {
    userId: string;
    imageUrl: string;
    userDetails: {
      name: string;
      username: string;
      email?: string;
      gender: string;
    };
  }): Promise<{ id: string; status: string; submittedAt: Date }>;
  
  hasUserPendingProfilePictureRequest(userId: string): Promise<boolean>;
  
  getPendingProfilePictureRequests(): Promise<Array<{
    id: string;
    userId: string;
    imageUrl: string;
    status: string;
    submittedAt: Date;
    userDetails: {
      name: string;
      username: string;
      email?: string;
      gender: string;
    };
  }>>;

  getAllProfilePictureRequests(): Promise<Array<{
    id: string;
    userId: string;
    imageUrl: string;
    status: string;
    submittedAt: Date;
    userDetails: {
      name: string;
      username: string;
      email?: string;
      gender: string;
    };
  }>>;

  approveProfilePictureRequest(requestId: string, adminId: string): Promise<{ success: boolean; message: string }>;
  
  rejectProfilePictureRequest(requestId: string, adminId: string, reason: string): Promise<{ success: boolean; message: string }>;

  // User blocking and reporting
  // blockUser(blockerId: string, blockedUserId: string, reason?: string): Promise<any>;
  // unblockUser(blockerId: string, blockedUserId: string): Promise<void>;
  getBlockedUsers(userId: string, page?: number, limit?: number): Promise<{ users: any[], pagination: any }>;
  isUserBlocked(blockerId: string, blockedUserId: string): Promise<boolean>;
  
  reportUser(reporterId: string, reportedUserId: string, reportData: any): Promise<any>;
  getUserReports(userId: string, page?: number, limit?: number): Promise<{ reports: any[], pagination: any }>;
  getReportById(reportId: string): Promise<any>;
  
  // Admin report management
  getAllReports(filters?: any, page?: number, limit?: number): Promise<{ reports: any[], pagination: any }>;
  updateReportStatus(reportId: string, status: string, adminId: string, adminNotes?: string): Promise<any>;

  // Follow/Following system
  followUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }>;
  unfollowUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string, page?: number, limit?: number): Promise<{ followers: any[], pagination: any }>;
  getFollowing(userId: string, page?: number, limit?: number): Promise<{ following: any[], pagination: any }>;
  getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }>;
  getMutualFollows(userId1: string, userId2: string): Promise<any[]>;
  getSuggestedUsers(userId: string, limit?: number): Promise<any[]>;
  searchUsersToFollow(userId: string, query: string, limit?: number): Promise<any[]>;
  getFollowRequests(userId: string): Promise<any[]>; // For future private account functionality
}

export class MemStorage implements IStorage {
  private admins: Map<number, Admin> = new Map();
  private users: Map<number, User> = new Map();
  private wallets: Map<number, Wallet> = new Map();
  private walletTransactions: Map<number, WalletTransaction> = new Map();
  private withdrawalRequests: Map<number, WithdrawalRequest> = new Map();
  private coinPackages: Map<number, CoinPackage> = new Map();
  private gifts: Map<number, Gift> = new Map();
  private giftTransactions: Map<number, GiftTransaction> = new Map();
  private reports: Map<number, Report> = new Map();
  private paymentLogs: Map<number, PaymentLog> = new Map();
  private bonusRules: Map<number, BonusRule> = new Map();
  private documents: Map<number, Document> = new Map();
  private leaderboard: Map<number, LeaderboardEntry> = new Map();
  private banners: Map<number, Banner> = new Map();
  
  private currentAdminId = 1;
  private currentUserId = 1;
  private currentWalletId = 1;
  private currentTransactionId = 1;
  private currentWithdrawalId = 1;
  private currentPackageId = 1;
  private currentGiftId = 1;
  private currentGiftTransactionId = 1;
  private currentReportId = 1;
  private currentPaymentId = 1;
  private currentBonusId = 1;
  private currentDocumentId = 1;
  private currentLeaderboardId = 1;
  private currentBannerId = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default admin
    const defaultAdmin: Admin = {
      id: this.currentAdminId++,
      username: "admin",
      password: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123', // Use environment variable
      name: "Admin User",
      role: "super_admin",
      createdAt: new Date(),
    };
    this.admins.set(defaultAdmin.id, defaultAdmin);

    // Create some sample users
    const sampleUsers: User[] = [
      {
        id: this.currentUserId++,
        username: "sarah_johnson",
        email: "sarah@example.com",
        name: "Sarah Johnson",
        gender: "female",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        isBlocked: false,
        profileType: "gicon",
        badgeLevel: 3,
        isOnline: true,
        lastActive: new Date(),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: this.currentUserId++,
        username: "mike_chen",
        email: "mike@example.com",
        name: "Mike Chen",
        gender: "male",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        isBlocked: false,
        profileType: "gstar",
        badgeLevel: 2,
        isOnline: true,
        lastActive: new Date(),
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      },
      {
        id: this.currentUserId++,
        username: "emma_davis",
        email: "emma@example.com",
        name: "Emma Davis",
        gender: "female",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        isBlocked: false,
        profileType: "both",
        badgeLevel: 5,
        isOnline: false,
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ];
    
    sampleUsers.forEach(user => this.users.set(user.id, user));

    // Create sample coin packages
    const samplePackages: CoinPackage[] = [
      {
        id: this.currentPackageId++,
        name: "Starter Pack",
        coinCount: 100,
        price: "399.00",
        offerDetails: "Best for beginners",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: this.currentPackageId++,
        name: "Popular Pack",
        coinCount: 500,
        price: "1599.00",
        offerDetails: "Most popular choice",
        isActive: true,
        createdAt: new Date(),
      },
    ];
    
    samplePackages.forEach(pkg => this.coinPackages.set(pkg.id, pkg));

    // Create sample gifts
    const sampleGifts: Gift[] = [
      {
        id: this.currentGiftId++,
        name: "Rose",
        image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        coinValue: 10,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: this.currentGiftId++,
        name: "Diamond",
        image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        coinValue: 100,
        isActive: true,
        createdAt: new Date(),
      },
    ];
    
    sampleGifts.forEach(gift => this.gifts.set(gift.id, gift));
  }

  // Admin operations
  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.admins.get(id);
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    return Array.from(this.admins.values()).find(admin => admin.username === username);
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const newAdmin: Admin = {
      ...admin,
      id: this.currentAdminId++,
      createdAt: new Date(),
      role: admin.role ?? "admin",
    };
    this.admins.set(newAdmin.id, newAdmin);
    return newAdmin;
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    // Check for duplicate name
    if (user.name) {
      const existingUser = Array.from(this.users.values()).find(u => u.name === user.name);
      if (existingUser) {
        throw new Error(`User with name '${user.name}' already exists`);
      }
    }

    const newUser: User = {
      ...user,
      id: this.currentUserId++,
      createdAt: new Date(),
      avatar: user.avatar ?? null,
      isBlocked: user.isBlocked ?? false,
      profileType: user.profileType ?? "basic",
      badgeLevel: user.badgeLevel ?? 1,
      isOnline: user.isOnline ?? false,
      lastActive: user.lastActive ?? null,
    };
    this.users.set(newUser.id, newUser);
    
    // Create wallet for new user
    await this.createWallet(newUser.id);
    
    return newUser;
  }

  async updateUser(id: number | string, updates: Partial<User>): Promise<User | undefined> {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    const user = this.users.get(numericId);
    if (!user) return undefined;
    
    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== user.name) {
      const existingUser = Array.from(this.users.values()).find(u => u.name === updates.name && u.id !== numericId);
      if (existingUser) {
        throw new Error(`User with name '${updates.name}' already exists`);
      }
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(numericId, updatedUser);
    return updatedUser;
  }

  async blockUser(id: string | number): Promise<boolean> {
    const userId = typeof id === 'string' ? parseInt(id) : id;
    const user = this.users.get(userId);
    if (!user) return false;
    
    user.isBlocked = true;
    this.users.set(userId, user);
    return true;
  }

  async unblockUser(id: string | number): Promise<boolean> {
    const userId = typeof id === 'string' ? parseInt(id) : id;
    const user = this.users.get(userId);
    if (!user) return false;
    
    user.isBlocked = false;
    this.users.set(userId, user);
    return true;
  }

  async deleteUser(id: string | number): Promise<boolean> {
    const userId = typeof id === 'string' ? parseInt(id) : id;
    const user = this.users.get(userId);
    if (!user) return false;
    
    // Delete user's wallet
    const wallet = Array.from(this.wallets.values()).find(w => w.userId === userId);
    if (wallet) {
      this.wallets.delete(wallet.id);
    }
    
    // Delete user's wallet transactions
    Array.from(this.walletTransactions.entries()).forEach(([id, transaction]) => {
      if (transaction.userId === userId) {
        this.walletTransactions.delete(id);
      }
    });
    
    // Delete user's withdrawal requests
    Array.from(this.withdrawalRequests.entries()).forEach(([id, request]) => {
      if (request.userId === userId) {
        this.withdrawalRequests.delete(id);
      }
    });
    
    // Delete user's gift transactions
    Array.from(this.giftTransactions.entries()).forEach(([id, transaction]) => {
      if (transaction.senderId === userId || transaction.receiverId === userId) {
        this.giftTransactions.delete(id);
      }
    });
    
    // Delete the user
    this.users.delete(userId);
    return true;
  }

  async searchUsers(query: string): Promise<User[]> {
    const users = Array.from(this.users.values());
    return users.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Wallet operations
  async getWallet(userId: number): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(wallet => wallet.userId === userId);
  }

  async createWallet(userId: number): Promise<Wallet> {
    const wallet: Wallet = {
      id: this.currentWalletId++,
      userId,
      coinBalance: 0,
      totalEarned: "0.00",
      totalSpent: "0.00",
      updatedAt: new Date(),
    };
    this.wallets.set(wallet.id, wallet);
    return wallet;
  }

  async updateWalletBalance(userId: number, amount: number): Promise<void> {
    const wallet = Array.from(this.wallets.values()).find(w => w.userId === userId);
    if (wallet) {
      wallet.coinBalance += amount;
      wallet.updatedAt = new Date();
      this.wallets.set(wallet.id, wallet);
    }
  }

  async getWalletTransactions(userId?: number): Promise<WalletTransaction[]> {
    const transactions = Array.from(this.walletTransactions.values());
    return userId ? transactions.filter(t => t.userId === userId) : transactions;
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const newTransaction: WalletTransaction = {
      ...transaction,
      id: this.currentTransactionId++,
      createdAt: new Date(),
      adminId: transaction.adminId || null,
    };
    this.walletTransactions.set(newTransaction.id, newTransaction);
    
    // Update wallet balance
    await this.updateWalletBalance(transaction.userId, 
      transaction.type === 'credit' ? transaction.amount : -transaction.amount
    );
    
    return newTransaction;
  }

  // Withdrawal operations
  async getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return Array.from(this.withdrawalRequests.values());
  }

  async getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined> {
    return this.withdrawalRequests.get(id);
  }

  async createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const newRequest: WithdrawalRequest = {
      ...request,
      id: this.currentWithdrawalId++,
      createdAt: new Date(),
      processedAt: null,
      status: request.status || "pending",
      remarks: request.remarks || null,
      processedBy: request.processedBy || null,
    };
    this.withdrawalRequests.set(newRequest.id, newRequest);
    return newRequest;
  }

  async updateWithdrawalRequest(id: number, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined> {
    const request = this.withdrawalRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { 
      ...request, 
      ...updates,
      processedAt: updates.status && updates.status !== 'pending' ? new Date() : request.processedAt
    };
    this.withdrawalRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Coin package operations
  async getCoinPackages(): Promise<CoinPackage[]> {
    return Array.from(this.coinPackages.values());
  }

  async getCoinPackage(id: number): Promise<CoinPackage | undefined> {
    return this.coinPackages.get(id);
  }

  async createCoinPackage(packageData: InsertCoinPackage): Promise<CoinPackage> {
    const newPackage: CoinPackage = {
      ...packageData,
      id: this.currentPackageId++,
      createdAt: new Date(),
      isActive: packageData.isActive ?? true,
      offerDetails: packageData.offerDetails ?? null,
    };
    this.coinPackages.set(newPackage.id, newPackage);
    return newPackage;
  }

  async updateCoinPackage(id: number, updates: Partial<CoinPackage>): Promise<CoinPackage | undefined> {
    const coinPackage = this.coinPackages.get(id);
    if (!coinPackage) return undefined;
    
    const updatedPackage = { ...coinPackage, ...updates };
    this.coinPackages.set(id, updatedPackage);
    return updatedPackage;
  }

  async deleteCoinPackage(id: number): Promise<boolean> {
    return this.coinPackages.delete(id);
  }

  // Gift operations
  async getGifts(): Promise<Gift[]> {
    return Array.from(this.gifts.values());
  }

  async getGift(id: number): Promise<Gift | undefined> {
    return this.gifts.get(id);
  }

  async createGift(gift: InsertGift): Promise<Gift> {
    const newGift: Gift = {
      ...gift,
      id: this.currentGiftId++,
      createdAt: new Date(),
      isActive: gift.isActive ?? true,
    };
    this.gifts.set(newGift.id, newGift);
    return newGift;
  }

  async updateGift(id: number, updates: Partial<Gift>): Promise<Gift | undefined> {
    const gift = this.gifts.get(id);
    if (!gift) return undefined;
    
    const updatedGift = { ...gift, ...updates };
    this.gifts.set(id, updatedGift);
    return updatedGift;
  }

  async deleteGift(id: number): Promise<boolean> {
    return this.gifts.delete(id);
  }

  async getGiftTransactions(): Promise<GiftTransaction[]> {
    return Array.from(this.giftTransactions.values());
  }


  // Report operations
  async getReports(): Promise<Report[]> {
    return Array.from(this.reports.values());
  }

  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async updateReport(id: number, updates: Partial<Report>): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;
    
    const updatedReport = { 
      ...report, 
      ...updates,
      processedAt: updates.status && updates.status !== 'pending' ? new Date() : report.processedAt
    };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  // Payment log operations
  async getPaymentLogs(): Promise<PaymentLog[]> {
    return Array.from(this.paymentLogs.values());
  }

  // Bonus rule operations
  async getBonusRules(): Promise<BonusRule[]> {
    return Array.from(this.bonusRules.values());
  }

  async getBonusRule(id: number): Promise<BonusRule | undefined> {
    return this.bonusRules.get(id);
  }

  async createBonusRule(rule: InsertBonusRule): Promise<BonusRule> {
    const newRule: BonusRule = {
      ...rule,
      id: this.currentBonusId++,
      createdAt: new Date(),
      isActive: rule.isActive ?? true,
    };
    this.bonusRules.set(newRule.id, newRule);
    return newRule;
  }

  async updateBonusRule(id: number, updates: Partial<BonusRule>): Promise<BonusRule | undefined> {
    const rule = this.bonusRules.get(id);
    if (!rule) return undefined;
    
    const updatedRule = { ...rule, ...updates };
    this.bonusRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteBonusRule(id: number): Promise<boolean> {
    return this.bonusRules.delete(id);
  }

  // Document operations
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const newDocument: Document = {
      ...document,
      id: this.currentDocumentId++,
      updatedAt: new Date(),
      version: document.version || "1.0",
    };
    this.documents.set(newDocument.id, newDocument);
    return newDocument;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...updates, updatedAt: new Date() };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Leaderboard operations
  async getLeaderboard(type: string, period: string): Promise<LeaderboardEntry[]> {
    return Array.from(this.leaderboard.values())
      .filter(entry => entry.type === type && entry.period === period)
      .sort((a, b) => a.rank - b.rank);
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalRevenue: string;
    activeSessions: number;
    pendingWithdrawals: number;
  }> {
    const totalUsers = this.users.size;
    const activeSessions = Array.from(this.users.values()).filter(u => u.isOnline).length;
    const pendingWithdrawals = Array.from(this.withdrawalRequests.values())
      .filter(r => r.status === 'pending').length;
    
    // Calculate total revenue from payment logs
    const totalRevenue = Array.from(this.paymentLogs.values())
      .filter(log => log.status === 'success')
      .reduce((sum, log) => sum + parseFloat(log.amount), 0)
      .toFixed(2);

    return {
      totalUsers,
      totalRevenue,
      activeSessions,
      pendingWithdrawals,
    };
  }

  // Follow/Following system stub methods (for MemStorage compatibility)
  async followUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Follow functionality not implemented in MemStorage" };
  }

  async unfollowUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Unfollow functionality not implemented in MemStorage" };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return false;
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<{ followers: any[], pagination: any }> {
    return { 
      followers: [], 
      pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } 
    };
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<{ following: any[], pagination: any }> {
    return { 
      following: [], 
      pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } 
    };
  }

  async getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    return { followersCount: 0, followingCount: 0 };
  }

  async getMutualFollows(userId1: string, userId2: string): Promise<any[]> {
    return [];
  }

  async getSuggestedUsers(userId: string, limit: number = 10): Promise<any[]> {
    return [];
  }

  async searchUsersToFollow(userId: string, query: string, limit: number = 20): Promise<any[]> {
    return [];
  }

  async getFollowRequests(userId: string): Promise<any[]> {
    return [];
  }

  // Placeholder implementations for missing methods
  async getCallTransactions(): Promise<any[]> {
    return [];
  }

  async getCallTransactionStats(): Promise<any> {
    return { totalCalls: 0, totalRevenue: 0 };
  }

  async clearDemoCallTransactions(): Promise<void> {
    // No-op for MemStorage
  }

  async getGiftTransactionsByCallId(callId: string): Promise<any[]> {
    return [];
  }

  async createProfilePictureRequest(data: {
    userId: string;
    imageUrl: string;
    userDetails: {
      name: string;
      username: string;
      email?: string;
      gender: string;
    };
  }): Promise<{ id: string; status: string; submittedAt: Date }> {
    return { 
      id: Date.now().toString(), 
      status: 'pending', 
      submittedAt: new Date() 
    };
  }

  async hasUserPendingProfilePictureRequest(userId: string): Promise<boolean> {
    return false;
  }

  async getPendingProfilePictureRequests(): Promise<Array<any>> {
    return [];
  }

  async getAllProfilePictureRequests(): Promise<Array<any>> {
    return [];
  }

  async approveProfilePictureRequest(requestId: string, adminId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Not implemented in MemStorage" };
  }

  async rejectProfilePictureRequest(requestId: string, adminId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Not implemented in MemStorage" };
  }

  async getBlockedUsers(userId: string, page?: number, limit?: number): Promise<{ users: any[], pagination: any }> {
    return { users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  }

  async isUserBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    return false;
  }

  async reportUser(reporterId: string, reportedUserId: string, reportData: any): Promise<any> {
    return { id: Date.now().toString(), status: 'pending' };
  }

  async getUserReports(userId: string, page?: number, limit?: number): Promise<{ reports: any[], pagination: any }> {
    return { reports: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  }

  async getReportById(reportId: string): Promise<any> {
    return null;
  }

  async getAllReports(filters?: any, page?: number, limit?: number): Promise<{ reports: any[], pagination: any }> {
    return { reports: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  }

  async updateReportStatus(reportId: string, status: string, adminId: string, adminNotes?: string): Promise<any> {
    return { success: false, message: "Not implemented in MemStorage" };
  }

  // Banner operations
  async getBanners(): Promise<Banner[]> {
    return Array.from(this.banners.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getBanner(id: number | string): Promise<Banner | undefined> {
    return this.banners.get(Number(id));
  }

  async createBanner(bannerData: InsertBanner): Promise<Banner> {
    const newBanner: Banner = {
      ...bannerData,
      id: this.currentBannerId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.banners.set(newBanner.id, newBanner);
    return newBanner;
  }

  async updateBanner(id: number | string, updates: Partial<Banner>): Promise<Banner | undefined> {
    const banner = this.banners.get(Number(id));
    if (!banner) return undefined;
    
    const updatedBanner = { 
      ...banner, 
      ...updates, 
      id: banner.id,
      updatedAt: new Date()
    };
    this.banners.set(Number(id), updatedBanner);
    return updatedBanner;
  }

  async deleteBanner(id: number | string): Promise<boolean> {
    return this.banners.delete(Number(id));
  }
}

export const storage = new MemStorage();
