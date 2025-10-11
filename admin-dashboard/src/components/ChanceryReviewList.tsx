import { useQuery } from "@tanstack/react-query";
import { getChurchesByDiocese, type Church, type ChurchStatus, updateChurchStatusWithValidation } from "@/lib/churches";
import { shouldRequireHeritageReview, assessHeritageSignificance } from "@/lib/heritage-detection";
import { workflowStateMachine, getStatusBadgeColor } from "@/lib/workflow-state-machine";
import { notifyChurchStatusChange } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, XCircle, ArrowRight, AlertTriangle, Info, Clock, Building2, Eye, Edit3 } from "lucide-react";

interface Props {
  diocese: "tagbilaran" | "talibon";
  onViewChurch?: (church: Church) => void;
  onEditChurch?: (church: Church) => void;
}

export function ChanceryReviewList({ diocese, onViewChurch, onEditChurch }: Props) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const statuses: ChurchStatus[] = ["pending", "heritage_review"];

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Church[]>({
    queryKey: ["churches", diocese, statuses],
    queryFn: () => getChurchesByDiocese(diocese, statuses),
  });

  const handleStatusChange = async (
    churchId: string,
    targetStatus: ChurchStatus,
    church: Church,
    customNote?: string
  ) => {
    if (!userProfile) {
      toast({
        title: "Error",
        description: "User profile not available",
        variant: "destructive"
      });
      return;
    }

    console.log('Attempting status change:', {
      churchId,
      targetStatus,
      currentStatus: church.status,
      userRole: userProfile.role,
      diocese: userProfile.diocese,
      churchDiocese: church.diocese
    });

    try {
      // Get default note based on action
      let note = customNote;
      if (!note) {
        switch (targetStatus) {
          case 'approved':
            note = "Approved by Chancery Office";
            break;
          case 'heritage_review':
            note = "Forwarded to Museum Researcher for heritage validation";
            break;
          default:
            note = `Status changed to ${targetStatus}`;
        }
      }

      // Use enhanced status update with validation
      const result = await updateChurchStatusWithValidation(
        churchId,
        targetStatus,
        userProfile,
        note
      );

      if (result.success) {
        // Show success message
        let successMessage = `Church status updated to ${targetStatus}`;
        if (result.autoForwarded) {
          successMessage = "Church automatically forwarded to heritage review due to heritage indicators";
        }

        toast({
          title: "Success",
          description: successMessage
        });

        // Send notification
        await notifyChurchStatusChange(
          churchId,
          church.name,
          church.status,
          result.autoForwarded ? 'heritage_review' : targetStatus,
          userProfile,
          note
        );

        // Refresh the list
        refetch();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update church status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Status change error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleApprove = async (church: Church) => {
    await handleStatusChange(church.id, 'approved', church);
  };


  const handleForwardHeritage = async (church: Church) => {
    const assessment = assessHeritageSignificance(church);
    const note = `Heritage review required. ${assessment.reasoning}`;
    await handleStatusChange(church.id, 'heritage_review', church, note);
  };

  // Helper function to get heritage assessment for each church
  const getHeritageAssessmentForChurch = (church: Church) => {
    try {
      return assessHeritageSignificance(church);
    } catch (error) {
      console.error('Heritage assessment error:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="heritage-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Review Queue</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pending submissions...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="heritage-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Review Queue</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive text-sm">
          Failed to load submissions. Check Firestore rules and data.
        </CardContent>
      </Card>
    );
  }

  const items = data ?? [];

  return (
    <Card className="heritage-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          Review Queue {isFetching && <Loader2 className="inline h-4 w-4 ml-2 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No submissions awaiting review.</div>
        ) : (
          <TooltipProvider>
            {items.map((c) => {
              const heritageAssessment = getHeritageAssessmentForChurch(c);
              const shouldAutoForward = heritageAssessment?.shouldRequireReview;
              const validTransitions = userProfile ?
                workflowStateMachine.getValidTransitions(c.status, userProfile.role) : [];

              return (
                <div key={c.id} className="p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        {heritageAssessment && (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={`w-2 h-2 rounded-full ${
                                heritageAssessment.confidence === 'high' ? 'bg-orange-500' :
                                heritageAssessment.confidence === 'medium' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs max-w-xs">
                                <div className="font-medium">Heritage Assessment</div>
                                <div>Confidence: {heritageAssessment.confidence}</div>
                                <div className="mt-1">{heritageAssessment.reasoning}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.municipality ?? "Unknown"} • {c.classification ?? "Unclassified"}
                        {heritageAssessment && heritageAssessment.confidence === 'high' && (
                          <span className="ml-2">
                            • Heritage Assessment: {heritageAssessment.confidence}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getStatusBadgeColor(c.status)}`}
                      >
                        {c.status.replace("_", " ")}
                      </Badge>

                      {validTransitions.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              {validTransitions.length} action{validTransitions.length > 1 ? 's' : ''}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-medium">Available Actions:</div>
                              {validTransitions.map((transition, idx) => (
                                <div key={idx}>• {transition.description}</div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {shouldAutoForward && (
                    <div className="mb-2 p-2 bg-orange-100 border border-orange-300 rounded text-xs">
                      <div className="flex items-center gap-1 text-orange-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-medium">Heritage Review Required</span>
                      </div>
                      <div className="text-orange-600 mt-1">
                        This church will be automatically forwarded for heritage validation.
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-end">
                    {/* View Church Details Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewChurch?.(c)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>

                    {/* Edit Church Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditChurch?.(c)}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <Edit3 className="w-4 h-4 mr-1" /> Edit
                    </Button>

                    {/* Heritage Review Button - Show for explicit heritage or high-confidence assessments */}
                    {(c.classification === 'ICP' || c.classification === 'NCT' || shouldAutoForward) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForwardHeritage(c)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <ArrowRight className="w-4 h-4 mr-1" /> Send to Museum Researcher
                      </Button>
                    )}


                    {/* Smart Approval Button - Only show for non-heritage churches */}
                    {c.classification !== 'ICP' && c.classification !== 'NCT' && (
                      <Button
                        variant="heritage"
                        size="sm"
                        onClick={() => handleApprove(c)}
                        className={shouldAutoForward ? 'opacity-75' : ''}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {shouldAutoForward ? 'Review & Approve' : 'Publish'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
