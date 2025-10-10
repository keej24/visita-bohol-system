import React, { Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { useChurchStats } from '@/hooks/useChurchStats';
import type { Diocese } from '@/contexts/AuthContext';
import {
  MobileHeaderSkeleton,
  MobileStatsSkeleton,
  MobileReviewListSkeleton,
  MobileChartSkeleton,
  ProgressiveSkeleton,
} from './MobileSkeletons';

// Mobile-optimized components
const MobileHeader = React.lazy(() => import('./MobileHeader'));
const MobileStatsGrid = React.lazy(() => import('./MobileStatsGrid'));
const MobileReviewList = React.lazy(() => import('./MobileReviewList'));
const MobileChurchList = React.lazy(() => import('./MobileChurchList'));

// Lazy load chart with longer delay for mobile
const ChurchVisitsChart = React.lazy(() => 
  import('@/components/ChurchVisitsChart').then(module => ({
    default: module.ChurchVisitsChart
  }))
);

interface MobileResponsiveDashboardProps {
  diocese: Diocese;
}

export const MobileResponsiveDashboard: React.FC<MobileResponsiveDashboardProps> = ({ diocese }) => {
  const { userProfile } = useAuth();
  const churchStats = useChurchStats(diocese);

  return (
    <Layout className="mobile-optimized">
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
        {/* Mobile-optimized Header */}
        <ErrorBoundary fallback={<MobileHeaderSkeleton />}>
          <ProgressiveSkeleton
            isLoading={!userProfile}
            skeleton={<MobileHeaderSkeleton />}
            delay={100}
          >
            <Suspense fallback={<MobileHeaderSkeleton />}>
              <MobileHeader diocese={diocese} userProfile={userProfile} />
            </Suspense>
          </ProgressiveSkeleton>
        </ErrorBoundary>

        {/* Mobile-optimized Stats */}
        <ErrorBoundary fallback={<MobileStatsSkeleton />}>
          <ProgressiveSkeleton
            isLoading={churchStats.isLoading}
            skeleton={<MobileStatsSkeleton />}
            delay={150}
          >
            <Suspense fallback={<MobileStatsSkeleton />}>
              <MobileStatsGrid diocese={diocese} stats={churchStats} />
            </Suspense>
          </ProgressiveSkeleton>
        </ErrorBoundary>

        {/* Mobile Layout: Stack on mobile, side-by-side on desktop */}
        <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <ErrorBoundary fallback={<MobileChartSkeleton />}>
              <ProgressiveSkeleton
                isLoading={false} // Chart can load independently
                skeleton={<MobileChartSkeleton />}
                delay={300}
              >
                <Suspense fallback={<MobileChartSkeleton />}>
                  <ChurchVisitsChart />
                </Suspense>
              </ProgressiveSkeleton>
            </ErrorBoundary>
          </div>
          
          {/* Review Queue - Priority on mobile */}
          <div className="order-1 lg:order-2">
            <ErrorBoundary fallback={<MobileReviewListSkeleton />}>
              <ProgressiveSkeleton
                isLoading={churchStats.isLoading}
                skeleton={<MobileReviewListSkeleton />}
                delay={200}
              >
                <Suspense fallback={<MobileReviewListSkeleton />}>
                  <MobileReviewList diocese={diocese} />
                </Suspense>
              </ProgressiveSkeleton>
            </ErrorBoundary>
          </div>
        </div>

        {/* Church List - Lower priority, loads last */}
        <ErrorBoundary>
          <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-lg" />}>
            <MobileChurchList diocese={diocese} />
          </Suspense>
        </ErrorBoundary>

        {/* Mobile FAB for quick actions */}
        <div className="fixed bottom-6 right-6 sm:hidden">
          <button 
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            aria-label="Quick actions"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default MobileResponsiveDashboard;
