// Announcement list component for displaying and managing announcements
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  Edit,
  Archive,
  Plus,
  Phone,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import type { Announcement, AnnouncementFilters } from '@/types/announcement';
import { ANNOUNCEMENT_CATEGORIES } from '@/types/announcement';
import type { Diocese } from '@/contexts/AuthContext';

interface AnnouncementListProps {
  announcements: Announcement[];
  diocese?: Diocese;
  isLoading?: boolean;
  onEdit: (announcement: Announcement) => void;
  onArchive: (id: string) => void;
  onDelete?: (id: string) => void; // Optional - kept for backward compatibility but not used
  onCreate?: () => void;
  onAutoArchive?: () => void;
  onView?: (announcement: Announcement) => void;
  showScope?: boolean; // Show scope badge (diocese/parish)
  showHeader?: boolean; // Show header with title and "New Announcement" button
  isArchivedView?: boolean; // Whether this is showing archived announcements
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  diocese,
  isLoading = false,
  onEdit,
  onArchive,
  onDelete,
  onCreate,
  onAutoArchive,
  onView,
  showScope = true,
  showHeader = true,
  isArchivedView = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AnnouncementFilters>({
    isArchived: false,
  });

  // Filter and search announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((announcement) => {
      // Search filter
      const matchesSearch = !searchQuery ||
        announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        announcement.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (announcement.venue && announcement.venue.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = !filters.category || announcement.category === filters.category;

      // Don't filter by archive status here - the parent component already passes
      // the correct announcements (active or archived) based on the tab
      return matchesSearch && matchesCategory;
    });
  }, [announcements, searchQuery, filters]);

  const getStatusColor = (announcement: Announcement) => {
    if (announcement.isArchived) return 'secondary';

    // For non-event announcements (no dates), show as active
    if (!announcement.eventDate) return 'default';

    const now = new Date();
    const eventDate = new Date(announcement.eventDate);
    const endDate = announcement.endDate ? new Date(announcement.endDate) : null;

    if (eventDate > now) return 'default'; // Upcoming
    if (eventDate.toDateString() === now.toDateString()) return 'destructive'; // Today
    // Past events - check if should be auto-archived based on endDate
    return endDate && endDate < now ? 'secondary' : 'outline'; // Past and ended vs Past but still valid
  };

  const getStatusText = (announcement: Announcement) => {
    if (announcement.isArchived) return 'Archived';

    // For non-event announcements (no dates), show as active
    if (!announcement.eventDate) return 'Active';

    const now = new Date();
    const eventDate = new Date(announcement.eventDate);

    // Check if the event has truly ended (considering endDate, endTime, or eventDate)
    const isPastEvent = isAnnouncementPast(announcement, now);
    
    if (isPastEvent) return 'Past';
    if (eventDate > now) return 'Upcoming';
    if (eventDate.toDateString() === now.toDateString()) return 'Today';
    return 'Past';
  };

  // Helper function to determine if an announcement is past
  const isAnnouncementPast = (announcement: Announcement, now: Date): boolean => {
    // If explicitly archived
    if (announcement.isArchived) return true;
    
    // No event date = not past
    if (!announcement.eventDate) return false;

    const eventDate = new Date(announcement.eventDate);

    // Check endDate first
    if (announcement.endDate && new Date(announcement.endDate) < now) {
      return true;
    }

    // If no endDate, check eventDate + endTime
    if (!announcement.endDate) {
      if (announcement.endTime) {
        const [hours, minutes] = announcement.endTime.split(':').map(Number);
        const eventEndDateTime = new Date(eventDate);
        eventEndDateTime.setHours(hours || 0, minutes || 0, 0, 0);
        return eventEndDateTime < now;
      } else if (announcement.eventTime) {
        const [hours, minutes] = announcement.eventTime.split(':').map(Number);
        const eventDateTime = new Date(eventDate);
        eventDateTime.setHours(hours || 0, minutes || 0, 0, 0);
        return eventDateTime < now;
      } else {
        // Use end of event day
        const eventEndOfDay = new Date(eventDate);
        eventEndOfDay.setHours(23, 59, 59, 999);
        return eventEndOfDay < now;
      }
    }

    return false;
  };

  // Count past events that should be auto-archived
  const getPastEventsCount = (): number => {
    const now = new Date();
    return announcements.filter(a => 
      !a.isArchived && isAnnouncementPast(a, now)
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Announcements</h2>
            {diocese && (
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage announcements for the {diocese === 'tagbilaran' ? 'Diocese of Tagbilaran' : 'Diocese of Talibon'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {getPastEventsCount() > 0 && onAutoArchive && (
              <Button onClick={onAutoArchive} variant="outline" size="sm" className="text-orange-600 border-orange-200 text-xs sm:text-sm">
                <Archive className="w-4 h-4 sm:mr-2" />
                <span className="hidden xs:inline">Archive Past</span> ({getPastEventsCount()})
              </Button>
            )}
            {onCreate && (
              <Button onClick={onCreate} size="sm" className="btn-heritage text-xs sm:text-sm">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden xs:inline">New</span> <span className="xs:hidden">+</span><span className="hidden sm:inline">Announcement</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value === 'all' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ANNOUNCEMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading announcements...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No announcements found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filters.category 
                  ? 'No announcements match your current filters.'
                  : 'Get started by creating your first announcement.'
                }
              </p>
              {!searchQuery && !filters.category && onCreate && (
                <Button onClick={onCreate} className="btn-heritage">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Announcement
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      <CardTitle className="text-base sm:text-lg truncate">{announcement.title}</CardTitle>
                      <Badge variant={getStatusColor(announcement)} className="text-xs">
                        {getStatusText(announcement)}
                      </Badge>
                      {showScope && (
                        <Badge variant="outline" className="text-xs hidden xs:inline-flex">
                          {announcement.scope}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                        {announcement.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {onView ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(announcement)}
                        title="View announcement details"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs sm:text-sm"
                      >
                        <Search className="w-4 h-4" />
                        <span className="ml-1 hidden sm:inline">View</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(announcement)}
                          title="Edit announcement"
                          className="text-xs sm:text-sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {isArchivedView ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onArchive(announcement.id)}
                              title="Restore announcement to active list"
                              className="text-green-600 border-green-300 hover:bg-green-50 text-xs sm:text-sm"
                            >
                              <Archive className="w-4 h-4" />
                              <span className="ml-1 hidden sm:inline">Unarchive</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onArchive(announcement.id)}
                            title="Archive announcement"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs sm:text-sm"
                          >
                            <Archive className="w-4 h-4" />
                            <span className="ml-1 hidden sm:inline">Archive</span>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  {announcement.eventDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{format(new Date(announcement.eventDate), 'PPP')}</span>
                    </div>
                  )}
                  {announcement.eventTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{announcement.eventTime}</span>
                    </div>
                  )}
                  {announcement.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{announcement.venue}</span>
                    </div>
                  )}

                  {announcement.endDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Valid until: {format(new Date(announcement.endDate), 'PPP')}</span>
                    </div>
                  )}

                  {announcement.contactInfo && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{announcement.contactInfo}</span>
                    </div>
                  )}
                </div>

                {/* Posted Date and Time */}
                <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Posted {format(new Date(announcement.createdAt), 'PPP')}</span>
                    {announcement.updatedAt && announcement.updatedAt.getTime() !== announcement.createdAt.getTime() && (
                      <span className="hidden sm:inline ml-2">• Updated {format(new Date(announcement.updatedAt), 'PPP')}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};