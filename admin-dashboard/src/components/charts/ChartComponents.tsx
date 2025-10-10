import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  ComposedChart,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Color palettes for consistent theming
export const chartColors = {
  primary: ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554'],
  success: ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'],
  warning: ['#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F'],
  danger: ['#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'],
  heritage: ['#8B5A3C', '#A0522D', '#CD853F', '#DEB887', '#F5DEB3'],
  mixed: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
};

// Base chart data types
type ChartDataPoint = Record<string, string | number | boolean>;

// Base chart props interface
interface BaseChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
}

// Tooltip props interface
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: string | number;
    color: string;
    name?: string;
  }>;
  label?: string;
  formatter?: (value: number | string, name?: string) => [string | number, string];
}

// Custom tooltip component
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.dataKey}:</span>
          <span className="font-medium">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Chart wrapper component
const ChartWrapper: React.FC<BaseChartProps & { children: React.ReactNode }> = ({
  title,
  subtitle,
  className,
  loading,
  error,
  onRefresh,
  onExport,
  children,
}) => {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="icon" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="mb-2">Failed to load chart data</p>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Try Again
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};

// Church Status Distribution Pie Chart
export interface ChurchStatusData {
  status: string;
  count: number;
  percentage: number;
}

export const ChurchStatusChart: React.FC<BaseChartProps & { 
  data: ChurchStatusData[];
  showPercentages?: boolean;
}> = ({ 
  data, 
  title = "Church Status Distribution",
  height = 300,
  showPercentages = true,
  ...props 
}) => {
  const statusColors = {
    'approved': chartColors.success[0],
    'pending': chartColors.warning[0],
    'heritage_review': chartColors.primary[0],
    'needs_revision': chartColors.danger[0],
  };

  const formatTooltip = (value: number, name: string) => {
    const item = data.find(d => d.status === name);
    return [`${value} churches (${item?.percentage}%)`, name.replace('_', ' ').toUpperCase()];
  };

  return (
    <ChartWrapper title={title} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="count"
            nameKey="status"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={statusColors[entry.status as keyof typeof statusColors] || chartColors.mixed[index]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={formatTooltip} />} />
          {props.showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Status Legend */}
      <div className="flex flex-wrap gap-2 mt-4">
        {data.map((item) => (
          <Badge key={item.status} variant="outline" className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColors[item.status as keyof typeof statusColors] }}
            />
            {item.status.replace('_', ' ').toUpperCase()}: {item.count}
            {showPercentages && ` (${item.percentage}%)`}
          </Badge>
        ))}
      </div>
    </ChartWrapper>
  );
};

// Monthly Church Submissions Trend
export interface MonthlyTrendData {
  month: string;
  submissions: number;
  approvals: number;
  rejections: number;
}

