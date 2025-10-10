import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle, MapPin } from 'lucide-react';
import type { Diocese } from '@/contexts/AuthContext';

interface StatsGridProps {
  diocese: Diocese;
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
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isHighlight ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          <Icon className={`w-5 h-5 ${isHighlight ? 'text-orange-600' : 'text-blue-600'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xl font-semibold text-gray-900">
            {isLoading ? '—' : value}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

export const StatsGrid = React.memo<StatsGridProps>(({ diocese, stats }) => {
  const { totalParishes, heritageCount, pendingCount, isLoading } = stats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Total Parishes"
        value={totalParishes}
        icon={FileText}
        isLoading={isLoading}
      />

      <StatCard
        label="Pending Reviews"
        value={pendingCount}
        icon={AlertCircle}
        isLoading={isLoading}
        isHighlight={pendingCount > 0}
      />

      <StatCard
        label="Heritage Churches"
        value={heritageCount}
        icon={MapPin}
        isLoading={isLoading}
      />
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';
