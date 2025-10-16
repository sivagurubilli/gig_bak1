import mongoose, { Schema, Document } from 'mongoose';

export interface IGift extends Document {
  name: string;
  image: string;
  coinValue: number;
  isActive: boolean;
  createdAt: Date;
}

const giftSchema = new Schema<IGift>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  coinValue: {
    type: Number,
    required: true,
    min: 1
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

export const Gift = mongoose.model<IGift>('Gift', giftSchema);