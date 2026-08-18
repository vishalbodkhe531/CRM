export type ItemType = "GOODS" | "SERVICE";
export type ItemStatus = "ACTIVE" | "INACTIVE";
export type GSTRate = 0 | 5 | 12 | 18 | 28;

export interface Item {
  id: string;
  name: string;
  itemCode: string | null;
  itemType: ItemType;
  hsnCode: string | null;
  sacCode: string | null;
  gstRate: number;
  price: number;
  description: string | null;
  status: ItemStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
