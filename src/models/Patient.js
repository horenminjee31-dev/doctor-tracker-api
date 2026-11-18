import mongoose from "mongoose";
import { GENDERS } from "../constants.js";

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, required: true, enum: GENDERS },
    condition: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 24, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    visitDate: { type: Date, required: true, default: Date.now },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

patientSchema.index({ doctor: 1, visitDate: -1 });
patientSchema.index({ visitDate: -1 });
patientSchema.index({ condition: 1, visitDate: -1 });
patientSchema.index({ createdAt: -1 });

export const Patient = mongoose.model("Patient", patientSchema);
