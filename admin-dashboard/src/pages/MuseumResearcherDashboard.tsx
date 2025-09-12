// Museum Researcher Dashboard for heritage validation and cultural content
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Edit,
  FileText,
  Camera,
  MapPin,
  Calendar,
  Users,
  Star,
  Archive
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Mock data for heritage churches
const heritageChurches = [
  {
    id: 1,
    name: "Baclayon Church",
    diocese: "tagbilaran",
    parish: "Baclayon Parish",
    classification: "ICP", // Important Cultural Property
    status: "pending_validation",
    culturalScore: 85,
    historicalAccuracy: 92,
    submittedBy: "Baclayon Parish Secretary",
    submissionDate: "2024-01-15",
    priority: "high",
    feedback: "Needs verification of 1595 founding date documents",
    images: 12,
    documents: 8
  },
  {
    id: 2,
    name: "Loboc Church",
    diocese: "tagbilaran",
    parish: "Loboc Parish", 
    classification: "NCT", // National Cultural Treasure
    status: "requires_revision",
    culturalScore: 78,
    historicalAccuracy: 87,
    submittedBy: "Loboc Parish Secretary",
    submissionDate: "2024-01-12",
    priority: "high",
    feedback: "Missing archaeological findings documentation",
    images: 8,
    documents: 5
  },
  {
    id: 3,
    name: "Dauis Church",
    diocese: "tagbilaran",
    parish: "Dauis Parish",
    classification: "ICP",
    status: "validated",
    culturalScore: 94,
    historicalAccuracy: 96,
    submittedBy: "Dauis Parish Secretary",
    submissionDate: "2024-01-10",
    priority: "completed",
    feedback: "Excellent documentation and cultural context",
    images: 15,
    documents: 12
  },
  {
    id: 4,
    name: "Inabanga Church",
    diocese: "talibon",
    parish: "Inabanga Parish",
    classification: "ICP",
    status: "pending_validation",
    culturalScore: 72,
    historicalAccuracy: 82,
    submittedBy: "Inabanga Parish Secretary",
    submissionDate: "2024-01-08",
    priority: "medium",
    feedback: "Architectural style verification needed",
    images: 6,
    documents: 4
  }
];

const researchTasks = [
  {
    id: 1,
    title: "Spanish Colonial Architecture Documentation",
    churches: ["Baclayon Church", "Loboc Church"],
    deadline: "2024-02-15",
    status: "in_progress",
    completion: 65
  },
  {
    id: 2,
    title: "Jesuit Mission History Validation",
    churches: ["Dauis Church"],
    deadline: "2024-01-30",
    status: "completed",
    completion: 100
  },
  {
    id: 3,
    title: "Indigenous Cultural Integration Study",
    churches: ["Inabanga Church"],
    deadline: "2024-02-28",
    status: "pending",
    completion: 25
  }
];

