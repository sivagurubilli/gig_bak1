import admin from 'firebase-admin';

// Initialize Firebase Admin
const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      // Use environment variables for Firebase configuration
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };

      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        console.log('Firebase environment variables not configured - Firebase features will be disabled');
        return null;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
      });
      
      console.log('Firebase Admin initialized successfully');
      return admin;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return null;
    }
  }
  
  return admin;
};

const firebase = initializeFirebase();
export const firestore = firebase?.firestore();
export const auth = firebase?.auth();

// Helper functions for Firestore operations
export class FirestoreService {
  
  // Sync user profile to Firestore
  static async syncUserProfile(userId: string, userData: any) {
    if (!firestore) {
      console.log('Firebase not configured - skipping profile sync');
      return false;
    }

    try {
      const userRef = firestore.collection('users').doc(userId);
      
      const profileData = {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar,
        gender: userData.gender,
        profileType: userData.profileType,
        badgeLevel: userData.badgeLevel,
        language: userData.language,
        dob: userData.dob,
        interests: userData.interests || [],
        aboutMe: userData.aboutMe,
        isOnline: userData.isOnline,
        lastActive: userData.lastActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await userRef.set(profileData, { merge: true });
      console.log(`User profile synced to Firestore: ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Error syncing user profile to Firestore:', error);
      return false;
    }
  }

  // Store transaction in Firestore for real-time access
  static async storeTransaction(transactionData: any) {
    if (!firestore) {
      console.log('Firebase not configured - skipping transaction storage');
      return null;
    }

    try {
      const transactionRef = firestore.collection('transactions').doc();
      
      const transaction = {
        id: transactionData.id,
        userId: transactionData.userId,
        type: transactionData.type,
        amount: transactionData.amount,
        description: transactionData.description,
        status: transactionData.status || 'completed',
        metadata: transactionData.metadata || {},
        createdAt: transactionData.createdAt,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await transactionRef.set(transaction);
      console.log(`Transaction stored in Firestore: ${transactionData.id}`);
      
      return transactionRef.id;
    } catch (error) {
      console.error('Error storing transaction in Firestore:', error);
      return null;
    }
  }

  // Store wallet transaction for real-time wallet updates
  static async storeWalletTransaction(walletTransactionData: any) {
    if (!firestore) {
      console.log('Firebase not configured - skipping wallet transaction storage');
      return false;
    }

    try {
      const docId = walletTransactionData.id?.toString() || firestore.collection('walletTransactions').doc().id;
      const walletTransactionRef = firestore
        .collection('walletTransactions')
        .doc(docId);
      
      const transaction = {
        id: walletTransactionData.id,
        userId: walletTransactionData.userId,
        type: walletTransactionData.type,
        amount: walletTransactionData.amount,
        description: walletTransactionData.description,
        balanceAfter: walletTransactionData.balanceAfter,
        createdAt: walletTransactionData.createdAt,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await walletTransactionRef.set(transaction, { merge: true });
      console.log(`Wallet transaction stored in Firestore: ${walletTransactionData.id}`);
      
      return true;
    } catch (error) {
      console.error('Error storing wallet transaction in Firestore:', error);
      return false;
    }
  }

  // Update user's online status in real-time
  static async updateUserOnlineStatus(userId: string, isOnline: boolean) {
    if (!firestore) {
      console.log('Firebase not configured - skipping online status update');
      return false;
    }

    try {
      const userRef = firestore.collection('users').doc(userId);
      
      await userRef.update({
        isOnline,
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating user online status:', error);
      return false;
    }
  }

  // Update user profile data in Firestore (for admin updates)
  static async updateUserInFirestore(userId: string, userData: any) {
    if (!firestore) {
      console.log('Firebase not configured - skipping user update');
      return false;
    }

    try {
      const userRef = firestore.collection('users').doc(userId);
      
      const updateData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await userRef.set(updateData, { merge: true });
      console.log('User data updated in Firestore:', userId);
      
      return true;
    } catch (error) {
      console.error('Error updating user in Firestore:', error);
      return false;
    }
  }

  // Store gift transaction for real-time gift tracking
  static async storeGiftTransaction(giftData: any) {
    if (!firestore) {
      console.log('Firebase not configured - skipping gift transaction storage');
      return null;
    }

    try {
      const giftRef = firestore.collection('giftTransactions').doc();
      
      const gift = {
        id: giftData.id,
        senderId: giftData.senderId,
        receiverId: giftData.receiverId,
        giftId: giftData.giftId,
        giftName: giftData.giftName,
        giftImage: giftData.giftImage,
        coinValue: giftData.coinValue,
        message: giftData.message || '',
        createdAt: giftData.createdAt,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await giftRef.set(gift);
      console.log(`Gift transaction stored in Firestore: ${giftData.id}`);
      
      return giftRef.id;
    } catch (error) {
      console.error('Error storing gift transaction in Firestore:', error);
      return null;
    }
  }

  // Sync call configuration to Firebase for real-time access
  static async syncCallConfiguration(configData: {
    videoCallCoinsPerMin: number;
    audioCallCoinsPerMin: number;
    gStarAudioCoinsPerMin: number;
    gStarVideoCoinsPerMin: number;
    messageCoins: number;
    adminCommissionPercent: number;
    gstarAdminCommission: number;
    giconAdminCommission: number;
    coinToRupeeRatio: number;
  }) {
    if (!firestore) {
      console.log('Firebase not configured - skipping call config sync');
      return false;
    }

    try {
      const configRef = firestore.collection('appSettings').doc('callConfiguration');
      
      const config = {
        videoCallCoinsPerMin: configData.videoCallCoinsPerMin,
        audioCallCoinsPerMin: configData.audioCallCoinsPerMin,
        gStarAudioCoinsPerMin: configData.gStarAudioCoinsPerMin,
        gStarVideoCoinsPerMin: configData.gStarVideoCoinsPerMin,
        messageCoins: configData.messageCoins,
        adminCommissionPercent: configData.adminCommissionPercent,
        gstarAdminCommission: configData.gstarAdminCommission,
        giconAdminCommission: configData.giconAdminCommission,
        coinToRupeeRatio: configData.coinToRupeeRatio,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await configRef.set(config, { merge: true });
      console.log('Call configuration synced to Firebase');
      
      return true;
    } catch (error) {
      console.error('Error syncing call configuration to Firebase:', error);
      return false;
    }
  }

  // Update user wallet balance in real-time
  static async updateUserWallet(userId: string, walletData: any) {
    if (!firestore) {
      console.log('Firebase not configured - skipping wallet update');
      return false;
    }

    try {
      const walletRef = firestore.collection('userWallets').doc(userId);
      
      const wallet = {
        userId: walletData.userId,
        coinBalance: walletData.coinBalance,
        totalEarned: walletData.totalEarned,
        totalSpent: walletData.totalSpent,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await walletRef.set(wallet, { merge: true });
      console.log(`User wallet updated in Firestore: ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Error updating user wallet in Firestore:', error);
      return false;
    }
  }
  
  // Send push notification to specific user
  static async sendNotification(userId: string, notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  }) {
    if (!admin.apps.length) {
      console.log('Firebase not initialized - skipping notification');
      return false;
    }

    try {
      // Get user's FCM token from Firestore (assumes app stores it)
      const userDoc = await firestore?.collection('users').doc(userId).get();
      const fcmToken = userDoc?.data()?.fcmToken;
      
      if (!fcmToken) {
        console.log(`No FCM token found for user ${userId} - skipping notification`);
        return false;
      }

      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl
        },
        data: notification.data || {},
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#7c3aed',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`Notification sent to user ${userId}:`, response);
      
      return true;
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
      return false;
    }
  }

