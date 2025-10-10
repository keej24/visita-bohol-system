import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", visits: 1850 },
  { month: "Feb", visits: 2100 },
  { month: "Mar", visits: 1950 },
  { month: "Apr", visits: 2300 },
  { month: "May", visits: 2600 },
  { month: "Jun", visits: 2340 },
  { month: "Jul", visits: 2800 },
  { month: "Aug", visits: 2950 },
  { month: "Sep", visits: 2700 },
  { month: "Oct", visits: 2900 },
  { month: "Nov", visits: 3100 },
  { month: "Dec", visits: 2850 }
];

export function ChurchVisitsChart() {
  return (
    <Card className="heritage-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          Church Visits Per Month
          <span className="text-sm font-normal text-muted-foreground">(2024)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-medium)"
                }}
              />
              <Area 
                type="monotone" 
                dataKey="visits" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorVisits)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
