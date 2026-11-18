import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  if (env.trustProxy) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.clientOrigin.split(",").map((origin) => origin.trim()),
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  if (!env.isProduction) app.use(morgan("dev"));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 600,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    })
  );

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
