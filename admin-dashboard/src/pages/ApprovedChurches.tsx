import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Church as ChurchIcon,
  Crown,
  Landmark,
  Calendar,
  MapPin,
  User,
  FileText,
  Eye,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChurchesByDiocese, type Church } from '@/lib/churches';
import { useAuth } from "@/hooks/useAuth";
import { ChurchDetailModal } from '@/components/ChurchDetailModal';
import { format } from 'date-fns';


const ApprovedChurches = () => {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch approved heritage churches from both dioceses
  const { data: tagbilaranApproved, isLoading: tagbilaranLoading } = useQuery<Church[]>({
    queryKey: ['churches', 'tagbilaran', 'approved'],
    queryFn: () => getChurchesByDiocese('tagbilaran', ['approved']),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: talibonApproved, isLoading: talibonLoading } = useQuery<Church[]>({
    queryKey: ['churches', 'talibon', 'approved'],
    queryFn: () => getChurchesByDiocese('talibon', ['approved']),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter only heritage churches (ICP/NCT) from approved churches
  const approvedHeritageChurches = [
    ...(tagbilaranApproved || []).filter(church => church.classification === 'ICP' || church.classification === 'NCT'),
    ...(talibonApproved || []).filter(church => church.classification === 'ICP' || church.classification === 'NCT')
  ];

  const isLoading = tagbilaranLoading || talibonLoading;

  const filteredChurches = approvedHeritageChurches.filter(church => {
    const matchesSearch = church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         church.municipality?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || church.classification === filterType;
    return matchesSearch && matchesFilter;
  });

  const getClassificationBadge = (classification: string) => {
    return classification === 'NCT' 
      ? 'bg-purple-100 text-purple-800 border-purple-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getClassificationIcon = (classification: string) => {
    return classification === 'NCT' ? <Landmark className="w-4 h-4" /> : <Crown className="w-4 h-4" />;
  };

  const handleViewChurch = (church: Church) => {
    setSelectedChurch(church);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChurch(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="heritage-card-accent p-6 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
              <ChurchIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-800 mb-1">
                Approved Heritage Churches
              </h1>
              <p className="text-green-700">
                Official registry of churches with approved heritage status (ICP/NCT) across Bohol dioceses
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                  {filteredChurches.length} Churches
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Heritage Registry
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search churches by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              size="sm"
            >
              All ({approvedHeritageChurches.length})
            </Button>
            <Button
              variant={filterType === "ICP" ? "default" : "outline"}
              onClick={() => setFilterType("ICP")}
              size="sm"
            >
              <Crown className="w-4 h-4 mr-1" />
              ICP ({approvedHeritageChurches.filter(c => c.classification === "ICP").length})
            </Button>
            <Button
              variant={filterType === "NCT" ? "default" : "outline"}
              onClick={() => setFilterType("NCT")}
              size="sm"
            >
              <Landmark className="w-4 h-4 mr-1" />
              NCT ({approvedHeritageChurches.filter(c => c.classification === "NCT").length})
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading approved heritage churches...</p>
            </div>
          </div>
        )}

        {/* Churches Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredChurches.map((church) => (
            <Card key={church.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{church.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-2">{church.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={getClassificationBadge(church.classification)}>
                        {getClassificationIcon(church.classification)}
                        <span className="ml-1">{church.classification}</span>
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                        Published
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Founded {church.foundedYear || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{church.municipality || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChurchIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="capitalize">{church.diocese} Diocese</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Updated {church.updatedAt ? format(church.updatedAt instanceof Date ? church.updatedAt : church.updatedAt.toDate(), 'MMM dd, yyyy') : 'N/A'}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {church.historicalBackground || church.culturalSignificance || 'No description available'}
                </p>

                {/* Heritage Status */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Heritage Status: {church.classification}</span>
                  <span>Status: {church.status}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewChurch(church)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredChurches.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No churches found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters to find heritage churches.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Church Detail Modal */}
        <ChurchDetailModal
          church={selectedChurch}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          mode="view"
        />
      </div>
    </Layout>
  );
};

export default ApprovedChurches;

