import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  amount: number;
  description: string;
  adminId: mongoose.Types.ObjectId | null;
  status: string;
  transactionId: string | null;
  metadata: any;
  createdAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'bonus', 'purchase', 'gift_received', 'gift_sent', 'withdrawal', 'call_payment', 'call_earning'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  transactionId: {
    type: String,
    default: null
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const WalletTransaction = mongoose.model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);