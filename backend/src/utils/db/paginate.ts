import { DB } from "../../config/db";

interface PaginateOptions {
  page: number;
  limit: number;
}

/**
 * Standardized repository pagination helper.
 * Eliminates redundant boilerplate for paginated data fetching.
 */
export async function paginate<T>(
  model: {
    findMany: (args: any) => Promise<T[]>;
    count: (args: any) => Promise<number>;
  },
  where: any,
  options: PaginateOptions,
  tx?: DB,
  otherParams: any = {},
) {
  const { page, limit } = options;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      skip,
      take: limit,
      ...otherParams,
    }),
    model.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
