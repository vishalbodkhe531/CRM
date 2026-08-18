import { Prisma } from "@prisma/client";
import { safeUserSelect } from "../utils/selectors/user.select";

export type SafeUser = Prisma.UserGetPayload<{
  select: typeof safeUserSelect;
}>;

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      organizationId?: string;
    }
  }
}
