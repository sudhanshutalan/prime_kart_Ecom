import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user?.id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict", // Add this for CSRF protection
  maxAge: parseInt(process.env.COOKIE_EXPIRES_IN || "7") * 24 * 60 * 60 * 1000, // Use maxAge instead of expires
});