const MuseumResearcherDashboard = () => {
  const { userProfile } = useAuth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'bg-success text-success-foreground';
      case 'pending_validation': return 'bg-warning text-warning-foreground';
      case 'requires_revision': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="w-4 h-4" />;
      case 'pending_validation': return <Clock className="w-4 h-4" />;
      case 'requires_revision': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-muted-foreground';
      case 'completed': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getClassificationBadge = (classification: string) => {
    const colors = {
      'ICP': 'bg-accent text-accent-foreground',
      'NCT': 'bg-primary text-primary-foreground'
    };
    return colors[classification as keyof typeof colors] || 'bg-secondary text-secondary-foreground';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Museum Researcher Header */}
        <div className="heritage-card-accent p-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary mb-1">
                Museum Researcher - Heritage Validation Dashboard
              </h1>
              <p className="text-muted-foreground">
                Validate heritage churches (ICP/NCT) and enhance cultural content across Bohol dioceses
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {userProfile?.name}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  HERITAGE SPECIALIST
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Cross-Diocese Access
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Heritage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Heritage Churches</p>
                  <p className="stats-value">14</p>
                </div>
                <Award className="w-8 h-8 text-accent" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                8 ICP • 6 NCT
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Pending Validation</p>
                  <p className="stats-value text-warning">6</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Validated</p>
                  <p className="stats-value text-success">5</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Needs Revision</p>
                  <p className="stats-value text-destructive">3</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="heritage-validation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="heritage-validation">Heritage Validation</TabsTrigger>
            <TabsTrigger value="cultural-content">Cultural Content</TabsTrigger>
            <TabsTrigger value="research-tasks">Research Tasks</TabsTrigger>
          </TabsList>

          {/* Heritage Validation Tab */}
          <TabsContent value="heritage-validation" className="space-y-6">
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Heritage Churches Validation Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {heritageChurches.map((church) => (
                  <div key={church.id} className="border rounded-lg p-4 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">{church.name}</h3>
                        <Badge className={`text-xs ${getClassificationBadge(church.classification)}`}>
                          {church.classification}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(church.status)}`}>
                          {getStatusIcon(church.status)}
                          <span className="ml-1 capitalize">{church.status.replace('_', ' ')}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {church.diocese}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Validate
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Cultural Score</span>
                          <span className="font-medium">{church.culturalScore}%</span>
                        </div>
                        <Progress value={church.culturalScore} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Historical Accuracy</span>
                          <span className="font-medium">{church.historicalAccuracy}%</span>
                        </div>
                        <Progress value={church.historicalAccuracy} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Submitted: {church.submissionDate} by {church.submittedBy}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          {church.images} images
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {church.documents} docs
                        </span>
                        <span className={`flex items-center gap-1 ${getPriorityColor(church.priority)}`}>
                          <Star className="w-3 h-3" />
                          {church.priority}
                        </span>
                      </div>
                    </div>
                    
                    {church.feedback && (
                      <div className="bg-warning/10 border border-warning/20 rounded p-2 text-sm">
                        <p className="text-warning-foreground font-medium">Validation Notes:</p>
                        <p className="text-warning-foreground">{church.feedback}</p>
                      </div>
                    )}

                    {/* Heritage declaration editor scaffold */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="decl-type-" >Declaration Type</Label>
                        <select id="decl-type-" aria-labelledby="decl-type-" className="input w-full rounded-md border bg-background p-2 text-sm">
                          <option>ICP</option>
                          <option>NCT</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Reference No.</Label>
                        <Input placeholder="e.g., NM-2024-001" />
                      </div>
                      <div className="space-y-1">
                        <Label>Issued By</Label>
                        <Input placeholder="e.g., NCCA, NHCP, National Museum" />
                      </div>
                      <div className="space-y-1">
                        <Label>Date Issued</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <Label>Heritage Notes</Label>
                        <Input placeholder="Add validation notes or requirements" />
                      </div>
                      <div className="md:col-span-4 flex gap-2 justify-end">
                        <Button variant="outline" size="sm">Request Parish Revision</Button>
                        <Button variant="heritage" size="sm">Mark Validated</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cultural Content Tab */}
          <TabsContent value="cultural-content" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="heritage-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Content Enhancement Queue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Spanish Colonial Architecture</h4>
                      <Badge variant="outline" className="text-xs">High Priority</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Enhance architectural descriptions for 6 churches</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={75} className="flex-1 h-2" />
                      <span className="text-xs">75%</span>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Indigenous Cultural Elements</h4>
                      <Badge variant="outline" className="text-xs">Medium</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Document pre-colonial influences</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={45} className="flex-1 h-2" />
                      <span className="text-xs">45%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Historical Timeline Verification</h4>
                      <Badge variant="outline" className="text-xs">Low</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Cross-reference historical dates</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={20} className="flex-1 h-2" />
                      <span className="text-xs">20%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="heritage-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                    <Archive className="w-5 h-5" />
                    Recently Completed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <h4 className="font-medium text-sm text-success-foreground">Baclayon Church Documentation</h4>
                    <p className="text-xs text-muted-foreground mt-1">Complete heritage documentation validated</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-success-foreground">
                      <CheckCircle className="w-3 h-3" />
                      <span>Completed Jan 15, 2024</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <h4 className="font-medium text-sm text-success-foreground">Jesuit Mission Archives</h4>
                    <p className="text-xs text-muted-foreground mt-1">Historical context enhancement for 3 churches</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-success-foreground">
                      <CheckCircle className="w-3 h-3" />
                      <span>Completed Jan 12, 2024</span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full">
                    View All Completed Work
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Research Tasks Tab */}
          <TabsContent value="research-tasks" className="space-y-6">
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Active Research Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {researchTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{task.title}</h3>
                      <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{task.completion}%</span>
                      </div>
                      <Progress value={task.completion} className="h-2" />
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          <span>Due: {task.deadline}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span>{task.churches.length} churches</span>
                        </div>
                      </div>
                      
                      <div className="text-xs">
                        <span className="text-muted-foreground">Churches: </span>
                        <span>{task.churches.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MuseumResearcherDashboard;
