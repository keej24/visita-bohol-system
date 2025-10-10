import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  MessageSquare,
  Star,
  Search,
  AlertTriangle,
  Eye,
  ArrowLeft,
  TrendingUp,
  Users,
  ThumbsUp,
  Loader2,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FeedbackService, FeedbackItem as FeedbackServiceItem } from '@/services/feedbackService';

interface ParishFeedbackProps {
  churchName: string;
  churchId: string;
  onClose: () => void;
}

// Use FeedbackItem from service
type FeedbackItem = FeedbackServiceItem & {
  churchName?: string;
};

export const ParishFeedback: React.FC<ParishFeedbackProps> = ({
  churchName,
  churchId,
  onClose
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{id: string, action: 'hide' | 'unhide'} | null>(null);
  const [moderationNote, setModerationNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Real feedback data from Firestore
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);

  // Load feedback with real-time updates
  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = FeedbackService.subscribeToFeedbackByChurch(
      churchId,
      (feedback) => {
        setFeedbackData(feedback.map(f => ({ ...f, churchName })));
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [churchId, churchName]);

  // Filter feedback
  const filteredFeedback = useMemo(() => {
    return feedbackData.filter(feedback => {
      const matchesSearch =
        feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.userName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
      const matchesRating = ratingFilter === 'all' || feedback.rating.toString() === ratingFilter;

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [feedbackData, searchTerm, statusFilter, ratingFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const published = feedbackData.filter(f => f.status === 'published').length;
    const hidden = feedbackData.filter(f => f.status === 'hidden').length;
    const avgRating = feedbackData.length > 0
      ? (feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length).toFixed(1)
      : '0';

    return { published, hidden, avgRating, total: feedbackData.length };
  }, [feedbackData]);

  // Handle moderation actions
  const handleModerationRequest = (feedbackId: string, action: 'hide' | 'unhide') => {
    setPendingAction({id: feedbackId, action});
    setShowConfirmDialog(true);
  };

  const confirmModeration = async () => {
    if (!pendingAction || !userProfile) return;

    try {
      const newStatus = pendingAction.action === 'hide' ? 'hidden' : 'published';

      await FeedbackService.moderateFeedback(
        pendingAction.id,
        newStatus,
        userProfile.uid
      );

      toast({
        title: "Feedback Moderated",
        description: `The feedback has been ${newStatus === 'hidden' ? 'hidden from' : 'published to'} public view.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to moderate feedback. Please try again.",
        variant: "destructive"
      });
    }

    setShowConfirmDialog(false);
    setPendingAction(null);
    setModerationNote('');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-green-600" />
              Visitor Feedback
            </h1>
            <p className="text-gray-600">Monitor and moderate feedback for {churchName}</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4" />
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <p className="text-xs text-gray-500">Visible to public</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Hidden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.hidden}</div>
            <p className="text-xs text-gray-500">Moderated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.avgRating}</div>
            <div className="flex gap-1 mt-1">
              {renderStars(Math.round(parseFloat(stats.avgRating)))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search feedback, users, or subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feedback List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-gray-500">Loading feedback...</p>
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No feedback matches your current filters.</p>
              </div>
            ) : (
              filteredFeedback.map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{feedback.subject}</h4>
                        <div className="flex gap-1">
                          {renderStars(feedback.rating)}
                        </div>
                        <Badge variant={feedback.status === 'published' ? 'default' : 'secondary'}>
                          {feedback.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">{feedback.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>By: {feedback.userName}</span>
                        <span>•</span>
                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                        {feedback.moderatedAt && (
                          <>
                            <span>•</span>
                            <span>Moderated by {feedback.moderatedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFeedback(feedback);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {feedback.status === 'published' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModerationRequest(feedback.id, 'hide')}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <EyeOff className="w-4 h-4 mr-1" />
                          Hide
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModerationRequest(feedback.id, 'unhide')}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Unhide
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{selectedFeedback.subject}</h3>
                <div className="flex gap-1">
                  {renderStars(selectedFeedback.rating)}
                </div>
                <Badge variant={selectedFeedback.status === 'published' ? 'default' : 'secondary'}>
                  {selectedFeedback.status}
                </Badge>
              </div>
              <div className="border rounded p-3 bg-gray-50">
                <p className="text-gray-800">{selectedFeedback.message}</p>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Submitted by:</strong> {selectedFeedback.userName}</p>
                <p><strong>Date:</strong> {new Date(selectedFeedback.createdAt).toLocaleString()}</p>
                {selectedFeedback.moderatedAt && (
                  <p><strong>Moderated:</strong> {new Date(selectedFeedback.moderatedAt).toLocaleString()} by {selectedFeedback.moderatedBy}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to hide this feedback from public view? This action can be reviewed later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional: Add a note about why this feedback is being hidden..."
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmModeration} className="bg-orange-600 hover:bg-orange-700">
              Hide Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
