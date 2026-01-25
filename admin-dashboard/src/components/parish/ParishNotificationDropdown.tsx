/**
 * =============================================================================
 * PARISH NOTIFICATION DROPDOWN - Parish Secretary Notification Bell
 * =============================================================================
 *
 * PURPOSE:
 * Displays notifications relevant to parish secretaries, focusing on:
 * - Church status changes (approved, pending review, revision requested)
 * - Church unpublish notifications
 * - Heritage review assignments
 *
 * This is a specialized version of the main NotificationDropdown that
 * shows notifications specifically targeted at parish_secretary role.
 */

import { useState, useEffect } from "react";
import { Bell, CheckCheck, ExternalLink, Loader2, RefreshCw, AlertTriangle, Clock, FileText, EyeOff } from "lucide-react";
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
import type { Notification, NotificationType, NotificationPriority } from "@/lib/notifications";
import { ChurchService } from "@/services/churchService";
import type { Church } from "@/types/church";

// Extended notification type that includes local status notifications
interface LocalNotification {
  id: string;
  type: NotificationType | 'system_notification';
  title: string;
  message: string;
  priority: NotificationPriority;
  isLocal: true;
  icon: string;
  createdAt?: Date;
  readBy?: string[];
  actionUrl?: string;
}

type DisplayNotification = (Notification & { isLocal: false }) | LocalNotification;

interface ParishNotificationDropdownProps {
  // Props are optional - component will fetch church info if not provided
  churchStatus?: string;
  churchName?: string;
}

