import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Calendar,
  Info,
  AlertCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { usePendingChurches, useUpdateChurchStatus } from '@/lib/optimized/queries';
import { useAuth } from '@/contexts/AuthContext';
import { ButtonLoadingSpinner } from './MobileSkeletons';
import type { Diocese } from '@/contexts/AuthContext';
import type { Church } from '@/lib/churches';

interface MobileReviewListProps {
  diocese: Diocese;
}

// Mobile-optimized review item card
const MobileReviewCard = React.memo<{
  church: Church;
  onAction: (churchId: string, action: 'approve' | 'heritage') => void;
  isUpdating: boolean;
  updatingId?: string;
}>(({ church, onAction, isUpdating, updatingId }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isThisUpdating = isUpdating && updatingId === church.id;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'heritage_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'heritage_review': return <Info className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="border-l-4 border-l-orange-400 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate mb-1">
              {church.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3" />
              <span>{church.municipality || 'Unknown location'}</span>
              {church.classification && (
                <>
                  <span>•</span>
                  <span className="uppercase font-medium">{church.classification}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Details Button */}
          <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>{church.name}</SheetTitle>
              </SheetHeader>
              <MobileChurchDetails church={church} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(church.status)}`}>
            {getStatusIcon(church.status)}
            <span className="capitalize">{church.status.replace('_', ' ')}</span>
          </div>
          {church.createdAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{new Date(church.createdAt.toDate()).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Heritage Site Actions */}
          {(church.classification === 'ICP' || church.classification === 'NCT') && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => onAction(church.id, 'heritage')}
              disabled={isThisUpdating}
            >
              {isThisUpdating ? (
                <ButtonLoadingSpinner size="sm" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Send to Museum Researcher
                </>
              )}
            </Button>
          )}
          
          {/* Approval Action - only for non-heritage */}
          {(church.classification === 'non-heritage' || church.classification === 'unknown') && (
            <Button
              variant="default"
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => onAction(church.id, 'approve')}
              disabled={isThisUpdating}
            >
              {isThisUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

MobileReviewCard.displayName = 'MobileReviewCard';

// Church details sheet component
const MobileChurchDetails: React.FC<{ church: Church }> = ({ church }) => (
  <div className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="font-medium text-muted-foreground mb-1">Municipality</p>
        <p>{church.municipality || 'Not specified'}</p>
      </div>
      <div>
        <p className="font-medium text-muted-foreground mb-1">Founded</p>
        <p>{church.foundedYear || 'Unknown'}</p>
      </div>
      <div>
        <p className="font-medium text-muted-foreground mb-1">Classification</p>
        <Badge variant="secondary">{church.classification || 'Unclassified'}</Badge>
      </div>
      <div>
        <p className="font-medium text-muted-foreground mb-1">Status</p>
        <Badge variant="outline" className="capitalize">
          {church.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
    
    {church.address && (
      <div>
        <p className="font-medium text-muted-foreground mb-1">Address</p>
        <p className="text-sm">{church.address}</p>
      </div>
    )}
    
    {church.historicalBackground && (
      <div>
        <p className="font-medium text-muted-foreground mb-1">Historical Background</p>
        <p className="text-sm">{church.historicalBackground}</p>
      </div>
    )}
  </div>
);

const MobileReviewList: React.FC<MobileReviewListProps> = ({ diocese }) => {
  const { userProfile } = useAuth();
  const { data: pendingChurches, isLoading, error } = usePendingChurches(diocese);
  const updateChurchMutation = useUpdateChurchStatus();
  const [updatingId, setUpdatingId] = useState<string>();

  const handleAction = async (churchId: string, action: 'approve' | 'heritage') => {
    setUpdatingId(churchId);
    try {
      const statusMap = {
        approve: 'approved' as const,
        heritage: 'heritage_review' as const,
      };

      const messageMap = {
        approve: 'Approved by Chancery',
        heritage: 'Forwarded to Museum Researcher for heritage validation.',
      };

      await updateChurchMutation.mutateAsync({
        churchId,
        status: statusMap[action],
        note: messageMap[action],
        reviewerUid: userProfile?.uid,
      });
    } catch (error) {
      console.error(`Failed to ${action} church:`, error);
    } finally {
      setUpdatingId(undefined);
    }
  };

  if (error) {
    return (
      <Card className="heritage-card border-destructive">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h3 className="font-semibold text-destructive mb-2">Failed to load reviews</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please check your connection and try again
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = pendingChurches ?? [];
  const isUpdating = updateChurchMutation.isPending;

  return (
    <Card className="heritage-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
            Review Queue
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {items.length}
            </Badge>
          )}
        </div>
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Tap items to view details and take action
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-green-600 mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              No submissions awaiting review
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((church) => (
              <MobileReviewCard
                key={church.id}
                church={church}
                onAction={handleAction}
                isUpdating={isUpdating}
                updatingId={updatingId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileReviewList;