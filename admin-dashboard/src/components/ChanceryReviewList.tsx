import { useQuery } from "@tanstack/react-query";
import { getChurchesByDiocese, type Church, type ChurchStatus, updateChurchStatus } from "@/lib/churches";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Pencil, XCircle, ArrowRight } from "lucide-react";

interface Props {
  diocese: "tagbilaran" | "talibon";
}

export function ChanceryReviewList({ diocese }: Props) {
  const { userProfile } = useAuth();
  const statuses: ChurchStatus[] = ["pending", "needs_revision", "heritage_review"];

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Church[]>({
    queryKey: ["churches", diocese, statuses],
    queryFn: () => getChurchesByDiocese(diocese, statuses),
  });

  const handleApprove = async (id: string) => {
    await updateChurchStatus(id, "approved", "Approved by Chancery", userProfile?.uid);
    refetch();
  };

  const handleRequestRevision = async (id: string) => {
    await updateChurchStatus(id, "needs_revision", "Please revise and resubmit.", userProfile?.uid);
    refetch();
  };
  const handleForwardHeritage = async (id: string) => {
    await updateChurchStatus(id, "heritage_review", "Forwarded to Museum Researcher for heritage validation.", userProfile?.uid);
    refetch();
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
          items.map((c) => (
            <div key={c.id} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.municipality ?? "Unknown"} • {c.classification ?? "Unclassified"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{c.status.replace("_", " ")}</Badge>
                {(c.classification === 'ICP' || c.classification === 'NCT') ? (
                  <Button variant="outline" size="sm" onClick={() => handleForwardHeritage(c.id)}>
                    <ArrowRight className="w-4 h-4 mr-1" /> Send to Heritage
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => handleRequestRevision(c.id)}>
                  <Pencil className="w-4 h-4 mr-1" /> Revise
                </Button>
                {(c.classification === 'non-heritage' || c.classification === 'unknown') && (
                  <Button variant="heritage" size="sm" onClick={() => handleApprove(c.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Publish
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