export function ParishNotificationDropdown({ churchStatus: propChurchStatus, churchName: propChurchName }: ParishNotificationDropdownProps) {
  const { userProfile } = useAuth();
  const [churchData, setChurchData] = useState<Church | null>(null);
  const [isLoadingChurch, setIsLoadingChurch] = useState(true);

  // Fetch church data for status and name
  useEffect(() => {
    const fetchChurchData = async () => {
      if (!userProfile?.parishId && !userProfile?.parish) {
        setIsLoadingChurch(false);
        return;
      }

      try {
        const churchId = userProfile.parishId || userProfile.parish;
        const church = await ChurchService.getChurch(churchId!);
        if (church) {
          setChurchData(church);
        }
      } catch (error) {
        console.error('Error fetching church for notifications:', error);
      } finally {
        setIsLoadingChurch(false);
      }
    };

    fetchChurchData();
  }, [userProfile?.parishId, userProfile?.parish]);

  // Use props if provided, otherwise use fetched data
  const churchStatus = propChurchStatus || churchData?.status;
  const churchName = propChurchName || churchData?.fullName || churchData?.name;

  // Fetch notifications and unread count
  const { data: notifications = [], isLoading, refetch } = useUserNotifications(userProfile);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userProfile);
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // Filter notifications relevant to parish users
  const parishNotifications = notifications.filter(notification => {
    const relevantTypes = [
      'church_approved',
      'church_unpublished',
      'revision_requested',
      'heritage_review_assigned',
      'heritage_validated',
      'system_notification'
    ];
    return relevantTypes.includes(notification.type);
  });

  // Count unread parish-relevant notifications
  const unreadParishCount = parishNotifications.filter(notification => {
    if (!userProfile) return false;
    return !notification.readBy?.includes(userProfile.uid);
  }).length;

  // Generate local notifications based on church status
  const getStatusNotification = () => {
    if (!churchStatus || !churchName) return null;
    
    switch (churchStatus) {
      case 'draft':
        return {
          id: 'local-draft',
          type: 'system_notification' as const,
          title: 'Profile Not Submitted',
          message: `Your church "${churchName}" is still in draft. Complete your profile and submit for review.`,
          priority: 'medium' as const,
          isLocal: true,
          icon: '📝'
        };
      case 'pending':
        return {
          id: 'local-pending',
          type: 'system_notification' as const,
          title: 'Under Review',
          message: `Your church "${churchName}" is currently being reviewed by the Chancery Office.`,
          priority: 'low' as const,
          isLocal: true,
          icon: '⏳'
        };
      case 'heritage_review':
        return {
          id: 'local-heritage',
          type: 'heritage_review_assigned' as const,
          title: 'Heritage Review in Progress',
          message: `Your church "${churchName}" has been forwarded to the Museum Researcher for heritage validation.`,
          priority: 'medium' as const,
          isLocal: true,
          icon: '🏛️'
        };
      default:
        return null;
    }
  };

  const localStatusNotification = getStatusNotification();

  const handleNotificationClick = (notification: Notification) => {
    if (!userProfile) return;

    // Mark as read if not already (skip for local notifications)
    if (!notification.readBy?.includes(userProfile.uid) && notification.id && !notification.id.startsWith('local-')) {
      markAsReadMutation.mutate({
        notificationId: notification.id!,
        userId: userProfile.uid,
      });
    }
  };

  const handleMarkAllAsRead = () => {
    if (!userProfile || unreadParishCount === 0) return;
    markAllAsReadMutation.mutate(userProfile);
  };

  const handleRefresh = () => {
    refetch();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'church_approved':
        return '✅';  // Church published
      case 'church_unpublished':
        return '🔴';  // Church unpublished - important!
      case 'revision_requested':
        return '📝';  // Revision needed
      case 'heritage_review_assigned':
        return '🏛️';  // Sent to museum researcher
      case 'heritage_validated':
        return '🎖️';  // Museum validated heritage
      default:
        return '📢';  // System notification
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'church_approved':
        return 'border-l-4 border-l-green-500 bg-green-50/50';
      case 'church_unpublished':
        return 'border-l-4 border-l-red-500 bg-red-50/50';
      case 'revision_requested':
        return 'border-l-4 border-l-orange-500 bg-orange-50/50';
      case 'heritage_review_assigned':
      case 'heritage_validated':
        return 'border-l-4 border-l-purple-500 bg-purple-50/50';
      default:
        return 'border-l-4 border-l-blue-500 bg-blue-50/50';
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

  const isUnread = (notification: Notification | { id: string; isLocal?: boolean }) => {
    if ('isLocal' in notification && notification.isLocal) return true;
    if (!userProfile) return false;
    return !('readBy' in notification) || !(notification as Notification).readBy?.includes(userProfile.uid);
  };

  const formatTimestamp = (timestamp: unknown) => {
    try {
      if (!timestamp) return 'just now';
      // Handle Firestore Timestamp
      const date = timestamp && typeof timestamp === 'object' && 'toDate' in timestamp 
        ? (timestamp as { toDate: () => Date }).toDate() 
        : new Date(timestamp as string | number);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };

  // Check if church is unpublished (not approved and had been previously)
  const isUnpublished = churchStatus && !['approved', 'draft', 'pending', 'heritage_review', 'under_review'].includes(churchStatus);

  // Combine local status notification with server notifications
  const allNotifications = [
    ...(localStatusNotification ? [localStatusNotification] : []),
    ...parishNotifications.map(n => ({ ...n, isLocal: false }))
  ];

  // Total count includes local notification if applicable
  const totalUnread = unreadParishCount + (localStatusNotification ? 1 : 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Notifications</span>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalUnread} unread
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
            {unreadParishCount > 0 && (
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

        {/* Church Status Alert - Always show if not approved */}
        {churchStatus && churchStatus !== 'approved' && (
          <>
            <div className="px-3 py-2 bg-amber-50 border-b">
              <div className="flex items-center gap-2 text-amber-800">
                {churchStatus === 'draft' && <FileText className="w-4 h-4" />}
                {churchStatus === 'pending' && <Clock className="w-4 h-4" />}
                {churchStatus === 'heritage_review' && <AlertTriangle className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {churchStatus === 'draft' && 'Profile needs to be submitted'}
                  {churchStatus === 'pending' && 'Profile under review'}
                  {churchStatus === 'heritage_review' && 'Heritage review in progress'}
                  {churchStatus === 'under_review' && 'Profile under review'}
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                {churchStatus === 'draft' && 'Complete and submit your church profile for review.'}
                {churchStatus === 'pending' && 'The Chancery Office is reviewing your submission.'}
                {churchStatus === 'heritage_review' && 'Museum Researcher is validating heritage status.'}
                {churchStatus === 'under_review' && 'Your profile is being reviewed.'}
              </p>
            </div>
          </>
        )}

        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You'll be notified about status updates
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {allNotifications.map((notification, index) => {
                const notif = notification as DisplayNotification;
                return (
                  <DropdownMenuItem
                    key={notif.id || index}
                    className={`flex flex-col items-start gap-2 p-3 cursor-pointer rounded-lg ${
                      getNotificationStyle(notif.type)
                    } ${isUnread(notif) ? '' : 'opacity-70'}`}
                    onClick={() => !notif.isLocal && handleNotificationClick(notif as Notification)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="text-xl flex-shrink-0">
                        {notif.isLocal ? notif.icon : getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {notif.title}
                          </p>
                          {isUnread(notif) && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(notif.priority)}`}
                          >
                            {notif.priority}
                          </Badge>
                          {notif.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notif.createdAt)}
                            </span>
                          )}
                          {notif.isLocal && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                              Current Status
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {notif.actionUrl && !notif.isLocal && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 ml-10">
                        <ExternalLink className="w-3 h-3" />
                        <span>View details</span>
                      </div>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Unpublish Alert */}
        {parishNotifications.some(n => n.type === 'church_unpublished') && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3 bg-red-50">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Important Notice</span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                Your church has been unpublished. Check your notifications for details and resubmit for review when ready.
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
