import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  propertyAddress: string;
  postcode: string;
  currentRating: string;
  currentScore: number;
  potentialRating: string;
  potentialScore: number;
  assessorName: string;
  assessmentDate: string;
  companyName: string;
  epcData: Record<string, unknown>;
  reportPath: string;
  createdAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    propertyAddress: { type: String, required: true },
    postcode: { type: String },
    currentRating: { type: String },
    currentScore: { type: Number },
    potentialRating: { type: String },
    potentialScore: { type: Number },
    assessorName: { type: String },
    assessmentDate: { type: String },
    companyName: { type: String },
    epcData: { type: Schema.Types.Mixed },
    reportPath: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IReport>('Report', ReportSchema);
