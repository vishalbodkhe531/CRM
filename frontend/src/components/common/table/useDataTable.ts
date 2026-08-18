import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  type OnChangeFn,
} from "@tanstack/react-table";

interface UseDataTableProps<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  pageCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
}

export function useDataTable<TData, TValue>({
  data,
  columns,
  pageCount,
  pagination,
  onPaginationChange,
}: UseDataTableProps<TData, TValue>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  return useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
    },
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });
}
