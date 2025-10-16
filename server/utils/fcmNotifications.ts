import admin from 'firebase-admin';

interface NotificationPayload {
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
  sound?: string;
}

interface NotificationTarget {
  token?: string;
  topic?: string;
  userId?: string;
}

class FCMNotificationService {
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (!admin.apps.length) {
        // Firebase admin is already initialized in the main app
        console.log('FCM Notification Service ready');
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
      this.initialized = false;
    }
  }

  async sendNotification(target: NotificationTarget, payload: NotificationPayload): Promise<boolean> {
    if (!this.initialized) {
      console.error('FCM not initialized');
      return false;
    }

    try {
      let message: admin.messaging.Message;

      const baseMessage = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl
        },
        data: payload.data || {},
        android: {
          notification: {
            sound: payload.sound || 'default',
            channelId: 'gigglebuz_notifications',
            priority: 'high' as const,
            defaultSound: true
          },
          priority: 'high' as const
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: 1,
              alert: {
                title: payload.title,
                body: payload.body
              }
            }
          }
        }
      };

      // Set target based on type
      if (target.token) {
        message = { ...baseMessage, token: target.token };
      } else if (target.topic) {
        message = { ...baseMessage, topic: target.topic };
      } else {
        throw new Error('No valid target provided');
      }

      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  async sendToMultipleTokens(tokens: string[], payload: NotificationPayload): Promise<{ success: number; failure: number }> {
    if (!this.initialized || tokens.length === 0) {
      return { success: 0, failure: tokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl
        },
        data: payload.data || {},
        tokens: tokens,
        android: {
          notification: {
            sound: payload.sound || 'default',
            channelId: 'gigglebuz_notifications',
            priority: 'high' as const,
            defaultSound: true
          },
          priority: 'high' as const
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Successfully sent ${response.successCount} messages`);
      
      if (response.failureCount > 0) {
        console.log(`Failed to send ${response.failureCount} messages`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Error for token ${tokens[idx]}:`, resp.error);
          }
        });
      }

      return {
        success: response.successCount,
        failure: response.failureCount
      };
    } catch (error) {
      console.error('Error sending multicast message:', error);
      return { success: 0, failure: tokens.length };
    }
  }

  async sendCoinPackagePurchaseNotification(userToken: string, packageName: string, coinAmount: number): Promise<boolean> {
    return this.sendNotification(
      { token: userToken },
      {
        title: '🎉 Purchase Successful!',
        body: `You've received ${coinAmount.toLocaleString()} coins from ${packageName}`,
        data: {
          type: 'coin_purchase',
          packageName,
          coinAmount: coinAmount.toString(),
          timestamp: new Date().toISOString()
        },
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200',
        sound: 'coin_sound'
      }
    );
  }

  async sendGiftReceivedNotification(userToken: string, giftName: string, senderName: string): Promise<boolean> {
    return this.sendNotification(
      { token: userToken },
      {
        title: '🎁 Gift Received!',
        body: `${senderName} sent you a ${giftName}`,
        data: {
          type: 'gift_received',
          giftName,
          senderName,
          timestamp: new Date().toISOString()
        },
        imageUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=200',
        sound: 'gift_sound'
      }
    );
  }

  async sendLeaderboardUpdateNotification(userToken: string, newRank: number, category: string): Promise<boolean> {
    return this.sendNotification(
      { token: userToken },
      {
        title: '🏆 Leaderboard Update!',
        body: `You're now #${newRank} in ${category} leaderboard!`,
        data: {
          type: 'leaderboard_update',
          rank: newRank.toString(),
          category,
          timestamp: new Date().toISOString()
        },
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200',
        sound: 'achievement_sound'
      }
    );
  }

  async sendWalletTransactionNotification(userToken: string, amount: number, type: 'credit' | 'debit'): Promise<boolean> {
    const emoji = type === 'credit' ? '💰' : '💸';
    const action = type === 'credit' ? 'received' : 'spent';
    
    return this.sendNotification(
      { token: userToken },
      {
        title: `${emoji} Wallet Update`,
        body: `You ${action} ₹${amount.toFixed(2)}`,
        data: {
          type: 'wallet_transaction',
          amount: amount.toString(),
          transactionType: type,
          timestamp: new Date().toISOString()
        },
        sound: 'transaction_sound'
      }
    );
  }

  async sendPromotionalNotification(topic: string, title: string, body: string, imageUrl?: string): Promise<boolean> {
    return this.sendNotification(
      { topic },
      {
        title,
        body,
        data: {
          type: 'promotional',
          timestamp: new Date().toISOString()
        },
        imageUrl,
        sound: 'promotional_sound'
      }
    );
  }

  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    try {
      await admin.messaging().subscribeToTopic([token], topic);
      console.log(`Successfully subscribed token to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return false;
    }
  }

  async unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
    try {
      await admin.messaging().unsubscribeFromTopic([token], topic);
      console.log(`Successfully unsubscribed token from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      return false;
    }
  }

  async sendToTopic(topic: string, notification: { title: string; body: string; imageUrl?: string }, data: any): Promise<any> {
    return this.sendNotification({ topic }, {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      data
    });
  }

  async sendToDevice(token: string, notification: { title: string; body: string; imageUrl?: string }, data: any): Promise<any> {
    return this.sendNotification({ token }, {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      data
    });
  }
}

export const fcmNotificationService = new FCMNotificationService();
export const fcmNotifications = fcmNotificationService;
export { NotificationPayload, NotificationTarget };