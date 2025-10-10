import { Layout } from "@/components/Layout";
import { DashboardStats } from "@/components/DashboardStats";
import { ChurchVisitsChart } from "@/components/ChurchVisitsChart";
import { RecentChurches } from "@/components/RecentChurches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, FileText, AlertCircle } from "lucide-react";

const recentAnnouncements = [
  {
    id: 1,
    title: "Christmas Mass Schedule 2024",
    date: "2024-01-15",
    priority: "High",
    status: "Published"
  },
  {
    id: 2,
    title: "Lenten Season Activities",
    date: "2024-01-12",
    priority: "Medium",
    status: "Draft"
  },
  {
    id: 3,
    title: "Pilgrim Registration Open",
    date: "2024-01-10",
    priority: "High",
    status: "Published"
  }
];

const pendingFeedback = [
  {
    id: 1,
    church: "Baclayon Church",
    type: "Maintenance Issue",
    date: "2024-01-15",
    priority: "High"
  },
  {
    id: 2,
    church: "Loboc Church",
    type: "Visitor Inquiry",
    date: "2024-01-14",
    priority: "Medium"
  },
  {
    id: 3,
    church: "Dauis Church",
    type: "Information Update",
    date: "2024-01-13",
    priority: "Low"
  }
];

const Index = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="heritage-card-accent p-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary mb-1">
                Welcome to Chancery Office Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage Bohol's sacred heritage and church information system efficiently
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <DashboardStats />

        {/* Charts and Tables Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chart takes 2 columns */}
          <div className="xl:col-span-2">
            <ChurchVisitsChart />
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Recent Announcements */}
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{announcement.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{announcement.date}</span>
                        <Badge 
                          variant={announcement.status === "Published" ? "default" : "secondary"}
                          className="text-xs px-2 py-0"
                        >
                          {announcement.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" size="sm">
                  View All Announcements
                </Button>
              </CardContent>
            </Card>

            {/* Pending Feedback */}
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Pending Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingFeedback.map((feedback) => (
                  <div key={feedback.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors border border-warning/20">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{feedback.church}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feedback.type}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{feedback.date}</span>
                        <Badge 
                          variant={feedback.priority === "High" ? "destructive" : feedback.priority === "Medium" ? "default" : "secondary"}
                          className="text-xs px-2 py-0"
                        >
                          {feedback.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" size="sm">
                  Review All Feedback
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Churches Table */}
        <RecentChurches />
      </div>
    </Layout>
  );
};

export default Index;

