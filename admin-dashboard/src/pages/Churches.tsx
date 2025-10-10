import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MapPin, Calendar, Users, ExternalLink, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/baclayon-church-hero.jpg";
import { useAuth } from "@/hooks/useAuth";

const churchesData = [
  {
    id: 1,
    name: "Baclayon Church",
    fullName: "Church of Our Lady of the Immaculate Conception",
    location: "Baclayon, Bohol",
    established: "1596",
    status: "Active",
    visitors: 1250,
    lastUpdated: "2024-01-15",
    description: "One of the oldest stone churches in the Philippines",
    category: "Heritage Church"
  },
  {
    id: 2,
    name: "Blood Compact Shrine",
    fullName: "Sandugo Blood Compact Shrine",
    location: "Tagbilaran City, Bohol",
    established: "1565",
    status: "Active",
    visitors: 980,
    lastUpdated: "2024-01-12",
    description: "Historical site commemorating the first treaty of friendship",
    category: "Historical Shrine"
  },
  {
    id: 3,
    name: "Loboc Church",
    fullName: "San Pedro Apostol Church",
    location: "Loboc, Bohol",
    established: "1602",
    status: "Under Review",
    visitors: 756,
    lastUpdated: "2024-01-10",
    description: "Historic church known for its beautiful river setting",
    category: "Heritage Church"
  },
  {
    id: 4,
    name: "Dauis Church",
    fullName: "Our Lady of the Assumption Church",
    location: "Dauis, Bohol",
    established: "1697",
    status: "Active",
    visitors: 892,
    lastUpdated: "2024-01-08",
    description: "Famous for its miraculous well and religious significance",
    category: "Pilgrimage Site"
  },
  {
    id: 5,
    name: "Dimiao Church",
    fullName: "Santa Monica Church",
    location: "Dimiao, Bohol",
    established: "1768",
    status: "Active",
    visitors: 654,
    lastUpdated: "2024-01-05",
    description: "Beautiful baroque architecture with ornate stone carvings",
    category: "Heritage Church"
  },
  {
    id: 6,
    name: "Alburquerque Church",
    fullName: "San Jose Church",
    location: "Alburquerque, Bohol",
    established: "1869",
    status: "Active",
    visitors: 423,
    lastUpdated: "2024-01-03",
    description: "Known for its unique architectural blend and peaceful atmosphere",
    category: "Parish Church"
  }
];

const Churches = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { userProfile } = useAuth();

  const filteredChurches = churchesData.filter(church =>
    church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    church.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    church.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section with Hero Image */}
        <div className="heritage-card-accent overflow-hidden">
          <div 
            className="h-48 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-primary/80 flex items-center">
              <div className="container mx-auto px-6">
                <h1 className="text-3xl font-bold text-primary-foreground mb-2">
                  Manage Churches
                </h1>
                <p className="text-primary-foreground/90">
                  Comprehensive management of Bohol's sacred heritage sites
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="heritage-card p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search churches by name, location, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {userProfile?.role === 'parish_secretary' && (
              <Button variant="heritage" className="gap-2">
                <Plus className="w-4 h-4" />
                Add New Church
              </Button>
            )}
          </div>
        </div>

        {/* Churches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredChurches.map((church) => (
            <Card key={church.id} className="heritage-card hover:shadow-[var(--shadow-medium)] transition-all duration-200 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-bold text-primary mb-1 truncate">
                      {church.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      {church.fullName}
                    </p>
                  </div>
                  <Badge 
                    variant={church.status === "Active" ? "default" : "secondary"}
                    className={church.status === "Active" ? "bg-success text-success-foreground" : ""}
                  >
                    {church.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{church.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Established {church.established}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{church.visitors.toLocaleString()} monthly visitors</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-foreground">{church.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {church.category}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Updated {church.lastUpdated}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="stats-card text-center">
            <CardContent className="pt-6">
              <div className="stats-value">{churchesData.length}</div>
              <div className="stats-label">Total Churches</div>
            </CardContent>
          </Card>
          <Card className="stats-card text-center">
            <CardContent className="pt-6">
              <div className="stats-value">{churchesData.filter(c => c.status === "Active").length}</div>
              <div className="stats-label">Active Churches</div>
            </CardContent>
          </Card>
          <Card className="stats-card text-center">
            <CardContent className="pt-6">
              <div className="stats-value">{churchesData.reduce((sum, c) => sum + c.visitors, 0).toLocaleString()}</div>
              <div className="stats-label">Total Monthly Visitors</div>
            </CardContent>
          </Card>
          <Card className="stats-card text-center">
            <CardContent className="pt-6">
              <div className="stats-value">{new Set(churchesData.map(c => c.category)).size}</div>
              <div className="stats-label">Church Categories</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Churches;
