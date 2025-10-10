import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { usePendingChurches, useChurchReview } from "@/hooks/useChurches";
import type { Church } from "@/types/church";

interface Props {
  diocese: "tagbilaran" | "talibon";
}

export function SimpleChanceryReviewList({ diocese }: Props) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { data: churches, isLoading, isError } = usePendingChurches(diocese);
  const reviewMutation = useChurchReview();

  const handleApprove = async (church: Church) => {
    if (!userProfile?.uid) return;

    reviewMutation.mutate({
      churchId: church.id,
      action: 'approve',
      notes: 'Approved by Chancery Office',
      reviewerId: userProfile.uid,
    });
  };

  const handleReject = async (church: Church) => {
    if (!userProfile?.uid) return;

    reviewMutation.mutate({
      churchId: church.id,
      action: 'request_revision',
      notes: 'Please revise and resubmit with corrections',
      reviewerId: userProfile.uid,
    });
  };

  const handleForwardToMuseum = async (church: Church) => {
    if (!userProfile?.uid) return;

    reviewMutation.mutate({
      churchId: church.id,
      action: 'forward_to_museum',
      notes: 'Forwarded to Museum Researcher for heritage review',
      reviewerId: userProfile.uid,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading submissions...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent className="text-red-600 text-sm">
          Failed to load submissions. Please try again.
        </CardContent>
      </Card>
    );
  }

  const items = churches ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Pending Reviews
          {items.length > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>All caught up! No submissions awaiting review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((church) => (
              <div key={church.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{church.name}</h3>
                    <p className="text-sm text-gray-600">
                      {church.municipality || "Unknown Municipality"}
                      {church.classification && ` • ${church.classification.replace('_', ' ').toUpperCase()}`}
                    </p>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          church.status === 'under_review' ? 'border-orange-300 text-orange-700 bg-orange-50' :
                          church.status === 'needs_revision' ? 'border-red-300 text-red-700 bg-red-50' :
                          'border-yellow-300 text-yellow-700 bg-yellow-50'
                        }`}
                      >
                        {church.status === 'under_review' ? 'Under Review' :
                         church.status === 'needs_revision' ? 'Needs Revision' : 'Pending Review'}
                      </Badge>
                    </div>
                  </div>

                  {(church.classification === 'ICP' || church.classification === 'NCT') && (
                    <div className="ml-3" title="Heritage Church">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(church)}
                    disabled={reviewMutation.isPending}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Request Revision
                  </Button>

                  {(church.classification === 'ICP' || church.classification === 'NCT') && userProfile?.role === 'chancery_office' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleForwardToMuseum(church)}
                      disabled={reviewMutation.isPending}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Forward to Museum
                    </Button>
                  )}

                  {/* Approve Button - Only show for non-heritage churches */}
                  {church.classification !== 'ICP' && church.classification !== 'NCT' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(church)}
                      disabled={reviewMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}