  // Send call-related notifications
  static async sendCallNotification(
    receiverUserId: string, 
    callerName: string, 
    callType: 'call_incoming' | 'call_started' | 'call_ended' | 'call_missed',
    callData?: any
  ) {
    const notifications = {
      call_incoming: {
        title: 'Incoming Call',
        body: `${callerName} is calling you`,
        data: {
          type: 'incoming_call',
          callId: callData?.callId || '',
          callerUserId: callData?.callerUserId || '',
          callType: callData?.callType || 'video'
        }
      },
      call_started: {
        title: 'Call Started',
        body: `Call with ${callerName} has started`,
        data: {
          type: 'call_started',
          callId: callData?.callId || '',
          callType: callData?.callType || 'video'
        }
      },
      call_ended: {
        title: 'Call Ended',
        body: `Call with ${callerName} has ended`,
        data: {
          type: 'call_ended',
          callId: callData?.callId || '',
          duration: callData?.duration?.toString() || '0',
          coinsSpent: callData?.coinsSpent?.toString() || '0'
        }
      },
      call_missed: {
        title: 'Missed Call',
        body: `You missed a ${callData?.callType || 'video'} call from ${callerName}`,
        data: {
          type: 'missed_call',
          callId: callData?.callId || '',
          callerUserId: callData?.callerUserId || '',
          callType: callData?.callType || 'video',
          missedReason: callData?.missedReason || 'no_answer'
        }
      }
    };

    const notification = notifications[callType];
    return await this.sendNotification(receiverUserId, notification);
  }

