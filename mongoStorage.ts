import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { IStorage } from './storage';
import { Admin, IAdmin } from './models/Admin';
import { User, IUser } from './models/User';
import { Wallet, IWallet } from './models/Wallet';
import { WalletTransaction, IWalletTransaction } from './models/WalletTransaction';
import { WithdrawalRequest, IWithdrawalRequest } from './models/WithdrawalRequest';
import { CoinPackage, ICoinPackage } from './models/CoinPackage';
import { Gift, IGift } from './models/Gift';
import { GiftTransaction, IGiftTransaction } from './models/GiftTransaction';
import { Notification, INotification } from './models/Notification';
import { Report, IReport } from './models/Report';
import { PaymentLog, IPaymentLog } from './models/PaymentLog';
import { BonusRule, IBonusRule } from './models/BonusRule';
import { DocumentModel, IDocument } from './models/Document';
import { LeaderboardEntry, ILeaderboardEntry } from './models/LeaderboardEntry';
import { CallConfig, ICallConfig } from './models/CallConfig';
import CallSession from './models/CallSession';
import { MissedCall } from './models/MissedCall';
import { CallRating } from './models/CallRating';
import UserBlock from './models/UserBlock';
import UserReport from './models/UserReport';
import { FirestoreService } from './firebase';
import { ProfilePictureRequest, IProfilePictureRequest } from './models/ProfilePictureRequest';
import { Follow, IFollow } from './models/Follow';
import { Banner, IBanner } from './models/Banner';
import type {
  Admin as AdminType, InsertAdmin,
  User as UserType, InsertUser,
  Wallet as WalletType,
  WalletTransaction as WalletTransactionType, InsertWalletTransaction,
  WithdrawalRequest as WithdrawalRequestType, InsertWithdrawalRequest,
  CoinPackage as CoinPackageType, InsertCoinPackage,
  Gift as GiftType, InsertGift,
  GiftTransaction as GiftTransactionType,
  // Notification as NotificationType, InsertNotification, // Commented out - not in schema
  Report as ReportType,
  PaymentLog as PaymentLogType,
  BonusRule as BonusRuleType, InsertBonusRule,
  Document as DocumentType, InsertDocument,
  LeaderboardEntry as LeaderboardEntryType,
  Banner as BannerType, InsertBanner
} from '@shared/schema';

export class MongoStorage implements IStorage {
  constructor() {
    // Delay initialization to ensure database connection is established
    // Use longer delay and check memory usage
    setTimeout(() => {
      this.initializeDefaultData();
    }, 10000); // Increased delay for memory optimization
  }

