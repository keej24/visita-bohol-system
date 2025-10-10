import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PaginationControls, 
  InfiniteScroll, 
  LoadMore 
} from '@/components/ui/enhanced-pagination';
import { 
  useChurchesPagination, 
  useChurchesInfiniteScroll 
} from '@/lib/data-management/pagination';
import { Search, MapPin, Calendar, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Church } from '@/types';

// Traditional paginated church list
export interface PaginatedChurchListProps {
  diocese: string;
  className?: string;
}

export const PaginatedChurchList: React.FC<PaginatedChurchListProps> = ({
  diocese,
  className,
}) => {
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const {
    items: churches,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    nextPage,
    previousPage,
    goToPage,
    refetch,
  } = useChurchesPagination(diocese, statusFilter.length > 0 ? statusFilter : undefined, {
    pageSize,
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    goToPage(0); // Reset to first page when changing page size
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    goToPage(0); // Reset to first page when filtering
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'heritage_review': return 'bg-blue-100 text-blue-800';
      case 'needs_revision': return 'bg-red-100 text-red-800';
      case 'approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-destructive mb-4">Error loading churches: {error.message}</p>
            <Button onClick={refetch}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filter Churches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['pending', 'heritage_review', 'needs_revision', 'approved'].map(status => (
              <Button
                key={status}
                variant={statusFilter.includes(status) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange(status)}
              >
                {status.replace('_', ' ').toUpperCase()}
              </Button>
            ))}
            {statusFilter.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter([])}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Church List */}
      <Card>
        <CardHeader>
          <CardTitle>Churches in {diocese}</CardTitle>
        </CardHeader>
        <CardContent>
          {churches.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              No churches found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {churches.map((church: Church) => (
                <ChurchCard key={church.id} church={church} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            itemCount={churches.length}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={goToPage}
            onNext={nextPage}
            onPrevious={previousPage}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isLoading}
            className="mt-6"
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Infinite scroll church list
export const InfiniteScrollChurchList: React.FC<PaginatedChurchListProps> = ({
  diocese,
  className,
}) => {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const {
    items: churches,
    hasNextPage,
    isLoading,
    isLoadingMore,
    error,
    fetchNextPage,
  } = useChurchesInfiniteScroll(diocese, statusFilter.length > 0 ? statusFilter : undefined, {
    pageSize: 20,
  });

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-destructive">Error loading churches: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filter Churches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['pending', 'heritage_review', 'needs_revision', 'approved'].map(status => (
              <Button
                key={status}
                variant={statusFilter.includes(status) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange(status)}
              >
                {status.replace('_', ' ').toUpperCase()}
              </Button>
            ))}
            {statusFilter.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter([])}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Infinite Scroll List */}
      <Card>
        <CardHeader>
          <CardTitle>Churches in {diocese}</CardTitle>
        </CardHeader>
        <CardContent>
          <InfiniteScroll
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage}
            isLoading={isLoadingMore}
          >
            {churches.length === 0 && !isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                No churches found matching your criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {churches.map((church: Church) => (
                  <ChurchCard key={church.id} church={church} />
                ))}
              </div>
            )}
          </InfiniteScroll>

          {/* Manual Load More Button (alternative to infinite scroll) */}
          {hasNextPage && (
            <LoadMore
              onLoadMore={fetchNextPage}
              hasMore={hasNextPage}
              isLoading={isLoadingMore}
              className="mt-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Individual church card component
interface ChurchCardProps {
  church: Church;
  className?: string;
}

const ChurchCard: React.FC<ChurchCardProps> = ({ church, className }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'heritage_review': return 'bg-blue-100 text-blue-800';
      case 'needs_revision': return 'bg-red-100 text-red-800';
      case 'approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{church.name}</h3>
              <Badge className={getStatusColor(church.status)}>
                {church.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{church.municipality}, {church.province}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Founded: {church.yearBuilt || 'Unknown'}</span>
              </div>
              
              {church.heritageClassification && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Heritage:</span>
                  <Badge variant="outline">
                    {church.heritageClassification}
                  </Badge>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3" />
                <span>Updated: {formatDate(church.updatedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            
            {church.status === 'pending' && (
              <Button size="sm">
                Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Compact grid view for mobile
export const CompactChurchGrid: React.FC<PaginatedChurchListProps> = ({
  diocese,
  className,
}) => {
  const [pageSize, setPageSize] = useState(12);

  const {
    items: churches,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    nextPage,
    previousPage,
    goToPage,
    refetch,
  } = useChurchesPagination(diocese, undefined, { pageSize });

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-destructive mb-4">Error loading churches</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {churches.map((church: Church) => (
          <CompactChurchCard key={church.id} church={church} />
        ))}
      </div>

      <PaginationControls
        currentPage={currentPage}
        pageSize={pageSize}
        itemCount={churches.length}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={goToPage}
        onNext={nextPage}
        onPrevious={previousPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          goToPage(0);
        }}
        isLoading={isLoading}
      />
    </div>
  );
};

// Compact church card for grid view
const CompactChurchCard: React.FC<{ church: Church }> = ({ church }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'heritage_review': return 'bg-blue-500';
      case 'needs_revision': return 'bg-red-500';
      case 'approved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm leading-tight">{church.name}</h4>
          <div className={cn(
            'w-3 h-3 rounded-full flex-shrink-0 ml-2',
            getStatusColor(church.status)
          )} />
        </div>
        
        <p className="text-xs text-muted-foreground mb-2">
          {church.municipality}
        </p>
        
        {church.heritageClassification && (
          <Badge variant="secondary" className="text-xs">
            {church.heritageClassification}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
