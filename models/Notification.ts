import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: string;
  targetUsers: string;
  senderId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['announcement', 'update', 'warning', 'promotion'],
    default: 'announcement'
  },
  targetUsers: {
    type: String,
    enum: ['all', 'active', 'blocked'],
    default: 'all'
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);