  private async initializeDefaultData() {
    try {
      // Check if database is connected before proceeding
      if (mongoose.connection.readyState !== 1) {
        console.log('Database not ready, skipping default data initialization');
        return;
      }

      console.log('Starting default data initialization...');

      // Create default admin if none exists
      const adminCount = await Admin.countDocuments().maxTimeMS(10000);
      if (adminCount === 0) {
        const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await Admin.create({
          username: 'admin',
          password: hashedPassword,
          name: 'System Administrator',
          role: 'admin'
        });
        console.log('Default admin created successfully');
      } else {
        console.log('Default admin already exists');
      }

      // Create sample users if none exist
      const userCount = await User.countDocuments().maxTimeMS(10000);
      if (userCount === 0) {
        const sampleUsers = [
          {
            username: 'sarah_johnson',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            gender: 'female',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b15c?w=400',
            profileType: 'gicon',
            badgeLevel: 3,
            language: 'en',
            dob: new Date('1992-06-15'),
            interests: ['photography', 'travel', 'music'],
            aboutMe: 'Travel photographer and music lover from Delhi.',
            isOnline: true
          },
          {
            username: 'mike_chen',
            name: 'Mike Chen',
            email: 'mike@example.com',
            gender: 'male',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            profileType: 'gstar',
            badgeLevel: 5,
            language: 'hi',
            dob: new Date('1989-03-22'),
            interests: ['technology', 'coding', 'gaming'],
            aboutMe: 'Software developer and tech enthusiast from Bangalore.',
            isOnline: false
          },
          {
            username: 'emma_watson',
            name: 'Emma Watson',
            email: 'emma@example.com',
            gender: 'female',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
            gIcons: 320,
            gStars: 145,
            isOnline: true
          }
        ];

        for (const userData of sampleUsers) {
          const user = await User.create(userData);
          await Wallet.create({
            userId: user._id,
            balance: Math.floor(Math.random() * 1000) + 100
          });
        }
      }

      // Create sample coin packages if none exist
      const packageCount = await CoinPackage.countDocuments();
      if (packageCount === 0) {
        await CoinPackage.insertMany([
          { name: 'Starter Pack', coinCount: 100, price: '399.00', offerDetails: 'Perfect for beginners' },
          { name: 'Popular Pack', coinCount: 500, price: '1599.00', offerDetails: 'Most popular choice - 20% bonus!' },
          { name: 'Premium Pack', coinCount: 1200, price: '3199.00', offerDetails: 'Best value - 40% bonus coins!' },
          { name: 'Ultimate Pack', coinCount: 3000, price: '6399.00', offerDetails: 'Ultimate value - 50% bonus coins!' }
        ]);
      }

      // Create sample gifts if none exist
      const giftCount = await Gift.countDocuments();
      if (giftCount === 0) {
        await Gift.insertMany([
          { name: 'Rose', image: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=200', coinValue: 10 },
          { name: 'Heart', image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200', coinValue: 25 },
          { name: 'Diamond Ring', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200', coinValue: 100 },
          { name: 'Golden Crown', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200', coinValue: 250 }
        ]);
      }

      // Create sample documents if none exist
      const documentCount = await DocumentModel.countDocuments();
      if (documentCount === 0) {
        const adminUser = await Admin.findOne();
        if (adminUser) {
          await DocumentModel.insertMany([
            {
              name: 'Terms of Service',
              type: 'terms',
              content: '**GIGGLEBUZ TERMS OF SERVICE**\n\n## 1. ACCEPTANCE OF TERMS\nBy accessing and using Gigglebuz, you accept and agree to be bound by the terms and provision of this agreement.\n\n## 2. USER RESPONSIBILITIES\n- Users must be at least 13 years old to use this service\n- Users are responsible for maintaining the confidentiality of their account\n- Users must not engage in harassment, bullying, or inappropriate behavior\n\n## 3. VIRTUAL CURRENCY\n- gIcons and gStars are virtual currencies with no real-world value\n- Virtual currency purchases are final and non-refundable\n- The platform reserves the right to modify virtual currency systems\n\n## 4. CONTENT GUIDELINES\n- All user-generated content must comply with community standards\n- Offensive, harmful, or illegal content is strictly prohibited\n- Copyright infringement will result in immediate account suspension\n\n## 5. PRIVACY AND DATA\n- User data is collected and processed according to our Privacy Policy\n- Personal information is protected using industry-standard security measures\n- Users can request data deletion by contacting support\n\n## 6. PLATFORM MODIFICATIONS\n- Gigglebuz reserves the right to modify or discontinue services\n- Users will be notified of significant changes via email or platform notifications\n- Continued use after modifications constitutes acceptance of new terms',
              version: '1.0',
              updatedBy: adminUser._id
            },
            {
              name: 'Privacy Policy',
              type: 'privacy',
              content: '**GIGGLEBUZ PRIVACY POLICY**\n\n## 1. INFORMATION WE COLLECT\n### Personal Information\n- Username, email address, and profile information\n- Demographic information (age, gender, location)\n- Communication preferences and settings\n\n### Usage Data\n- App usage patterns and feature interactions\n- Device information and technical specifications\n- Performance metrics and error logs\n\n## 2. HOW WE USE YOUR INFORMATION\n- To provide and improve our services\n- To personalize your experience on the platform\n- To communicate important updates and notifications\n- To ensure platform safety and security\n- To analyze usage patterns and optimize performance\n\n## 3. INFORMATION SHARING\n- We do not sell personal information to third parties\n- Data may be shared with service providers under strict agreements\n- Legal compliance may require disclosure in certain circumstances\n- Anonymous, aggregated data may be used for research purposes\n\n## 4. DATA SECURITY\n- Industry-standard encryption protects your data\n- Regular security audits and updates\n- Limited access controls for authorized personnel\n- Secure data centers with physical and digital protections\n\n## 5. YOUR RIGHTS\n- Access and review your personal information\n- Request corrections to inaccurate data\n- Delete your account and associated data\n- Opt-out of non-essential communications\n- Export your data in standard formats\n\n## 6. CONTACT US\nFor privacy concerns or data requests, contact our Data Protection Officer at privacy@gigglebuz.com',
              version: '1.0',
              updatedBy: adminUser._id
            },
            {
              name: 'Community Guidelines',
              type: 'guidelines',
              content: '**GIGGLEBUZ COMMUNITY GUIDELINES**\n\n## 1. RESPECT AND KINDNESS\n- Treat all users with respect and courtesy\n- No harassment, bullying, or discriminatory behavior\n- Constructive criticism is welcome, personal attacks are not\n- Respect cultural differences and diverse perspectives\n\n## 2. CONTENT STANDARDS\n### Prohibited Content\n- Spam, promotional content, or excessive self-promotion\n- Adult content, nudity, or sexually explicit material\n- Violence, threats, or content promoting self-harm\n- Hate speech, discrimination, or offensive language\n- Illegal activities or content violating laws\n\n### Quality Standards\n- Share original, authentic content\n- Provide accurate information and cite sources when applicable\n- Use appropriate language and maintain professionalism\n- Contribute meaningfully to discussions and interactions\n\n## 3. PLATFORM FEATURES\n### Virtual Gifts and Currency\n- Use gIcons and gStars responsibly\n- Do not attempt to exploit or manipulate the currency system\n- Report any bugs or issues with virtual transactions\n- Gifts should be given in good faith and positive spirit\n\n### Reporting and Moderation\n- Report content that violates these guidelines\n- Cooperate with moderation team investigations\n- Appeals process available for disputed actions\n- Repeated violations may result in account suspension\n\n## 4. CONSEQUENCES\n### Warning System\n- First violation: Warning and education\n- Second violation: Temporary restrictions\n- Third violation: Account suspension review\n- Severe violations: Immediate account termination\n\n## 5. UPDATES\nThese guidelines may be updated periodically. Users will be notified of significant changes through platform notifications.',
              version: '1.0',
              updatedBy: adminUser._id
            }
          ]);
        }
      }
      console.log('Default data initialization completed successfully');
    } catch (error) {
      console.error('Error initializing default data:', error);
      // Don't throw the error, just log it to prevent app crash
      // The app can still function without default data
    }
  }

  // Helper function to convert MongoDB document to schema format
  private toSchemaFormat(doc: any): any {
    if (!doc) return doc;
    const obj = doc.toObject ? doc.toObject() : doc;
    
    // Handle populated userId field specifically for wallet transactions
    if (obj.userId && typeof obj.userId === 'object' && obj.userId._id) {
      obj.userId = obj.userId._id.toString();
    }
    
    // Handle populated adminId field
    if (obj.adminId && typeof obj.adminId === 'object' && obj.adminId._id) {
      obj.adminId = obj.adminId._id.toString();
    }
    
    const result = {
      ...obj,
      id: obj._id.toString(),
      _id: undefined
    };
    
    // Map MongoDB property names to schema property names
    if (obj.coinCount !== undefined) {
      result.coinAmount = obj.coinCount;
      delete result.coinCount;
    }
    
    return result;
  }

  // Admin operations
  async getAdmin(id: number): Promise<AdminType | undefined> {
    const admin = await Admin.findById(id.toString());
    return admin ? this.toSchemaFormat(admin) : undefined;
  }

  async getAdminByUsername(username: string): Promise<AdminType | undefined> {
    const admin = await Admin.findOne({ username });
    return admin ? this.toSchemaFormat(admin) : undefined;
  }

  async createAdmin(admin: InsertAdmin): Promise<AdminType> {
    const newAdmin = await Admin.create(admin);
    return this.toSchemaFormat(newAdmin);
  }

  // User operations
  async getUsers(): Promise<UserType[]> {
    const users = await User.find().sort({ createdAt: -1 });
    return users.map(user => this.toSchemaFormat(user));
  }

  private normalizeId(id: string | number): string | null {
    const s = String(id);
    if (!mongoose.isValidObjectId(s)) {
      console.log(`MongoDB normalizeId - Invalid ObjectId: ${s}`);
      return null;
    }
    return s;
  }

  async getUser(id: number | string): Promise<UserType | undefined> {
    try {
      const normalizedId = this.normalizeId(id);
      if (!normalizedId) return undefined;
      
      console.log('MongoDB getUser - Looking for user with normalized ID:', normalizedId);
      const user = await User.findById(normalizedId);
      console.log('MongoDB getUser - Found user:', user ? 'Yes' : 'No');
      
      return user ? this.toSchemaFormat(user) : undefined;
    } catch (error) {
      console.error('Error finding user by ID:', id, error);
      return undefined;
    }
  }

  async getUserById(id: number | string): Promise<UserType | undefined> {
    return this.getUser(id);
  }


  async createUser(user: InsertUser): Promise<UserType> {
    // Check for duplicate name
    if (user.name) {
      const existingUser = await User.findOne({ name: user.name });
      if (existingUser) {
        throw new Error(`User with name '${user.name}' already exists`);
      }
    }
    
    // Set default profile type based on gender - female users get 'gicon', others get 'basic'
    const userData = {
      ...user,
      profileType: user.profileType || (user.gender === 'female' ? 'gicon' : 'basic')
    };
    
    const newUser = await User.create(userData);
    // Create wallet for new user
    await Wallet.create({ userId: newUser._id, balance: 0 });
    return this.toSchemaFormat(newUser);
  }

  async updateUser(id: number | string, updates: Partial<UserType>): Promise<UserType | undefined> {
    console.log('updateUser called with:', { id, updates });
    try {
      const normalizedId = this.normalizeId(id);
      if (!normalizedId) return undefined;
      
      // Check for duplicate name if name is being updated
      if (updates.name) {
        const existingUser = await User.findOne({ 
          name: updates.name,
          _id: { $ne: normalizedId } // Exclude current user
        });
        if (existingUser) {
          throw new Error(`User with name '${updates.name}' already exists`);
        }
      }
      
      // Validate profile type restrictions for female users
      if (updates.profileType === 'both' && updates.gender === 'female') {
        throw new Error('Female users cannot have "both" profile type. Use "gicon" or "gstar" instead.');
      }
      
      // Check existing user for gender-based profile type validation
      if (updates.profileType === 'both') {
        const existingUser = await User.findById(normalizedId);
        if (existingUser && existingUser.gender === 'female') {
          throw new Error('Female users cannot have "both" profile type. Use "gicon" or "gstar" instead.');
        }
      }
      
      const user = await User.findByIdAndUpdate(normalizedId, updates, { new: true });
      console.log('updateUser result:', user);
      return user ? this.toSchemaFormat(user) : undefined;
    } catch (error) {
      console.error('updateUser error:', error);
      throw error;
    }
  }



  async deleteUser(id: string | number): Promise<boolean> {
    try {
      const normalizedId = this.normalizeId(id);
      if (!normalizedId) {
        console.log(`MongoDB deleteUser - Invalid ID format: ${id}`);
        return false;
      }
      
      console.log(`MongoDB deleteUser - Deleting user with normalized ID: ${normalizedId}`);
      
      // Check if user exists
      const user = await User.findById(normalizedId);
      if (!user) {
        console.log(`MongoDB deleteUser - User not found: ${normalizedId}`);
        return false;
      }
      
      // Delete user's wallet
      await Wallet.findOneAndDelete({ userId: normalizedId });
      console.log(`MongoDB deleteUser - Deleted wallet for user: ${normalizedId}`);
      
      // Delete user's wallet transactions
      await WalletTransaction.deleteMany({ userId: normalizedId });
      console.log(`MongoDB deleteUser - Deleted wallet transactions for user: ${normalizedId}`);
      
      // Delete user's withdrawal requests
      await WithdrawalRequest.deleteMany({ userId: normalizedId });
      console.log(`MongoDB deleteUser - Deleted withdrawal requests for user: ${normalizedId}`);
      
      // Delete user's gift transactions (both sent and received)
      await GiftTransaction.deleteMany({ 
        $or: [{ senderId: normalizedId }, { receiverId: normalizedId }]
      });
      console.log(`MongoDB deleteUser - Deleted gift transactions for user: ${normalizedId}`);
      
      // Delete user's call sessions
      await CallSession.deleteMany({ 
        $or: [{ callerId: normalizedId }, { receiverId: normalizedId }]
      });
      console.log(`MongoDB deleteUser - Deleted call sessions for user: ${normalizedId}`);
      
      // Delete user's profile picture requests
      await ProfilePictureRequest.deleteMany({ userId: normalizedId });
      console.log(`MongoDB deleteUser - Deleted profile picture requests for user: ${normalizedId}`);
      
      // Delete user's ratings (both given and received)
      await CallRating.deleteMany({ 
        $or: [{ raterId: normalizedId }, { ratedUserId: normalizedId }]
      });
      console.log(`MongoDB deleteUser - Deleted ratings for user: ${normalizedId}`);
      
      // Delete user blocks and follows
      await UserBlock.deleteMany({ 
        $or: [{ blockerId: normalizedId }, { blockedUserId: normalizedId }]
      });
      await Follow.deleteMany({ 
        $or: [{ follower: normalizedId }, { following: normalizedId }]
      });
      console.log(`MongoDB deleteUser - Deleted social relations for user: ${normalizedId}`);
      
      // Finally, delete the user
      await User.findByIdAndDelete(normalizedId);
      console.log(`MongoDB deleteUser - Successfully deleted user: ${normalizedId}`);
      
      return true;
    } catch (error) {
      console.error('MongoDB deleteUser - Error deleting user:', error);
      return false;
    }
  }

  async searchUsers(query: string): Promise<UserType[]> {
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    });
    return users.map(user => this.toSchemaFormat(user));
  }

  // Wallet operations
  async getWallet(userId: number): Promise<WalletType | undefined> {
    console.log(`MongoDB getWallet - Looking for wallet with userId: ${userId}`);
    const wallet = await Wallet.findOne({ userId: userId.toString() });
    if (!wallet) {
      console.log(`MongoDB getWallet - No wallet found for user ${userId}`);
      return undefined;
    }
    
    console.log(`MongoDB getWallet - Found wallet:`, wallet);
    const formatted = this.toSchemaFormat(wallet);
    
    // Ensure proper field mapping
    formatted.coinBalance = wallet.coinBalance || (wallet as any).balance || 0;
    formatted.totalEarned = wallet.totalEarned || "0.00";
    formatted.totalSpent = wallet.totalSpent || "0.00";
    
    // Clean up old balance field if it exists
    if ('balance' in formatted) {
      delete formatted.balance;
    }
    
    console.log(`MongoDB getWallet - Formatted wallet:`, formatted);
    return formatted;
  }

  async getWalletByUserId(userId: number | string): Promise<WalletType | undefined> {
    const wallet = await Wallet.findOne({ userId: userId.toString() });
    if (!wallet) return undefined;
    
    const formatted = this.toSchemaFormat(wallet);
    
    // Ensure proper field mapping
    formatted.coinBalance = wallet.coinBalance || (wallet as any).balance || 0;
    formatted.totalEarned = wallet.totalEarned || "0.00";
    formatted.totalSpent = wallet.totalSpent || "0.00";
    
    // Clean up old balance field if it exists
    if ('balance' in formatted) {
      delete formatted.balance;
    }
    
    return formatted;
  }

  async createWallet(userId: number): Promise<WalletType> {
    const wallet = await Wallet.create({ 
      userId: userId.toString(), 
      coinBalance: 0,
      totalEarned: "0.00",
      totalSpent: "0.00"
    });
    return this.toSchemaFormat(wallet);
  }

  async updateWalletBalance(userId: number | string, amount: number, transaction?: any): Promise<void> {
    console.log(`MongoDB updateWalletBalance - User: ${userId}, Amount to add/subtract: ${amount}`);
    
    // Get current wallet
    const wallet = await Wallet.findOne({ userId: userId.toString() });
    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    console.log(`MongoDB updateWalletBalance - Current wallet balance: ${wallet.coinBalance || (wallet as any).balance || 0}`);
    
    const currentBalance = wallet.coinBalance || (wallet as any).balance || 0;
    const newBalance = Math.max(0, currentBalance + amount); // Add/subtract amount, ensure non-negative
    
    console.log(`MongoDB updateWalletBalance - Calculating: ${currentBalance} + ${amount} = ${newBalance}`);
    
    // Update coinBalance by adding/subtracting the amount
    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId: userId.toString() },
      { $set: { coinBalance: newBalance } },
      { new: true }
    );

    console.log(`MongoDB updateWalletBalance - Updated wallet balance: ${updatedWallet?.coinBalance}`);

    // Create transaction record if transaction data is provided
    if (transaction) {
      await WalletTransaction.create({
        userId: userId.toString(),
        amount: Math.abs(amount), // Store absolute amount
        type: transaction.type || (amount > 0 ? 'credit' : 'debit'),
        description: transaction.description || 'Balance adjustment',
        metadata: transaction,
        status: 'completed'
      });
    }
  }

