import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  name: string;
  type: string;
  content: string;
  version: string;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['terms', 'privacy', 'guidelines', 'nda', 'scope'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);