import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  /** Hide this column on mobile */
  mobileHidden?: boolean;
  /** Show prominently at top of mobile card */
  mobilePrimary?: boolean;
  /** Show in secondary info grid on mobile */
  mobileSecondary?: boolean;
  /** Is this an action column (buttons, etc.) */
  isAction?: boolean;
  className?: string;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  mobileCardClassName?: string;
}

function ResponsiveTableSkeleton({ 
  columns, 
  rows = 3,
  isMobile 
}: { 
  columns: number; 
  rows?: number;
  isMobile: boolean;
}) {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className="h-4 w-full max-w-[100px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyState,
  isLoading,
  loadingRows = 3,
  mobileCardClassName,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  // Separate columns by type for mobile layout
  const primaryColumns = columns.filter(col => col.mobilePrimary && !col.mobileHidden);
  const secondaryColumns = columns.filter(col => col.mobileSecondary && !col.mobileHidden);
  const actionColumns = columns.filter(col => col.isAction);
  const visibleDesktopColumns = columns.filter(col => !col.mobileHidden || !isMobile);

  if (isLoading) {
    return (
      <ResponsiveTableSkeleton 
        columns={columns.length} 
        rows={loadingRows}
        isMobile={isMobile}
      />
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Mobile: Stacked cards
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <Card
            key={keyExtractor(item)}
            className={cn(
              "p-4 transition-colors",
              onRowClick && "cursor-pointer active:bg-muted/50",
              mobileCardClassName
            )}
            onClick={() => onRowClick?.(item)}
          >
            {/* Primary row - most important info */}
            {primaryColumns.length > 0 && (
              <div className="flex justify-between items-start gap-2 mb-3">
                {primaryColumns.map((col) => (
                  <div key={col.key} className={cn("flex-shrink-0", col.className)}>
                    {col.render(item)}
                  </div>
                ))}
              </div>
            )}

            {/* Secondary info grid */}
            {secondaryColumns.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {secondaryColumns.map((col) => (
                  <div key={col.key} className="flex flex-col">
                    <span className="text-muted-foreground text-xs">{col.header}</span>
                    <span className={col.className}>{col.render(item)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            {actionColumns.length > 0 && (
              <div 
                className="flex justify-end gap-2 mt-3 pt-3 border-t border-border"
                onClick={(e) => e.stopPropagation()}
              >
                {actionColumns.map((col) => (
                  <div key={col.key} className="min-h-[44px] flex items-center">
                    {col.render(item)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: Standard table
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleDesktopColumns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(item)}
            >
              {visibleDesktopColumns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
