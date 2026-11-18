import { z } from "zod";
import { CONDITIONS, GENDERS, SPECIALIZATIONS } from "../constants.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const phone = z
  .string()
  .trim()
  .regex(/^[+()\-\s\d]{6,24}$/, "Enter a valid phone number");
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const pageQuery = {
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
};

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const doctorCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  specialization: z.enum(SPECIALIZATIONS, {
    message: `Specialization must be one of: ${SPECIALIZATIONS.join(", ")}`,
  }),
  hospital: z.string().trim().min(2, "Hospital is too short").max(120),
  phone,
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(160),
});

export const doctorsQuerySchema = z.object({
  ...pageQuery,
  specialization: z.enum(SPECIALIZATIONS).optional(),
  sort: z.enum(["newest", "oldest", "name", "name_desc"]).optional(),
});

export const patientCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  age: z.coerce.number().int("Age must be a whole number").min(0).max(130),
  gender: z.enum(GENDERS),
  condition: z.enum(CONDITIONS),
  phone: phone.optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
  visitDate: z.coerce.date(),
});

export const patientUpdateSchema = patientCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const patientsQuerySchema = z.object({
  ...pageQuery,
  condition: z.enum(CONDITIONS).optional(),
  gender: z.enum(GENDERS).optional(),
  doctorId: objectId.optional(),
  sort: z.enum(["visit_newest", "visit_oldest", "name", "newest"]).optional(),
});

export const doctorPatientsQuerySchema = z.object({
  ...pageQuery,
  condition: z.enum(CONDITIONS).optional(),
  sort: z.enum(["visit_newest", "visit_oldest", "name"]).optional(),
});

export const idParamSchema = z.object({ id: objectId });
export const doctorIdParamSchema = z.object({ doctorId: objectId });
