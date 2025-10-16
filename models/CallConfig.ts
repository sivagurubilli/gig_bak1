import mongoose, { Document, Schema } from 'mongoose';

export interface ICallConfig extends Document {
  videoCallCoinsPerMin: number;
  audioCallCoinsPerMin: number;
  gStarAudioCoinsPerMin: number;
  gStarVideoCoinsPerMin: number;
  messageCoins: number;
  adminCommissionPercent: number;
  gstarAdminCommission: number;
  giconAdminCommission: number;
  coinToRupeeRatio: number; // How many coins equal 1 rupee (default: 10)
  updatedAt: Date;
}

const CallConfigSchema = new Schema<ICallConfig>({
  videoCallCoinsPerMin: { type: Number, required: true, default: 10 },
  audioCallCoinsPerMin: { type: Number, required: true, default: 5 },
  gStarAudioCoinsPerMin: { type: Number, required: true, default: 8 },
  gStarVideoCoinsPerMin: { type: Number, required: true, default: 15 },
  messageCoins: { type: Number, required: true, default: 1 },
  adminCommissionPercent: { type: Number, required: true, default: 20, min: 0, max: 100 },
  gstarAdminCommission: { type: Number, required: true, default: 15, min: 0, max: 100 },
  giconAdminCommission: { type: Number, required: true, default: 10, min: 0, max: 100 },
  coinToRupeeRatio: { type: Number, required: true, default: 10, min: 1, max: 1000 },
  updatedAt: { type: Date, default: Date.now }
});

// Use a singleton pattern for configuration - only one config document
CallConfigSchema.index({}, { unique: true });

export const CallConfig = mongoose.model<ICallConfig>('CallConfig', CallConfigSchema);