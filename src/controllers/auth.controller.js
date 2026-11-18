import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { ApiError } from "../lib/ApiError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AUTH_COOKIE, cookieOptions, signSession } from "../middleware/auth.js";

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  res.cookie(AUTH_COOKIE, signSession(user), cookieOptions);
  res.json({ user: publicUser(user) });
});

export const logout = (_req, res) => {
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(AUTH_COOKIE, clearOptions);
  res.status(204).end();
};

export const me = (req, res) => {
  res.json({ user: req.user });
};
