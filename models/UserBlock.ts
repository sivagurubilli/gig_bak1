import mongoose, { Schema, Document } from 'mongoose';

export interface IUserBlock extends Document {
  blockerId: string;
  blockedUserId: string;
  reason?: string;
  blockedAt: Date;
  isActive: boolean;
}

const UserBlockSchema: Schema = new Schema({
  blockerId: {
    type: String,
    required: true
  },
  blockedUserId: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    enum: ['inappropriate_behavior', 'harassment', 'spam', 'fake_profile', 'other'],
    default: 'other'
  },
  blockedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one block per user pair
UserBlockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

// Index for finding who blocked a user
UserBlockSchema.index({ blockedUserId: 1, isActive: 1 });

// Index for finding who a user has blocked
UserBlockSchema.index({ blockerId: 1, isActive: 1 });

export default mongoose.model<IUserBlock>('UserBlock', UserBlockSchema);