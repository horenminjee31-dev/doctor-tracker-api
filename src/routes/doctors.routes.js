import { Router } from "express";
import {
  addDoctorPatient,
  createDoctor,
  deleteDoctor,
  getDoctor,
  listDoctorPatients,
  listDoctors,
  updateDoctor,
} from "../controllers/doctors.controller.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  doctorCreateSchema,
  doctorUpdateSchema,
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
router.patch("/:id", validateParams(idParamSchema), validateBody(doctorUpdateSchema), updateDoctor);
router.delete("/:id", validateParams(idParamSchema), deleteDoctor);
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
