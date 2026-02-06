/**
 * =============================================================================
 * FEEDBACK.TSX - Feedback/Review Moderation Page (Chancery Office)
 * =============================================================================
 *
 * PURPOSE:
 * This page allows Chancery Office users to view, moderate, and manage all
 * feedback/reviews submitted by mobile app users for churches in their diocese.
 * It provides tools to hide inappropriate content or unhide previously hidden
 * reviews.
 *
 * KEY FEATURES:
 * 1. Two-Tab Interface: Published vs Hidden feedback separation
 * 2. Search: Find feedback by content, user, or church name
 * 3. Statistics: Total count, average rating, moderation summary
 * 4. Photo Support: View attached photos in feedback
 * 5. Moderation Audit: Track who moderated and when
 *
 * MODERATION WORKFLOW:
 * ┌─────────────────┐     Hide      ┌─────────────────┐
 * │   Published     │ ─────────→ │     Hidden      │
 * │   (visible on   │ ←───────── │   (not shown    │
 * │   mobile app)   │   Unhide   │   on mobile)    │
 * └─────────────────┘             └─────────────────┘
 *
 * DATA FLOW:
 * 1. On mount, fetch all churches in user's diocese
 * 2. For each church, fetch feedback from 'feedback' collection
 * 3. Map church IDs to names for display
 * 4. Note: Feedback uses church_id OR church name for backwards compatibility
 *
 * PRIVACY PROTECTION:
 * - All feedback shows "Anonymous" for user names
 * - This encourages honest reviews without fear of identification
 * - Original user identity is stored but not displayed
 *
 * CONFIRMATION DIALOG:
 * - Hide/Unhide actions require confirmation before executing
 * - Prevents accidental moderation changes
 *
 * RELATED FILES:
 * - services/feedbackService.ts: Firebase CRUD and moderation operations
 * - components/parish/ParishFeedback.tsx: Parish secretary's feedback view
 * - mobile-app/lib/services/feedback_service.dart: Mobile app feedback submission
 */

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
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Church,
  ChevronDown,
  FolderOpen
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
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
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'hidden'>('pending');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{id: string, action: 'hide' | 'publish' | 'approve' | 'reject', subject?: string} | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChurch, setSelectedChurch] = useState<string>('all');

  // Group feedback by church name
  const feedbackByChurch = useMemo(() => {
    const grouped = new Map<string, FeedbackItem[]>();
    
    feedbackData.forEach(feedback => {
      const churchName = feedback.churchName;
      if (!grouped.has(churchName)) {
        grouped.set(churchName, []);
      }
      grouped.get(churchName)!.push(feedback);
    });

    // Sort churches alphabetically
    return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [feedbackData]);

  // Get unique church names for filter dropdown
  const churchNames = useMemo(() => {
    return Array.from(new Set(feedbackData.map(f => f.churchName))).sort();
  }, [feedbackData]);

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
            moderatedBy: data.moderatedBy // Will be resolved to name below
          });
        }

        // Resolve moderator IDs to names
        const moderatorIds = [...new Set(allFeedback.map(f => f.moderatedBy).filter(Boolean))] as string[];
        const moderatorNameMap = new Map<string, string>();
        
        // Fetch user names for all unique moderator IDs
        await Promise.all(moderatorIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Use name, parishInfo.name, or email as fallback
              moderatorNameMap.set(uid, userData.name || userData.parishInfo?.name || userData.email || uid);
            }
          } catch (error) {
            console.warn(`Could not fetch user name for ${uid}:`, error);
          }
        }));

        // Update feedback items with resolved moderator names
        allFeedback.forEach(feedback => {
          if (feedback.moderatedBy && moderatorNameMap.has(feedback.moderatedBy)) {
            feedback.moderatedBy = moderatorNameMap.get(feedback.moderatedBy);
          }
        });

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

  // Handle moderation actions (for published/hidden tabs)
  const handleModerationRequest = (feedbackId: string, action: 'hide' | 'publish', subject?: string) => {
    setPendingAction({id: feedbackId, action, subject});
    setShowConfirmDialog(true);
  };

  // Handle pre-moderation actions (for pending tab)
  const handlePreModerationRequest = (feedbackId: string, action: 'approve' | 'reject', subject?: string) => {
    setPendingAction({id: feedbackId, action, subject});
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
      userId: user.uid
    });

    try {
      let newStatus: 'published' | 'hidden';
      let successMessage: string;

      if (pendingAction.action === 'approve') {
        // Pre-moderation: Approve pending feedback
        await FeedbackService.approveFeedback(
          pendingAction.id, 
          user.uid, 
          userProfile || undefined, 
          pendingAction.subject
        );
        newStatus = 'published';
        successMessage = 'Feedback approved and published successfully.';
      } else if (pendingAction.action === 'reject') {
        // Pre-moderation: Reject pending feedback
        await FeedbackService.rejectFeedback(
          pendingAction.id, 
          user.uid, 
          'Content did not meet guidelines',
          userProfile || undefined, 
          pendingAction.subject
        );
        newStatus = 'hidden';
        successMessage = 'Feedback rejected successfully.';
      } else {
        // Post-moderation: Hide or unhide
        newStatus = pendingAction.action === 'hide' ? 'hidden' : 'published';
        await FeedbackService.moderateFeedback(
          pendingAction.id, 
          newStatus, 
          user.uid,
          userProfile || undefined,
          pendingAction.subject
        );
        successMessage = pendingAction.action === 'hide' 
          ? 'Feedback hidden successfully.' 
          : 'Feedback published successfully.';
      }

      console.log('✅ [FEEDBACK] Moderation successful, updating local state');

      // Update local state
      setFeedbackData(prev => prev.map(fb =>
        fb.id === pendingAction.id
          ? { ...fb, status: newStatus, moderatedAt: new Date().toISOString(), moderatedBy: user.email || 'Admin' }
          : fb
      ));

      toast({
        title: 'Success',
        description: successMessage,
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

  // Filter feedback based on search, status, active tab, and selected church
  const filteredFeedback = useMemo(() => {
    return feedbackData.filter(feedback => {
      // Filter by active tab
      const matchesTab = feedback.status === activeTab;
      
      // Filter by selected church
      const matchesChurch = selectedChurch === 'all' || feedback.churchName === selectedChurch;
      
      const matchesSearch = feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.churchName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;

      return matchesTab && matchesChurch && matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, feedbackData, activeTab, selectedChurch]);

  // Group filtered feedback by church for accordion view
  const filteredFeedbackByChurch = useMemo(() => {
    const grouped = new Map<string, FeedbackItem[]>();
    
    filteredFeedback.forEach(feedback => {
      const churchName = feedback.churchName;
      if (!grouped.has(churchName)) {
        grouped.set(churchName, []);
      }
      grouped.get(churchName)!.push(feedback);
    });

    // Sort churches alphabetically
    return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [filteredFeedback]);

  // Calculate statistics for the active tab
  const stats = useMemo(() => {
    // Filter by active tab first
    const tabFeedback = feedbackData.filter(f => f.status === activeTab);
    
    const total = tabFeedback.length;
    const pending = tabFeedback.filter(f => f.status === 'pending').length;
    const avgRating = total > 0 ? tabFeedback.reduce((sum, f) => sum + f.rating, 0) / total : 0;

    // Get counts for all feedback (for tab badges)
    const pendingCount = feedbackData.filter(f => f.status === 'pending').length;
    const publishedCount = feedbackData.filter(f => f.status === 'published').length;
    const hiddenCount = feedbackData.filter(f => f.status === 'hidden').length;

    return {
      total,
      pending,
      avgRating: avgRating.toFixed(1),
      pendingCount,
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
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Feedback Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
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
            {/* Tabs for Pending, Published, Hidden */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'published' | 'hidden')} className="w-full">
              <TabsList className="grid w-full max-w-xs sm:max-w-lg grid-cols-3">
                <TabsTrigger value="pending" className="text-xs sm:text-sm flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Pending</span>
                  {stats.pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                      {stats.pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="published" className="text-xs sm:text-sm">
                  <span className="hidden xs:inline">Published</span>
                  <span className="xs:hidden">Pub</span> {stats.publishedCount > 0 && `(${stats.publishedCount})`}
                </TabsTrigger>
                <TabsTrigger value="hidden" className="text-xs sm:text-sm">
                  Hidden {stats.hiddenCount > 0 && `(${stats.hiddenCount})`}
                </TabsTrigger>
              </TabsList>

              {/* Pending Tab - Pre-Moderation Queue */}
              <TabsContent value="pending" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {/* Statistics Cards - Pending Tab */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <Clock className="w-4 h-4 text-amber-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Awaiting Review</p>
                          <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.pendingCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Approved</p>
                          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.publishedCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <XCircle className="w-4 h-4 text-red-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Rejected</p>
                          <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.hiddenCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Info Banner */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Pre-Moderation Queue</h4>
                        <p className="text-sm text-blue-700">
                          All new feedback submissions require approval before becoming visible to the public. 
                          Review each submission and approve or reject based on community guidelines.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Search and Church Filter - Pending Tab */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search pending feedback..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="w-full md:w-64">
                        <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                          <SelectTrigger>
                            <Church className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filter by church" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Churches</SelectItem>
                            {churchNames.map(name => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Feedback Organized by Church */}
                <div className="space-y-3 sm:space-y-4">
                  {filteredFeedbackByChurch.size === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                        <p className="text-muted-foreground">No pending feedback awaiting review.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Accordion type="multiple" className="space-y-2" defaultValue={Array.from(filteredFeedbackByChurch.keys())}>
                      {Array.from(filteredFeedbackByChurch.entries()).map(([churchName, feedbackItems]) => (
                        <AccordionItem key={churchName} value={churchName} className="border rounded-lg bg-white">
                          <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50 rounded-t-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <Church className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="text-left">
                                <span className="font-medium text-gray-900">{churchName}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                    {feedbackItems.length} pending
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3 pt-2">
                              {feedbackItems.map((feedback) => (
                                <div key={feedback.id} className="border border-amber-200 rounded-lg p-3 bg-amber-50/30 hover:bg-amber-50 transition-colors">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                          <Clock className="w-3 h-3 mr-1" />
                                          Pending
                                        </Badge>
                                        <div className="flex gap-0.5 ml-2">
                                          {renderStars(feedback.rating)}
                                        </div>
                                      </div>
                                      <p className="text-gray-600 mb-2 text-sm">{feedback.message}</p>
                                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{feedback.userName}</span>
                                      </div>
                                      {feedback.photos && feedback.photos.length > 0 && (
                                        <div className="flex gap-2 mt-2">
                                          {feedback.photos.slice(0, 3).map((photo, idx) => (
                                            <img
                                              key={idx}
                                              src={photo}
                                              alt={`Attached photo ${idx + 1}`}
                                              className="w-16 h-16 object-cover rounded border"
                                            />
                                          ))}
                                          {feedback.photos.length > 3 && (
                                            <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-sm text-muted-foreground">
                                              +{feedback.photos.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-700 border-green-300 hover:bg-green-50"
                                        onClick={() => handlePreModerationRequest(feedback.id, 'approve', feedback.subject)}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-700 border-red-300 hover:bg-red-50"
                                        onClick={() => handlePreModerationRequest(feedback.id, 'reject', feedback.subject)}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </TabsContent>

              {/* Published Tab */}
              <TabsContent value="published" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {/* Statistics Cards - Published Tab */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <MessageSquare className="w-4 h-4 text-green-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Published</p>
                          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Hidden</p>
                          <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.hiddenCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <Star className="w-4 h-4 text-yellow-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Avg Rating</p>
                          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.avgRating}</p>
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
                      <div className="w-full md:w-64">
                        <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                          <SelectTrigger>
                            <Church className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filter by church" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Churches</SelectItem>
                            {churchNames.map(name => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Feedback List - Published Tab (Organized by Church) */}
                <div className="space-y-3 sm:space-y-4">
                  {filteredFeedbackByChurch.size === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>
                        {searchTerm
                          ? 'No published feedback matches your search.'
                          : 'No published feedback available.'}
                      </p>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="space-y-2" defaultValue={Array.from(filteredFeedbackByChurch.keys())}>
                      {Array.from(filteredFeedbackByChurch.entries()).map(([churchName, feedbackItems]) => (
                        <AccordionItem key={churchName} value={churchName} className="border rounded-lg bg-white">
                          <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50 rounded-t-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <Church className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="text-left">
                                <span className="font-medium text-gray-900">{churchName}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    {feedbackItems.length} review{feedbackItems.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Avg: {(feedbackItems.reduce((sum, f) => sum + f.rating, 0) / feedbackItems.length).toFixed(1)} ★
                                  </span>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3 pt-2">
                              {feedbackItems.map((feedback) => (
                                <div key={feedback.id} className="border rounded-lg p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                                        <h4 className="font-semibold text-gray-900 text-sm truncate">{feedback.subject}</h4>
                                        <div className="flex gap-0.5">
                                          {renderStars(feedback.rating)}
                                        </div>
                                      </div>
                                      <p className="text-gray-600 mb-2 line-clamp-2 text-xs sm:text-sm">{feedback.message}</p>

                                      {/* Display photos if available */}
                                      {feedback.photos && feedback.photos.length > 0 && (
                                        <div className="flex gap-1 sm:gap-2 mb-2 flex-wrap">
                                          {feedback.photos.slice(0, 3).map((photoUrl, index) => (
                                            <img
                                              key={index}
                                              src={photoUrl}
                                              alt={`Feedback photo ${index + 1}`}
                                              className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                                              onClick={() => window.open(photoUrl, '_blank')}
                                            />
                                          ))}
                                          {feedback.photos.length > 3 && (
                                            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-600 text-xs sm:text-sm font-medium">
                                              +{feedback.photos.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-500">
                                        <span>{feedback.userName}</span>
                                        <span>•</span>
                                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                                        {feedback.moderatedAt && (
                                          <>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="hidden sm:inline">Moderated by {feedback.moderatedBy}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 sm:gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedFeedback(feedback);
                                          setShowDetailsDialog(true);
                                        }}
                                        className="text-xs sm:text-sm"
                                      >
                                        <Eye className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">View</span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerationRequest(feedback.id, 'hide')}
                                        className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs sm:text-sm"
                                      >
                                        <EyeOff className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Hide</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </TabsContent>

              {/* Hidden Tab */}
              <TabsContent value="hidden" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {/* Statistics Cards - Hidden Tab */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <MessageSquare className="w-4 h-4 text-green-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Published</p>
                          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.publishedCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Hidden</p>
                          <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <Star className="w-4 h-4 text-yellow-600 mb-1 sm:mb-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Avg Rating</p>
                          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.avgRating}</p>
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
                      <div className="w-full md:w-64">
                        <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                          <SelectTrigger>
                            <Church className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filter by church" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Churches</SelectItem>
                            {churchNames.map(name => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Feedback List - Hidden Tab (Organized by Church) */}
                <div className="space-y-3 sm:space-y-4">
                  {filteredFeedbackByChurch.size === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>
                        {searchTerm
                          ? 'No hidden feedback matches your search.'
                          : 'No hidden feedback available.'}
                      </p>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="space-y-2" defaultValue={Array.from(filteredFeedbackByChurch.keys())}>
                      {Array.from(filteredFeedbackByChurch.entries()).map(([churchName, feedbackItems]) => (
                        <AccordionItem key={churchName} value={churchName} className="border rounded-lg bg-white">
                          <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50 rounded-t-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <Church className="w-4 h-4 text-orange-600" />
                              </div>
                              <div className="text-left">
                                <span className="font-medium text-gray-900">{churchName}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                    {feedbackItems.length} hidden
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3 pt-2">
                              {feedbackItems.map((feedback) => (
                                <div key={feedback.id} className="border border-orange-200 rounded-lg p-3 bg-orange-50/30 hover:bg-orange-50 transition-colors">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                                        <h4 className="font-semibold text-gray-900 text-sm truncate">{feedback.subject}</h4>
                                        <div className="flex gap-0.5">
                                          {renderStars(feedback.rating)}
                                        </div>
                                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                          Hidden
                                        </Badge>
                                      </div>
                                      <p className="text-gray-600 mb-2 line-clamp-2 text-xs sm:text-sm">{feedback.message}</p>

                                      {/* Display photos if available */}
                                      {feedback.photos && feedback.photos.length > 0 && (
                                        <div className="flex gap-1 sm:gap-2 mb-2 flex-wrap">
                                          {feedback.photos.slice(0, 3).map((photoUrl, index) => (
                                            <img
                                              key={index}
                                              src={photoUrl}
                                              alt={`Feedback photo ${index + 1}`}
                                              className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                                              onClick={() => window.open(photoUrl, '_blank')}
                                            />
                                          ))}
                                          {feedback.photos.length > 3 && (
                                            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-600 text-xs sm:text-sm font-medium">
                                              +{feedback.photos.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-500">
                                        <span>{feedback.userName}</span>
                                        <span>•</span>
                                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                                        {feedback.moderatedAt && (
                                          <>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="hidden sm:inline">Hidden by {feedback.moderatedBy}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 sm:gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedFeedback(feedback);
                                          setShowDetailsDialog(true);
                                        }}
                                        className="text-xs sm:text-sm"
                                      >
                                        <Eye className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">View</span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerationRequest(feedback.id, 'publish')}
                                        className="text-green-600 border-green-200 hover:bg-green-50 text-xs sm:text-sm"
                                      >
                                        <Eye className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Unhide</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
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
          <DialogContent className="max-w-2xl mx-2 sm:mx-auto w-[calc(100%-1rem)] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedFeedback.subject}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Feedback from {selectedFeedback.userName} at {selectedFeedback.churchName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Rating</h4>
                <div className="flex items-center gap-1">
                  {renderStars(selectedFeedback.rating)}
                  <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                    ({selectedFeedback.rating}/5)
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Message</h4>
                <p className="text-xs sm:text-sm leading-relaxed">{selectedFeedback.message}</p>
              </div>

              {/* Display photos in detail view */}
              {selectedFeedback.photos && selectedFeedback.photos.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">
                    Photos ({selectedFeedback.photos.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedFeedback.photos.map((photoUrl, index) => (
                      <img
                        key={index}
                        src={photoUrl}
                        alt={`Feedback photo ${index + 1}`}
                        className="w-full h-24 sm:h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => window.open(photoUrl, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Status</h4>
                <Badge className={getStatusColor(selectedFeedback.status)}>
                  {selectedFeedback.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Submitted</h4>
                  <p>{new Date(selectedFeedback.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </div>
                {selectedFeedback.moderatedAt && (
                  <div>
                    <h4 className="font-medium text-muted-foreground mb-1">Moderated</h4>
                    <p>{new Date(selectedFeedback.moderatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    <p className="text-muted-foreground">by {selectedFeedback.moderatedBy}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 sm:pt-4">
                {selectedFeedback.status === 'published' && (
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      handleModerationRequest(selectedFeedback.id, 'hide');
                      setShowDetailsDialog(false);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Hide This Feedback
                  </Button>
                )}

                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="mx-2 sm:mx-auto w-[calc(100%-1rem)] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {pendingAction?.action === 'approve' ? 'Approve Feedback' :
               pendingAction?.action === 'reject' ? 'Reject Feedback' :
               pendingAction?.action === 'hide' ? 'Hide Feedback' : 'Publish Feedback'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {pendingAction?.action === 'approve'
                ? 'Approving will make this feedback visible to all users on the mobile app. Are you sure?'
                : pendingAction?.action === 'reject'
                ? 'Rejecting will permanently hide this feedback from users. Are you sure?'
                : pendingAction?.action === 'hide'
                ? 'Are you sure you want to hide this feedback? It will no longer be visible to users.'
                : 'Are you sure you want to publish this feedback? It will become visible to all users.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 sm:pt-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={pendingAction?.action === 'reject' || pendingAction?.action === 'hide' ? 'destructive' : 'default'}
              className={pendingAction?.action === 'approve' ? 'bg-green-600 hover:bg-green-700 w-full sm:w-auto' : 'w-full sm:w-auto'}
              onClick={confirmModeration}
            >
              {pendingAction?.action === 'approve' ? 'Approve & Publish' :
               pendingAction?.action === 'reject' ? 'Reject' :
               pendingAction?.action === 'hide' ? 'Hide' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FeedbackReports;