  async getWalletTransactions(userId?: number): Promise<WalletTransactionType[]> {
    const query = userId ? { userId: userId.toString() } : {};
    const transactions = await WalletTransaction.find(query)
      .populate('userId', 'name username')
      .sort({ createdAt: -1 });
    return transactions.map(tx => this.toSchemaFormat(tx));
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransactionType> {
    console.log('Creating wallet transaction with data:', transaction);
    const transactionData = {
      ...transaction,
      userId: transaction.userId.toString(),
      adminId: transaction.adminId ? transaction.adminId.toString() : null,
    };
    console.log('Final transaction data for MongoDB:', transactionData);
    const newTransaction = await WalletTransaction.create(transactionData);
    return this.toSchemaFormat(newTransaction);
  }

  async updateWalletTransaction(id: number, updates: Partial<WalletTransactionType>): Promise<WalletTransactionType | undefined> {
    const transaction = await WalletTransaction.findByIdAndUpdate(id.toString(), updates, { new: true });
    return transaction ? this.toSchemaFormat(transaction) : undefined;
  }

  // Withdrawal operations
  async getWithdrawalRequests(): Promise<WithdrawalRequestType[]> {
    const requests = await WithdrawalRequest.find()
      .populate('userId', 'name username')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    return requests.map(req => this.toSchemaFormat(req));
  }

  async getWithdrawalRequest(id: number): Promise<WithdrawalRequestType | undefined> {
    const request = await WithdrawalRequest.findById(id.toString())
      .populate('userId', 'name username')
      .populate('processedBy', 'name');
    return request ? this.toSchemaFormat(request) : undefined;
  }

  async createWithdrawalRequest(request: any): Promise<WithdrawalRequestType> {
    console.log('Creating withdrawal request:', request);
    
    // Support both new (coin-based) and legacy format
    const requestData = {
      userId: request.userId,
      coinAmount: request.coinAmount || parseInt(request.amount || "0"),
      rupeeAmount: request.rupeeAmount || (parseFloat(request.amount || "0") / 10).toFixed(2),
      status: request.status || 'pending',
      accountType: request.accountType,
      accountDetails: request.accountDetails,
      remarks: request.remarks
    };
    
    const newRequest = await WithdrawalRequest.create(requestData);
    return this.toSchemaFormat(newRequest);
  }

  async updateWithdrawalRequest(id: number | string, updates: Partial<WithdrawalRequestType>): Promise<WithdrawalRequestType | undefined> {
    try {
      const updateData = {
        ...updates,
        processedAt: updates.status && updates.status !== 'pending' ? new Date() : null
      };
      
      const request = await WithdrawalRequest.findByIdAndUpdate(id.toString(), updateData, { new: true })
        .populate('userId', 'name username')
        .populate('processedBy', 'name');
      return request ? this.toSchemaFormat(request) : undefined;
    } catch (error) {
      console.error('Error updating withdrawal request:', error);
      return undefined;
    }
  }

  // Coin package operations
  async getCoinPackages(): Promise<CoinPackageType[]> {
    const packages = await CoinPackage.find().sort({ createdAt: -1 });
    return packages.map(pkg => this.toSchemaFormat(pkg));
  }

  async getCoinPackage(id: number | string): Promise<CoinPackageType | undefined> {
    const coinPackage = await CoinPackage.findById(id);
    return coinPackage ? this.toSchemaFormat(coinPackage) : undefined;
  }

  async createCoinPackage(packageData: InsertCoinPackage): Promise<CoinPackageType> {
    const newPackage = await CoinPackage.create(packageData);
    return this.toSchemaFormat(newPackage);
  }

  async updateCoinPackage(id: string | number, updates: Partial<CoinPackageType>): Promise<CoinPackageType | undefined> {
    const coinPackage = await CoinPackage.findByIdAndUpdate(id.toString(), updates, { new: true });
    return coinPackage ? this.toSchemaFormat(coinPackage) : undefined;
  }

  async deleteCoinPackage(id: string | number): Promise<boolean> {
    const result = await CoinPackage.findByIdAndDelete(id.toString());
    return !!result;
  }

  // Gift operations
  async getGifts(): Promise<GiftType[]> {
    const gifts = await Gift.find().sort({ createdAt: -1 });
    return gifts.map(gift => this.toSchemaFormat(gift));
  }

  async getGift(id: number | string): Promise<GiftType | undefined> {
    const gift = await Gift.findById(id);
    return gift ? this.toSchemaFormat(gift) : undefined;
  }

  async createGift(gift: InsertGift): Promise<GiftType> {
    const newGift = await Gift.create(gift);
    return this.toSchemaFormat(newGift);
  }

  async updateGift(id: string | number, updates: Partial<GiftType>): Promise<GiftType | undefined> {
    const gift = await Gift.findByIdAndUpdate(id.toString(), updates, { new: true });
    return gift ? this.toSchemaFormat(gift) : undefined;
  }

  async deleteGift(id: string | number): Promise<boolean> {
    try {
      console.log('Attempting to delete gift with ID:', id);
      const result = await Gift.findByIdAndDelete(id.toString());
      console.log('Delete result:', result);
      return !!result;
    } catch (error) {
      console.error('MongoDB delete gift error:', error);
      throw error;
    }
  }

  async getGiftTransactions(): Promise<GiftTransactionType[]> {
    const transactions = await GiftTransaction.find()
      .populate('senderId', 'name username')
      .populate('receiverId', 'name username')
      .populate('giftId', 'name image')
      .sort({ createdAt: -1 });
    return transactions.map(tx => this.toSchemaFormat(tx));
  }

  // Notification operations - commented out due to missing types
  // async getNotifications(): Promise<NotificationType[]> {
  //   const notifications = await Notification.find()
  //     .populate('senderId', 'name')
  //     .sort({ createdAt: -1 });
  //   return notifications.map(notif => this.toSchemaFormat(notif));
  // }

  // async createNotification(notification: InsertNotification): Promise<NotificationType> {
  //   const newNotification = await Notification.create(notification);
  //   return this.toSchemaFormat(newNotification);
  // }

  // Report operations
  async getReports(): Promise<ReportType[]> {
    const reports = await Report.find()
      .populate('reporterId', 'name username')
      .populate('reportedUserId', 'name username')
      .sort({ createdAt: -1 });
    return reports.map(report => this.toSchemaFormat(report));
  }

  async getReport(id: number): Promise<ReportType | undefined> {
    const report = await Report.findById(id.toString())
      .populate('reporterId', 'name username')
      .populate('reportedUserId', 'name username');
    return report ? this.toSchemaFormat(report) : undefined;
  }

  async updateReport(id: number, updates: Partial<ReportType>): Promise<ReportType | undefined> {
    const report = await Report.findByIdAndUpdate(id.toString(), updates, { new: true });
    return report ? this.toSchemaFormat(report) : undefined;
  }

  // Payment log operations
  async getPaymentLogs(): Promise<PaymentLogType[]> {
    const logs = await PaymentLog.find()
      .populate('userId', 'name username')
      .sort({ createdAt: -1 });
    return logs.map(log => this.toSchemaFormat(log));
  }

  // Bonus rule operations
  async getBonusRules(): Promise<BonusRuleType[]> {
    const rules = await BonusRule.find().sort({ createdAt: -1 });
    return rules.map(rule => this.toSchemaFormat(rule));
  }

  async getBonusRule(id: number): Promise<BonusRuleType | undefined> {
    const rule = await BonusRule.findById(id.toString());
    return rule ? this.toSchemaFormat(rule) : undefined;
  }

  async createBonusRule(rule: InsertBonusRule): Promise<BonusRuleType> {
    const newRule = await BonusRule.create(rule);
    return this.toSchemaFormat(newRule);
  }

  async updateBonusRule(id: number, updates: Partial<BonusRuleType>): Promise<BonusRuleType | undefined> {
    const rule = await BonusRule.findByIdAndUpdate(id.toString(), updates, { new: true });
    return rule ? this.toSchemaFormat(rule) : undefined;
  }

  async deleteBonusRule(id: number): Promise<boolean> {
    const result = await BonusRule.findByIdAndDelete(id.toString());
    return !!result;
  }

  // Call Session operations for dynamic time management
  async getActiveCallSession(callerUserId: string): Promise<any | null> {
    try {
      const activeCall = await CallSession.findOne({
        callerUserId: callerUserId,
        status: { $in: ['initiated', 'connected'] }
      }).sort({ startTime: -1 });
      return activeCall;
    } catch (error) {
      console.error('Error getting active call session:', error);
      return null;
    }
  }

  async getCallSessionByCallId(callId: string): Promise<any | null> {
    try {
      const callSession = await CallSession.findOne({ callId });
      return callSession;
    } catch (error) {
      console.error('Error getting call session by callId:', error);
      return null;
    }
  }

  async updateCallSessionRemainingTime(callId: string, timeDeduction: number): Promise<boolean> {
    try {
      console.log(`🕐 Updating call ${callId} - deducting ${timeDeduction} minutes`);
      
      const result = await CallSession.findOneAndUpdate(
        { callId },
        { 
          $inc: { remainingMinutes: -timeDeduction },
          $set: { lastUpdated: new Date() }
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Call time updated: ${result.remainingMinutes} minutes remaining`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating call session remaining time:', error);
      return false;
    }
  }

  async endCallSession(callId: string, reason: string): Promise<boolean> {
    try {
      console.log(`📞 Ending call ${callId} - reason: ${reason}`);
      
      const result = await CallSession.findOneAndUpdate(
        { callId },
        { 
          $set: { 
            status: 'ended',
            endTime: new Date(),
            remainingMinutes: 0,
            lastUpdated: new Date()
          }
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Call ${callId} ended successfully - reason: ${reason}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error ending call session:', error);
      return false;
    }
  }

  async updateCallSession(callId: string, update: any): Promise<boolean> {
    try {
      console.log(`🔄 Updating call session ${callId}`);
      
      const result = await CallSession.findOneAndUpdate(
        { callId },
        { 
          $set: { 
            ...update, 
            lastUpdated: new Date() 
          }
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Call session ${callId} updated successfully`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating call session:', error);
      return false;
    }
  }

  // Document operations
  async getDocuments(): Promise<DocumentType[]> {
    const documents = await DocumentModel.find()
      .populate('updatedBy', 'name')
      .sort({ updatedAt: -1 });
    return documents.map(doc => this.toSchemaFormat(doc));
  }

  async getDocument(id: number): Promise<DocumentType | undefined> {
    const document = await DocumentModel.findById(id.toString())
      .populate('updatedBy', 'name');
    return document ? this.toSchemaFormat(document) : undefined;
  }

  async createDocument(document: InsertDocument): Promise<DocumentType> {
    const documentData = {
      ...document,
      updatedBy: document.updatedBy ? document.updatedBy.toString() : null,
    };
    const newDocument = await DocumentModel.create(documentData);
    return this.toSchemaFormat(newDocument);
  }

  async updateDocument(id: number, updates: Partial<DocumentType>): Promise<DocumentType | undefined> {
    const document = await DocumentModel.findByIdAndUpdate(id.toString(), updates, { new: true });
    return document ? this.toSchemaFormat(document) : undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await DocumentModel.findByIdAndDelete(id.toString());
    return !!result;
  }

  // Leaderboard operations
  async getLeaderboard(type: string, period: string): Promise<LeaderboardEntryType[]> {
    const entries = await LeaderboardEntry.find({ type, period })
      .populate('userId', 'name username avatar')
      .sort({ rank: 1 });
    return entries.map(entry => this.toSchemaFormat(entry));
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalRevenue: string;
    activeSessions: number;
    pendingWithdrawals: number;
  }> {
    const [userCount, paymentLogs, activeUsers, pendingWithdrawals] = await Promise.all([
      User.countDocuments(),
      PaymentLog.find({ status: 'success' }),
      User.countDocuments({ isOnline: true }),
      WithdrawalRequest.countDocuments({ status: 'pending' })
    ]);

    const totalRevenue = paymentLogs.reduce((sum, log) => sum + parseFloat(log.amount), 0);

    return {
      totalUsers: userCount,
      totalRevenue: totalRevenue.toFixed(2),
      activeSessions: activeUsers,
      pendingWithdrawals
    };
  }

  // Call Configuration methods
  async getCallConfig(): Promise<{
    videoCallCoinsPerMin: number;
    audioCallCoinsPerMin: number;
    gStarAudioCoinsPerMin: number;
    gStarVideoCoinsPerMin: number;
    messageCoins: number;
    adminCommissionPercent: number;
    gstarAdminCommission: number;
    giconAdminCommission: number;
    coinToRupeeRatio: number;
  } | null> {
    try {
      const config = await CallConfig.findOne();
      if (!config) {
        return null;
      }
      return {
        videoCallCoinsPerMin: config.videoCallCoinsPerMin,
        audioCallCoinsPerMin: config.audioCallCoinsPerMin,
        gStarAudioCoinsPerMin: config.gStarAudioCoinsPerMin,
        gStarVideoCoinsPerMin: config.gStarVideoCoinsPerMin,
        messageCoins: config.messageCoins,
        adminCommissionPercent: config.adminCommissionPercent,
        gstarAdminCommission: config.gstarAdminCommission,
        giconAdminCommission: config.giconAdminCommission,
        coinToRupeeRatio: config.coinToRupeeRatio
      };
    } catch (error) {
      console.error('Error fetching call config:', error);
      throw error;
    }
  }

  async updateCallConfig(config: {
    videoCallCoinsPerMin: number;
    audioCallCoinsPerMin: number;
    gStarAudioCoinsPerMin: number;
    gStarVideoCoinsPerMin: number;
    messageCoins: number;
    adminCommissionPercent: number;
    gstarAdminCommission: number;
    giconAdminCommission: number;
    coinToRupeeRatio: number;
  }): Promise<{
    videoCallCoinsPerMin: number;
    audioCallCoinsPerMin: number;
    gStarAudioCoinsPerMin: number;
    gStarVideoCoinsPerMin: number;
    messageCoins: number;
    adminCommissionPercent: number;
    gstarAdminCommission: number;
    giconAdminCommission: number;
    coinToRupeeRatio: number;
  }> {
    try {
      const updatedConfig = await CallConfig.findOneAndUpdate(
        {},
        { 
          ...config,
          updatedAt: new Date()
        },
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      // Sync configuration to Firebase for real-time access
      await FirestoreService.syncCallConfiguration({
        videoCallCoinsPerMin: updatedConfig.videoCallCoinsPerMin,
        audioCallCoinsPerMin: updatedConfig.audioCallCoinsPerMin,
        gStarAudioCoinsPerMin: updatedConfig.gStarAudioCoinsPerMin,
        gStarVideoCoinsPerMin: updatedConfig.gStarVideoCoinsPerMin,
        messageCoins: updatedConfig.messageCoins,
        adminCommissionPercent: updatedConfig.adminCommissionPercent,
        gstarAdminCommission: updatedConfig.gstarAdminCommission,
        giconAdminCommission: updatedConfig.giconAdminCommission,
        coinToRupeeRatio: updatedConfig.coinToRupeeRatio
      });

      return {
        videoCallCoinsPerMin: updatedConfig.videoCallCoinsPerMin,
        audioCallCoinsPerMin: updatedConfig.audioCallCoinsPerMin,
        gStarAudioCoinsPerMin: updatedConfig.gStarAudioCoinsPerMin,
        gStarVideoCoinsPerMin: updatedConfig.gStarVideoCoinsPerMin,
        messageCoins: updatedConfig.messageCoins,
        adminCommissionPercent: updatedConfig.adminCommissionPercent,
        gstarAdminCommission: updatedConfig.gstarAdminCommission,
        giconAdminCommission: updatedConfig.giconAdminCommission,
        coinToRupeeRatio: updatedConfig.coinToRupeeRatio
      };
    } catch (error) {
      console.error('Error updating call config:', error);
      throw error;
    }
  }

  // Call transactions management
  async getCallTransactions(): Promise<any[]> {
    try {
      const sessions = await CallSession.find()
        .populate({
          path: 'callerUserId',
          select: 'name username gender profileType',
          match: { _id: { $type: 'objectId' } }
        })
        .populate({
          path: 'receiverUserId', 
          select: 'name username gender profileType',
          match: { _id: { $type: 'objectId' } }
        })
        .sort({ createdAt: -1 });
    
      console.log(`Found ${sessions.length} call sessions for admin panel`);
    
      return sessions.map(session => {
      const sessionData = this.toSchemaFormat(session);
      
      // Determine commission type based on receiver profile and caller/receiver genders
      let commissionType = 'none';
      let actualCommissionRate = 0;
      
      if (sessionData.callerUserId?.gender === 'male' && sessionData.receiverUserId?.gender === 'female') {
        const receiverProfile = sessionData.receiverUserId?.profileType || 'basic';
        if (receiverProfile === 'gstar') {
          commissionType = 'gstar';
          actualCommissionRate = 25; // From config
        } else if (receiverProfile === 'gicon') {
          commissionType = 'gicon';
          actualCommissionRate = 18; // From config
        } else {
          commissionType = 'admin';
          actualCommissionRate = 20; // Default admin
        }
      }
      
      return {
        id: sessionData._id,
        callId: sessionData.callId,
        callerId: sessionData.callerUserId?._id,
        callerName: sessionData.callerUserId?.name || sessionData.callerUserId?.username || 'Unknown',
        callerGender: sessionData.callerUserId?.gender || 'unknown',
        callerProfileType: sessionData.callerUserId?.profileType || 'basic',
        receiverId: sessionData.receiverUserId?._id,
        receiverName: sessionData.receiverUserId?.name || sessionData.receiverUserId?.username || 'Unknown',
        receiverGender: sessionData.receiverUserId?.gender || 'unknown',
        receiverProfileType: sessionData.receiverUserId?.profileType || 'basic',
        callType: sessionData.callType,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        duration: sessionData.durationMinutes || 0,
        coinsPerMinute: sessionData.coinsPerMinute || 0,
        totalCoins: sessionData.totalCoinsDeducted || 0,
        adminCommission: sessionData.adminCommission || 0,
        adminCommissionPercent: actualCommissionRate,
        commissionType: commissionType,
        receiverEarnings: sessionData.coinsToReceiver || 0,
        status: sessionData.status,
        paymentProcessed: sessionData.paymentProcessed || false,
        paymentDetails: {
          callerPaid: sessionData.totalCoinsDeducted || 0,
          receiverEarned: sessionData.coinsToReceiver || 0,
          adminEarned: sessionData.adminCommission || 0,
          isPayableCall: sessionData.callerUserId?.gender === 'male' && sessionData.receiverUserId?.gender === 'female'
        },
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt
      };
      });
    } catch (error) {
      console.error('Error fetching call transactions:', error);
      throw error;
    }
  }

  async getCallTransactionStats(): Promise<any> {
    const sessions = await CallSession.find({ status: 'ended' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessions.filter(session => 
      new Date(session.createdAt) >= today
    );

    const totalDuration = sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);
    const totalRevenue = sessions.reduce((sum, session) => sum + (session.totalCoinsDeducted || 0), 0);
    const totalCommission = sessions.reduce((sum, session) => sum + (session.adminCommission || 0), 0);

    return {
      totalCalls: sessions.length,
      callsToday: todaySessions.length,
      totalDuration: totalDuration,
      avgDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      totalRevenue: totalRevenue,
      revenueToday: todaySessions.reduce((sum, session) => sum + (session.totalCoinsDeducted || 0), 0),
      totalCommission: totalCommission,
      avgCommissionPercent: sessions.length > 0 ? (totalCommission / totalRevenue) * 100 : 20
    };
  }

  // Call rating management
  async submitCallRating(ratingData: {
    callId: string;
    raterUserId: string;
    ratedUserId: string;
    callType: string;
    overallRating: number;
    callQuality?: number;
    userExperience?: number;
    communication?: number;
    feedback?: string;
    tags?: string[];
    isAnonymous?: boolean;
    callDuration?: number;
    reportIssue?: boolean;
    issueType?: string;
    issueDescription?: string;
  }): Promise<any> {
    try {
      // Check if rating already exists for this call and user
      const existingRating = await CallRating.findOne({
        callId: ratingData.callId,
        raterUserId: ratingData.raterUserId
      });

      if (existingRating) {
        // Update existing rating
        Object.assign(existingRating, ratingData);
        await existingRating.save();
        console.log(`Updated rating for call ${ratingData.callId} by user ${ratingData.raterUserId}`);
        return this.toSchemaFormat(existingRating);
      } else {
        // Create new rating
        const newRating = new CallRating(ratingData);
        await newRating.save();
        console.log(`Created new rating for call ${ratingData.callId} by user ${ratingData.raterUserId}`);
        
        // Update user's average rating in Firebase
        await this.updateUserAverageRating(ratingData.ratedUserId);
        
        return this.toSchemaFormat(newRating);
      }
    } catch (error) {
      console.error('Error submitting call rating:', error);
      throw error;
    }
  }

  async getCallRating(callId: string, raterUserId: string): Promise<any | null> {
    try {
      const rating = await CallRating.findOne({
        callId,
        raterUserId
      });
      return rating ? this.toSchemaFormat(rating) : null;
    } catch (error) {
      console.error('Error getting call rating:', error);
      throw error;
    }
  }

  async getUserRatings(userId: string, page: number = 1, limit: number = 20): Promise<{ ratings: any[], pagination: any, stats: any }> {
    try {
      const skip = (page - 1) * limit;
      
      // Get ratings received by this user
      const ratings = await CallRating.find({ ratedUserId: userId })
        .populate('raterUserId', 'name username avatar gender')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalRatings = await CallRating.countDocuments({ ratedUserId: userId });

      // Calculate rating statistics
      const allRatings = await CallRating.find({ ratedUserId: userId }).lean();
      const stats = this.calculateRatingStats(allRatings);

      return {
        ratings: ratings.map(rating => this.toSchemaFormat(rating)),
        pagination: {
          page,
          limit,
          total: totalRatings,
          totalPages: Math.ceil(totalRatings / limit),
          hasMore: totalRatings > page * limit
        },
        stats
      };
    } catch (error) {
      console.error('Error getting user ratings:', error);
      throw error;
    }
  }

  async getUserRatingStats(userId: string): Promise<any> {
    try {
      const ratings = await CallRating.find({ ratedUserId: userId }).lean();
      return this.calculateRatingStats(ratings);
    } catch (error) {
      console.error('Error getting user rating stats:', error);
      throw error;
    }
  }

  private calculateRatingStats(ratings: any[]): any {
    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        averageCallQuality: 0,
        averageUserExperience: 0,
        averageCommunication: 0,
        topTags: [],
        recentRatings: []
      };
    }

    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.overallRating, 0) / totalRatings;
    
    // Rating distribution
    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => distribution[r.overallRating]++);

    // Average specific ratings
    const ratingsWithQuality = ratings.filter(r => r.callQuality);
    const averageCallQuality = ratingsWithQuality.length > 0 
      ? ratingsWithQuality.reduce((sum, r) => sum + r.callQuality, 0) / ratingsWithQuality.length 
      : 0;

    const ratingsWithUX = ratings.filter(r => r.userExperience);
    const averageUserExperience = ratingsWithUX.length > 0 
      ? ratingsWithUX.reduce((sum, r) => sum + r.userExperience, 0) / ratingsWithUX.length 
      : 0;

    const ratingsWithComm = ratings.filter(r => r.communication);
    const averageCommunication = ratingsWithComm.length > 0 
      ? ratingsWithComm.reduce((sum, r) => sum + r.communication, 0) / ratingsWithComm.length 
      : 0;

    // Top tags
    const tagCounts: { [key: string]: number } = {};
    ratings.forEach(r => {
      if (r.tags) {
        r.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution: distribution,
      averageCallQuality: Math.round(averageCallQuality * 10) / 10,
      averageUserExperience: Math.round(averageUserExperience * 10) / 10,
      averageCommunication: Math.round(averageCommunication * 10) / 10,
      topTags,
      recentRatings: ratings.slice(0, 5).map(r => ({
        rating: r.overallRating,
        feedback: r.feedback,
        createdAt: r.createdAt
      }))
    };
  }

  private async updateUserAverageRating(userId: string): Promise<void> {
    try {
      const stats = await this.getUserRatingStats(userId);
      
      // Update user's average rating in the database
      await User.findByIdAndUpdate(userId, {
        $set: {
          averageRating: stats.averageRating,
          totalRatings: stats.totalRatings,
          ratingStats: {
            callQuality: stats.averageCallQuality,
            userExperience: stats.averageUserExperience,
            communication: stats.averageCommunication
          }
        }
      });

      // Sync to Firebase for real-time access
      await FirestoreService.updateUserRating(userId, {
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
        ratingDistribution: stats.ratingDistribution,
        lastRatingUpdate: new Date()
      });

      console.log(`Updated average rating for user ${userId}: ${stats.averageRating} (${stats.totalRatings} ratings)`);
    } catch (error) {
      console.error('Error updating user average rating:', error);
    }
  }

  async clearDemoCallTransactions(): Promise<void> {
    try {
      // Remove demo call sessions (those with callId starting with 'demo-call-')
      const result = await CallSession.deleteMany({ 
        callId: { $regex: /^demo-call-/ } 
      });
      console.log(`Cleared ${result.deletedCount} demo call transactions`);
      
      // Also remove any demo users if they exist
      await User.deleteMany({ 
        username: { $in: ['caller_demo', 'receiver_demo'] } 
      });
      
      console.log('Demo call transactions and users cleared successfully');
    } catch (error) {
      console.error('Error in clearDemoCallTransactions:', error);
      throw error;
    }
  }

  async getGiftTransactionsByCallId(callId: string): Promise<any[]> {
    try {
      // Get gift transactions that might be associated with a call
      // For now, we'll return empty array since we need to implement gift-call linking
      // This would require adding callId field to gift transactions or 
      // querying gifts sent during the call timeframe
      return [];
    } catch (error) {
      console.error('Error in getGiftTransactionsByCallId:', error);
      return [];
    }
  }

  // User blocking and reporting methods
  async blockUser(id: string | number): Promise<boolean> {
    try {
      const normalizedId = this.normalizeId(id);
      if (!normalizedId) return false;
      
      const result = await User.findByIdAndUpdate(normalizedId, { 
        isBlocked: true,
        blockedAt: new Date(),
        blockedBy: 'admin',
        blockReason: 'Blocked by admin'
      });
      
      return !!result;
    } catch (error) {
      console.error('Error in blockUser:', error);
      return false;
    }
  }

  async blockUserProfile(blockerId: string, blockedUserId: string, reason?: string): Promise<any> {
    try {
      // Prevent self-blocking
      if (blockerId === blockedUserId) {
        throw new Error('Cannot block yourself');
      }

      // Check if already blocked
      const existingBlock = await UserBlock.findOne({
        blockerId,
        blockedUserId,
        isActive: true
      });

      if (existingBlock) {
        return existingBlock;
      }

      // Create new block
      const userBlock = new UserBlock({
        blockerId,
        blockedUserId,
        reason: reason || 'other',
        blockedAt: new Date(),
        isActive: true
      });

      await userBlock.save();
      return userBlock;
    } catch (error) {
      console.error('Error in blockUser:', error);
      throw error;
    }
  }

  async unblockUser(id: string | number): Promise<boolean> {
    try {
      const normalizedId = this.normalizeId(id);
      if (!normalizedId) return false;
      
      const result = await User.findByIdAndUpdate(normalizedId, { 
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockReason: null
      });
      
      return !!result;
    } catch (error) {
      console.error('Error in unblockUser:', error);
      return false;
    }
  }

  async unblockUserProfile(blockerId: string, blockedUserId: string): Promise<void> {
    try {
      await UserBlock.findOneAndUpdate(
        {
          blockerId,
          blockedUserId,
          isActive: true
        },
        {
          isActive: false
        }
      );
    } catch (error) {
      console.error('Error in unblockUserProfile:', error);
      throw error;
    }
  }

  async getBlockedUsers(userId: string, page: number = 1, limit: number = 20): Promise<{ users: any[], pagination: any }> {
    try {
      const skip = (page - 1) * limit;

      // Get blocked user IDs
      const blocks = await UserBlock.find({
        blockerId: userId,
        isActive: true
      })
      .sort({ blockedAt: -1 })
      .skip(skip)
      .limit(limit);

      // Get user details for blocked users
      const blockedUserIds = blocks.map(block => block.blockedUserId);
      const users = await User.find({ _id: { $in: blockedUserIds } })
        .select('username name avatar gender isOnline lastSeen');

      // Combine block info with user details
      const enrichedUsers = blocks.map(block => {
        const user = users.find(u => u._id.toString() === block.blockedUserId);
        return {
          blockId: block._id,
          blockedAt: block.blockedAt,
          reason: block.reason,
          user: user ? {
            id: user._id,
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            gender: user.gender,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          } : null
        };
      });

      // Get total count for pagination
      const totalCount = await UserBlock.countDocuments({
        blockerId: userId,
        isActive: true
      });

      return {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: skip + enrichedUsers.length < totalCount
        }
      };
    } catch (error) {
      console.error('Error in getBlockedUsers:', error);
      throw error;
    }
  }

  async isUserBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    try {
      const block = await UserBlock.findOne({
        blockerId,
        blockedUserId,
        isActive: true
      });
      return !!block;
    } catch (error) {
      console.error('Error in isUserBlocked:', error);
      return false;
    }
  }

  async reportUser(reporterId: string, reportedUserId: string, reportData: any): Promise<any> {
    try {
      // Prevent self-reporting
      if (reporterId === reportedUserId) {
        throw new Error('Cannot report yourself');
      }

      // Create new report
      const userReport = new UserReport({
        reporterId,
        reportedUserId,
        reportType: reportData.reportType,
        description: reportData.description,
        evidence: reportData.evidence || {},
        severity: reportData.severity || 'medium',
        status: 'pending',
        reportedAt: new Date()
      });

      await userReport.save();
      return userReport;
    } catch (error) {
      console.error('Error in reportUser:', error);
      throw error;
    }
  }

  async getUserReports(userId: string, page: number = 1, limit: number = 20): Promise<{ reports: any[], pagination: any }> {
    try {
      const skip = (page - 1) * limit;

      const reports = await UserReport.find({ reporterId: userId })
        .sort({ reportedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reportedUserId', 'username name avatar')
        .lean();

      const totalCount = await UserReport.countDocuments({ reporterId: userId });

      return {
        reports,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: skip + reports.length < totalCount
        }
      };
    } catch (error) {
      console.error('Error in getUserReports:', error);
      throw error;
    }
  }

  async getReportById(reportId: string): Promise<any> {
    try {
      const report = await UserReport.findById(reportId)
        .populate('reporterId', 'username name avatar')
        .populate('reportedUserId', 'username name avatar')
        .lean();
      return report;
    } catch (error) {
      console.error('Error in getReportById:', error);
      throw error;
    }
  }

  // Admin report management
  async getAllReports(filters: any = {}, page: number = 1, limit: number = 20): Promise<{ reports: any[], pagination: any }> {
    try {
      const skip = (page - 1) * limit;
      
      // Build filter query
      const query: any = {};
      if (filters.status) query.status = filters.status;
      if (filters.reportType) query.reportType = filters.reportType;
      if (filters.severity) query.severity = filters.severity;
      if (filters.startDate) {
        query.reportedAt = { ...query.reportedAt, $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        query.reportedAt = { ...query.reportedAt, $lte: new Date(filters.endDate) };
      }

      const reports = await UserReport.find(query)
        .sort({ severity: -1, reportedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporterId', 'username name avatar')
        .populate('reportedUserId', 'username name avatar')
        .lean();

      const totalCount = await UserReport.countDocuments(query);

      return {
        reports,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: skip + reports.length < totalCount
        }
      };
    } catch (error) {
      console.error('Error in getAllReports:', error);
      throw error;
    }
  }

  async updateReportStatus(reportId: string, status: string, adminId: string, adminNotes?: string): Promise<any> {
    try {
      const updatedReport = await UserReport.findByIdAndUpdate(
        reportId,
        {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes
        },
        { new: true }
      );

      return updatedReport;
    } catch (error) {
      console.error('Error in updateReportStatus:', error);
      throw error;
    }
  }

  // Missed Call Management
  async createMissedCall(missedCallData: {
    callId: string;
    callerUserId: string;
    receiverUserId: string;
    callType: 'video' | 'audio' | 'message';
    initiatedAt: Date;
    missedReason: 'no_answer' | 'declined' | 'busy' | 'offline' | 'timeout' | 'inactive' | 'dnd';
  }): Promise<any> {
    try {
      console.log('MongoDB createMissedCall - Attempting to create:', {
        callId: missedCallData.callId,
        callerUserId: missedCallData.callerUserId,
        receiverUserId: missedCallData.receiverUserId,
        callType: missedCallData.callType,
        missedReason: missedCallData.missedReason
      });

      const missedCall = new MissedCall({
        callId: missedCallData.callId,
        callerUserId: missedCallData.callerUserId,
        receiverUserId: missedCallData.receiverUserId,
        callType: missedCallData.callType,
        initiatedAt: missedCallData.initiatedAt,
        missedReason: missedCallData.missedReason,
        notificationSent: false,
        viewed: false
      });

      await missedCall.save();
      console.log('MongoDB createMissedCall - Successfully saved missed call:', missedCall._id);
      return missedCall;
    } catch (error) {
      console.error('MongoDB createMissedCall - Error creating missed call:', {
        error: error.message,
        name: error.name,
        callId: missedCallData.callId
      });
      throw error;
    }
  }

  async getMissedCalls(userId: number, page: number = 1, limit: number = 20): Promise<{ missedCalls: any[], pagination: any }> {
    try {
      const skip = (page - 1) * limit;

      const missedCalls = await MissedCall.find({ receiverUserId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await MissedCall.countDocuments({ receiverUserId: userId });
      const unreadCount = await MissedCall.countDocuments({ 
        receiverUserId: userId, 
        viewed: false 
      });

      // Get caller details for each missed call
      const missedCallsWithCallerInfo = await Promise.all(
        missedCalls.map(async (call) => {
          const caller = await this.getUserById(call.callerUserId);
          return {
            ...call,
            caller: {
              id: caller?.id,
              name: caller?.name,
              username: caller?.username,
              avatar: caller?.avatar
            }
          };
        })
      );

      return {
        missedCalls: missedCallsWithCallerInfo,
        pagination: {
          page,
          limit,
          total: totalCount,
          unread: unreadCount,
          hasMore: skip + missedCalls.length < totalCount
        }
      };
    } catch (error) {
      console.error('Error getting missed calls:', error);
      throw error;
    }
  }

  async markMissedCallAsViewed(callId: string, userId: number): Promise<boolean> {
    try {
      const result = await MissedCall.updateOne(
        { callId, receiverUserId: userId },
        { viewed: true }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error marking missed call as viewed:', error);
      return false;
    }
  }

  async markAllMissedCallsAsViewed(userId: number): Promise<number> {
    try {
      const result = await MissedCall.updateMany(
        { receiverUserId: userId, viewed: false },
        { viewed: true }
      );
      return result.modifiedCount || 0;
    } catch (error) {
      console.error('Error marking all missed calls as viewed:', error);
      return 0;
    }
  }

  async updateMissedCallNotificationStatus(callId: string, sent: boolean): Promise<boolean> {
    try {
      const result = await MissedCall.updateOne(
        { callId },
        { notificationSent: sent }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating missed call notification status:', error);
      return false;
    }
  }

  // Gift Management Methods
  async getActiveGifts(): Promise<any[]> {
    try {
      const gifts = await Gift.find({ isActive: true })
        .sort({ price: 1 })
        .lean();
      return gifts;
    } catch (error) {
      console.error('Error getting active gifts:', error);
      return [];
    }
  }

  async getGiftById(giftId: string): Promise<any> {
    try {
      const gift = await Gift.findById(giftId).lean();
      return gift;
    } catch (error) {
      console.error('Error getting gift by ID:', error);
      return null;
    }
  }

  async createGiftTransaction(transactionData: {
    giftId: string;
    senderId: number;
    receiverId: number;
    coinValue: number;
  }): Promise<any> {
    try {
      const giftTransaction = new GiftTransaction({
        giftId: transactionData.giftId,
        senderId: transactionData.senderId,
        receiverId: transactionData.receiverId,
        coinValue: transactionData.coinValue
      });

      await giftTransaction.save();
      return giftTransaction;
    } catch (error) {
      console.error('Error creating gift transaction:', error);
      throw error;
    }
  }

  async getGiftTransactionsPaginated(userId: number, type: string = 'all', page: number = 1, limit: number = 20): Promise<{ transactions: any[], pagination: any }> {
    try {
      const skip = (page - 1) * limit;
      
      // Build query based on transaction type
      let query: any = {};
      if (type === 'sent') {
        query.senderId = userId;
      } else if (type === 'received') {
        query.receiverId = userId;
      } else {
        query.$or = [
          { senderId: userId },
          { receiverId: userId }
        ];
      }

      const transactions = await GiftTransaction.find(query)
        .populate('giftId', 'name image price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await GiftTransaction.countDocuments(query);

      // Get user details for each transaction
      const transactionsWithUserInfo = await Promise.all(
        transactions.map(async (transaction) => {
          const [sender, receiver] = await Promise.all([
            this.getUserById(transaction.senderId.toString()),
            this.getUserById(transaction.receiverId.toString())
          ]);

          return {
            ...transaction,
            sender: {
              id: sender?.id,
              name: sender?.name,
              username: sender?.username,
              avatar: sender?.avatar
            },
            receiver: {
              id: receiver?.id,
              name: receiver?.name,
              username: receiver?.username,
              avatar: receiver?.avatar
            },
            gift: transaction.giftId,
            type: transaction.senderId.toString() === userId.toString() ? 'sent' : 'received'
          };
        })
      );

      return {
        transactions: transactionsWithUserInfo,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: skip + transactions.length < totalCount
        }
      };
    } catch (error) {
      console.error('Error getting gift transactions:', error);
      throw error;
    }
  }

  async getWalletByUserIdNumber(userId: number): Promise<any> {
    try {
      const wallet = await Wallet.findOne({ userId });
      return wallet;
    } catch (error) {
      console.error('Error getting wallet by user ID:', error);
      return null;
    }
  }

  // Profile picture approval system implementation
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
    console.log('MongoDB createProfilePictureRequest - Creating request for user:', data.userId);
    
    const request = await ProfilePictureRequest.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      imageUrl: data.imageUrl,
      userDetails: data.userDetails,
      status: 'pending',
      submittedAt: new Date()
    });
    
    console.log('MongoDB createProfilePictureRequest - Created request:', request._id);
    
    return {
      id: request._id.toString(),
      status: request.status,
      submittedAt: request.submittedAt
    };
  }

  async getPendingProfilePictureRequests(): Promise<Array<{
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
  }>> {
    console.log('MongoDB getPendingProfilePictureRequests - Fetching pending requests');
    
    const requests = await ProfilePictureRequest.find({ status: 'pending' })
      .sort({ submittedAt: -1 })
      .lean();
    
    console.log('MongoDB getPendingProfilePictureRequests - Found requests:', requests.length);
    
    return requests.map(request => ({
      id: request._id.toString(),
      userId: request.userId.toString(),
      imageUrl: request.imageUrl,
      status: request.status,
      submittedAt: request.submittedAt,
      userDetails: request.userDetails || {
        name: 'Unknown',
        username: 'Unknown',
        gender: 'unknown'
      }
    }));
  }

  async hasUserPendingProfilePictureRequest(userId: string): Promise<boolean> {
    console.log('MongoDB hasUserPendingProfilePictureRequest - Checking for user:', userId);
    
    const existingRequest = await ProfilePictureRequest.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending'
    });
    
    const hasPendingRequest = existingRequest !== null;
    console.log('MongoDB hasUserPendingProfilePictureRequest - Has pending request:', hasPendingRequest);
    
    return hasPendingRequest;
  }

  async getAllProfilePictureRequests(): Promise<Array<{
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
  }>> {
    console.log('MongoDB getAllProfilePictureRequests - Fetching all requests');
    
    const requests = await ProfilePictureRequest.find({})
      .sort({ submittedAt: -1 })
      .lean();
    
    console.log('MongoDB getAllProfilePictureRequests - Found requests:', requests.length);
    
    return requests.map(request => ({
      id: request._id.toString(),
      userId: request.userId.toString(),
      imageUrl: request.imageUrl,
      status: request.status,
      submittedAt: request.submittedAt,
      userDetails: request.userDetails || {
        name: '',
        username: '',
        gender: 'male'
      }
    }));
  }

  async approveProfilePictureRequest(requestId: string, adminId: string): Promise<{ success: boolean; message: string }> {
    console.log('MongoDB approveProfilePictureRequest - Approving request:', requestId, 'by admin:', adminId);
    
    try {
      const request = await ProfilePictureRequest.findById(requestId);
      if (!request) {
        return { success: false, message: 'Profile picture request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, message: 'Request has already been processed' };
      }

      // Update the user's avatar
      await User.findByIdAndUpdate(request.userId, { 
        avatar: request.imageUrl 
      });

      // Update the request status
      await ProfilePictureRequest.findByIdAndUpdate(requestId, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: new (mongoose as any).Types.ObjectId(adminId)
      });

      // Sync with Firebase
      const user = await User.findById(request.userId);
      if (user) {
        await FirestoreService.updateUserInFirestore(user._id.toString(), {
          avatar: request.imageUrl
        });
      }

      console.log('MongoDB approveProfilePictureRequest - Successfully approved');
      
      return { success: true, message: 'Profile picture approved and updated successfully' };
    } catch (error) {
      console.error('MongoDB approveProfilePictureRequest - Error:', error);
      return { success: false, message: 'Failed to approve profile picture' };
    }
  }

  async rejectProfilePictureRequest(requestId: string, adminId: string, reason: string): Promise<{ success: boolean; message: string }> {
    console.log('MongoDB rejectProfilePictureRequest - Rejecting request:', requestId, 'by admin:', adminId);
    
    try {
      const request = await ProfilePictureRequest.findById(requestId);
      if (!request) {
        return { success: false, message: 'Profile picture request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, message: 'Request has already been processed' };
      }

      // Update the request status
      await ProfilePictureRequest.findByIdAndUpdate(requestId, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: new (mongoose as any).Types.ObjectId(adminId),
        rejectionReason: reason
      });

      console.log('MongoDB rejectProfilePictureRequest - Successfully rejected');
      
      return { success: true, message: 'Profile picture rejected successfully' };
    } catch (error) {
      console.error('MongoDB rejectProfilePictureRequest - Error:', error);
      return { success: false, message: 'Failed to reject profile picture' };
    }
  }

  // User Blocking Management Methods
  
  async blockUserByAdmin(adminUserId: string, userId: string, reason?: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { 
      isBlocked: true,
      blockedAt: new Date(),
      blockedBy: adminUserId,
      blockReason: reason || 'Blocked by admin'
    });
  }

  async unblockUserByAdmin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { 
      isBlocked: false,
      blockedAt: null,
      blockedBy: null,
      blockReason: null
    });
  }