  // Send wallet-related notifications
  static async sendWalletNotification(
    userId: string, 
    type: 'recharge' | 'debit' | 'earning' | 'withdrawal' | 'gift_sent' | 'gift_received',
    walletData?: any
  ) {
    const notifications = {
      recharge: {
        title: 'Wallet Recharged',
        body: `${walletData?.amount || 0} coins added to your wallet`,
        data: { type: 'wallet_recharge', amount: walletData?.amount?.toString() || '0' }
      },
      debit: {
        title: 'Coins Deducted',
        body: `${walletData?.amount || 0} coins deducted from your wallet`,
        data: { type: 'wallet_debit', amount: walletData?.amount?.toString() || '0' }
      },
      earning: {
        title: 'Coins Earned',
        body: `You earned ${walletData?.amount || 0} coins${walletData?.details ? ` from ${walletData.details}` : ''}`,
        data: { type: 'wallet_earning', amount: walletData?.amount?.toString() || '0' }
      },
      withdrawal: {
        title: 'Withdrawal Request',
        body: `Withdrawal of ${walletData?.amount || 0} coins has been processed`,
        data: { type: 'wallet_withdrawal', amount: walletData?.amount?.toString() || '0' }
      },
      gift_sent: {
        title: 'Gift Sent',
        body: `You sent ${walletData?.giftName || 'a gift'} to ${walletData?.receiverName || 'someone'}`,
        data: {
          type: 'gift_sent',
          amount: walletData?.amount?.toString() || '0',
          giftName: walletData?.giftName || '',
          receiverName: walletData?.receiverName || ''
        }
      },
      gift_received: {
        title: 'Gift Received',
        body: `You received ${walletData?.giftName || 'a gift'} from ${walletData?.senderName || 'someone'}`,
        data: {
          type: 'gift_received',
          amount: walletData?.amount?.toString() || '0',
          giftName: walletData?.giftName || '',
          senderName: walletData?.senderName || '',
          message: walletData?.message || ''
        }
      }
    };

    const notification = notifications[type];
    return await this.sendNotification(userId, notification);
  }

  // Add missing Firebase rating methods
  static async updateUserRating(userId: string, ratingData: any) {
    try {
      const userRef = firestore.collection('users').doc(userId);
      await userRef.update({
        averageRating: ratingData.averageRating,
        totalRatings: ratingData.totalRatings,
        ratingDistribution: ratingData.ratingDistribution,
        lastRatingUpdate: new Date()
      });
      console.log(`Updated rating data for user ${userId} in Firebase`);
    } catch (error) {
      console.error('Error updating user rating in Firebase:', error);
    }
  }
}

// Export individual functions for easier importing
export async function updateUserInFirestore(userId: string, userData: any) {
  return await FirestoreService.updateUserInFirestore(userId, userData);
}

export async function updateUserWallet(userId: string, walletData: any) {
  return await FirestoreService.updateUserWallet(userId, walletData);
}

export async function updateUserOnlineStatus(userId: string, isOnline: boolean) {
  return await FirestoreService.updateUserOnlineStatus(userId, isOnline);
}

export async function storeWalletTransaction(walletTransactionData: any) {
  return await FirestoreService.storeWalletTransaction(walletTransactionData);
}

export async function storeGiftTransaction(giftData: any) {
  return await FirestoreService.storeGiftTransaction(giftData);
}

export default firebase;