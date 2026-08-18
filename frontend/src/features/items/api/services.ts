import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type { CreateItemInput, UpdateItemInput } from "@/contracts/validation";
import type { Item } from "@/contracts/types";
import type { ItemListParams, ItemStats } from "../types";
import { ITEM_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

export const itemsService = {
  getItems: (params?: ItemListParams) =>
    service.get<Item[]>(ITEM_ENDPOINTS.LIST, { params }),

  getItemStats: () =>
    service.get<ItemStats>(ITEM_ENDPOINTS.STATS).then((res) => res.data),

  getItemDetail: (id: string) =>
    service.get<Item>(ITEM_ENDPOINTS.GET(id)).then((res) => res.data),

  createItem: (payload: CreateItemInput) =>
    service.post<Item>(ITEM_ENDPOINTS.CREATE, payload).then((res) => res.data),

  updateItem: (id: string, payload: UpdateItemInput) =>
    service
      .patch<Item>(ITEM_ENDPOINTS.UPDATE(id), payload)
      .then((res) => res.data),

  deleteItem: (id: string) => service.delete<void>(ITEM_ENDPOINTS.DELETE(id)),

  toggleItemStatus: (id: string) =>
    service
      .patch<Item>(ITEM_ENDPOINTS.TOGGLE_STATUS(id))
      .then((res) => res.data),
};
