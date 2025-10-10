import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, FileText, AlertCircle, MapPin, TrendingUp, TrendingDown } from 'lucide-react';
import type { Diocese } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface MobileStatsGridProps {
  diocese: Diocese;
  stats: {
    totalChurches: number;
    totalParishes: number;
    activeUsers: number;
    heritageCount: number;
    pendingCount: number;
    approvedCount: number;
    isLoading: boolean;
  };
}


interface MobileStatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  priority?: 'high' | 'medium' | 'low';
}

const MobileStatCard = React.memo<MobileStatCardProps>(({ 
  label, 
  value, 
  icon: Icon, 
  iconColor, 
  isLoading, 
  trend, 
  trendValue,
  priority = 'medium'
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-600" />;
    return null;
  };

  const getPriorityBorder = () => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <Card className={`stats-card transition-all duration-200 hover:shadow-md border-l-4 ${getPriorityBorder()}`}>
      <CardContent className="p-4 sm:p-6">
        {/* Mobile Layout: Stacked */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-8 h-8 ${iconColor} rounded-full flex items-center justify-center`}>
              <Icon className="w-4 h-4" />
            </div>
            {priority === 'high' && (
              <Badge variant="destructive" className="text-xs">
                Urgent
              </Badge>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? '—' : value}
            </p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon()}
                <span className="text-xs text-muted-foreground">{trendValue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout: Side by side */}
        <div className="hidden sm:flex items-center justify-between">
          <div>
            <p className="stats-label">{label}</p>
            <div className="flex items-center gap-2">
              <p className="stats-value">{isLoading ? '—' : value}</p>
              {trend && trendValue && (
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                  <span className="text-xs text-muted-foreground">{trendValue}</span>
                </div>
              )}
            </div>
          </div>
          <div className={`w-8 h-8 ${iconColor} rounded-full flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

MobileStatCard.displayName = 'MobileStatCard';

const MobileStatsGrid: React.FC<MobileStatsGridProps> = ({ diocese, stats }) => {
  const { totalChurches, totalParishes, activeUsers, heritageCount, pendingCount, approvedCount, isLoading } = stats;

  const statsData = [
    {
      label: "Total Parishes",
      value: totalParishes,
      icon: FileText,
      iconColor: "bg-blue-100 text-blue-600",
      priority: 'low' as const,
      isLoading,
    },
    {
      label: "Heritage Churches",
      value: heritageCount,
      icon: MapPin,
      iconColor: "bg-purple-100 text-purple-600",
      priority: 'medium' as const,
      trend: 'neutral' as const,
      trendValue: `${heritageCount} heritage sites`,
      isLoading,
    },
    {
      label: "Pending Reviews",
      value: pendingCount,
      icon: Clock,
      iconColor: "bg-orange-100 text-orange-600",
      priority: pendingCount > 0 ? 'high' : 'low' as const,
      trend: pendingCount > 5 ? 'up' : 'neutral' as const,
      trendValue: pendingCount > 0 ? `${pendingCount} awaiting` : "All clear",
      isLoading,
    },
    {
      label: "Active Users",
      value: activeUsers,
      icon: AlertCircle,
      iconColor: "bg-green-100 text-green-600",
      priority: 'low' as const,
      trend: 'neutral' as const,
      trendValue: "Last 30 days",
      isLoading,
    },
  ];

  return (
    <div>
      {/* Mobile: 2-column grid */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {statsData.map((stat, index) => (
          <MobileStatCard key={index} {...stat} />
        ))}
      </div>

      {/* Desktop: 4-column grid */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <MobileStatCard key={index} {...stat} />
        ))}
      </div>

      {/* Mobile: Summary banner for urgent items */}
      {pendingCount > 0 && (
        <div className="mt-3 sm:hidden">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {pendingCount} {pendingCount === 1 ? 'church' : 'churches'} awaiting review
              </span>
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Tap Review Queue below to take action
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileStatsGrid;
