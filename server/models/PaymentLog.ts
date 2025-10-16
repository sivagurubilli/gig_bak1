import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentLog extends Document {
  userId: mongoose.Types.ObjectId;
  amount: string;
  paymentMethod: string;
  transactionId: string | null;
  status: string;
  createdAt: Date;
}

const paymentLogSchema = new Schema<IPaymentLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank_transfer', 'crypto'],
    default: 'card'
  },
  transactionId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'pending', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const PaymentLog = mongoose.model<IPaymentLog>('PaymentLog', paymentLogSchema);