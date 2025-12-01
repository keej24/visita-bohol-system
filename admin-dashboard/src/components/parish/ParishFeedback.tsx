import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Star,
  Search,
  AlertTriangle,
  Eye,
  Loader2,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

import { FeedbackService, FeedbackItem as FeedbackServiceItem } from '@/services/feedbackService';

interface ParishFeedbackProps {
  churchName: string;
  churchId: string;
}

// Use FeedbackItem from service
type FeedbackItem = FeedbackServiceItem & {
  churchName?: string;
};

export const ParishFeedback: React.FC<ParishFeedbackProps> = ({
  churchName,
  churchId
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'published' | 'hidden'>('published');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{id: string, action: 'hide' | 'publish'} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real feedback data from Firestore
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);

  // Load feedback with real-time updates
  useEffect(() => {
    console.log('🔍 [PARISH FEEDBACK] Subscribing to feedback for churchId:', churchId);
    setIsLoading(true);

    const unsubscribe = FeedbackService.subscribeToFeedbackByChurch(
      churchId,
      (feedback) => {
        console.log('📬 [PARISH FEEDBACK] Received feedback:', {
          churchId,
          count: feedback.length,
          items: feedback.map(f => ({ id: f.id, church_id: f.church_id, status: f.status }))
        });
        // churchName is only used for display, not for subscription logic
        setFeedbackData(feedback.map(f => ({ ...f, churchName })));
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId]); // Only re-subscribe when churchId changes, not churchName

  // Filter feedback based on active tab and search
  const filteredFeedback = useMemo(() => {
    return feedbackData.filter(feedback => {
      const matchesSearch =
        feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.userName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = feedback.status === activeTab;

      return matchesSearch && matchesStatus;
    });
  }, [feedbackData, searchTerm, activeTab]);

  // Calculate stats based on active tab
  const stats = useMemo(() => {
    const published = feedbackData.filter(f => f.status === 'published');
    const hidden = feedbackData.filter(f => f.status === 'hidden');
    
    const currentData = activeTab === 'published' ? published : hidden;
    const avgRating = currentData.length > 0
      ? (currentData.reduce((sum, f) => sum + f.rating, 0) / currentData.length).toFixed(1)
      : '0';

    return { 
      published: published.length, 
      hidden: hidden.length, 
      avgRating, 
      total: feedbackData.length,
      currentCount: currentData.length
    };
  }, [feedbackData, activeTab]);

  // Handle moderation actions
  const handleModerationRequest = (feedbackId: string, action: 'hide' | 'publish') => {
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
        title: "Success",
        description: newStatus === 'hidden' 
          ? 'Feedback has been hidden from public view.' 
          : 'Feedback has been unhidden to public view.',
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-600" />
            Visitor Feedback
          </h1>
          <p className="text-gray-600">Monitor and moderate feedback for {churchName}</p>
        </div>
      </div>

      {/* Tabs for Published/Hidden */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'published' | 'hidden')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="published">
            Published {stats.published > 0 && `(${stats.published})`}
          </TabsTrigger>
          <TabsTrigger value="hidden">
            Hidden {stats.hidden > 0 && `(${stats.hidden})`}
          </TabsTrigger>
        </TabsList>

        {/* Published Tab */}
        <TabsContent value="published" className="space-y-6 mt-6">
          {/* Statistics Cards - Published Tab */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Published</p>
                    <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hidden</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.hidden}</p>
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

          {/* Filters - Published Tab */}
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
              </div>
            </CardContent>
          </Card>

          {/* Published Feedback List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-gray-500">Loading feedback...</p>
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No published feedback found.</p>
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

                      {/* Display photos if available */}
                      {feedback.photos && feedback.photos.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {feedback.photos.slice(0, 3).map((photoUrl, index) => (
                            <img
                              key={index}
                              src={photoUrl}
                              alt={`Feedback photo ${index + 1}`}
                              className="w-20 h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(photoUrl, '_blank')}
                            />
                          ))}
                          {feedback.photos.length > 3 && (
                            <div className="w-20 h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                              +{feedback.photos.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>By: {feedback.userName}</span>
                        <span>•</span>
                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                        {feedback.photos && feedback.photos.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {feedback.photos.length} photo{feedback.photos.length === 1 ? '' : 's'}
                            </span>
                          </>
                        )}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleModerationRequest(feedback.id, 'hide')}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        <EyeOff className="w-4 h-4 mr-1" />
                        Hide
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Hidden Tab */}
        <TabsContent value="hidden" className="space-y-6 mt-6">
          {/* Statistics Cards - Hidden Tab */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Hidden</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.hidden}</p>
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

          {/* Filters - Hidden Tab */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search hidden feedback..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hidden Feedback List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-gray-500">Loading feedback...</p>
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hidden feedback found.</p>
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

                      {/* Display photos if available */}
                      {feedback.photos && feedback.photos.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {feedback.photos.slice(0, 3).map((photoUrl, index) => (
                            <img
                              key={index}
                              src={photoUrl}
                              alt={`Feedback photo ${index + 1}`}
                              className="w-20 h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(photoUrl, '_blank')}
                            />
                          ))}
                          {feedback.photos.length > 3 && (
                            <div className="w-20 h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                              +{feedback.photos.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>By: {feedback.userName}</span>
                        <span>•</span>
                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                        {feedback.photos && feedback.photos.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {feedback.photos.length} photo{feedback.photos.length === 1 ? '' : 's'}
                            </span>
                          </>
                        )}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleModerationRequest(feedback.id, 'publish')}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Unhide
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

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

              {/* Display photos in detail view */}
              {selectedFeedback.photos && selectedFeedback.photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Photos ({selectedFeedback.photos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedFeedback.photos.map((photoUrl, index) => (
                      <img
                        key={index}
                        src={photoUrl}
                        alt={`Feedback photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => window.open(photoUrl, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

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
            <DialogTitle>
              {pendingAction?.action === 'hide' ? 'Hide Feedback' : 'Unhide Feedback'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === 'hide'
                ? 'Are you sure you want to hide this feedback?'
                : 'Are you sure you want to unhide this feedback?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              No
            </Button>
            <Button
              onClick={confirmModeration}
              className={
                pendingAction?.action === 'hide'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};