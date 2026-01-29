import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Search, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Filter,
  Users,
  Clock,
  CheckCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getChurchesByDiocese, type Church } from '@/lib/churches';
import type { Diocese } from '@/contexts/AuthContext';
import { MobileChurchTableSkeleton } from './MobileSkeletons';

interface MobileChurchListProps {
  diocese: Diocese;
  maxItems?: number;
}

const StatusBadge = React.memo<{ status: string }>(({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { 
          variant: 'default' as const, 
          label: 'Active', 
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-3 h-3" />
        };
      case 'pending':
        return { 
          variant: 'secondary' as const, 
          label: 'Pending', 
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="w-3 h-3" />
        };
      case 'heritage_review':
        return { 
          variant: 'secondary' as const, 
          label: 'Heritage Review', 
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Users className="w-3 h-3" />
        };
      default:
        return { 
          variant: 'outline' as const, 
          label: status, 
          className: '',
          icon: null
        };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Mobile church card component
const MobileChurchCard = React.memo<{ church: Church }>(({ church }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Generate random visitor count for demo purposes
  const visitorCount = useMemo(() => 
    Math.floor(Math.random() * 2000 + 500), 
    [church.id]
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate mb-1">
              {church.name}
            </h3>
            <div className="flex items-center gap-1 text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="text-sm truncate">{church.municipality || 'Unknown'}</span>
            </div>
          </div>
          <StatusBadge status={church.status} />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {church.createdAt && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{new Date(church.createdAt.toDate()).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-primary font-medium">
              <Users className="w-3 h-3" />
              <span>{visitorCount.toLocaleString()}</span>
            </div>
          </div>
          
          <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>{church.name}</SheetTitle>
              </SheetHeader>
              <MobileChurchDetails church={church} visitorCount={visitorCount} />
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
});

MobileChurchCard.displayName = 'MobileChurchCard';

// Desktop table row component
const DesktopChurchRow = React.memo<{ church: Church }>(({ church }) => {
  const visitorCount = useMemo(() => 
    Math.floor(Math.random() * 2000 + 500), 
    [church.id]
  );

  return (
    <tr className="table-row hover:bg-muted/50 transition-colors">
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
        <span className="font-medium text-primary">{visitorCount.toLocaleString()}</span>
      </td>
      <td className="p-4">
        <Button variant="ghost" size="sm">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
});

DesktopChurchRow.displayName = 'DesktopChurchRow';

// Church details component
const MobileChurchDetails: React.FC<{ church: Church; visitorCount: number }> = ({ 
  church, 
  visitorCount 
}) => (
  <div className="space-y-6 py-4">
    {/* Basic Info */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Municipality</p>
        <p className="text-sm">{church.municipality || 'Not specified'}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Founded</p>
        <p className="text-sm">{church.foundingYear || 'Unknown'}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Classification</p>
        <Badge variant="secondary">{church.classification || 'Unclassified'}</Badge>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Visitors</p>
        <p className="text-sm font-semibold text-primary">{visitorCount.toLocaleString()}</p>
      </div>
    </div>

    {/* Address */}
    {church.address && (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Full Address</p>
        <p className="text-sm">{church.address}</p>
      </div>
    )}

    {/* Historical Background */}
    {church.historicalBackground && (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Historical Background</p>
        <p className="text-sm leading-relaxed">{church.historicalBackground}</p>
      </div>
    )}

    {/* Mass Schedules */}
    {church.massSchedules && (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Mass Schedules</p>
        <p className="text-sm">{church.massSchedules}</p>
      </div>
    )}

    {/* Priest */}
    {church.assignedPriest && (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Assigned Priest</p>
        <p className="text-sm">{church.assignedPriest}</p>
      </div>
    )}

    {/* Action Button */}
    <Button className="w-full" variant="outline">
      <ExternalLink className="w-4 h-4 mr-2" />
      View Full Profile
    </Button>
  </div>
);

const MobileChurchList: React.FC<MobileChurchListProps> = ({ 
  diocese, 
  maxItems = 10 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: churches, isLoading, error } = useQuery<Church[]>({
    queryKey: ['churches', diocese, 'all'],
    queryFn: () => getChurchesByDiocese(diocese),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const filteredChurches = useMemo(() => {
    if (!churches) return [];
    
    let filtered = churches;
    
    if (searchTerm) {
      filtered = filtered.filter(church =>
        church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        church.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate().getTime() || 0;
        const dateB = b.createdAt?.toDate().getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, maxItems);
  }, [churches, searchTerm, maxItems]);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-2">Error loading churches</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <MobileChurchTableSkeleton />;
  }

  return (
    <Card className="data-table">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
            Recent Churches
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
          <Button variant="outline" size="sm" className="btn-heritage self-start sm:self-center">
            View All Churches
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search churches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              disabled={isLoading}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="px-3"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Mobile: Card Layout */}
        <div className="sm:hidden space-y-3 p-4">
          {filteredChurches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No churches match your search' : 'No churches found'}
              </p>
            </div>
          ) : (
            filteredChurches.map((church) => (
              <MobileChurchCard key={church.id} church={church} />
            ))
          )}
        </div>
        
        {/* Desktop: Table Layout */}
        <div className="hidden sm:block overflow-hidden">
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
              {filteredChurches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No churches match your search' : 'No churches found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredChurches.map((church) => (
                  <DesktopChurchRow key={church.id} church={church} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileChurchList;