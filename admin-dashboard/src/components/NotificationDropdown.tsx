import { useState } from "react";
import { Bell, Check, CheckCheck, ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch notifications and unread count
  const { data: notifications = [], isLoading, refetch, error } = useUserNotifications(userProfile);

  // Debug logging
  console.log('[NotificationDropdown] userProfile:', userProfile?.role, userProfile?.diocese);
  console.log('[NotificationDropdown] notifications:', notifications.length, 'isLoading:', isLoading, 'error:', error);

  // Sort notifications by createdAt descending (latest first)
  const sortedNotifications = [...notifications].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
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
      case 'church_unpublished':
        return '🔴';  // Church unpublished
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
              className="absolute -top-2 -right-2 w-4 h-4 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between py-1.5">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRefresh();
            }}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="p-1">
              {sortedNotifications.map((notification) => {
                const isExpanded = expandedId === notification.id;
                return (
                  <div
                    key={notification.id}
                    className={`p-2 mb-1 rounded cursor-pointer border-l-2 ${
                      notification.type === 'church_submitted' ? 'border-l-blue-500 bg-blue-50/50' :
                      notification.type === 'heritage_review_assigned' ? 'border-l-purple-500 bg-purple-50/50' :
                      notification.type === 'heritage_validated' ? 'border-l-green-500 bg-green-50/50' :
                      notification.type === 'church_unpublished' ? 'border-l-red-500 bg-red-50/50' :
                      'border-l-gray-500 bg-gray-50/50'
                    } ${isUnread(notification) ? '' : 'opacity-60'}`}
                    onClick={() => {
                      if (!notification.readBy?.includes(userProfile?.uid || '')) {
                        markAsReadMutation.mutate({
                          notificationId: notification.id!,
                          userId: userProfile?.uid || '',
                        });
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight truncate">{notification.title}</p>
                        <p className={`text-[11px] text-muted-foreground mt-0.5 ${isExpanded ? '' : 'line-clamp-1'}`}>
                          {notification.message}
                        </p>
                        
                        {isExpanded && (
                          <div className="mt-2 p-1.5 bg-white/70 rounded text-[10px] space-y-0.5 border">
                            {notification.relatedData?.churchName && (
                              <p><b>Church:</b> {notification.relatedData.churchName}</p>
                            )}
                            {notification.relatedData?.actionBy?.name && (
                              <p><b>From:</b> {notification.relatedData.actionBy.name}</p>
                            )}
                            {notification.metadata?.note && (
                              <p><b>Note:</b> {String(notification.metadata.note)}</p>
                            )}
                            {notification.actionUrl && (
                              <button
                                className="text-blue-600 hover:underline mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(notification.actionUrl!);
                                }}
                              >
                                Go to Dashboard →
                              </button>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimestamp(notification.createdAt)}
                          </span>
                          <button
                            className="text-[10px] text-blue-600 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : notification.id!);
                            }}
                          >
                            {isExpanded ? 'Less' : 'More'}
                          </button>
                        </div>
                      </div>
                      {isUnread(notification) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

