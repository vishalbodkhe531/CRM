import { Prisma } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { safeUserSelect } from "../../utils/selectors";

export const authRepository = {
  
  async findUserByEmail(email: string, tx?: DB) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { email },
      select: safeUserSelect,
    });
  },

  async findUserByEmailWithPassword(email: string, tx?: DB) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            status: true,
          },
        },
      },
    });
  },

  async findUserForPasswordReset(email: string, tx?: DB) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            status: true,
          },
        },
      },
    });
  },

  async findUserById(id: string, tx?: DB) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  },

  async findUserByIdWithPassword(id: string, tx?: DB) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { id },
    });
  },

  async createUser(data: Prisma.UserCreateInput, tx?: DB) {
    const db = tx || prisma;
    return db.user.create({
      data,
      select: safeUserSelect,
    });
  },

  async updateUserLastLogin(id: string, tx?: DB) {
    const db = tx || prisma;
    return db.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: safeUserSelect,
    });
  },

  async updateUserProfile(
    id: string,
    data: Prisma.UserUncheckedUpdateInput,
    tx?: DB,
  ) {
    const db = tx || prisma;
    return db.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  },

  async updateUserPassword(
    id: string,
    password: string,
    tx?: DB,
  ) {
    const db = tx || prisma;
    return db.user.update({
      where: { id },
      data: {
        password,
        passwordChangedAt: new Date(),
      },
      select: safeUserSelect,
    });
  },

  async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    ip?: string,
    userAgent?: string,
    tx?: DB,
  ) {
    const db = tx || prisma;
    return db.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        expiresAt,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
  },

  async findRefreshToken(tokenHash: string, tx?: DB) {
    const db = tx || prisma;
    return db.refreshToken.findUnique({
      where: { token: tokenHash },
      include: {
        user: {
          include: {
            organization: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });
  },

  async markTokenAsReplaced(tokenHash: string, tx?: DB) {
    const db = tx || prisma;
    return db.refreshToken.update({
      where: { token: tokenHash },
      data: { replacedAt: new Date() },
    });
  },

  async markAsUsedAfterRotation(tokenHash: string, tx?: DB) {
    const db = tx || prisma;
    return db.refreshToken.update({
      where: { token: tokenHash },
      data: { isUsedAfterRotation: true },
    });
  },

  async deleteRefreshToken(tokenHash: string, tx?: DB) {
    const db = tx || prisma;
    try {
      return await db.refreshToken.delete({
        where: { token: tokenHash },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return null;
      }
      throw error;
    }
  },

  async deleteAllUserRefreshTokens(userId: string, tx?: DB) {
    const db = tx || prisma;
    return db.refreshToken.deleteMany({
      where: { userId },
    });
  },

  async deleteOldTokens(tx?: DB) {
    const db = tx || prisma;
    const oneMinuteAgo = new Date(Date.now() - 60000);
    return db.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { replacedAt: { lt: oneMinuteAgo } },
        ],
      },
    });
  },

  async createPasswordResetOtp(
    data: {
      userId: string;
      otpHash: string;
      expiresAt: Date;
      requestedIp?: string;
      requestedUserAgent?: string;
    },
    tx?: DB,
  ) {
    const db = tx || prisma;
    return db.passwordResetOtp.create({
      data: {
        userId: data.userId,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        requestedIp: data.requestedIp ?? null,
        requestedUserAgent: data.requestedUserAgent ?? null,
      },
    });
  },

  async findPasswordResetOtp(otpHash: string, tx?: DB) {
    const db = tx || prisma;
    return db.passwordResetOtp.findUnique({
      where: { otpHash },
      include: {
        user: {
          include: {
            organization: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });
  },

  async findLatestPendingPasswordResetOtp(userId: string, tx?: DB) {
    const db = tx || prisma;
    return db.passwordResetOtp.findFirst({
      where: {
        userId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async incrementPasswordResetOtpFailures(id: string, tx?: DB) {
    const db = tx || prisma;
    return db.passwordResetOtp.update({
      where: { id },
      data: { failedAttempts: { increment: 1 } },
    });
  },

  async markPasswordResetOtpUsed(
    id: string,
    consumedIp?: string,
    consumedUserAgent?: string,
    tx?: DB,
  ) {
    const db = tx || prisma;
    return db.passwordResetOtp.updateMany({
      where: {
        id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
        consumedIp: consumedIp ?? null,
        consumedUserAgent: consumedUserAgent ?? null,
      },
    });
  },

  async revokeUnusedPasswordResetOtps(
    userId: string,
    excludeId?: string,
    tx?: DB,
  ) {
    const db = tx || prisma;
    return db.passwordResetOtp.updateMany({
      where: {
        userId,
        usedAt: null,
        revokedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      data: {
        revokedAt: new Date(),
      },
    });
  },

  async revokePasswordResetOtp(id: string, tx?: DB) {
    const db = tx || prisma;
    return db.passwordResetOtp.updateMany({
      where: {
        id,
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  },

  async deleteOldPasswordResetOtps(tx?: DB) {
    const db = tx || prisma;
    const retentionCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return db.passwordResetOtp.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: retentionCutoff } },
          { usedAt: { lt: retentionCutoff } },
          { revokedAt: { lt: retentionCutoff } },
        ],
      },
    });
  },

  /**
   * Helper to fetch active refresh tokens for a user, ordered by creation.
   */
  async getActiveRefreshTokens(userId: string, tx?: DB) {
    const db = tx || prisma;
    return db.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Helper to rotate tokens and keep session count under control.
   */
  async rotateRefreshTokens(userId: string, tokensToKeep: string[], tx?: DB) {
    const db = tx || prisma;
    return db.refreshToken.deleteMany({
      where: {
        userId,
        id: { notIn: tokensToKeep },
      },
    });
  },
};
