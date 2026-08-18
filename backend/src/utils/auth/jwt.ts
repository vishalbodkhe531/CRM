import jwt, { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env";
 
const jwtPayloadSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  organizationId: z.string().optional(),
  organizationPrefix: z.string().optional(),
  nonce: z.string().uuid().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
 
export type JWTPayload = z.infer<typeof jwtPayloadSchema>;
 
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
 
const parseJwtPayload = (value: unknown): JWTPayload => {
  return jwtPayloadSchema.parse(value);
};
 
/**
 * Generate access token for a user
 */
export const signAccessToken = (payload: JWTPayload): string => {
  const { iat: _iat, exp: _exp, ...cleanPayload } = payload;
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  };
  return jwt.sign(cleanPayload, env.JWT_SECRET, options);
};
 
/**
 * Generate refresh token for a user
 */
export const signRefreshToken = (payload: JWTPayload): string => {
  const { iat: _iat, exp: _exp, ...cleanPayload } = payload;
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  };
  return jwt.sign(cleanPayload, env.JWT_REFRESH_SECRET, options);
};
 
/**
 * Verify and decode access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return parseJwtPayload(jwt.verify(token, env.JWT_SECRET));
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw error;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw error;
    }
    // If it's a ZodError or other unexpected error
    throw error;
  }
};
 
/**
 * Verify and decode refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return parseJwtPayload(jwt.verify(token, env.JWT_REFRESH_SECRET));
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      throw new Error(error.message);
    }
    throw error;
  }
};
 
/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: JWTPayload): TokenPair => {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};
