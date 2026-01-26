import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, ChevronRight, Clock, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { Diocese } from "@/contexts/AuthContext";
import type { Church } from "@/lib/churches";

interface PendingReviewAlertProps {
  diocese: Diocese;
  onViewChurch?: (church: Church) => void;
}

interface PendingChurch {
  id: string;
  name: string;
  municipality?: string;
  submittedAt?: Timestamp;
  submissionNotes?: string;
}

export function PendingReviewAlert({ diocese, onViewChurch }: PendingReviewAlertProps) {
  const [pendingChurches, setPendingChurches] = useState<PendingChurch[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewSubmission, setHasNewSubmission] = useState(false);

  // Real-time listener for pending churches
  useEffect(() => {
    const q = query(
      collection(db, "churches"),
      where("diocese", "==", diocese),
      where("status", "in", ["pending", "under_review"]),
      orderBy("submittedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const churches: PendingChurch[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.data().churchName || "Unknown Church",
        municipality: doc.data().municipality,
        submittedAt: doc.data().submittedAt,
        submissionNotes: doc.data().submissionNotes,
      }));

      // Check if there are new submissions (within the last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const hasRecent = churches.some(
        (church) => church.submittedAt && church.submittedAt.toMillis() > fiveMinutesAgo
      );
      
      if (hasRecent && pendingChurches.length > 0 && churches.length > pendingChurches.length) {
        setHasNewSubmission(true);
        // Play a subtle notification sound (optional, browser dependent)
        try {
          const audio = new Audio("/notification.mp3");
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Ignore errors if sound doesn't exist or can't play
          });
        } catch {
          // Ignore audio creation errors
        }
      }

      setPendingChurches(churches);
    });

    return () => unsubscribe();
  }, [diocese, pendingChurches.length]);

  // Auto-dismiss the "new submission" indicator after 10 seconds
  useEffect(() => {
    if (hasNewSubmission) {
      const timer = setTimeout(() => setHasNewSubmission(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [hasNewSubmission]);

  const formatSubmissionTime = (timestamp?: Timestamp) => {
    if (!timestamp) return "Recently";
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  if (pendingChurches.length === 0) {
    return null;
  }

  return (
    <Alert 
      className={`relative overflow-hidden transition-all duration-300 ${
        hasNewSubmission 
          ? "border-orange-500 bg-orange-50 animate-pulse" 
          : "border-blue-200 bg-blue-50"
      }`}
    >
      {/* Animated gradient border for new submissions */}
      {hasNewSubmission && (
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-yellow-400/20 to-orange-400/20 animate-shimmer" />
      )}
      
      <div className="relative flex items-start gap-3">
        <div className={`flex-shrink-0 p-2 rounded-full ${
          hasNewSubmission ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
        }`}>
          <Bell className={`w-5 h-5 ${hasNewSubmission ? "animate-bounce" : ""}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <AlertTitle className="flex items-center gap-2 text-base font-semibold">
            {hasNewSubmission ? (
              <span className="text-orange-800">🔔 New Church Submission!</span>
            ) : (
              <span className="text-blue-800">Church Profiles Pending Review</span>
            )}
            <Badge 
              variant={hasNewSubmission ? "destructive" : "secondary"} 
              className="ml-2"
            >
              {pendingChurches.length} {pendingChurches.length === 1 ? "church" : "churches"}
            </Badge>
          </AlertTitle>
          
          <AlertDescription className="mt-2">
            <p className="text-sm text-muted-foreground mb-3">
              {hasNewSubmission 
                ? "A parish has just submitted a church profile for your review." 
                : `You have ${pendingChurches.length} church profile${pendingChurches.length > 1 ? "s" : ""} waiting for review and approval.`
              }
            </p>
            
            {/* Compact list of pending churches */}
            <div className="space-y-2">
              {(isExpanded ? pendingChurches : pendingChurches.slice(0, 3)).map((church) => (
                <div 
                  key={church.id}
                  className="flex items-center justify-between p-2 bg-white/70 rounded-md border border-blue-100 hover:border-blue-300 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (onViewChurch) {
                      onViewChurch({ id: church.id, name: church.name } as Church);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 animate-pulse" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground group-hover:text-blue-700">
                        {church.name}
                      </p>
                      {church.municipality && (
                        <p className="text-xs text-muted-foreground truncate">
                          {church.municipality}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatSubmissionTime(church.submittedAt)}
                    </span>
                    <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
              
              {/* Show more/less toggle */}
              {pendingChurches.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-blue-600 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded 
                    ? "Show less" 
                    : `Show ${pendingChurches.length - 3} more`
                  }
                  <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
