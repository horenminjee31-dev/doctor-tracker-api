import { Router } from "express";
import {
  addDoctorPatient,
  createDoctor,
  getDoctor,
  listDoctorPatients,
  listDoctors,
} from "../controllers/doctors.controller.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  doctorCreateSchema,
  doctorIdParamSchema,
  doctorPatientsQuerySchema,
  doctorsQuerySchema,
  idParamSchema,
  patientCreateSchema,
} from "../schemas/index.js";

const router = Router();

router.get("/", validateQuery(doctorsQuerySchema), listDoctors);
router.post("/", validateBody(doctorCreateSchema), createDoctor);
router.get("/:id", validateParams(idParamSchema), getDoctor);
router.get(
  "/:doctorId/patients",
  validateParams(doctorIdParamSchema),
  validateQuery(doctorPatientsQuerySchema),
  listDoctorPatients
);
router.post(
  "/:doctorId/patients",
  validateParams(doctorIdParamSchema),
  validateBody(patientCreateSchema),
  addDoctorPatient
);

export default router;
