import mongoose, { Schema, Document } from 'mongoose';

export interface IProfilePictureRequest extends Document {
  userId: mongoose.Types.ObjectId;
  imageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  userDetails?: {
    name: string;
    username: string;
    email?: string;
    gender: string;
  };
}

const profilePictureRequestSchema = new Schema<IProfilePictureRequest>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: {
    type: String
  },
  userDetails: {
    name: String,
    username: String,
    email: String,
    gender: String
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
profilePictureRequestSchema.index({ status: 1, submittedAt: -1 });

export const ProfilePictureRequest = mongoose.model<IProfilePictureRequest>('ProfilePictureRequest', profilePictureRequestSchema);