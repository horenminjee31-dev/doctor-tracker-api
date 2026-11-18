import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema } from "../schemas/index.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again in 15 minutes." },
});

const router = Router();

router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
