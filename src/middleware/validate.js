import { ApiError } from "../lib/ApiError.js";

const formatIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(new ApiError(422, "Validation failed", formatIssues(result.error)));
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const error = new ApiError(422, "Invalid query parameters", formatIssues(result.error));
    return next(error);
  }
  req.valid = { ...req.valid, query: result.data };
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return next(new ApiError(422, "Invalid path parameters", formatIssues(result.error)));
  }
  req.valid = { ...req.valid, params: result.data };
  next();
};
