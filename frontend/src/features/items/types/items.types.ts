import {
  ITEM_STATUS_VALUES,
  ITEM_TYPE_VALUES,
} from "@/contracts/constants";
import type { CreateItemInput, ItemFilterInput, UpdateItemInput } from "@/contracts/validation";
import type { GSTRate, Item, ItemStatus, ItemType } from "@/contracts/types";

export type {
  CreateItemInput,
  GSTRate,
  Item,
  ItemStatus,
  ItemType,
  UpdateItemInput,
};

export {
  ITEM_STATUS_VALUES,
  ITEM_TYPE_VALUES,
};

export type ProductStatus = ItemStatus;

export interface ItemsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ItemStats {
  total: number;
  active: number;
  inactive: number;
  goods: number;
  services: number;
}

export type CreateItemPayload = CreateItemInput;
export type UpdateItemPayload = UpdateItemInput;

export type ItemListParams = Partial<ItemFilterInput>;
