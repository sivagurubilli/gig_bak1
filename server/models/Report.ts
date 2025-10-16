import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  reason: string;
  description: string | null;
  status: string;
  action: string | null;
  remarks: string | null;
  createdAt: Date;
}

const reportSchema = new Schema<IReport>({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: ['inappropriate_content', 'harassment', 'spam', 'fake_profile', 'other'],
    required: true
  },
  description: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  action: {
    type: String,
    enum: ['warning', 'suspension', 'permanent_block'],
    default: null
  },
  remarks: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Report = mongoose.model<IReport>('Report', reportSchema);