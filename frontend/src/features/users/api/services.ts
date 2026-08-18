import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type { ResetPasswordResult, User, UserListParams } from "../types";
import type { CreateUserInput, UpdateUserInput } from "@/contracts/validation";
import { USER_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

export const usersService = {
  getUsers: (params?: UserListParams) =>
    service.get<User[]>(USER_ENDPOINTS.LIST, { params }),

  getUserDetail: (id: string) =>
    service.get<User>(USER_ENDPOINTS.DETAIL(id)).then((res) => res.data),

  createUser: (data: CreateUserInput) => {
    const payload = {
      ...data,
      managerId: data.managerId === null ? undefined : data.managerId,
    };
    return service
      .post<User>(USER_ENDPOINTS.CREATE, payload)
      .then((res) => res.data);
  },

  updateUser: (id: string, data: UpdateUserInput) => {
    const payload = {
      ...data,
      managerId: data.managerId === null ? undefined : data.managerId,
    };
    return service
      .put<User>(USER_ENDPOINTS.UPDATE(id), payload)
      .then((res) => res.data);
  },

  enableUser: (id: string) =>
    service.patch<User>(USER_ENDPOINTS.ENABLE(id)).then((res) => res.data),

  disableUser: (id: string) =>
    service.patch<User>(USER_ENDPOINTS.DISABLE(id)).then((res) => res.data),

  deleteUser: (id: string) => service.delete<void>(USER_ENDPOINTS.DELETE(id)),

  /**
   * Super-admin only. The temporary password is returned once and is not
   * retrievable afterwards — never cache or persist this response.
   */
  resetUserPassword: (id: string) =>
    service
      .post<ResetPasswordResult>(USER_ENDPOINTS.RESET_PASSWORD(id))
      .then((res) => res.data),
};
