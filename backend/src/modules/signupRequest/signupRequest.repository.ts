import { Prisma, SignupRequestStatus } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { paginate } from "../../utils/db/paginate";

export interface SignupRequestFindAllOptions {
  pageNum?: number;
  limitNum?: number;
  search?: string;
  status?: SignupRequestStatus | SignupRequestStatus[];
}

const buildSignupRequestWhere = (
  options: SignupRequestFindAllOptions,
): Prisma.SignupRequestWhereInput => {
  const where: Prisma.SignupRequestWhereInput = {};

  if (options.search) {
    where.OR = [
      { firstName: { contains: options.search, mode: "insensitive" } },
      { lastName: { contains: options.search, mode: "insensitive" } },
      { email: { contains: options.search, mode: "insensitive" } },
      { companyName: { contains: options.search, mode: "insensitive" } },
      { phone: { contains: options.search, mode: "insensitive" } },
    ];
  }

  if (options.status) {
    where.status = Array.isArray(options.status)
      ? { in: options.status }
      : options.status;
  }

  return where;
};

export const signupRequestRepository = {
  create: async (
    data: Prisma.SignupRequestUncheckedCreateInput,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.signupRequest.create({ data });
  },

  findByEmail: async (email: string, tx?: DB) => {
    const db = tx || prisma;
    return db.signupRequest.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
  },

  findActiveUserByEmail: async (email: string, tx?: DB) => {
    const db = tx || prisma;
    return db.user.findUnique({ where: { email } });
  },

  findAll: async (options: SignupRequestFindAllOptions = {}, tx?: DB) => {
    const db = tx || prisma;
    const page = options.pageNum || 1;
    const limit = Math.min(options.limitNum || 20, 100);
    const where = buildSignupRequestWhere(options);

    return paginate(db.signupRequest, where, { page, limit }, db, {
      orderBy: { createdAt: "desc" },
    });
  },

  findById: async (id: string, tx?: DB) => {
    const db = tx || prisma;
    return db.signupRequest.findUnique({ where: { id } });
  },

  updateStatus: async (
    id: string,
    data: {
      status: SignupRequestStatus;
      adminNotes?: string | null;
      reviewedBy: string;
      reviewedAt: Date;
    },
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.signupRequest.update({
      where: { id },
      data,
    });
  },
};
