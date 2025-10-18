import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  id: string; // MongoDB _id converted to id
  username: string;
  name: string;
  email: string;
  phoneNumber: string; // Phone number for OTP authentication
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
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    sparse: true, // Allow null values but enforce uniqueness for non-null values
    trim: true
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

// Add transform to convert _id to id
userSchema.set('toJSON', {
  transform: function(doc: any, ret: any) {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model<IUser>('User', userSchema);