import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { usePendingChurches, useUpdateChurchStatus } from '@/lib/optimized/queries';
import { useAuth } from '@/hooks/useAuth';
import type { Diocese } from '@/hooks/useAuth';
import type { Church } from '@/lib/churches';

interface OptimizedChanceryReviewListProps {
  diocese: Diocese;
}

const ReviewItem = React.memo<{
  church: Church;
  onApprove: (id: string) => void;
  onForwardHeritage: (id: string) => void;
  isUpdating: boolean;
}>(({ church, onApprove, onForwardHeritage, isUpdating }) => (
  <div className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <div className="font-medium text-sm truncate">{church.name}</div>
      <div className="text-xs text-muted-foreground">
        {church.municipality ?? "Unknown"} • {church.classification ?? "Unclassified"}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-xs capitalize">
        {church.status.replace("_", " ")}
      </Badge>
      
      {/* Heritage Site Actions */}
      {(church.classification === 'ICP' || church.classification === 'NCT') && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onForwardHeritage(church.id)}
          disabled={isUpdating}
        >
          <ArrowRight className="w-4 h-4 mr-1" /> 
          Send to Museum Researcher
        </Button>
      )}
      
      
      {/* Approval Action - only for non-heritage */}
      {church.classification !== 'ICP' && church.classification !== 'NCT' && (
        <Button 
          variant="heritage" 
          size="sm" 
          onClick={() => onApprove(church.id)}
          disabled={isUpdating}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" /> 
          Publish
        </Button>
      )}
    </div>
  </div>
));

ReviewItem.displayName = 'ReviewItem';

export const OptimizedChanceryReviewList = React.memo<OptimizedChanceryReviewListProps>(({ diocese }) => {
  const { userProfile } = useAuth();
  const { data: pendingChurches, isLoading, error } = usePendingChurches(diocese);
  const updateChurchMutation = useUpdateChurchStatus();

  const handleApprove = useCallback(async (id: string) => {
    try {
      await updateChurchMutation.mutateAsync({
        churchId: id,
        status: "approved",
        note: "Approved by Chancery",
        reviewerUid: userProfile?.uid,
      });
    } catch (error) {
      console.error('Failed to approve church:', error);
      // Error handling could include toast notifications here
    }
  }, [updateChurchMutation, userProfile?.uid]);


  const handleForwardHeritage = useCallback(async (id: string) => {
    try {
      await updateChurchMutation.mutateAsync({
        churchId: id,
        status: "heritage_review",
        note: "Forwarded to Museum Researcher for heritage validation.",
        reviewerUid: userProfile?.uid,
      });
    } catch (error) {
      console.error('Failed to forward to heritage review:', error);
    }
  }, [updateChurchMutation, userProfile?.uid]);

  if (error) {
    return (
      <Card className="heritage-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Review Queue</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive text-sm">
          Failed to load submissions. Please check your connection and try again.
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
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
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          Review Queue 
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {items.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading pending submissions...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">No submissions awaiting review.</div>
          </div>
        ) : (
          items.map((church) => (
            <ReviewItem
              key={church.id}
              church={church}
              onApprove={handleApprove}
              onForwardHeritage={handleForwardHeritage}
              isUpdating={isUpdating}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
});

OptimizedChanceryReviewList.displayName = 'OptimizedChanceryReviewList';

