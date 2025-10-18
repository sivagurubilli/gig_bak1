import mongoose from 'mongoose';

const CallSessionSchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true
  },
  callerUserId: {
    type: String,
    required: true,
    ref: 'User'
  },
  receiverUserId: {
    type: String,
    required: true,
    ref: 'User'
  },
  callType: {
    type: String,
    enum: ['video', 'audio', 'message'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'connected', 'ended', 'failed'],
    default: 'initiated'
  },
  coinsPerMinute: {
    type: Number,
    required: true
  },
  adminCommissionPercent: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  totalCoinsDeducted: {
    type: Number,
    default: 0
  },
  coinsToReceiver: {
    type: Number,
    default: 0
  },
  adminCommission: {
    type: Number,
    default: 0
  },
  paymentProcessed: {
    type: Boolean,
    default: false
  },
  // New fields for dynamic call time management
  maxAllowedMinutes: {
    type: Number,
    default: 0
  },
  remainingMinutes: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Additional fields for enhanced call tracking
  connectedAt: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  coinsDeducted: {
    type: Number,
    default: 0
  },
  endReason: {
    type: String,
    enum: ['completed', 'timeout', 'user_disconnected', 'insufficient_coins', 'admin_ended'],
    default: 'completed'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

export default mongoose.model('CallSession', CallSessionSchema);