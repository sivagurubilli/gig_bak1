import mongoose, { Schema, Document } from 'mongoose';

export interface IUserReport extends Document {
  reporterId: string;
  reportedUserId: string;
  reportType: 'inappropriate_content' | 'harassment' | 'spam' | 'fake_profile' | 'underage' | 'violence' | 'nudity' | 'hate_speech' | 'other';
  description?: string;
  evidence?: {
    screenshots?: string[];
    chatLogs?: string[];
    callId?: string;
    giftTransactionId?: string;
  };
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminNotes?: string;
  reportedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // Admin ID who reviewed
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionTaken?: string;
}

const UserReportSchema: Schema = new Schema({
  reporterId: {
    type: String,
    required: true,
    index: true
  },
  reportedUserId: {
    type: String,
    required: true,
    index: true
  },
  reportType: {
    type: String,
    required: true,
    enum: [
      'inappropriate_content',
      'harassment', 
      'spam',
      'fake_profile',
      'underage',
      'violence',
      'nudity',
      'hate_speech',
      'other'
    ]
  },
  description: {
    type: String,
    maxlength: 1000
  },
  evidence: {
    screenshots: [String],
    chatLogs: [String],
    callId: String,
    giftTransactionId: String
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    maxlength: 2000
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: String, // Admin ID
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  actionTaken: String
}, {
  timestamps: true
});

// Index for admin review queue
UserReportSchema.index({ status: 1, severity: -1, reportedAt: -1 });

// Index for finding reports about a specific user
UserReportSchema.index({ reportedUserId: 1, status: 1 });

// Index for finding reports by a specific user
UserReportSchema.index({ reporterId: 1, reportedAt: -1 });

export default mongoose.model<IUserReport>('UserReport', UserReportSchema);