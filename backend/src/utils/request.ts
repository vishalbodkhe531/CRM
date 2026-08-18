import { Request } from "express";

/**
 * Extracts the real client IP address from the request.
 * Reliable fallback chain for various environments (Render, Nginx, direct).
 */
export const extractIp = (req: Request): string | undefined => {
  const forwarded = req.headers["x-forwarded-for"];
  
  // 1. x-forwarded-for (first IP in the list)
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  
  // 2. req.ip (express trust proxy must be enabled)
  if (req.ip) {
    return req.ip;
  }
  
  // 3. socket remote address
  return req.socket.remoteAddress;
};

/**
 * Extracts the refresh token from the httpOnly cookies.
 */
export const getRefreshToken = (req: Request): string | undefined => {
  return req.cookies?.refresh_token;
};
