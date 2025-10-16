import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  coinBalance: number;
  totalEarned: string;
  totalSpent: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  coinBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: String,
    default: "0.00"
  },
  totalSpent: {
    type: String,
    default: "0.00"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);