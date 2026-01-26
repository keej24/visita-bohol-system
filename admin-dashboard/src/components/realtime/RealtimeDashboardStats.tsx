import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  RefreshCw,
  Wifi,
  WifiOff,
  TrendingUp,
  Users,
} from 'lucide-react';
import { 
  useRealtimeChurchStats, 
  useRealtimePendingChurches,
  useFirestoreConnection 
} from '@/lib/data-management/realtime';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Real-time connection status indicator
export const ConnectionStatus: React.FC = () => {
  const { isOnline, lastOnline } = useFirestoreConnection();

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-600" />
            <span className="text-red-600">Offline</span>
          </>
        )}
      </div>
      {lastOnline && (
        <span className="text-muted-foreground">
          Last: {lastOnline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
      )}
    </div>
  );
};

// Real-time statistics cards
export interface RealtimeStatsProps {
  diocese: string;
  className?: string;
}

export const RealtimeStats: React.FC<RealtimeStatsProps> = ({
  diocese,
  className,
}) => {
  const { stats, isConnected, error, lastUpdated } = useRealtimeChurchStats(diocese);

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading real-time stats</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-8 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsConfig = [
    {
      title: 'Pending Review',
      value: stats.pendingCount,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      trend: '+2 today',
    },
    {
      title: 'In Heritage Review',
      value: stats.reviewCount,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      trend: '3 reviewed',
    },
    {
      title: 'Needs Revision',
      value: stats.revisionCount,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      trend: '-1 fixed',
    },
    {
      title: 'Approved',
      value: stats.approvedCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      trend: '+5 approved',
    },
  ];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Live Church Statistics</h2>
        <div className="flex items-center space-x-4">
          <ConnectionStatus />
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="wait">
          {statsConfig.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                'relative overflow-hidden transition-all hover:shadow-md',
                isConnected ? stat.borderColor : 'border-gray-200'
              )}>
                <div className={cn(
                  'absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -mr-10 -mt-10',
                  stat.bgColor
                )} />
                
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <motion.p
                          key={stat.value}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-bold"
                        >
                          {stat.value}
                        </motion.p>
                        {isConnected && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-2 h-2 bg-green-500 rounded-full"
                          />
                        )}
                      </div>
                    </div>
                    <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                      <stat.icon className={cn('h-6 w-6', stat.color)} />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {stat.trend}
                    </span>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Total Churches: {stats.totalCount}</span>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Live Updates' : 'Offline'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Real-time pending reviews list
export const RealtimePendingReviews: React.FC<RealtimeStatsProps> = ({
  diocese,
  className,
}) => {
  const { isConnected, error, lastUpdated } = useRealtimePendingChurches(diocese);
  const { data: pendingChurches } = useRealtimeChurchStats(diocese); // We can get the data from cache

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Error Loading Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Unable to load pending reviews. Check your connection.
          </p>
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Mock data for demonstration - in real app, this would come from the real-time hook
  const mockPendingChurches = [
    {
      id: '1',
      name: 'San Pedro Apostol Church',
      municipality: 'Loboc',
      status: 'pending',
      updatedAt: new Date(),
      priority: 'high',
    },
    {
      id: '2',
      name: 'Our Lady of Light Church',
      municipality: 'Loon',
      status: 'heritage_review',
      updatedAt: new Date(),
      priority: 'urgent',
    },
    {
      id: '3',
      name: 'Holy Trinity Church',
      municipality: 'Baclayon',
      status: 'pending',
      updatedAt: new Date(),
      priority: 'normal',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'heritage_review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Pending Reviews</span>
            {isConnected && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence>
            {mockPendingChurches.map((church, index) => (
              <motion.div
                key={church.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm">{church.name}</h4>
                    <Badge size="sm" className={getPriorityColor(church.priority)}>
                      {church.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{church.municipality}</span>
                    <span>•</span>
                    <span>{church.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(church.status)}>
                    {church.status.replace('_', ' ')}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {mockPendingChurches.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No pending reviews!</p>
            <p className="text-sm">All churches are up to date.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Real-time activity feed
export const RealtimeActivityFeed: React.FC<RealtimeStatsProps> = ({
  diocese,
  className,
}) => {
  const { isConnected } = useRealtimeChurchStats(diocese);

  // Mock activity data - in real app, this would come from a real-time activity log
  const activities = [
    {
      id: '1',
      type: 'church_approved',
      message: 'San Miguel Church approved for heritage classification',
      timestamp: new Date(),
      user: 'Fr. Rodriguez',
    },
    {
      id: '2',
      type: 'church_submitted',
      message: 'New church submission from Tubigon Parish',
      timestamp: new Date(Date.now() - 30000),
      user: 'Parish Secretary',
    },
    {
      id: '3',
      type: 'revision_requested',
      message: 'Holy Cross Church requires additional documentation',
      timestamp: new Date(Date.now() - 120000),
      user: 'Heritage Committee',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'church_approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'church_submitted': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'revision_requested': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Live Activity</span>
          </CardTitle>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Live Updates' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AnimatePresence>
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {activity.user}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};