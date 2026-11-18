import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../lib/ApiError.js";

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation failed",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error?.name === "ValidationError" && error.errors) {
    return res.status(422).json({
      message: "Validation failed",
      details: Object.entries(error.errors).map(([field, issue]) => ({
        field,
        message: issue.message,
      })),
    });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for ${error.path}` });
  }

  if (error?.code === 11000) {
    const field = Object.keys(error.keyValue ?? {})[0] ?? "field";
    return res.status(409).json({ message: `A record with this ${field} already exists` });
  }

  if (!env.isProduction) console.error(error);
  return res.status(500).json({ message: "Something went wrong on our side" });
}
