  import { ChevronLeft, ChevronRight } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import TooltipLabel from "@/components/common/TooltipLabel";

  const MAX_VISIBLE_PAGES = 5;

  interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    pageSize?: number;
    itemLabel?: string;
  }

  const TablePagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    pageSize,
    itemLabel = "records",
  }: TablePaginationProps) => {
    if (totalPages <= 1 && !totalItems) {
      return null;
    }

    const getVisiblePages = () => {
      if (totalPages <= MAX_VISIBLE_PAGES) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
      }

      const half = Math.floor(MAX_VISIBLE_PAGES / 2);
      let start = Math.max(1, currentPage - half);
      const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);

      if (end - start + 1 < MAX_VISIBLE_PAGES) {
        start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
      }

      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    };

    const summaryText =
      totalItems && pageSize
        ? `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
            currentPage * pageSize,
            totalItems,
          )} of ${totalItems} ${itemLabel}`
        : null;

    if (totalPages <= 1) {
      return summaryText ? (
        <div className="py-4 text-sm text-muted-foreground">{summaryText}</div>
      ) : null;
    }

    return (
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {summaryText}
        </div>

        <div className="flex items-center justify-center gap-1">
          <TooltipLabel label="Previous page">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipLabel>

          {getVisiblePages().map((pageNumber) => (
            <Button
              key={pageNumber}
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(pageNumber)}
              className={`h-8 w-8 min-w-8 rounded-full p-0 text-xs font-medium transition-colors ${
                currentPage === pageNumber
                  ? "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-current={currentPage === pageNumber ? "page" : undefined}
            >
              {pageNumber}
            </Button>
          ))}

          <TooltipLabel label="Next page">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipLabel>
        </div>
      </div>
    );
  };

  export default TablePagination;
