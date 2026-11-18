import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../lib/ApiError.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const AUTH_COOKIE = "dt_session";

export function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
};

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized("Session expired, please sign in again");
  }

  const user = await User.findById(payload.sub).select("name email role").lean();
  if (!user) throw ApiError.unauthorized();

  req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, "You do not have permission to perform this action"));
  }
  next();
};
