import mongoose, { Schema, Document } from 'mongoose';

export interface IGiftTransaction extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  giftId: mongoose.Types.ObjectId;
  coinValue: number;
  createdAt: Date;
}

const giftTransactionSchema = new Schema<IGiftTransaction>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  giftId: {
    type: Schema.Types.ObjectId,
    ref: 'Gift',
    required: true
  },
  coinValue: {
    type: Number,
    required: true,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const GiftTransaction = mongoose.model<IGiftTransaction>('GiftTransaction', giftTransactionSchema);