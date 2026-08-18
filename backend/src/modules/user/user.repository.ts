import { Prisma } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { safeUserSelect } from "../../utils/selectors/user.select";
import { paginate } from "../../utils/db/paginate";
import { SafeUser } from "../../types/user.types";

const ACTIVE_FILTER = { deletedAt: null };

const buildScopedUserWhere = (
  id: string,
  organizationId?: string | null,
): Prisma.UserWhereInput => ({
  id,
  ...(organizationId ? { organizationId } : {}),
  ...ACTIVE_FILTER,
});

async function findById(
  id: string,
  organizationId?: string | null,
  select?: Prisma.UserSelect,
  tx?: DB,
) : Promise<SafeUser | null> {
  const db = tx || prisma;
  return (await db.user.findFirst({
    where: buildScopedUserWhere(id, organizationId),
    select: select || safeUserSelect,
  })) as any as SafeUser | null;
}

async function findByEmail(email: string, idToIgnore?: string, tx?: DB) {
  const db = tx || prisma;
  const normalizedEmail = email.toLowerCase().trim();
  const where: Prisma.UserWhereInput = { 
    email: normalizedEmail,
    ...ACTIVE_FILTER 
  };
  if (idToIgnore) {
    where.id = { not: idToIgnore };
  }
  return db.user.findFirst({
    where,
    select: { id: true },
  });
}

async function create(data: Prisma.UserCreateInput, tx?: DB): Promise<SafeUser> {
  const db = tx || prisma;
  return (await db.user.create({
    data,
    select: safeUserSelect,
  })) as any as SafeUser;
}

async function findMany(where: Prisma.UserWhereInput, tx?: DB) : Promise<SafeUser[]> {
  const db = tx || prisma;
  return (await db.user.findMany({
    where: {
      ...where,
      ...ACTIVE_FILTER,
    },
    select: safeUserSelect,
    orderBy: { createdAt: "desc" },
  })) as any as SafeUser[];
}

async function getUsers(
  where: Prisma.UserWhereInput,
  options: { page: number; limit: number },
  tx?: DB,
) : Promise<{ data: SafeUser[]; meta: any }> {
  const db = tx || prisma;
  const finalWhere: Prisma.UserWhereInput = {
    ...where,
    ...ACTIVE_FILTER,
  };

  const result = await paginate(
    db.user,
    finalWhere,
    options,
    db,
    {
      select: safeUserSelect,
      orderBy: { createdAt: "desc" },
    }
  );
  return result as any as { data: SafeUser[]; meta: any };
}

async function update(
  id: string,
  data: Prisma.UserUncheckedUpdateInput,
  organizationId?: string | null,
  tx?: DB,
) {
  const db = tx || prisma;
  // Enforce organization scoping via findFirst check
  const user = await db.user.findFirst({
    where: buildScopedUserWhere(id, organizationId),
    select: { id: true },
  });

  if (!user) return null;

  return (await db.user.update({
    where: { id },
    data,
    select: safeUserSelect,
  })) as any as SafeUser;
}

export const userRepository = {
  findById,
  findByEmail,
  create,
  findMany,
  getUsers,
  update,
};
