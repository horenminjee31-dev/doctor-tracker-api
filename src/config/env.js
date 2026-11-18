import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET ?? "";

if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters (see .env.example)");
}

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/doctor_tracker",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  cookieSameSite: process.env.COOKIE_SAMESITE || "lax",
  cookieSecure:
    process.env.COOKIE_SECURE === "true" ||
    (isProduction && process.env.COOKIE_SECURE !== "false"),
  trustProxy: process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true",
  rootDir,
};
