import mongoose, { Schema, Document } from 'mongoose';

export interface ICoinPackage extends Document {
  name: string;
  coinAmount: number;
  price: string;
  description: string | null;
  discount: number | null;
  isActive: boolean;
  createdAt: Date;
}

const coinPackageSchema = new Schema<ICoinPackage>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  coinAmount: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  discount: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const CoinPackage = mongoose.model<ICoinPackage>('CoinPackage', coinPackageSchema);