  async getBlockedUsersByAdmin(page: number = 1, limit: number = 20): Promise<{ users: any[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find({ isBlocked: true })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ isBlocked: true })
    ]);

    return { users, total };
  }

  // User Profile Blocking Methods (user-to-user blocking)


  async isUserBlockedByAdmin(blockerId: string, blockedUserId: string): Promise<boolean> {
    const block = await UserBlock.findOne({
      blockerId,
      blockedUserId,
      isActive: true
    });
    return !!block;
  }

  async getBlockedUserProfiles(userId: string, page: number = 1, limit: number = 20): Promise<{ users: any[], total: number }> {
    const skip = (page - 1) * limit;
    
    // Get blocked user IDs
    const blocks = await UserBlock.find({
      blockerId: userId,
      isActive: true
    })
    .skip(skip)
    .limit(limit)
    .lean();

    const total = await UserBlock.countDocuments({
      blockerId: userId,
      isActive: true
    });

    // Get user details for blocked users
    const blockedUserIds = blocks.map(block => block.blockedUserId);
    const users = await User.find({ _id: { $in: blockedUserIds } }).lean();

    // Combine block info with user info
    const enrichedUsers = blocks.map(block => {
      const user = users.find(u => u._id.toString() === block.blockedUserId);
      return {
        userId: block.blockedUserId,
        name: user?.name || user?.username || 'Unknown User',
        username: user?.username,
        avatar: user?.avatar,
        blockedAt: block.blockedAt,
        reason: block.reason
      };
    });

    return { users: enrichedUsers, total };
  }

  // Follow/Following system methods
  async followUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    console.log('MongoDB followUser - Following:', followerId, '->', followingId);
    
    try {
      // Check if users exist
      const [follower, following] = await Promise.all([
        User.findById(followerId),
        User.findById(followingId)
      ]);

      if (!follower) {
        return { success: false, message: 'Follower user not found' };
      }

      if (!following) {
        return { success: false, message: 'User to follow not found' };
      }

      if (followerId === followingId) {
        return { success: false, message: 'Cannot follow yourself' };
      }

      // Check if already following
      const existingFollow = await Follow.findOne({
        follower: new mongoose.Types.ObjectId(followerId),
        following: new mongoose.Types.ObjectId(followingId)
      });

      if (existingFollow) {
        return { success: false, message: 'Already following this user' };
      }

      // Create follow relationship
      const follow = new Follow({
        follower: new mongoose.Types.ObjectId(followerId),
        following: new mongoose.Types.ObjectId(followingId)
      });

      await follow.save();

      // Sync to Firebase
      await FirestoreService.updateUserInFirestore(followerId, {
        lastActivity: new Date().toISOString()
      });

      console.log('MongoDB followUser - Successfully created follow relationship');
      return { success: true, message: 'Successfully followed user' };

    } catch (error) {
      console.error('MongoDB followUser - Error:', error);
      return { success: false, message: 'Failed to follow user' };
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    console.log('MongoDB unfollowUser - Unfollowing:', followerId, '->', followingId);
    
    try {
      const result = await Follow.deleteOne({
        follower: new mongoose.Types.ObjectId(followerId),
        following: new mongoose.Types.ObjectId(followingId)
      });

      if (result.deletedCount === 0) {
        return { success: false, message: 'Follow relationship not found' };
      }

      // Sync to Firebase
      await FirestoreService.updateUserInFirestore(followerId, {
        lastActivity: new Date().toISOString()
      });

      console.log('MongoDB unfollowUser - Successfully removed follow relationship');
      return { success: true, message: 'Successfully unfollowed user' };

    } catch (error) {
      console.error('MongoDB unfollowUser - Error:', error);
      return { success: false, message: 'Failed to unfollow user' };
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await Follow.findOne({
        follower: new mongoose.Types.ObjectId(followerId),
        following: new mongoose.Types.ObjectId(followingId)
      });

      return !!follow;
    } catch (error) {
      console.error('MongoDB isFollowing - Error:', error);
      return false;
    }
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<{ followers: any[], pagination: any }> {
    console.log('MongoDB getFollowers - Getting followers for user:', userId);
    
    try {
      const skip = (page - 1) * limit;

      const follows = await Follow.find({ following: new mongoose.Types.ObjectId(userId) })
        .populate('follower', 'username name avatar gender profileType badgeLevel isOnline lastActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Follow.countDocuments({ following: new mongoose.Types.ObjectId(userId) });

      const followers = follows.map(follow => ({
        id: (follow.follower as any)._id,
        username: (follow.follower as any).username,
        name: (follow.follower as any).name,
        avatar: (follow.follower as any).avatar,
        gender: (follow.follower as any).gender,
        profileType: (follow.follower as any).profileType,
        badgeLevel: (follow.follower as any).badgeLevel,
        isOnline: (follow.follower as any).isOnline,
        lastActive: (follow.follower as any).lastActive,
        followedAt: follow.createdAt
      }));

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      console.log('MongoDB getFollowers - Found followers:', followers.length);
      return { followers, pagination };

    } catch (error) {
      console.error('MongoDB getFollowers - Error:', error);
      return { followers: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<{ following: any[], pagination: any }> {
    console.log('MongoDB getFollowing - Getting following for user:', userId);
    
    try {
      const skip = (page - 1) * limit;

      const follows = await Follow.find({ follower: new mongoose.Types.ObjectId(userId) })
        .populate('following', 'username name avatar gender profileType badgeLevel isOnline lastActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Follow.countDocuments({ follower: new mongoose.Types.ObjectId(userId) });

      const following = follows.map(follow => ({
        id: (follow.following as any)._id,
        username: (follow.following as any).username,
        name: (follow.following as any).name,
        avatar: (follow.following as any).avatar,
        gender: (follow.following as any).gender,
        profileType: (follow.following as any).profileType,
        badgeLevel: (follow.following as any).badgeLevel,
        isOnline: (follow.following as any).isOnline,
        lastActive: (follow.following as any).lastActive,
        followedAt: follow.createdAt
      }));

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      console.log('MongoDB getFollowing - Found following:', following.length);
      return { following, pagination };

    } catch (error) {
      console.error('MongoDB getFollowing - Error:', error);
      return { following: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  async getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    try {
      const [followersCount, followingCount] = await Promise.all([
        Follow.countDocuments({ following: new mongoose.Types.ObjectId(userId) }),
        Follow.countDocuments({ follower: new mongoose.Types.ObjectId(userId) })
      ]);

      return { followersCount, followingCount };
    } catch (error) {
      console.error('MongoDB getFollowCounts - Error:', error);
      return { followersCount: 0, followingCount: 0 };
    }
  }

  async getMutualFollows(userId1: string, userId2: string): Promise<any[]> {
    console.log('MongoDB getMutualFollows - Getting mutual follows between:', userId1, 'and', userId2);
    
    try {
      // Get users that both userId1 and userId2 follow
      const user1Following = await Follow.find({ follower: new mongoose.Types.ObjectId(userId1) }).select('following');
      const user2Following = await Follow.find({ follower: new mongoose.Types.ObjectId(userId2) }).select('following');

      const user1FollowingIds = user1Following.map(f => f.following.toString());
      const user2FollowingIds = user2Following.map(f => f.following.toString());

      const mutualFollowingIds = user1FollowingIds.filter(id => user2FollowingIds.includes(id));

      // Get user details for mutual follows
      const mutualUsers = await User.find({ 
        _id: { $in: mutualFollowingIds.map(id => new mongoose.Types.ObjectId(id)) }
      }).select('username name avatar gender profileType badgeLevel isOnline').lean();

      return mutualUsers.map(user => ({
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        gender: user.gender,
        profileType: user.profileType,
        badgeLevel: user.badgeLevel,
        isOnline: user.isOnline
      }));

    } catch (error) {
      console.error('MongoDB getMutualFollows - Error:', error);
      return [];
    }
  }

  async getSuggestedUsers(userId: string, limit: number = 10): Promise<any[]> {
    console.log('MongoDB getSuggestedUsers - Getting suggested users for:', userId);
    
    try {
      // Get users that the current user is already following
      const currentFollowing = await Follow.find({ follower: new mongoose.Types.ObjectId(userId) }).select('following');
      const followingIds = currentFollowing.map(f => f.following.toString());
      followingIds.push(userId); // Exclude self

      // Get users with similar interests or high badge levels (suggestion algorithm)
      const currentUser = await User.findById(userId).select('interests gender');
      
      let matchCriteria = {
        _id: { $nin: followingIds.map(id => new mongoose.Types.ObjectId(id)) },
        isBlocked: false
      };

      // Prefer users with similar interests if available
      if (currentUser?.interests && currentUser.interests.length > 0) {
        matchCriteria.interests = { $in: currentUser.interests };
      }

      let suggestedUsers = await User.find(matchCriteria)
        .select('username name avatar gender profileType badgeLevel isOnline interests')
        .sort({ badgeLevel: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      // If not enough users with similar interests, get other users
      if (suggestedUsers.length < limit) {
        const remainingLimit = limit - suggestedUsers.length;
        const existingIds = suggestedUsers.map(u => u._id.toString());
        
        const additionalUsers = await User.find({
          _id: { 
            $nin: [...followingIds, ...existingIds].map(id => new mongoose.Types.ObjectId(id))
          },
          isBlocked: false
        })
        .select('username name avatar gender profileType badgeLevel isOnline')
        .sort({ badgeLevel: -1, createdAt: -1 })
        .limit(remainingLimit)
        .lean();

        suggestedUsers = [...suggestedUsers, ...additionalUsers];
      }

      return suggestedUsers.map(user => ({
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        gender: user.gender,
        profileType: user.profileType,
        badgeLevel: user.badgeLevel,
        isOnline: user.isOnline,
        commonInterests: currentUser?.interests ? 
          (user.interests || []).filter(interest => currentUser.interests.includes(interest)) : []
      }));

    } catch (error) {
      console.error('MongoDB getSuggestedUsers - Error:', error);
      return [];
    }
  }

  async searchUsersToFollow(userId: string, query: string, limit: number = 20): Promise<any[]> {
    console.log('MongoDB searchUsersToFollow - Searching users for:', userId, 'query:', query);
    
    try {
      // Get users that the current user is already following
      const currentFollowing = await Follow.find({ follower: new mongoose.Types.ObjectId(userId) }).select('following');
      const followingIds = currentFollowing.map(f => f.following.toString());
      followingIds.push(userId); // Exclude self

      const searchResults = await User.find({
        _id: { $nin: followingIds.map(id => new mongoose.Types.ObjectId(id)) },
        isBlocked: false,
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      })
      .select('username name avatar gender profileType badgeLevel isOnline')
      .sort({ badgeLevel: -1 })
      .limit(limit)
      .lean();

      return searchResults.map(user => ({
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        gender: user.gender,
        profileType: user.profileType,
        badgeLevel: user.badgeLevel,
        isOnline: user.isOnline
      }));

    } catch (error) {
      console.error('MongoDB searchUsersToFollow - Error:', error);
      return [];
    }
  }

  async getFollowRequests(userId: string): Promise<any[]> {
    // Placeholder for future private account functionality
    console.log('MongoDB getFollowRequests - Feature not yet implemented for user:', userId);
    return [];
  }

  // Banner operations
  async getBanners(): Promise<BannerType[]> {
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    return banners.map(banner => this.toSchemaFormat(banner));
  }

  async getBanner(id: number | string): Promise<BannerType | undefined> {
    const banner = await Banner.findById(id);
    return banner ? this.toSchemaFormat(banner) : undefined;
  }

  async createBanner(bannerData: InsertBanner): Promise<BannerType> {
    const newBanner = await Banner.create(bannerData);
    return this.toSchemaFormat(newBanner);
  }

  async updateBanner(id: number | string, updates: Partial<BannerType>): Promise<BannerType | undefined> {
    const banner = await Banner.findByIdAndUpdate(id.toString(), updates, { new: true });
    return banner ? this.toSchemaFormat(banner) : undefined;
  }

  async deleteBanner(id: number | string): Promise<boolean> {
    const result = await Banner.findByIdAndDelete(id.toString());
    return !!result;
  }

}