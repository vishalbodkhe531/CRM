import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { usersService } from "../api/services";
import { extractApiError } from "@/utils/apiError";
import { toast } from "@/utils/toast";
import type { CreateUserInput, UpdateUserInput } from "@/contracts/validation";
import type { User } from "../types";

interface UserListCache {
  data?: User[];
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.listScope });
      toast.success("User created successfully");
    },
    onError: (error) => {
      toast.error(extractApiError(error).message ?? "Failed to create user");
    },
  });
};

/**
 * Super-admin password reset.
 *
 * The temporary password comes back exactly once. It is deliberately not written
 * into the query cache — the caller holds it in component state and shows it in
 * a one-time dialog.
 */
export const useResetUserPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.resetUserPassword(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.listScope });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.users.detailScope, id] as const,
      });
    },
    onError: (error) => {
      toast.error(extractApiError(error).message ?? "Failed to reset password");
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => 
      usersService.updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.listScope });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.users.detailScope, variables.id] as const,
      });
      toast.success("User updated successfully");
    },
    onError: (error) => {
      toast.error(extractApiError(error).message ?? "Failed to update user");
    },
  });
};

export const useEnableUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.enableUser(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.listScope });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.users.detailScope, id] as const,
      });
      toast.success("User enabled successfully");
    },
    onError: (error) => {
      toast.error(extractApiError(error).message ?? "Failed to enable user");
    },
  });
};

export const useDisableUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.disableUser(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.listScope });
      const previousUsers = queryClient.getQueryData(queryKeys.users.listScope);

      // Optimistically update the list to show as inactive
      queryClient.setQueriesData(
        { queryKey: queryKeys.users.listScope },
        (old: UserListCache | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data?.map((user) => 
              user.id === id ? { ...user, status: "INACTIVE" } : user
            ),
          };
        }
      );

      return { previousUsers };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.users.detailScope, id] as const,
      });
      toast.success("User disabled successfully");
    },
    onError: (error, _id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(queryKeys.users.listScope, context.previousUsers);
      }
      toast.error(extractApiError(error).message ?? "Failed to disable user");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.listScope });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.listScope });
      const previousUsers = queryClient.getQueryData(queryKeys.users.listScope);

      // Optimistically remove from list
      queryClient.setQueriesData(
        { queryKey: queryKeys.users.listScope },
        (old: UserListCache | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data?.filter((user) => user.id !== id),
          };
        }
      );

      return { previousUsers };
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: [...queryKeys.users.detailScope, id] as const,
      });
      toast.success("User deleted successfully");
    },
    onError: (error, _id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(queryKeys.users.listScope, context.previousUsers);
      }
      toast.error(extractApiError(error).message ?? "Failed to delete user");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.listScope });
    },
  });
};
