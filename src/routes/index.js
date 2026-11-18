import { Router } from "express";
import authRoutes from "./auth.routes.js";
import doctorsRoutes from "./doctors.routes.js";
import patientsRoutes from "./patients.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import { requireAuth } from "../middleware/auth.js";
import { CONDITIONS, GENDERS, SPECIALIZATIONS } from "../constants.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

router.use("/auth", authRoutes);

router.get("/meta", requireAuth, (_req, res) => {
  res.json({ specializations: SPECIALIZATIONS, conditions: CONDITIONS, genders: GENDERS });
});

router.use("/doctors", requireAuth, doctorsRoutes);
router.use("/patients", requireAuth, patientsRoutes);
router.use("/dashboard", requireAuth, dashboardRoutes);

export default router;
