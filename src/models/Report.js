'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReportSchema = new Schema(
  {
    propertyAddress: { type: String, required: true },
    postcode: { type: String },
    currentRating: { type: String },
    potentialRating: { type: String },
    currentScore: { type: Number },
    potentialScore: { type: Number },
    assessorName: { type: String },
    companyName: { type: String },
    assessmentDate: { type: String },
    filename: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
