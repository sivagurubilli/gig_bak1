import { MongoStorage } from '../mongoStorage';

const storage = new MongoStorage();

interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  userId?: string;
  topic?: string;
}

interface NotificationTemplate {
  type: 'gift_received' | 'wallet_recharged' | 'withdrawal_approved' | 'level_up' | 'new_leaderboard';
  title: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  gift_received: {
    type: 'gift_received',
    title: '🎁 Gift Received!',
    body: 'You received a {giftName} from {senderName}!'
  },
  wallet_recharged: {
    type: 'wallet_recharged',
    title: '💰 Wallet Recharged',
    body: 'Your wallet has been recharged with {amount} coins!'
  },
  withdrawal_approved: {
    type: 'withdrawal_approved',
    title: '✅ Withdrawal Approved',
    body: 'Your withdrawal of ₹{amount} has been approved!'
  },
  level_up: {
    type: 'level_up',
    title: '🌟 Level Up!',
    body: 'Congratulations! You reached {profileType} status!'
  },
  new_leaderboard: {
    type: 'new_leaderboard',
    title: '🏆 New Leaderboard',
    body: 'Weekly leaderboard updated! Check your ranking!'
  }
};

class NotificationService {
  async sendPushNotification(notification: PushNotification): Promise<boolean> {
    try {
      // In production, integrate with Firebase Cloud Messaging (FCM)
      // For now, we'll simulate and log the notification
      
      console.log('📱 Push Notification Sent:', {
        timestamp: new Date().toISOString(),
        title: notification.title,
        body: notification.body,
        userId: notification.userId,
        topic: notification.topic,
        data: notification.data
      });

      // Store notification in database for tracking
      if (notification.userId) {
        await this.storeNotification({
          userId: parseInt(notification.userId),
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          isRead: false
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  async sendGiftNotification(recipientId: string, giftName: string, senderName: string): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.gift_received;
    const body = template.body
      .replace('{giftName}', giftName)
      .replace('{senderName}', senderName);

    await this.sendPushNotification({
      title: template.title,
      body,
      userId: recipientId,
      data: {
        type: 'gift_received',
        giftName,
        senderName
      }
    });
  }

  async sendWalletRechargeNotification(userId: string, amount: number): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.wallet_recharged;
    const body = template.body.replace('{amount}', amount.toString());

    await this.sendPushNotification({
      title: template.title,
      body,
      userId,
      data: {
        type: 'wallet_recharged',
        amount
      }
    });
  }

  async sendWithdrawalApprovedNotification(userId: string, amount: string): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.withdrawal_approved;
    const body = template.body.replace('{amount}', amount);

    await this.sendPushNotification({
      title: template.title,
      body,
      userId,
      data: {
        type: 'withdrawal_approved',
        amount
      }
    });
  }

  async sendLevelUpNotification(userId: string, profileType: string): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.level_up;
    const body = template.body.replace('{profileType}', profileType.toUpperCase());

    await this.sendPushNotification({
      title: template.title,
      body,
      userId,
      data: {
        type: 'level_up',
        profileType
      }
    });
  }

  async sendLeaderboardUpdateNotification(): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.new_leaderboard;

    await this.sendPushNotification({
      title: template.title,
      body: template.body,
      topic: 'all_users',
      data: {
        type: 'new_leaderboard'
      }
    });
  }

  async storeNotification(notification: {
    userId: number;
    title: string;
    body: string;
    data: Record<string, any>;
    isRead: boolean;
  }): Promise<void> {
    try {
      // For now, we'll use console logging
      // In production, store in notifications collection
      console.log('📱 Notification stored:', {
        ...notification,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    try {
      // In production, retrieve from notifications collection
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      // In production, update notification in database
      console.log('📱 Notification marked as read:', notificationId);
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();