import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface EnhancedSectionCardProps {
  title: string;
  description?: string;
  status?: 'complete' | 'pending' | 'incomplete' | 'attention';
  count?: number;
  icon: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  className?: string;
  priority?: 'normal' | 'high' | 'urgent';
  lastUpdated?: string;
}

export const EnhancedSectionCard: React.FC<EnhancedSectionCardProps> = ({
  title,
  description,
  status = 'incomplete',
  count,
  icon,
  primaryAction,
  secondaryAction,
  children,
  className,
  priority = 'normal',
  lastUpdated
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'complete':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'attention':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Attention
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPriorityBorder = () => {
    switch (priority) {
      case 'high':
        return 'border-orange-300 shadow-orange-100';
      case 'urgent':
        return 'border-red-300 shadow-red-100';
      default:
        return 'border-purple-200';
    }
  };

  return (
    <Card className={cn(
      'parish-card-ui transition-all duration-300 hover:shadow-lg',
      getPriorityBorder(),
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="parish-stat-icon from-purple-500 to-purple-600 w-10 h-10">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
              {lastUpdated && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            {priority !== 'normal' && (
              <span className={cn(
                "text-xs font-medium",
                priority === 'high' ? 'text-orange-600' : 'text-red-600'
              )}>
                {priority === 'high' ? '⚡ High' : '🔥 Urgent'}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {children}

          {(primaryAction || secondaryAction) && (
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              {primaryAction && (
                <Button
                  size="sm"
                  variant={primaryAction.variant || 'default'}
                  className={cn(
                    primaryAction.variant === 'default' && 'parish-primary-btn',
                    "flex-1"
                  )}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {secondaryAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  onClick={secondaryAction.onClick}
                >
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
