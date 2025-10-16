import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  name: string;
  email: string;
  gender: string;
  avatar: string | null;
  isBlocked: boolean;
  profileType: string; // 'basic' | 'gicon' | 'gstar' | 'both'
  badgeLevel: number;
  language: string; // User's preferred language
  dob: Date | null; // Date of birth
  interests: string[]; // Array of user interests
  aboutMe: string | null; // User's about me description
  isOnline: boolean;
  lastActive: Date | null;
  fcmToken: string | null; // Firebase Cloud Messaging token for push notifications
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  profileType: {
    type: String,
    enum: ['basic', 'gicon', 'gstar', 'both'],
    default: 'basic'
  },
  badgeLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  language: {
    type: String,
    default: 'en'
  },
  dob: {
    type: Date,
    default: null
  },
  interests: {
    type: [String],
    default: []
  },
  aboutMe: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: null
  },
  fcmToken: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.model<IUser>('User', userSchema);