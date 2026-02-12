/**
 * FILE PURPOSE: Pending Updates Review List for Chancery Dashboard
 *
 * This component displays approved churches that have pending changes
 * submitted by parishes, awaiting Chancery (and optionally Museum) review.
 *
 * FEATURES:
 * - Lists churches with hasPendingChanges: true
 * - Shows which fields were changed
 * - Allows Chancery to view/edit pending data before approval
 * - For heritage churches, allows forwarding to Museum
 * - Applies changes to the live church profile upon approval
 *
 * WORKFLOW:
 * 1. Parish submits changes to approved church → stored in pendingChanges
 * 2. Chancery reviews and optionally edits the pending data
 * 3. Chancery approves → changes merged to live profile
 *    OR Chancery forwards to Museum (for heritage churches)
 * 4. Museum reviews → approves and merges changes
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { applyPendingChanges, forwardPendingChangesToMuseum } from "@/lib/workflow-state-machine";
import { getFieldLabel } from "@/lib/church-field-categories";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  Eye,
  Edit3,
  Clock,
  FileEdit,
  Building2,
  Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Church } from "@/types/church";
import type { Diocese } from "@/contexts/AuthContext";

interface Props {
  diocese: Diocese;
  onViewChurch?: (church: Church) => void;
  onEditChurch?: (church: Church) => void;
}

export function PendingUpdatesReviewList({ diocese, onViewChurch, onEditChurch }: Props) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingChurchId, setProcessingChurchId] = useState<string | null>(null);

  // Query for churches with pending changes
  const { data: churches, isLoading, isError } = useQuery<Church[]>({
    queryKey: ["churches", diocese, "pending-updates"],
    queryFn: async () => {
      const churchesRef = collection(db, "churches");
      const q = query(
        churchesRef,
        where("diocese", "==", diocese),
        where("hasPendingChanges", "==", true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Church)
        // Exclude churches already forwarded to Museum for heritage review
        .filter(c => !c.pendingChanges?.forwardedToMuseum && c.status !== 'heritage_review');
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const handleApproveChanges = async (church: Church) => {
    if (!userProfile) {
      toast({
        title: "Error",
        description: "User profile not available",
        variant: "destructive"
      });
      return;
    }

    setProcessingChurchId(church.id);

    try {
      const result = await applyPendingChanges(
        church.id,
        userProfile,
        undefined, // No edits made - use original pending data
        "Approved by Chancery Office"
      );

      if (result.success) {
        toast({
          title: "Changes Approved",
          description: `Updates to ${church.name} have been published.`
        });

        // Invalidate queries to refresh lists
        await queryClient.invalidateQueries({ queryKey: ["churches"] });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve changes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error approving changes:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setProcessingChurchId(null);
    }
  };

  const handleForwardToMuseum = async (church: Church) => {
    if (!userProfile) {
      toast({
        title: "Error",
        description: "User profile not available",
        variant: "destructive"
      });
      return;
    }

    setProcessingChurchId(church.id);

    try {
      const result = await forwardPendingChangesToMuseum(
        church.id,
        userProfile,
        "Forwarded for heritage validation"
      );

      if (result.success) {
        toast({
          title: "Forwarded to Museum",
          description: `${church.name} updates sent to Museum Researcher for heritage validation.`
        });

        await queryClient.invalidateQueries({ queryKey: ["churches"] });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to forward to museum",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error forwarding to museum:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setProcessingChurchId(null);
    }
  };

  const isHeritage = (church: Church) => {
    return church.classification === "ICP" || church.classification === "NCT";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Pending Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <FileEdit className="h-5 w-5" />
            Error Loading Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load pending updates. Please try refreshing the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!churches || churches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Pending Updates
          </CardTitle>
          <CardDescription>
            Review changes submitted by parishes to approved churches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No pending updates to review.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileEdit className="h-5 w-5" />
          Pending Updates
          <Badge variant="secondary" className="ml-2">
            {churches.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Review changes submitted by parishes to approved churches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {churches.map((church) => (
          <div
            key={church.id}
            className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors"
          >
            {/* Church Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold truncate">{church.name}</h4>
                  {isHeritage(church) && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                      <Landmark className="h-3 w-3 mr-1" />
                      {church.classification}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {church.municipality}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                Update Pending
              </Badge>
            </div>

            {/* Changed Fields */}
            {church.pendingChanges?.changedFields && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Modified Fields
                </p>
                <div className="flex flex-wrap gap-1">
                  {church.pendingChanges.changedFields.map((field) => (
                    <Badge
                      key={field}
                      variant="secondary"
                      className="text-xs"
                    >
                      {getFieldLabel(field)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Submission Info */}
            {church.pendingChanges?.submittedAt && (
              <p className="text-xs text-muted-foreground">
                Submitted:{" "}
                {new Date(
                  church.pendingChanges.submittedAt instanceof Date
                    ? church.pendingChanges.submittedAt
                    : (church.pendingChanges.submittedAt as { toDate: () => Date }).toDate()
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
              </p>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewChurch?.(church)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>

              {/* Edit Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditChurch?.(church)}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Review & Edit
              </Button>

              <div className="flex-1" />

              {/* Forward to Museum (for heritage churches) */}
              {isHeritage(church) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleForwardToMuseum(church)}
                  disabled={processingChurchId === church.id}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  {processingChurchId === church.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Building2 className="h-4 w-4 mr-1" />
                  )}
                  Forward to Museum
                </Button>
              )}

              {/* Approve Button - hidden when forwarded to museum for heritage review */}
              {church.status !== 'heritage_review' && (
                <Button
                  size="sm"
                  onClick={() => handleApproveChanges(church)}
                  disabled={processingChurchId === church.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingChurchId === church.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  )}
                  Approve Changes
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
