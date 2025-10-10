// Announcement list component for displaying and managing announcements
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  Edit,
  Archive,
  Trash2,
  Plus,
  Phone
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
  onDelete: (id: string) => void;
  onCreate?: () => void;
  onAutoArchive?: () => void;
  showScope?: boolean; // Show scope badge (diocese/parish)
  showHeader?: boolean; // Show header with title and "New Announcement" button
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
  showScope = true,
  showHeader = true,
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
        announcement.venue.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = !filters.category || announcement.category === filters.category;

      // Archive filter
      const matchesArchived = filters.isArchived === announcement.isArchived;

      return matchesSearch && matchesCategory && matchesArchived;
    });
  }, [announcements, searchQuery, filters]);

  const getStatusColor = (announcement: Announcement) => {
    if (announcement.isArchived) return 'secondary';
    
    const now = new Date();
    const eventDate = new Date(announcement.eventDate);
    const endDate = new Date(announcement.endDate);
    
    if (eventDate > now) return 'default'; // Upcoming
    if (eventDate.toDateString() === now.toDateString()) return 'destructive'; // Today
    // Past events - check if should be auto-archived based on endDate
    return endDate < now ? 'secondary' : 'outline'; // Past and ended vs Past but still valid
  };

  const getStatusText = (announcement: Announcement) => {
    if (announcement.isArchived) return 'Archived';

    const now = new Date();
    const eventDate = new Date(announcement.eventDate);

    if (eventDate > now) return 'Upcoming';
    if (eventDate.toDateString() === now.toDateString()) return 'Today';
    return 'Past';
  };

  // Count past events that should be auto-archived based on endDate
  const getPastEventsCount = (): number => {
    const now = new Date();
    return announcements.filter(a =>
      !a.isArchived &&
      new Date(a.endDate) < now
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
            {diocese && (
              <p className="text-muted-foreground">
                Manage announcements for the {diocese === 'tagbilaran' ? 'Diocese of Tagbilaran' : 'Diocese of Talibon'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {getPastEventsCount() > 0 && onAutoArchive && (
              <Button onClick={onAutoArchive} variant="outline" className="text-orange-600 border-orange-200">
                <Archive className="w-4 h-4 mr-2" />
                Archive Past Events ({getPastEventsCount()})
              </Button>
            )}
            {onCreate && (
              <Button onClick={onCreate} className="btn-heritage">
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select 
                value={filters.isArchived ? 'archived' : 'active'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, isArchived: value === 'archived' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <Badge variant={getStatusColor(announcement)}>
                        {getStatusText(announcement)}
                      </Badge>
                      {showScope && (
                        <Badge variant="outline" className="text-xs">
                          {announcement.scope}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {announcement.category}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {announcement.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(announcement)}
                      title="Edit announcement"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!announcement.isArchived && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onArchive(announcement.id)}
                        title="Archive announcement"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(announcement.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(announcement.eventDate), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{announcement.eventTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{announcement.venue}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Valid until: {format(new Date(announcement.endDate), 'PPP')}</span>
                  </div>

                  {announcement.contactInfo && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{announcement.contactInfo}</span>
                    </div>
                  )}
                </div>

                {/* Posted Date and Time */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Posted on {format(new Date(announcement.createdAt), 'PPP \'at\' p')}</span>
                    {announcement.updatedAt && announcement.updatedAt.getTime() !== announcement.createdAt.getTime() && (
                      <span className="ml-2">• Last updated {format(new Date(announcement.updatedAt), 'PPP \'at\' p')}</span>
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