export const MonthlyTrendChart: React.FC<BaseChartProps & { 
  data: MonthlyTrendData[];
  metric?: 'submissions' | 'approvals' | 'all';
}> = ({ 
  data, 
  title = "Monthly Church Activity",
  height = 300,
  metric = 'all',
  ...props 
}) => {
  const formatTooltip = (value: number, name: string) => {
    const labelMap: { [key: string]: string } = {
      'submissions': 'New Submissions',
      'approvals': 'Approved Churches',
      'rejections': 'Revision Requests',
    };
    return [value, labelMap[name] || name];
  };

  return (
    <ChartWrapper title={title} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip content={<CustomTooltip formatter={formatTooltip} />} />
          {props.showLegend && <Legend />}
          
          {(metric === 'all' || metric === 'submissions') && (
            <Bar dataKey="submissions" fill={chartColors.primary[0]} name="submissions" />
          )}
          {(metric === 'all' || metric === 'approvals') && (
            <Line 
              type="monotone" 
              dataKey="approvals" 
              stroke={chartColors.success[0]}
              strokeWidth={2}
              name="approvals"
            />
          )}
          {metric === 'all' && (
            <Area 
              type="monotone" 
              dataKey="rejections" 
              fill={chartColors.danger[0]}
              fillOpacity={0.3}
              stroke={chartColors.danger[0]}
              name="rejections"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

// Diocese Comparison Chart
export interface DioceseComparisonData {
  diocese: string;
  totalChurches: number;
  approved: number;
  pending: number;
  heritageClassified: number;
}

export const DioceseComparisonChart: React.FC<BaseChartProps & { 
  data: DioceseComparisonData[];
  metric?: 'total' | 'approved' | 'pending' | 'heritage';
}> = ({ 
  data, 
  title = "Diocese Comparison",
  height = 300,
  metric = 'total',
  ...props 
}) => {
  const metricMap = {
    total: 'totalChurches',
    approved: 'approved',
    pending: 'pending',
    heritage: 'heritageClassified',
  };

  const colorMap = {
    total: chartColors.primary[0],
    approved: chartColors.success[0],
    pending: chartColors.warning[0],
    heritage: chartColors.heritage[0],
  };

  return (
    <ChartWrapper title={title} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="diocese" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          {props.showLegend && <Legend />}
          <Bar 
            dataKey={metricMap[metric]} 
            fill={colorMap[metric]}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

// Heritage Classification Progress
export interface HeritageProgressData {
  classification: string;
  current: number;
  target: number;
  percentage: number;
}

export const HeritageProgressChart: React.FC<BaseChartProps & { 
  data: HeritageProgressData[];
}> = ({ 
  data, 
  title = "Heritage Classification Progress",
  height = 300,
  ...props 
}) => {
  return (
    <ChartWrapper title={title} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={data}>
          <RadialBar
            minAngle={15}
            label={{ position: 'insideStart', fill: '#fff' }}
            background
            clockWise
            dataKey="percentage"
          />
          <Legend />
          <Tooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>
      
      {/* Progress Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {data.map((item) => (
          <div key={item.classification} className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">{item.classification}</p>
              <p className="text-sm text-muted-foreground">
                {item.current} of {item.target} churches
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{item.percentage}%</p>
              <div className="w-20 h-2 bg-muted-foreground/20 rounded-full">
                <div 
                  className="h-2 bg-primary rounded-full transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartWrapper>
  );
};

// Activity Timeline Chart
export interface ActivityTimelineData {
  date: string;
  submissions: number;
  reviews: number;
  approvals: number;
}

export const ActivityTimelineChart: React.FC<BaseChartProps & { 
  data: ActivityTimelineData[];
  dateRange?: '7d' | '30d' | '90d' | '1y';
}> = ({ 
  data, 
  title = "Activity Timeline",
  height = 300,
  dateRange = '30d',
  ...props 
}) => {
  const formatTooltip = (value: number, name: string) => {
    const labelMap: { [key: string]: string } = {
      'submissions': 'New Submissions',
      'reviews': 'Under Review',
      'approvals': 'Approved',
    };
    return [value, labelMap[name] || name];
  };

  return (
    <ChartWrapper title={title} {...props}>
      <div className="flex items-center gap-2 mb-4">
        <Select defaultValue={dateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 3 months</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="submissions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary[0]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={chartColors.primary[0]} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="reviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.warning[0]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={chartColors.warning[0]} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="approvals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.success[0]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={chartColors.success[0]} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" />
          <YAxis />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip formatter={formatTooltip} />} />
          {props.showLegend && <Legend />}
          <Area
            type="monotone"
            dataKey="submissions"
            stackId="1"
            stroke={chartColors.primary[0]}
            fill="url(#submissions)"
            name="submissions"
          />
          <Area
            type="monotone"
            dataKey="reviews"
            stackId="1"
            stroke={chartColors.warning[0]}
            fill="url(#reviews)"
            name="reviews"
          />
          <Area
            type="monotone"
            dataKey="approvals"
            stackId="1"
            stroke={chartColors.success[0]}
            fill="url(#approvals)"
            name="approvals"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

// Quick Stats Cards with Mini Charts
export interface QuickStatData {
  label: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: number[];
}

export const QuickStatsCard: React.FC<QuickStatData & { className?: string }> = ({
  label,
  value,
  change,
  changeType,
  trend,
  className,
}) => {
  const trendData = trend.map((value, index) => ({ x: index, y: value }));
  const trendColor = changeType === 'increase' ? chartColors.success[0] : 
                    changeType === 'decrease' ? chartColors.danger[0] : 
                    chartColors.primary[0];

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold">{value.toLocaleString()}</p>
              <div className={cn(
                'flex items-center text-xs font-medium',
                changeType === 'increase' && 'text-green-600',
                changeType === 'decrease' && 'text-red-600',
                changeType === 'neutral' && 'text-muted-foreground'
              )}>
                {changeType === 'increase' && <TrendingUp className="h-3 w-3 mr-1" />}
                {changeType === 'decrease' && <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(change)}%
              </div>
            </div>
          </div>
          
          <div className="w-20 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <Line 
                  type="monotone" 
                  dataKey="y" 
                  stroke={trendColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Chart Container with Multiple Views
export const ChartContainer: React.FC<{
  children: React.ReactNode;
  views: Array<{ id: string; label: string; icon: React.ReactNode }>;
  activeView: string;
  onViewChange: (view: string) => void;
  className?: string;
}> = ({ children, views, activeView, onViewChange, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        {views.map((view) => (
          <Button
            key={view.id}
            variant={activeView === view.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange(view.id)}
            className="flex items-center gap-2"
          >
            {view.icon}
            {view.label}
          </Button>
        ))}
      </div>
      {children}
    </div>
  );
};

export default {
  ChartWrapper,
  ChurchStatusChart,
  MonthlyTrendChart,
  DioceseComparisonChart,
  HeritageProgressChart,
  ActivityTimelineChart,
  QuickStatsCard,
  ChartContainer,
  chartColors,
};
