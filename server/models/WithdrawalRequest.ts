import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawalRequest extends Document {
  userId: mongoose.Types.ObjectId;
  coinAmount: number; // Original coin amount requested
  rupeeAmount: string; // Converted rupee amount (coinAmount / 10)
  status: string;
  accountType: string | null; // 'bank' | 'upi' | 'paytm'
  accountDetails: string | null; // JSON string of account details
  remarks: string | null;
  processedBy: mongoose.Types.ObjectId | null;
  processedAt: Date | null;
  createdAt: Date;
}

const withdrawalRequestSchema = new Schema<IWithdrawalRequest>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coinAmount: {
    type: Number,
    required: true,
    min: 10 // Minimum withdrawal is 10 coins (1 rupee)
  },
  rupeeAmount: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  accountType: {
    type: String,
    enum: ['bank', 'upi', 'paytm'],
    default: null
  },
  accountDetails: {
    type: String,
    default: null
  },
  remarks: {
    type: String,
    default: null
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const WithdrawalRequest = mongoose.model<IWithdrawalRequest>('WithdrawalRequest', withdrawalRequestSchema);