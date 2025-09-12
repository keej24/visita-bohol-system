import { Church, Megaphone, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    title: "Total Churches Managed",
    value: "127",
    change: "+3 this month",
    icon: Church,
    trend: "up"
  },
  {
    title: "Total Announcements Posted",
    value: "45",
    change: "+12 this week",
    icon: Megaphone,
    trend: "up"
  },
  {
    title: "Pending Feedback Reports",
    value: "8",
    change: "Review needed",
    icon: MessageSquare,
    trend: "pending"
  },
  {
    title: "Monthly Church Visits",
    value: "2,340",
    change: "+18% vs last month",
    icon: TrendingUp,
    trend: "up"
  }
];

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="stats-card hover:scale-[1.02] transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stats-value mb-1">{stat.value}</div>
            <p className={`text-xs ${
              stat.trend === 'up' ? 'text-success' : 
              stat.trend === 'pending' ? 'text-warning' : 
              'text-muted-foreground'
            }`}>
              {stat.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}