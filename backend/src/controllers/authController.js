import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { email, text } from "../utils/validation.js";

const tokenFor = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
export const register = async (request, response) => {
  const { name, email: address, password } = request.body;
  if (
    !text(name) ||
    !email(address) ||
    typeof password !== "string" ||
    password.length < 8
  )
    return response
      .status(400)
      .json({
        message: "Name, valid email, and an 8-character password are required.",
      });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await User.create({ name, email: address, passwordHash });
    return response
      .status(201)
      .json({
        user: { id: user.id, name: user.name, email: user.email },
        token: tokenFor(user),
      });
  } catch (error) {
    if (error.code === 11000)
      return response
        .status(409)
        .json({ message: "That email is already registered." });
    throw error;
  }
};
export const login = async (request, response) => {
  const { email: address, password } = request.body;
  const user = await User.findOne({ email: address?.toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash)))
    return response
      .status(401)
      .json({ message: "Email or password is incorrect." });
  return response.json({
    user: { id: user.id, name: user.name, email: user.email },
    token: tokenFor(user),
  });
};
