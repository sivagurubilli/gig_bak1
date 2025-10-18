import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  id: number;
  userId: mongoose.Types.ObjectId;
  type: string;
  period: string;
  value: number;
  score: number; // Alias for value
  rank: number;
  periodStart: Date;
  periodEnd: Date;
  updatedAt: Date;
}

const leaderboardEntrySchema = new Schema<ILeaderboardEntry>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['gifters', 'earners', 'receivers'],
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'all_time'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  rank: {
    type: Number,
    required: true,
    min: 1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  periodStart: {
    type: Date,
    default: Date.now
  },
  periodEnd: {
    type: Date,
    default: Date.now
  }
});

// Add virtual for score (alias for value)
leaderboardEntrySchema.virtual('score').get(function() {
  return this.value;
});

// Ensure virtual fields are serialized
leaderboardEntrySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Compound index for efficient querying
leaderboardEntrySchema.index({ type: 1, period: 1, rank: 1 });

export const LeaderboardEntry = mongoose.model<ILeaderboardEntry>('LeaderboardEntry', leaderboardEntrySchema);