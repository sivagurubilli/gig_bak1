import mongoose from 'mongoose';

const callRatingSchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  raterUserId: {
    type: String,
    required: true,
    index: true
  },
  ratedUserId: {
    type: String,
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: ['video', 'audio', 'message'],
    required: true
  },
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  callQuality: {
    type: Number,
    min: 1,
    max: 5
  },
  userExperience: {
    type: Number,
    min: 1,
    max: 5
  },
  communication: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    enum: [
      'great_conversation',
      'good_connection',
      'poor_audio',
      'poor_video',
      'friendly',
      'professional',
      'helpful',
      'rude',
      'inappropriate',
      'technical_issues',
      'would_recommend',
      'entertaining'
    ]
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  callDuration: {
    type: Number, // in seconds
    default: 0
  },
  reportIssue: {
    type: Boolean,
    default: false
  },
  issueType: {
    type: String,
    enum: ['technical', 'behavior', 'content', 'other']
  },
  issueDescription: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
callRatingSchema.index({ ratedUserId: 1, createdAt: -1 });
callRatingSchema.index({ raterUserId: 1, createdAt: -1 });
callRatingSchema.index({ overallRating: 1 });
callRatingSchema.index({ callType: 1, overallRating: -1 });

export const CallRating = mongoose.model('CallRating', callRatingSchema);