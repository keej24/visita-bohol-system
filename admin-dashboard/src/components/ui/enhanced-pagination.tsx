import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced pagination component for traditional page-based navigation
export interface EnhancedPaginationProps {
  currentPage: number;
  totalPages?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

export const EnhancedPagination: React.FC<EnhancedPaginationProps> = ({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onNext,
  onPrevious,
  isLoading = false,
  showPageNumbers = true,
  maxVisiblePages = 5,
  className,
}) => {
  const getVisiblePages = () => {
    if (!totalPages || !showPageNumbers) return [];

    const halfVisible = Math.floor(maxVisiblePages / 2);
    let start = Math.max(0, currentPage - halfVisible);
    const end = Math.min(totalPages - 1, start + maxVisiblePages - 1);

    // Adjust start if we're near the end
    if (end - start < maxVisiblePages - 1) {
      start = Math.max(0, end - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const shouldShowFirstPage = visiblePages[0] > 0;
  const shouldShowLastPage = totalPages && visiblePages[visiblePages.length - 1] < totalPages - 1;
  const shouldShowStartEllipsis = visiblePages[0] > 1;
  const shouldShowEndEllipsis = totalPages && visiblePages[visiblePages.length - 1] < totalPages - 2;

  return (
    <Pagination className={className}>
      <PaginationContent>
        {/* First page and previous */}
        {totalPages && totalPages > maxVisiblePages && (
          <PaginationItem>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(0)}
              disabled={currentPage === 0 || isLoading}
              className="h-9 w-9"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationPrevious 
            onClick={onPrevious}
            className={cn(
              hasPreviousPage && !isLoading
                ? "cursor-pointer" 
                : "pointer-events-none opacity-50"
            )}
          />
        </PaginationItem>

        {/* Page numbers */}
        {showPageNumbers && (
          <>
            {shouldShowFirstPage && (
              <>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange(0)}
                    isActive={currentPage === 0}
                    className="cursor-pointer"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
                {shouldShowStartEllipsis && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
              </>
            )}

            {visiblePages.map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            {shouldShowLastPage && (
              <>
                {shouldShowEndEllipsis && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange(totalPages! - 1)}
                    isActive={currentPage === totalPages! - 1}
                    className="cursor-pointer"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}
          </>
        )}

        {/* Next and last page */}
        <PaginationItem>
          <PaginationNext 
            onClick={onNext}
            className={cn(
              hasNextPage && !isLoading
                ? "cursor-pointer" 
                : "pointer-events-none opacity-50"
            )}
          />
        </PaginationItem>

        {totalPages && totalPages > maxVisiblePages && (
          <PaginationItem>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={currentPage === totalPages - 1 || isLoading}
              className="h-9 w-9"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <PaginationItem>
            <div className="flex h-9 w-9 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
};

// Load more button for infinite scrolling
export interface LoadMoreProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  error?: string | null;
  className?: string;
}

export const LoadMore: React.FC<LoadMoreProps> = ({
  onLoadMore,
  hasMore,
  isLoading,
  error,
  className,
}) => {
  if (!hasMore && !isLoading) {
    return (
      <div className={cn('text-center py-4 text-muted-foreground', className)}>
        No more items to load
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-4', className)}>
        <p className="text-destructive mb-2">Error loading more items</p>
        <Button variant="outline" size="sm" onClick={onLoadMore}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('text-center py-4', className)}>
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading}
        className="min-w-[120px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  );
};

// Infinite scroll component with intersection observer
export interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  rootMargin?: string;
  children: React.ReactNode;
  className?: string;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 0.5,
  rootMargin = '20px',
  children,
  className,
}) => {
  const loadingRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const loadingElement = loadingRef.current;
    if (!loadingElement || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(loadingElement);

    return () => {
      observer.unobserve(loadingElement);
    };
  }, [onLoadMore, hasMore, isLoading, threshold, rootMargin]);

  return (
    <div className={className}>
      {children}
      
      {hasMore && (
        <div
          ref={loadingRef}
          className="flex justify-center items-center py-4"
        >
          {isLoading && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Page size selector
export interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
}

export const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  pageSize,
  onPageSizeChange,
  options = [10, 20, 50, 100],
  className,
}) => {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="text-sm text-muted-foreground">Show</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-8 w-16 rounded border bg-background px-2 text-sm"
        aria-label="Items per page"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted-foreground">per page</span>
    </div>
  );
};

// Pagination info component
export interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems?: number;
  itemCount: number;
  className?: string;
}

export const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  pageSize,
  totalItems,
  itemCount,
  className,
}) => {
  const startItem = currentPage * pageSize + 1;
  const endItem = startItem + itemCount - 1;

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      Showing {startItem}–{endItem}
      {totalItems && ` of ${totalItems}`} results
    </div>
  );
};

// Combined pagination controls
export interface PaginationControlsProps {
  currentPage: number;
  totalPages?: number;
  pageSize: number;
  totalItems?: number;
  itemCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  itemCount,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onNext,
  onPrevious,
  onPageSizeChange,
  isLoading = false,
  className,
}) => {
  return (
    <div className={cn(
      'flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0',
      className
    )}>
      <div className="flex items-center space-x-4">
        <PageSizeSelector
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
        <PaginationInfo
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          itemCount={itemCount}
        />
      </div>

      <EnhancedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={onPageChange}
        onNext={onNext}
        onPrevious={onPrevious}
        isLoading={isLoading}
      />
    </div>
  );
};