import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/utils/cn";
import type { Prospect } from "@/contracts/types";

export const getCustomersColumns = (): ColumnDef<Prospect>[] => [
  {
    header: "Name",
    id: "fullName",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => {
      const prospect = row.original;
      const lead = prospect.lead;
      if (!lead) return "-";
      return (
        <span
          className={cn(
            "font-medium",
            !lead.isActive && "text-muted-foreground line-through",
          )}
        >
          {[lead.firstName, lead.lastName].filter(Boolean).join(" ")}
        </span>
      );
    },
  },
  {
    header: "Company",
    id: "companyName",
    meta: {
      className: "hidden md:table-cell min-w-[180px]",
      headerClassName: "hidden md:table-cell",
    },
    cell: ({ row }) => row.original.lead?.companyName || "-",
  },
  {
    header: "Item",
    id: "productInterest",
    meta: {
      className: "hidden md:table-cell min-w-[150px]",
      headerClassName: "hidden md:table-cell",
    },
    cell: ({ row }) => {
      const item = row.original.lead?.productInterest;
      return item ? (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{item.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {item.itemCode}
          </span>
        </div>
      ) : (
        "-"
      );
    },
  },
  {
    header: "Mobile",
    id: "mobile",
    meta: {
      className: "hidden lg:table-cell whitespace-nowrap",
      headerClassName: "hidden lg:table-cell",
    },
    cell: ({ row }) => row.original.lead?.mobile || "-",
  },
];
