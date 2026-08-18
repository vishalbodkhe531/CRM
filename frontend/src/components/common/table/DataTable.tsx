import {
  flexRender,
  type Table as TanstackTable,
  type RowData,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/cn";
import LoadingState from "@/components/common/LoadingState";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    className?: string;
  }
}

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  className?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  loadingMessage?: string;
  mobileCardRenderer?: (row: TData) => React.ReactNode;
}

export function DataTable<TData>({
  table,
  className,
  isLoading,
  emptyState,
  loadingMessage = "Loading data...",
  mobileCardRenderer,
}: DataTableProps<TData>) {
  if (isLoading) {
    const columnCount = table.getAllColumns().length || 5;
    return (
      <div className="flex min-h-0 w-full flex-col gap-3">
        <div className={cn(mobileCardRenderer && "hidden md:block")}>
          <Table className={cn("min-w-full md:min-w-200", className)}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(header.column.columnDef.meta?.headerClassName)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`} className="h-12">
                  {Array.from({ length: columnCount }).map((_, colIndex) => (
                    <TableCell key={`skeleton-cell-${rowIndex}-${colIndex}`}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (!isLoading && table.getRowModel().rows?.length === 0 && emptyState) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border bg-card">
        {emptyState}
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className="flex min-h-0 w-full flex-col gap-3">
      {mobileCardRenderer && (
        <div className="grid gap-3 md:hidden">
          {rows.map((row) => (
            <div key={row.id}>{mobileCardRenderer(row.original)}</div>
          ))}
        </div>
      )}
      <div className={cn(mobileCardRenderer && "hidden md:block")}>
        <Table className={cn("min-w-full md:min-w-200", className)}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isActions = header.column.id === "actions";
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.column.columnDef.meta?.headerClassName,
                        isActions &&
                          "sticky right-0 z-20 border-l border-border bg-sidebar-accent text-sidebar-accent-foreground dark:bg-sidebar-accent dark:text-sidebar-accent-foreground",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group h-12"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isActions = cell.column.id === "actions";
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.columnDef.meta?.className,
                          isActions &&
                            "sticky right-0 z-20 border-l border-border bg-white group-hover:bg-[rgb(245_245_245)] dark:bg-[rgb(30_30_30)] dark:group-hover:bg-[rgb(36_36_36)]",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
