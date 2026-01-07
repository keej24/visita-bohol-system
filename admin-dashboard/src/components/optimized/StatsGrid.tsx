import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle, MapPin } from 'lucide-react';

interface StatsGridProps {
  stats: {
    totalChurches: number;
    totalParishes: number;
    heritageCount: number;
    pendingCount: number;
    approvedCount: number;
    isLoading: boolean;
  };
}


interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  isHighlight?: boolean;
}

const StatCard = React.memo<StatCardProps>(({ label, value, icon: Icon, isLoading, isHighlight }) => (
  <Card className={`${isHighlight ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isHighlight ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isHighlight ? 'text-orange-600' : 'text-blue-600'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{label}</p>
          <p className="text-lg sm:text-xl font-semibold text-gray-900">
            {isLoading ? '—' : value}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

export const StatsGrid = React.memo<StatsGridProps>(({ stats }) => {
  const { totalChurches, heritageCount, pendingCount, isLoading } = stats;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <StatCard
        label="Total Churches"
        value={totalChurches}
        icon={FileText}
        isLoading={isLoading}
      />

      <StatCard
        label="Pending"
        value={pendingCount}
        icon={AlertCircle}
        isLoading={isLoading}
        isHighlight={pendingCount > 0}
      />

      <StatCard
        label="Heritage"
        value={heritageCount}
        icon={MapPin}
        isLoading={isLoading}
      />
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';