// Diocese-specific dashboard for Tagbilaran
import { Layout } from "@/components/Layout";
import { ChurchVisitsChart } from "@/components/ChurchVisitsChart";
import { ChanceryReviewList } from "@/components/ChanceryReviewList";
import { RecentChurches } from "@/components/RecentChurches";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, AlertCircle, MapPin, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getChurchesByDiocese, type Church } from "@/lib/churches";
import { CreateParishAccountModal } from "@/components/CreateParishAccountModal";

const TagbilaranDashboard = () => {
  const { userProfile } = useAuth();
  const { data: churches, isLoading } = useQuery<Church[]>({
    queryKey: ["churches", "tagbilaran"],
    queryFn: () => getChurchesByDiocese("tagbilaran"),
  });
  const pendingCount = (churches ?? []).filter((c) => [
    "pending",
    "needs_revision",
    "heritage_review",
  ].includes(c.status)).length;
  const heritageCount = (churches ?? []).filter(
    (c) => c.classification === "ICP" || c.classification === "NCT"
  ).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Diocese Header */}
        <div className="heritage-card-accent p-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-4 justify-between">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary mb-1">
                Diocese of Tagbilaran - Chancery Office
              </h1>
              <p className="text-muted-foreground">
                Managing churches and parishes in the Diocese of Tagbilaran
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Welcome, {userProfile?.name}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {userProfile?.role?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            <CreateParishAccountModal diocese="tagbilaran" trigger={
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm shadow">
                <Plus className="w-4 h-4" /> Add Parish Account
              </button>
            } />
          </div>
        </div>

        {/* Diocese-specific Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Total Parishes</p>
                  <p className="stats-value">24</p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Heritage Churches</p>
                  <p className="stats-value">{isLoading ? '—' : heritageCount}</p>
                </div>
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Pending Reviews</p>
                  <p className="stats-value">{isLoading ? '—' : pendingCount}</p>
                </div>
                <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Active Users</p>
                  <p className="stats-value">12</p>
                </div>
                <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Review Queue */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ChurchVisitsChart />
          </div>
          <ChanceryReviewList diocese="tagbilaran" />
        </div>

        {/* Tagbilaran Churches */}
        <RecentChurches />
      </div>
    </Layout>
  );
};

export default TagbilaranDashboard;
