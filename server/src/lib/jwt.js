import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";

export function signUserToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, restaurantId: user.restaurantId, name: user.name },
    SECRET,
    { expiresIn: "12h" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
