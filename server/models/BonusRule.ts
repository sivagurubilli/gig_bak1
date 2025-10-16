import mongoose, { Schema, Document } from 'mongoose';

export interface IBonusRule extends Document {
  name: string;
  type: string;
  coinReward: number;
  conditions: any;
  isActive: boolean;
  createdAt: Date;
}

const bonusRuleSchema = new Schema<IBonusRule>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['daily_login', 'online_time', 'first_purchase'],
    required: true
  },
  coinReward: {
    type: Number,
    required: true,
    min: 1
  },
  conditions: {
    type: Schema.Types.Mixed,
    required: true
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

export const BonusRule = mongoose.model<IBonusRule>('BonusRule', bonusRuleSchema);