import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const MobileHeaderSkeleton = () => (
  <div className="heritage-card-accent p-4 sm:p-6">
    <div className="flex items-center gap-3 justify-between">
      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-6 sm:h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full sm:w-5/6 mb-2" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <Skeleton className="hidden sm:block w-32 h-9 rounded-md" />
    </div>
  </div>
);

export const MobileStatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="stats-card">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 mb-2" />
              <Skeleton className="h-6 sm:h-8 w-8 sm:w-12" />
            </div>
            <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const MobileReviewListSkeleton = () => (
  <Card className="heritage-card">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg bg-secondary/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const MobileChurchTableSkeleton = () => (
  <Card className="data-table">
    <CardHeader className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-10 w-full" />
    </CardHeader>
    <CardContent className="p-0">
      <div className="space-y-3 p-4 sm:p-0">
        {/* Mobile: Card layout skeleton */}
        <div className="block sm:hidden space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-1/2 mb-2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop: Table layout skeleton */}
        <div className="hidden sm:block">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {['Church Name', 'Location', 'Date Added', 'Status', 'Visitors', 'Actions'].map((header) => (
                  <th key={header} className="text-left p-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="table-row">
                  <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                  <td className="p-4"><Skeleton className="h-5 w-12" /></td>
                  <td className="p-4"><Skeleton className="h-8 w-8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const MobileChartSkeleton = () => (
  <Card className="heritage-card">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent className="pt-6">
      <div className="h-60 sm:h-80 flex items-end justify-center space-x-2 sm:space-x-4">
        {[...Array(12)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="w-4 sm:w-8" 
            style={{ height: `${Math.random() * 80 + 20}%` }} 
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

// Loading overlay for button states
export const ButtonLoadingSpinner = ({ size = "sm" }: { size?: "sm" | "md" }) => (
  <div className={`inline-flex items-center ${size === "sm" ? "gap-1" : "gap-2"}`}>
    <div 
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${
        size === "sm" ? "w-3 h-3" : "w-4 h-4"
      }`} 
    />
    <span>Loading...</span>
  </div>
);

// Progressive loading skeleton that adapts to content
export const ProgressiveSkeleton = ({ 
  isLoading, 
  children,
  skeleton,
  delay = 200 
}: { 
  isLoading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  delay?: number;
}) => {
  const [showSkeleton, setShowSkeleton] = React.useState(false);

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isLoading) {
      timeout = setTimeout(() => setShowSkeleton(true), delay);
    } else {
      setShowSkeleton(false);
    }

    return () => clearTimeout(timeout);
  }, [isLoading, delay]);

  if (isLoading && showSkeleton) {
    return <>{skeleton}</>;
  }

  if (isLoading && !showSkeleton) {
    return null; // Show nothing during initial delay
  }

  return <>{children}</>;
};