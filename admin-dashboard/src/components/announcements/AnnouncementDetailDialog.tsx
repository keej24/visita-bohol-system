import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Phone, Archive, Edit3, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Announcement } from '@/types/announcement';

type AnnouncementDetailDialogProps = {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (announcement: Announcement) => void;
  onArchive: (announcement: Announcement) => void;
  onUnarchive: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
};

export const AnnouncementDetailDialog: React.FC<AnnouncementDetailDialogProps> = ({
  announcement,
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  const statusBadge = useMemo(() => {
    if (!announcement) return null;
    if (announcement.isArchived) {
      return <Badge variant="secondary">Archived</Badge>;
    }

    if (!announcement.eventDate) {
      return <Badge variant="default">Active</Badge>;
    }

    const now = new Date();
    const eventDate = new Date(announcement.eventDate);

    if (eventDate > now) return <Badge variant="default">Upcoming</Badge>;
    if (eventDate.toDateString() === now.toDateString()) return <Badge variant="destructive">Today</Badge>;
    return <Badge variant="outline">Past</Badge>;
  }, [announcement]);

  if (!announcement) {
    return null;
  }

  const handleEditClick = () => {
    onEdit(announcement);
  };

  const handleUnarchiveClick = () => {
    onUnarchive(announcement);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {announcement.title}
            {statusBadge}
            <Badge variant="outline" className="text-xs capitalize">
              {announcement.scope}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {announcement.category}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {announcement.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
            {announcement.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Valid until: {format(new Date(announcement.endDate), 'PPP')}</span>
              </div>
            )}
            {announcement.endTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Ends at {announcement.endTime}</span>
              </div>
            )}
            {announcement.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{announcement.venue}</span>
              </div>
            )}
            {announcement.contactInfo && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{announcement.contactInfo}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Posted on {format(new Date(announcement.createdAt), "PPP 'at' p")}</p>
            {announcement.updatedAt && announcement.updatedAt.getTime() !== announcement.createdAt.getTime() && (
              <p>Last updated {format(new Date(announcement.updatedAt), "PPP 'at' p")}</p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
            {!announcement.isArchived ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Announcement</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to archive this announcement?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onArchive(announcement)}>Yes</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleUnarchiveClick}
                  className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-50"
                >
                  <Archive className="w-4 h-4" />
                  Restore
                </Button>
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete this announcement? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(announcement)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
            <Button className="btn-heritage flex items-center gap-2" onClick={handleEditClick}>
              <Edit3 className="w-4 h-4" />
              Update
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
