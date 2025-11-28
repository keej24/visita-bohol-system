import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getChurchesByDiocese, type Church } from '@/lib/churches';
import type { Diocese } from '@/contexts/AuthContext';

interface OptimizedRecentChurchesProps {
  diocese?: Diocese;
  maxItems?: number;
}

const StatusBadge = React.memo<{ status: string }>(({ status }) => (
  <Badge 
    variant={status === "approved" ? "default" : "secondary"}
    className={status === "approved" ? "bg-success text-success-foreground" : ""}
  >
    {status === "approved" ? "Active" : 
     status === "pending" ? "Pending" :
     status === "heritage_review" ? "Heritage Review" : 
     status === "under_review" ? "Under Review" : status}
  </Badge>
));

StatusBadge.displayName = 'StatusBadge';

const ChurchRow = React.memo<{ church: Church }>(({ church }) => (
  <tr className="table-row">
    <td className="p-4">
      <div className="font-medium text-foreground">{church.name}</div>
    </td>
    <td className="p-4">
      <div className="flex items-center gap-1 text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span className="text-sm">{church.municipality || 'Unknown'}</span>
      </div>
    </td>
    <td className="p-4">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span className="text-sm">
          {church.createdAt ? new Date(church.createdAt.toDate()).toLocaleDateString() : 'N/A'}
        </span>
      </div>
    </td>
    <td className="p-4">
      <StatusBadge status={church.status} />
    </td>
    <td className="p-4">
      <span className="font-medium text-primary">
        {Math.floor(Math.random() * 2000 + 500).toLocaleString()}
      </span>
    </td>
    <td className="p-4">
      <Button variant="ghost" size="sm">
        <ExternalLink className="w-4 h-4" />
      </Button>
    </td>
  </tr>
));

ChurchRow.displayName = 'ChurchRow';

export const OptimizedRecentChurches = React.memo<OptimizedRecentChurchesProps>(({ 
  diocese, 
  maxItems = 10 
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: churches, isLoading, error } = useQuery<Church[]>({
    queryKey: ['churches', diocese || 'all'],
    queryFn: () => diocese ? getChurchesByDiocese(diocese) : Promise.resolve([]),
    enabled: !!diocese,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const filteredChurches = useMemo(() => {
    if (!churches) return [];
    
    const filtered = searchTerm 
      ? churches.filter(church =>
          church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          church.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : churches;
    
    return filtered
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate().getTime() || 0;
        const dateB = b.createdAt?.toDate().getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, maxItems);
  }, [churches, searchTerm, maxItems]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  if (error) {
    return (
      <Card className="data-table">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <p className="mb-2">Error loading churches</p>
            <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="data-table">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
            Recent Churches
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
            onChange={handleSearchChange}
            className="pl-9"
            disabled={isLoading}
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading churches...</p>
                  </td>
                </tr>
              ) : filteredChurches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No churches match your search' : 'No churches found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredChurches.map((church) => (
                  <ChurchRow key={church.id} church={church} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedRecentChurches.displayName = 'OptimizedRecentChurches';