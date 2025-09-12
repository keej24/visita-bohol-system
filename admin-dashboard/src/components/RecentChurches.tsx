import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, ExternalLink } from "lucide-react";
import { useState } from "react";

const churchesData = [
  {
    id: 1,
    name: "Baclayon Church",
    location: "Baclayon, Bohol",
    dateAdded: "2024-01-15",
    status: "Active",
    visitors: 1250
  },
  {
    id: 2,
    name: "Blood Compact Shrine",
    location: "Tagbilaran City, Bohol",
    dateAdded: "2024-01-12",
    status: "Active",
    visitors: 980
  },
  {
    id: 3,
    name: "Loboc Church",
    location: "Loboc, Bohol",
    dateAdded: "2024-01-10",
    status: "Under Review",
    visitors: 756
  },
  {
    id: 4,
    name: "Dauis Church",
    location: "Dauis, Bohol",
    dateAdded: "2024-01-08",
    status: "Active",
    visitors: 892
  },
  {
    id: 5,
    name: "Dimiao Church",
    location: "Dimiao, Bohol",
    dateAdded: "2024-01-05",
    status: "Active",
    visitors: 654
  }
];

export function RecentChurches() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChurches = churchesData.filter(church =>
    church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    church.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="data-table">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-primary">
            Recent Churches
          </CardTitle>
          <Button variant="outline" size="sm" className="btn-heritage">
            View All Churches
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search churches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left p-4 text-sm">Church Name</th>
                <th className="text-left p-4 text-sm">Location</th>
                <th className="text-left p-4 text-sm">Date Added</th>
                <th className="text-left p-4 text-sm">Status</th>
                <th className="text-left p-4 text-sm">Visitors</th>
                <th className="text-left p-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChurches.map((church) => (
                <tr key={church.id} className="table-row">
                  <td className="p-4">
                    <div className="font-medium text-foreground">{church.name}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="text-sm">{church.location}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="text-sm">{church.dateAdded}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant={church.status === "Active" ? "default" : "secondary"}
                      className={church.status === "Active" ? "bg-success text-success-foreground" : ""}
                    >
                      {church.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-primary">{church.visitors.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}