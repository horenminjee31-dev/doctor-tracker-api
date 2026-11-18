import { Router } from "express";
import { deletePatient, listPatients, updatePatient } from "../controllers/patients.controller.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { idParamSchema, patientUpdateSchema, patientsQuerySchema } from "../schemas/index.js";

const router = Router();

router.get("/", validateQuery(patientsQuerySchema), listPatients);
router.patch("/:id", validateParams(idParamSchema), validateBody(patientUpdateSchema), updatePatient);
router.delete("/:id", validateParams(idParamSchema), deletePatient);

export default router;
