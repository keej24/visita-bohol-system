import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, CheckCircle2, ArrowRight, AlertTriangle, Info, Clock, Building2, Eye, Edit3, Check, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SecurityReviewChecklist } from "./SecurityReviewChecklist";

interface Props {
  diocese: "tagbilaran" | "talibon";
  onViewChurch?: (church: Church) => void;
  onEditChurch?: (church: Church) => void;
}

export function ChanceryReviewList({ diocese, onViewChurch, onEditChurch }: Props) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const statuses: ChurchStatus[] = ["pending", "heritage_review"];
  
  // State for security review checklist dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [churchToApprove, setChurchToApprove] = useState<Church | null>(null);
  
  // State for dismissed note banners (by church ID)
  const [dismissedNotes, setDismissedNotes] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, isFetching } = useQuery<Church[]>({
    queryKey: ["churches", diocese, statuses],
    queryFn: () => getChurchesByDiocese(diocese, statuses),
    staleTime: 30 * 1000, // 30 seconds - shorter for more responsive updates
    refetchOnWindowFocus: true, // Auto-refresh when switching browser tabs
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

        // Invalidate ALL church queries to ensure all dashboards (Chancery, Museum) refresh
        await queryClient.invalidateQueries({ queryKey: ['churches'] });
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

  // Opens the security review checklist dialog instead of direct approval
  const handleApproveClick = (church: Church) => {
    setChurchToApprove(church);
    setReviewDialogOpen(true);
  };

  // Called after security checklist is confirmed
  const handleApproveConfirmed = async (church: Church) => {
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
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-base sm:text-lg font-semibold text-primary">
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
              
              // Check CURRENT heritage classification - prioritize historicalDetails over legacy classification field
              const currentHeritageClass = c.historicalDetails?.heritageClassification || c.classification;
              const isCurrentlyHeritage = currentHeritageClass === 'National Cultural Treasures' || 
                                          currentHeritageClass === 'Important Cultural Properties' ||
                                          currentHeritageClass === 'ICP' || 
                                          currentHeritageClass === 'NCT';

              return (
                <div key={c.id} className="p-2 sm:p-3 rounded-lg bg-secondary/30">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        {heritageAssessment && (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
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
                          <span className="ml-2 hidden sm:inline">
                            • Heritage: {heritageAssessment.confidence}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status Badge - Show adjusted status if heritage classification changed */}
                      {(() => {
                        // If status is heritage_review but classification is no longer heritage, show "Pending" instead
                        const displayStatus = (c.status === 'heritage_review' && !isCurrentlyHeritage) 
                          ? 'pending' 
                          : c.status;
                        const displayColor = (c.status === 'heritage_review' && !isCurrentlyHeritage)
                          ? getStatusBadgeColor('pending')
                          : getStatusBadgeColor(c.status);
                        return (
                          <Badge
                            variant="outline"
                            className={`text-[10px] sm:text-xs capitalize ${displayColor}`}
                          >
                            {displayStatus.replace("_", " ")}
                          </Badge>
                        );
                      })()}

                      {validTransitions.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="hidden sm:flex items-center text-xs text-muted-foreground">
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

                  {isCurrentlyHeritage && c.status !== 'heritage_review' && (
                    <div className="mb-2 p-2 bg-orange-100 border border-orange-300 rounded text-xs">
                      <div className="flex items-center gap-1 text-orange-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-medium">Heritage Review Required</span>
                      </div>
                      <div className="text-orange-600 mt-1">
                        This church is classified as heritage and must be forwarded for museum validation.
                      </div>
                    </div>
                  )}

                  {/* Note from Museum Researcher - shows when classification was changed to non-heritage */}
                  {c.lastReviewNote && c.status === 'pending' && c.lastReviewNote.includes('Returned to Chancery') && !dismissedNotes.has(c.id) && (
                    <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs relative">
                      <button
                        onClick={() => setDismissedNotes(prev => new Set(prev).add(c.id))}
                        className="absolute top-1 right-1 p-0.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded"
                        aria-label="Dismiss note"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-1 text-amber-700 pr-4">
                        <MessageSquare className="w-3 h-3" />
                        <span className="font-medium">Note from Museum Researcher</span>
                      </div>
                      <div className="text-amber-600 mt-1 pr-4">
                        {c.lastReviewNote}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
                    {/* View Church Details Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewChurch?.(c)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" /> <span className="hidden sm:inline">View</span>
                    </Button>

                    {/* Edit Church Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditChurch?.(c)}
                      className="text-green-600 border-green-300 hover:bg-green-50 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                    </Button>

                    {/* Heritage Review Button - Only show for actual heritage churches (ICP/NCT) */}
                    {isCurrentlyHeritage && (
                      <Button
                        variant={c.status === 'heritage_review' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleForwardHeritage(c)}
                        disabled={c.status === 'heritage_review'}
                        className={cn(
                          "h-8 px-2 sm:px-3 text-xs sm:text-sm",
                          c.status === 'heritage_review' 
                            ? 'bg-orange-500 hover:bg-orange-500 text-white border-orange-500 cursor-default' 
                            : 'text-orange-600 border-orange-300 hover:bg-orange-50'
                        )}
                      >
                        {c.status === 'heritage_review' ? (
                          <><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" /> <span className="hidden sm:inline">Sent to Museum</span><span className="sm:hidden">Sent</span></>
                        ) : (
                          <><ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" /> <span className="hidden sm:inline">Send to Museum Researcher</span><span className="sm:hidden">Museum</span></>
                        )}
                      </Button>
                    )}


                    {/* Smart Approval Button - Only show for non-heritage churches */}
                    {!isCurrentlyHeritage && (
                      <Button
                        variant="heritage"
                        size="sm"
                        onClick={() => handleApproveClick(c)}
                        className={cn("h-8 px-2 sm:px-3 text-xs sm:text-sm", shouldAutoForward ? 'opacity-75' : '')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">{shouldAutoForward ? 'Review & Approve' : 'Publish'}</span>
                        <span className="sm:hidden">Publish</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        )}
      </CardContent>

      {/* Security Review Checklist Dialog */}
      <SecurityReviewChecklist
        church={churchToApprove}
        isOpen={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          setChurchToApprove(null);
        }}
        onApprove={handleApproveConfirmed}
        isHeritage={churchToApprove?.classification === 'ICP' || churchToApprove?.classification === 'NCT'}
      />
    </Card>
  );
}
