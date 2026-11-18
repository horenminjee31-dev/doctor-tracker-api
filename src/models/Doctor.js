import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    specialization: { type: String, required: true, trim: true, maxlength: 80 },
    hospital: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 160,
    },
  },
  { timestamps: true }
);

doctorSchema.index({ createdAt: -1 });
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1 });
doctorSchema.index({ name: 1 });

export const Doctor = mongoose.model("Doctor", doctorSchema);
