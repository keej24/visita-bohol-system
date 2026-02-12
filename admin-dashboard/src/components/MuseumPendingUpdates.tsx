/**
 * FILE PURPOSE: Museum Pending Updates Review for Heritage Churches
 *
 * This component displays heritage churches (ICP/NCT) that have pending changes
 * forwarded by the Chancery for Museum Researcher validation.
 *
 * The Museum Researcher can:
 * - View/edit the pending changes (especially heritage-related fields)
 * - Approve changes (merges to live profile)
 *
 * Note: Only heritage churches in 'heritage_review' status with pendingChanges
 * are shown here. Non-heritage pending updates are handled by Chancery only.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, query, where, getDocs, and } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { applyPendingChanges } from "@/lib/workflow-state-machine";
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
  Eye,
  Edit3,
  Clock,
  FileEdit,
  Landmark
} from "lucide-react";
import type { Church } from "@/types/church";

interface Props {
  onViewChurch?: (church: Church) => void;
  onEditChurch?: (church: Church) => void;
}

export function MuseumPendingUpdates({ onViewChurch, onEditChurch }: Props) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingChurchId, setProcessingChurchId] = useState<string | null>(null);

  // Query for heritage churches with pending changes in heritage_review status
  const { data: churches, isLoading, isError } = useQuery<Church[]>({
    queryKey: ["churches", "museum", "pending-updates"],
    queryFn: async () => {
      const churchesRef = collection(db, "churches");
      
      // Primary query: churches forwarded via the new pendingChanges flag
      const forwardedQ = query(
        churchesRef,
        where("hasPendingChanges", "==", true),
        where("pendingChanges.forwardedToMuseum", "==", true)
      );
      const forwardedSnapshot = await getDocs(forwardedQ);
      
      // Legacy fallback: churches still using the old heritage_review status
      const legacyQ = query(
        churchesRef,
        where("status", "==", "heritage_review"),
        where("hasPendingChanges", "==", true)
      );
      const legacySnapshot = await getDocs(legacyQ);
      
      // Merge and deduplicate by ID
      const allDocs = new Map<string, Church>();
      for (const d of [...forwardedSnapshot.docs, ...legacySnapshot.docs]) {
        if (!allDocs.has(d.id)) {
          allDocs.set(d.id, { id: d.id, ...d.data() } as Church);
        }
      }
      
      // Filter to only heritage churches (ICP/NCT)
      return Array.from(allDocs.values())
        .filter(church => 
          church.classification === "ICP" || church.classification === "NCT"
        );
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
        undefined, // No edits - use original pending data
        "Heritage validation approved by Museum Researcher"
      );

      if (result.success) {
        toast({
          title: "Heritage Validation Complete",
          description: `Updates to ${church.name} have been validated and published.`
        });

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

  if (isLoading) {
    return (
      <Card className="border-amber-200">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <FileEdit className="h-5 w-5" />
            Pending Heritage Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-amber-200">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <FileEdit className="h-5 w-5" />
            Error Loading Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load pending heritage updates. Please try refreshing.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!churches || churches.length === 0) {
    return (
      <Card className="border-amber-200">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <FileEdit className="h-5 w-5" />
            Pending Heritage Updates
          </CardTitle>
          <CardDescription>
            Review heritage field updates forwarded by the Chancery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No heritage updates pending validation.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200">
      <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <FileEdit className="h-5 w-5" />
          Pending Heritage Updates
          <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
            {churches.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Review heritage field updates forwarded by the Chancery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {churches.map((church) => (
          <div
            key={church.id}
            className="border border-amber-100 rounded-lg p-4 space-y-3 bg-amber-50/40 hover:bg-amber-50 transition-colors"
          >
            {/* Church Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold truncate">{church.name}</h4>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    <Landmark className="h-3 w-3 mr-1" />
                    {church.classification}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {church.municipality} • <span className="capitalize">{church.diocese}</span>
                </p>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                Heritage Review
              </Badge>
            </div>

            {/* Changed Fields */}
            {church.pendingChanges?.changedFields && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  Modified Fields
                </p>
                <div className="flex flex-wrap gap-1">
                  {church.pendingChanges.changedFields.map((field) => (
                    <Badge
                      key={field}
                      variant="secondary"
                      className="text-xs bg-amber-100 text-amber-800"
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
                Forwarded:{" "}
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

            <Separator className="bg-amber-200" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewChurch?.(church)}
                className="border-amber-300 hover:bg-amber-100"
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>

              {/* Edit Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditChurch?.(church)}
                className="border-amber-300 hover:bg-amber-100"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Review & Edit
              </Button>

              <div className="flex-1" />

              {/* Approve Button */}
              <Button
                size="sm"
                onClick={() => handleApproveChanges(church)}
                disabled={processingChurchId === church.id}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {processingChurchId === church.id ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Validate & Publish
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
