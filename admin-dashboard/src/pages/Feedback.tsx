import React, { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  EyeOff,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FeedbackService } from '@/services/feedbackService';

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
  photos?: string[];
  moderatedAt?: string;
  moderatedBy?: string;
}

const FeedbackReports = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'published' | 'hidden'>('published');
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

        console.log('🔍 [FEEDBACK] Starting fetch for diocese:', userProfile.diocese);

        // Get all churches in the diocese
        const churchesRef = collection(db, 'churches');
        const churchesQuery = query(churchesRef, where('diocese', '==', userProfile.diocese));
        const churchesSnapshot = await getDocs(churchesQuery);

        const churchMap = new Map<string, string>();
        const churchIds: string[] = [];
        const churchNameToIdMap = new Map<string, string>();
        
        churchesSnapshot.docs.forEach(doc => {
          const churchData = doc.data();
          const churchName = churchData.name || 'Unknown Church';
          churchMap.set(doc.id, churchName);
          churchIds.push(doc.id);
          // Map church names to IDs for backwards compatibility
          churchNameToIdMap.set(churchName, doc.id);
        });

        console.log('🏛️ [FEEDBACK] Found churches:', {
          count: churchIds.length,
          ids: churchIds,
          names: Array.from(churchMap.values())
        });

        if (churchIds.length === 0) {
          console.log('⚠️ [FEEDBACK] No churches found for diocese:', userProfile.diocese);
          setFeedbackData([]);
          setLoading(false);
          return;
        }

        // Fetch ALL feedback and filter by diocese churches
        // This approach is needed because some feedback uses church names instead of IDs
        const allFeedback: FeedbackItem[] = [];
        
        console.log('📥 [FEEDBACK] Fetching all feedback...');
        
        const feedbackRef = collection(db, 'feedback');
        const feedbackQuery = query(feedbackRef, orderBy('date_submitted', 'desc'));
        const feedbackSnapshot = await getDocs(feedbackQuery);
        
        console.log(`� [FEEDBACK] Total feedback documents in database: ${feedbackSnapshot.docs.length}`);

        for (const feedbackDoc of feedbackSnapshot.docs) {
          const data = feedbackDoc.data();
          const churchIdOrName = data.church_id || data.churchId;
          
          // Check if this feedback belongs to a church in our diocese
          const belongsToDiocese = churchIds.includes(churchIdOrName) || 
                                   churchNameToIdMap.has(churchIdOrName);
          
          if (!belongsToDiocese) {
            continue; // Skip feedback for churches not in this diocese
          }
          
          // Get the actual church ID (convert name to ID if needed)
          const actualChurchId = churchIds.includes(churchIdOrName) 
            ? churchIdOrName 
            : churchNameToIdMap.get(churchIdOrName) || churchIdOrName;

          // Always show as Anonymous for privacy protection
          const userName = 'Anonymous';
          
          // Note: User identity is protected in feedback to encourage honest reviews
          // Original code that fetched actual names has been removed for privacy

          allFeedback.push({
            id: feedbackDoc.id,
            churchName: churchMap.get(actualChurchId) || churchIdOrName,
            userName,
            rating: data.rating || 5,
            subject: data.subject || data.category || 'Review',
            message: data.comment || data.message || '',
            status: data.status || 'published', // Default to published if no status field
            createdAt: data.date_submitted?.toDate?.()?.toISOString() || new Date().toISOString(),
            photos: Array.isArray(data.photos) ? data.photos : [],
            moderatedAt: data.moderatedAt?.toDate?.()?.toISOString(),
            moderatedBy: data.moderatedBy
          });
        }

        // Sort all feedback by date
        allFeedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        console.log('✅ [FEEDBACK] Successfully loaded feedback:', {
          total: allFeedback.length,
          diocese: userProfile.diocese,
          churches: churchIds.length,
          breakdown: {
            published: allFeedback.filter(f => f.status === 'published').length,
            hidden: allFeedback.filter(f => f.status === 'hidden').length,
            pending: allFeedback.filter(f => f.status === 'pending').length,
          }
        });
        
        setFeedbackData(allFeedback);
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string; stack?: string };
        console.error('❌ [FEEDBACK] Error fetching diocese feedback:', {
          error: error,
          code: err?.code,
          message: err?.message,
          diocese: userProfile?.diocese,
          stack: err?.stack
        });
        
        // Show specific error to user
        const errorMessage = err?.code === 'permission-denied' 
          ? 'Permission denied. Please check your access rights or contact support.'
          : err?.code === 'failed-precondition'
          ? 'Database index error. Please contact technical support.'
          : err?.message || 'Failed to load feedback data. Please try again.';
          
        toast({
          title: 'Error Loading Feedback',
          description: errorMessage,
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
      console.error('❌ [FEEDBACK] Cannot moderate: Missing pendingAction or user', { pendingAction, user: !!user });
      return;
    }

    console.log('🔄 [FEEDBACK] Starting moderation:', {
      feedbackId: pendingAction.id,
      action: pendingAction.action,
      newStatus: pendingAction.action === 'hide' ? 'hidden' : 'published',
      userId: user.uid
    });

    try {
      const newStatus = pendingAction.action === 'hide' ? 'hidden' : 'published';
      await FeedbackService.moderateFeedback(pendingAction.id, newStatus, user.uid);

      console.log('✅ [FEEDBACK] Moderation successful, updating local state');

      // Update local state
      setFeedbackData(prev => prev.map(fb =>
        fb.id === pendingAction.id
          ? { ...fb, status: newStatus, moderatedAt: new Date().toISOString(), moderatedBy: user.email || 'Admin' }
          : fb
      ));

      toast({
        title: 'Success',
        description: pendingAction.action === 'hide' 
          ? 'Feedback hidden successfully.' 
          : 'Feedback published successfully.',
      });
    } catch (error) {
      console.error('❌ [FEEDBACK] Error moderating feedback:', error);
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

  // Filter feedback based on search, status, and active tab
  const filteredFeedback = useMemo(() => {
    return feedbackData.filter(feedback => {
      // Filter by active tab
      const matchesTab = feedback.status === activeTab;
      
      const matchesSearch = feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.churchName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, feedbackData, activeTab]);

  // Calculate statistics for the active tab
  const stats = useMemo(() => {
    // Filter by active tab first
    const tabFeedback = feedbackData.filter(f => f.status === activeTab);
    
    const total = tabFeedback.length;
    const pending = tabFeedback.filter(f => f.status === 'pending').length;
    const avgRating = total > 0 ? tabFeedback.reduce((sum, f) => sum + f.rating, 0) / total : 0;

    // Get counts for all feedback (for tab badges)
    const publishedCount = feedbackData.filter(f => f.status === 'published').length;
    const hiddenCount = feedbackData.filter(f => f.status === 'hidden').length;

    return {
      total,
      pending,
      avgRating: avgRating.toFixed(1),
      publishedCount,
      hiddenCount
    };
  }, [feedbackData, activeTab]);

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
            {/* Tabs for Published vs Hidden */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'published' | 'hidden')} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="published">
                  Published {stats.publishedCount > 0 && `(${stats.publishedCount})`}
                </TabsTrigger>
                <TabsTrigger value="hidden">
                  Hidden {stats.hiddenCount > 0 && `(${stats.hiddenCount})`}
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
                          <p className="text-2xl font-bold text-green-600">{stats.total}</p>
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
                          <p className="text-2xl font-bold text-orange-600">{stats.hiddenCount}</p>
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

                {/* Feedback List - Published Tab */}
                <div className="space-y-4">
              {filteredFeedback.map((feedback) => (
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
                        <span>{feedback.churchName}</span>
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
                      {feedback.status === 'published' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModerationRequest(feedback.id, 'hide')}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <EyeOff className="w-4 h-4 mr-1" />
                          Hide
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

                  {filteredFeedback.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>
                        {searchTerm
                          ? 'No published feedback matches your search.'
                          : 'No published feedback available.'}
                      </p>
                    </div>
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
                          <p className="text-2xl font-bold text-green-600">{stats.publishedCount}</p>
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
                          <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
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

                {/* Feedback List - Hidden Tab */}
                <div className="space-y-4">
                  {filteredFeedback.map((feedback) => (
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
                            <span>{feedback.churchName}</span>
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
                  ))}

                  {filteredFeedback.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>
                        {searchTerm
                          ? 'No hidden feedback matches your search.'
                          : 'No hidden feedback available.'}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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

              {/* Display photos in detail view */}
              {selectedFeedback.photos && selectedFeedback.photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Photos ({selectedFeedback.photos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedFeedback.photos.map((photoUrl, index) => (
                      <img
                        key={index}
                        src={photoUrl}
                        alt={`Feedback photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => window.open(photoUrl, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

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
              {pendingAction?.action === 'hide' ? 'Confirm Hide Feedback' : 'Confirm Publish Feedback'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === 'hide'
                ? 'Are you sure you want to hide this feedback?'
                : 'Are you sure you want to publish this feedback?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant={pendingAction?.action === 'hide' ? 'destructive' : 'default'}
              onClick={confirmModeration}
            >
              Yes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingAction(null);
              }}
            >
              No
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FeedbackReports;
