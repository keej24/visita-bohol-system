import React, { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
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
  DialogTrigger,
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FeedbackService, type FeedbackItem as ServiceFeedbackItem } from '@/services/feedbackService';

// Define feedback type with church name
interface FeedbackItem {
  id: string;
  churchName: string;
  userName: string;
  rating: number;
  subject: string;
  message: string;
  status: 'published' | 'hidden' | 'pending';
  createdAt: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

const FeedbackReports = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{id: string, action: 'hide' | 'publish'} | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all feedback for the diocese
  useEffect(() => {
    const fetchDioceseFeedback = async () => {
      if (!userProfile?.diocese) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get all churches in the diocese
        const churchesRef = collection(db, 'churches');
        const churchesQuery = query(churchesRef, where('diocese', '==', userProfile.diocese));
        const churchesSnapshot = await getDocs(churchesQuery);

        const churchMap = new Map<string, string>();
        churchesSnapshot.docs.forEach(doc => {
          churchMap.set(doc.id, doc.data().name || 'Unknown Church');
        });

        // Get all feedback for all churches in the diocese
        const feedbackRef = collection(db, 'feedback');
        const feedbackQuery = query(feedbackRef, orderBy('date_submitted', 'desc'));
        const feedbackSnapshot = await getDocs(feedbackQuery);

        const allFeedback: FeedbackItem[] = [];

        for (const feedbackDoc of feedbackSnapshot.docs) {
          const data = feedbackDoc.data();
          const churchId = data.church_id || data.churchId;

          // Only include feedback for churches in this diocese
          if (churchMap.has(churchId)) {
            // Fetch user name if available
            let userName = 'Anonymous';
            if (data.pub_user_id) {
              try {
                const userDoc = await getDoc(doc(db, 'pub_users', data.pub_user_id));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  userName = userData.displayName || userData.name || 'Anonymous';
                }
              } catch (error) {
                console.error('Error fetching user name:', error);
              }
            }

            allFeedback.push({
              id: feedbackDoc.id,
              churchName: churchMap.get(churchId) || 'Unknown Church',
              userName,
              rating: data.rating || 5,
              subject: data.subject || 'Feedback',
              message: data.comment || data.message || '',
              status: data.status || 'published',
              createdAt: data.date_submitted?.toDate?.()?.toISOString() || new Date().toISOString(),
              moderatedAt: data.moderatedAt?.toDate?.()?.toISOString(),
              moderatedBy: data.moderatedBy
            });
          }
        }

        setFeedbackData(allFeedback);
      } catch (error) {
        console.error('Error fetching diocese feedback:', error);
        toast({
          title: 'Error',
          description: 'Failed to load feedback data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDioceseFeedback();
  }, [userProfile?.diocese, toast]);

  // Handle moderation actions
  const handleModerationRequest = (feedbackId: string, action: 'hide' | 'publish') => {
    setPendingAction({id: feedbackId, action});
    setShowConfirmDialog(true);
  };

  const confirmModeration = async () => {
    if (!pendingAction || !user) {
      return;
    }

    try {
      const newStatus = pendingAction.action === 'hide' ? 'hidden' : 'published';
      await FeedbackService.moderateFeedback(pendingAction.id, newStatus, user.uid);

      // Update local state
      setFeedbackData(prev => prev.map(fb =>
        fb.id === pendingAction.id
          ? { ...fb, status: newStatus, moderatedAt: new Date().toISOString(), moderatedBy: user.email || 'Admin' }
          : fb
      ));

      toast({
        title: 'Success',
        description: `Feedback ${pendingAction.action === 'hide' ? 'hidden' : 'published'} successfully`,
      });
    } catch (error) {
      console.error('Error moderating feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to moderate feedback',
        variant: 'destructive'
      });
    } finally {
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  // Filter feedback based on search and status
  const filteredFeedback = useMemo(() => {
    return feedbackData.filter(feedback => {
      const matchesSearch = feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.churchName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, feedbackData]);

  // Calculate simple statistics
  const stats = useMemo(() => {
    const total = feedbackData.length;
    const published = feedbackData.filter(f => f.status === 'published').length;
    const hidden = feedbackData.filter(f => f.status === 'hidden').length;
    const pending = feedbackData.filter(f => f.status === 'pending').length;
    const avgRating = total > 0 ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / total : 0;

    return {
      total,
      published,
      hidden,
      pending,
      avgRating: avgRating.toFixed(1)
    };
  }, [feedbackData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'hidden': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Feedback Management
            </h1>
            <p className="text-muted-foreground">
              Moderate user feedback and maintain community standards
            </p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading feedback...</span>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Published</p>
                      <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Hidden Content</p>
                      <p className="text-2xl font-bold text-red-600">{stats.hidden}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.avgRating}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search feedback..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Feedback</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Feedback List */}
            <div className="space-y-4">
              {filteredFeedback.map((feedback) => (
                <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{feedback.subject}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span>{feedback.userName} • {feedback.churchName}</span>
                              <div className="flex items-center gap-1">
                                {renderStars(feedback.rating)}
                              </div>
                            </div>
                          </div>
                          <Badge className={getStatusColor(feedback.status)}>
                            {feedback.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground">{feedback.message}</p>

                        {feedback.moderatedAt && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Moderated by {feedback.moderatedBy} on {new Date(feedback.moderatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>

                        {feedback.status === 'published' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleModerationRequest(feedback.id, 'hide')}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Hide
                          </Button>
                        )}

                        {(feedback.status === 'hidden' || feedback.status === 'pending') && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleModerationRequest(feedback.id, 'publish')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredFeedback.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your filters to see more results.'
                      : 'No feedback has been submitted yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Feedback Details Dialog */}
      {selectedFeedback && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedFeedback.subject}</DialogTitle>
              <DialogDescription>
                Feedback from {selectedFeedback.userName} at {selectedFeedback.churchName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Rating</h4>
                <div className="flex items-center gap-1">
                  {renderStars(selectedFeedback.rating)}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({selectedFeedback.rating}/5)
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Message</h4>
                <p className="text-sm leading-relaxed">{selectedFeedback.message}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
                <Badge className={getStatusColor(selectedFeedback.status)}>
                  {selectedFeedback.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Submitted</h4>
                  <p>{new Date(selectedFeedback.createdAt).toLocaleString()}</p>
                </div>
                {selectedFeedback.moderatedAt && (
                  <div>
                    <h4 className="font-medium text-muted-foreground mb-1">Moderated</h4>
                    <p>{new Date(selectedFeedback.moderatedAt).toLocaleString()}</p>
                    <p className="text-muted-foreground">by {selectedFeedback.moderatedBy}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                {selectedFeedback.status === 'published' && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleModerationRequest(selectedFeedback.id, 'hide');
                      setShowDetailsDialog(false);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Hide This Feedback
                  </Button>
                )}

                {(selectedFeedback.status === 'hidden' || selectedFeedback.status === 'pending') && (
                  <Button
                    variant="default"
                    onClick={() => {
                      handleModerationRequest(selectedFeedback.id, 'publish');
                      setShowDetailsDialog(false);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Publish This Feedback
                  </Button>
                )}

                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === 'hide' ? 'Hide Feedback?' : 'Publish Feedback?'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === 'hide'
                ? 'This will hide the feedback from public view due to community standards violations. This action removes inappropriate content while keeping a record for administrative purposes.'
                : 'This will make the feedback visible to the public. Make sure the content is appropriate and follows community standards.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant={pendingAction?.action === 'hide' ? 'destructive' : 'default'}
              onClick={confirmModeration}
            >
              {pendingAction?.action === 'hide' ? (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Hide Feedback
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Publish Feedback
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingAction(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FeedbackReports;
