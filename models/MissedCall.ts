import mongoose, { Document, Schema } from 'mongoose';

export interface IMissedCall extends Document {
  callId: string;
  callerUserId: string;
  receiverUserId: string;
  callType: 'video' | 'audio' | 'message';
  initiatedAt: Date;
  missedReason: 'no_answer' | 'declined' | 'busy' | 'offline' | 'timeout' | 'inactive' | 'dnd';
  notificationSent: boolean;
  viewed: boolean;
  createdAt: Date;
}

const MissedCallSchema = new Schema<IMissedCall>({
  callId: { type: String, required: true },
  callerUserId: { type: String, required: true },
  receiverUserId: { type: String, required: true },
  callType: { type: String, enum: ['video', 'audio', 'message'], required: true },
  initiatedAt: { type: Date, required: true },
  missedReason: { 
    type: String, 
    enum: ['no_answer', 'declined', 'busy', 'offline', 'timeout', 'inactive', 'dnd'], 
    required: true 
  },
  notificationSent: { type: Boolean, default: false },
  viewed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
MissedCallSchema.index({ callId: 1 }, { unique: true });
MissedCallSchema.index({ receiverUserId: 1, createdAt: -1 });
MissedCallSchema.index({ callerUserId: 1, createdAt: -1 });

export const MissedCall = mongoose.model<IMissedCall>('MissedCall', MissedCallSchema);