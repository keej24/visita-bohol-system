import { Bell, Check, CheckCheck, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from "@/lib/optimized/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/lib/notifications";

export function NotificationDropdown() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // Fetch notifications and unread count
  const { data: notifications = [], isLoading, refetch } = useUserNotifications(userProfile);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userProfile);
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const handleNotificationClick = (notification: Notification) => {
    if (!userProfile) return;

    // Mark as read if not already
    if (!notification.readBy?.includes(userProfile.uid)) {
      markAsReadMutation.mutate({
        notificationId: notification.id!,
        userId: userProfile.uid,
      });
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    if (!userProfile || unreadCount === 0) return;
    markAllAsReadMutation.mutate(userProfile);
  };

  const handleRefresh = () => {
    refetch();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'church_submitted':
        return '📥';  // Parish submitted church for review
      case 'church_approved':
        return '✅';  // Church published
      case 'revision_requested':
        return '📝';  // Revision needed
      case 'heritage_review_assigned':
        return '🏛️';  // Sent to museum researcher
      case 'heritage_validated':
        return '🎖️';  // Museum validated heritage
      case 'workflow_error':
        return '⚠️';  // Error
      default:
        return '📢';  // System notification
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const isUnread = (notification: Notification) => {
    if (!userProfile) return false;
    return !notification.readBy?.includes(userProfile.uid);
  };

  const formatTimestamp = (timestamp: unknown) => {
    try {
      // Handle Firestore Timestamp
      const date = timestamp && typeof timestamp === 'object' && 'toDate' in timestamp 
        ? (timestamp as { toDate: () => Date }).toDate() 
        : new Date(timestamp as string | number);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRefresh();
                    }}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {unreadCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMarkAllAsRead();
                      }}
                      disabled={markAllAsReadMutation.isPending}
                    >
                      {markAllAsReadMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCheck className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark all as read</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You'll be notified about important updates
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-2 p-3 cursor-pointer ${
                    isUnread(notification) ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="text-xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">
                          {notification.title}
                        </p>
                        {isUnread(notification) && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(notification.priority)}`}
                        >
                          {notification.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {notification.actionUrl && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 ml-10">
                      <ExternalLink className="w-3 h-3" />
                      <span>View details</span>
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/notifications')}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
