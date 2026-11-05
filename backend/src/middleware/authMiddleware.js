import jwt from "jsonwebtoken";

export const requireAuth = (request, response, next) => {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return response.status(401).json({ message: "Authentication required." });
  try {
    request.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired token." });
  }
};
