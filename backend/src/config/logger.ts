import winston from "winston";
import path from "path";
import { env } from "./env";

const isDevelopment = env.NODE_ENV !== "production";

/** Type guard for plain objects to avoid 'as' casting per project rules */
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

// Fields to redact from logs for security
const sensitiveFields = [
  "password",
  "token",
  "refreshToken",
  "authorization",
  "passwordHash",
  "secret",
  "apiKey",
];

// Custom format to redact sensitive fields
const redactFormat = winston.format((info) => {
  const redactedInfo = { ...info };

  // Redact sensitive fields at top level
  sensitiveFields.forEach((field) => {
    if (redactedInfo[field] !== undefined) {
      redactedInfo[field] = "[REDACTED]";
    }
  });

  // Redact in nested objects (like error details, meta, etc.)
  ["meta", "details", "data", "body"].forEach((key) => {
    const obj = redactedInfo[key];
    if (isRecord(obj)) {
      sensitiveFields.forEach((field) => {
        if (field in obj) {
          obj[field] = "[REDACTED]";
        }
      });
    }
  });

  return redactedInfo;
});

const logFormat = winston.format.combine(
  redactFormat(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  redactFormat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  }),
);

const transports: winston.transport[] = [];

if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: env.LOG_LEVEL || "debug",
    }),
  );
} else {
  transports.push(
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: logFormat, // Keep JSON format in Prod for better parsing, no colors
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  format: logFormat,
  transports,
  exitOnError: false,
});

export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
