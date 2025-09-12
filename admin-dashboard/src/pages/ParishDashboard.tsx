// Parish Secretary Dashboard for managing church entries
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createChurch, getChurchesByParish, submitChurchForReview, updateChurch, type Church, type ChurchUpdate } from "@/lib/churches";
import { 
  Upload, 
  Church as ChurchIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Edit,
  Eye,
  FileText,
  Calendar,
  MapPin 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Timestamp } from "firebase/firestore";

// simple derived completeness placeholder until form is implemented
const computeCompleteness = (c: Partial<Church>) => {
  let score = 0;
  if (c.name) score += 40;
  if (c.municipality) score += 20;
  if (c.foundedYear) score += 20;
  if (c.classification) score += 20;
  return score;
};

const recentAnnouncements = [
  {
    id: 1,
    title: "Sunday Mass Schedule Change",
    status: "published",
    date: "2024-01-15"
  },
  {
    id: 2,
    title: "Parish Feast Day Celebration",
    status: "pending_approval",
    date: "2024-01-12"
  }
];

const ParishDashboard = () => {
  const { userProfile } = useAuth();
  const parishId = userProfile?.parish;
  const diocese = userProfile?.diocese;
  const queryClient = useQueryClient();
  const { data: churches, isLoading } = useQuery<Church[]>({
    queryKey: ["churches", "parish", parishId],
    queryFn: () => getChurchesByParish(parishId!),
    enabled: !!parishId,
  });
  const hasChurch = (churches?.length ?? 0) > 0;

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; municipality?: string; foundedYear?: number }) => {
      if (!parishId || !diocese) throw new Error('Missing parish/diocese on profile');
      if (hasChurch) throw new Error('A church already exists for this parish');
      const id = await createChurch({
        name: payload.name,
        municipality: payload.municipality,
        foundedYear: payload.foundedYear,
        parishId,
        diocese,
        status: 'pending',
      });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["churches", "parish", parishId] });
    }
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', municipality: '', foundedYear: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Church | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', municipality: '', foundedYear: '', address: '', latitude: '', longitude: '',
    architecturalStyle: '', historicalBackground: '', massSchedules: '', assignedPriest: '', classification: 'unknown'
  });
  const [errors, setErrors] = useState<{ address?: string; latitude?: string; longitude?: string; assignedPriest?: string }>({});

  // Reset errors when opening/closing the edit dialog or switching item
  useEffect(() => {
    if (editOpen) {
      setErrors({});
    }
  }, [editOpen, editing?.id]);

  const toClassification = (v: string): NonNullable<Church['classification']> =>
    (v === 'ICP' || v === 'NCT' || v === 'non-heritage' || v === 'unknown') ? v : 'unknown';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'needs_revision': return 'bg-destructive/10 text-destructive';
      case 'heritage_review': return 'bg-accent/20 text-accent-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatUpdatedAt = (value?: Timestamp | string | number | Date): string => {
    if (!value) return '—';
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
      return (value as Timestamp).toDate().toLocaleDateString();
    }
    const d = new Date(value as string | number | Date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'needs_revision': return <AlertCircle className="w-4 h-4" />;
      case 'heritage_review': return <Clock className="w-4 h-4" />;
      default: return <Edit className="w-4 h-4" />;
    }
  };

  const approvedCount = (churches ?? []).filter(c => c.status === 'approved').length;
  const pendingCount = (churches ?? []).filter(c => c.status === 'pending' || c.status === 'heritage_review').length;
  const needsRevisionCount = (churches ?? []).filter(c => c.status === 'needs_revision').length;

  const submitMutation = useMutation({
    mutationFn: async (id: string) => submitChurchForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["churches", "parish", parishId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChurchUpdate }) => updateChurch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["churches", "parish", parishId] });
      setEditOpen(false);
      setEditing(null);
    }
  });

  // Field-level validators
  const validateLatitude = (value: string): string | undefined => {
    if (!value) return undefined; // optional unless longitude is present
    const num = Number(value);
    if (Number.isNaN(num)) return 'Latitude must be a number';
    if (num < -90 || num > 90) return 'Latitude must be between -90 and 90';
    return undefined;
  };
  const validateLongitude = (value: string): string | undefined => {
    if (!value) return undefined; // optional unless latitude is present
    const num = Number(value);
    if (Number.isNaN(num)) return 'Longitude must be a number';
    if (num < -180 || num > 180) return 'Longitude must be between -180 and 180';
    return undefined;
  };
  const validateAddress = (value: string): string | undefined => {
    if (!value) return undefined; // optional
    if (value.length < 3) return 'Address is too short';
    if (value.length > 200) return 'Address is too long (max 200 chars)';
    return undefined;
  };
  const validatePriest = (value: string): string | undefined => {
    if (!value) return undefined; // optional
    const trimmed = value.trim();
    if (trimmed.length < 2) return 'Name is too short';
    if (trimmed.length > 100) return 'Name is too long (max 100 chars)';
    // Allow letters, spaces, dots, apostrophes, and hyphens
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ .'-]+$/.test(trimmed)) return 'Only letters, spaces, period, apostrophe, and hyphen allowed';
    return undefined;
  };

  const runAllValidation = () => {
    const latErr = validateLatitude(editForm.latitude);
    const lngErr = validateLongitude(editForm.longitude);
    const addrErr = validateAddress(editForm.address);
    const priestErr = validatePriest(editForm.assignedPriest);
    const pairErrLat = !latErr && !lngErr && ((!!editForm.latitude && !editForm.longitude) ? 'Longitude is required when latitude is provided' : undefined);
    const pairErrLng = !latErr && !lngErr && ((!editForm.latitude && !!editForm.longitude) ? 'Latitude is required when longitude is provided' : undefined);
    const finalErrors = {
      latitude: latErr || pairErrLat,
      longitude: lngErr || pairErrLng,
      address: addrErr,
      assignedPriest: priestErr,
    };
    setErrors(finalErrors);
    // Return whether form is valid
    return Object.values(finalErrors).every((v) => !v);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Parish Header */}
        <div className="heritage-card-accent p-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                <ChurchIcon className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary mb-1">
                  {userProfile?.parish || 'Parish Name'} - Secretary Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage church profiles and announcements for your parish
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {userProfile?.name}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Diocese of {userProfile?.diocese}
                  </Badge>
                </div>
              </div>
            </div>
            {!hasChurch && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-heritage">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Church
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Church</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Church Name</Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="municipality">Municipality</Label>
                      <Input id="municipality" value={form.municipality} onChange={(e) => setForm(f => ({...f, municipality: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="founded">Founded Year</Label>
                      <Input id="founded" type="number" value={form.foundedYear} onChange={(e) => setForm(f => ({...f, foundedYear: e.target.value}))} />
                    </div>
                    <Button
                      className="btn-heritage w-full"
                      disabled={createMutation.isPending || !form.name}
                      onClick={async () => {
                        if (hasChurch) return; // guard
                        await createMutation.mutateAsync({
                          name: form.name.trim(),
                          municipality: form.municipality.trim() || undefined,
                          foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
                        });
                        setOpen(false);
                        setForm({ name: '', municipality: '', foundedYear: '' });
                      }}
                    >
                      {createMutation.isPending ? 'Saving…' : 'Save Church'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

  {/* Quick Stats */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Total Churches</p>
      <p className="stats-value">{(churches ?? []).length}</p>
                </div>
                <ChurchIcon className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Approved</p>
      <p className="stats-value text-success">{approvedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stats-label">Pending Review</p>
      <p className="stats-value text-warning">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
      <p className="stats-label">Needs Revision</p>
      <p className="stats-value text-muted-foreground">{needsRevisionCount}</p>
                </div>
                <Edit className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Church Entries */}
          <div className="xl:col-span-2" id="churches">
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  {hasChurch ? 'Church Profile' : 'Church Profile Setup'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasChurch ? (churches ?? []).slice(0, 1).map((church) => (
                  <div key={church.id} className="border rounded-lg p-4 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">{church.name}</h3>
                        <Badge className={`text-xs ${getStatusColor(church.status)}`}>
                          {getStatusIcon(church.status)}
                          <span className="ml-1 capitalize">{church.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditing(church);
                          setEditForm({
                            name: church.name || '',
                            municipality: church.municipality || '',
                            foundedYear: church.foundedYear?.toString() || '',
                            address: church.address || '',
                            latitude: church.latitude !== undefined ? String(church.latitude) : '',
                            longitude: church.longitude !== undefined ? String(church.longitude) : '',
                            architecturalStyle: church.architecturalStyle || '',
                            historicalBackground: church.historicalBackground || '',
                            massSchedules: church.massSchedules || '',
                            assignedPriest: church.assignedPriest || '',
                            classification: church.classification || 'unknown',
                          });
                          setEditOpen(true);
                        }}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {church.status === 'needs_revision' && (
                          <Button size="sm" onClick={() => submitMutation.mutate(church.id!)}>
                            <Upload className="w-4 h-4 mr-1" />
                            Resubmit for Review
                          </Button>
                        )}
                        {church.status === 'pending' && (
                          <Button size="sm" variant="secondary" disabled>
                            <Clock className="w-4 h-4 mr-1" /> In Review
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Completeness</span>
                        <span className="font-medium">{computeCompleteness(church)}%</span>
                      </div>
                      <Progress value={computeCompleteness(church)} className="h-2" />
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Last updated: {formatUpdatedAt(church.updatedAt as unknown as Timestamp | string | number | Date)}</span>
                        <span>{/* images count placeholder */}images: —</span>
                      </div>
                      
                      {/* feedback placeholder: add when feedback feature is implemented */}
                    </div>
                  </div>
                )) : (
                  <div className="border rounded-lg p-6 text-center text-muted-foreground">
                    <p className="mb-4">No church profile yet. Create your parish church profile to get started.</p>
                    <Button className="btn-heritage" onClick={() => setOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Create Church Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6" id="announcements">
            {/* Recent Announcements */}
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="p-3 rounded-lg bg-secondary/30">
                    <p className="font-medium text-sm">{announcement.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{announcement.date}</span>
                      <Badge 
                        variant={announcement.status === 'published' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {announcement.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Announcement
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="heritage-card" id="feedback">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  View Guidelines
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="w-4 h-4 mr-2" />
                  Upload Images
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Review History
                </Button>
              </CardContent>
       </Card>
          </div>
        </div>
      </div>
     {/* Invisible anchor for settings section future-proofing */}
     <div id="settings" className="h-0 w-0 overflow-hidden" />
      {/* Edit Church Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Church</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label>Municipality</Label>
            <Input value={editForm.municipality} onChange={e => setEditForm(f => ({...f, municipality: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label>Founded Year</Label>
            <Input type="number" value={editForm.foundedYear} onChange={e => setEditForm(f => ({...f, foundedYear: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={editForm.address} onChange={e => {
              const v = e.target.value;
              setEditForm(f => ({...f, address: v}));
              setErrors(err => ({...err, address: validateAddress(v)}));
            }} />
            {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
          </div>
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input type="number" step="any" value={editForm.latitude} onChange={e => {
              const v = e.target.value;
              setEditForm(f => ({...f, latitude: v}));
              const latErr = validateLatitude(v);
              // Pair error when one present without the other
              const pairErr = (!latErr && !!v && !editForm.longitude) ? 'Longitude is required when latitude is provided' : undefined;
              setErrors(err => ({...err, latitude: latErr || pairErr, longitude: err.longitude && !editForm.longitude ? err.longitude : err.longitude }));
            }} />
            <p className="text-xs text-muted-foreground">Valid range -90 to 90</p>
            {errors.latitude && <p className="text-xs text-destructive mt-1">{errors.latitude}</p>}
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input type="number" step="any" value={editForm.longitude} onChange={e => {
              const v = e.target.value;
              setEditForm(f => ({...f, longitude: v}));
              const lngErr = validateLongitude(v);
              const pairErr = (!lngErr && !!v && !editForm.latitude) ? 'Latitude is required when longitude is provided' : undefined;
              setErrors(err => ({...err, longitude: lngErr || pairErr, latitude: err.latitude && !editForm.latitude ? err.latitude : err.latitude }));
            }} />
            <p className="text-xs text-muted-foreground">Valid range -180 to 180</p>
            {errors.longitude && <p className="text-xs text-destructive mt-1">{errors.longitude}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Architectural Style</Label>
            <Input value={editForm.architecturalStyle} onChange={e => setEditForm(f => ({...f, architecturalStyle: e.target.value}))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Historical Background</Label>
            <Input value={editForm.historicalBackground} onChange={e => setEditForm(f => ({...f, historicalBackground: e.target.value}))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Mass Schedules</Label>
            <Input value={editForm.massSchedules} onChange={e => setEditForm(f => ({...f, massSchedules: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label>Assigned Priest</Label>
            <Input value={editForm.assignedPriest} onChange={e => {
              const v = e.target.value;
              setEditForm(f => ({...f, assignedPriest: v}));
              setErrors(err => ({...err, assignedPriest: validatePriest(v)}));
            }} />
            {errors.assignedPriest && <p className="text-xs text-destructive mt-1">{errors.assignedPriest}</p>}
          </div>
          <div className="space-y-2">
            <Label>Classification</Label>
            <Select value={editForm.classification} onValueChange={(v) => setEditForm(f => ({...f, classification: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="non-heritage">Non-heritage</SelectItem>
                <SelectItem value="ICP">ICP</SelectItem>
                <SelectItem value="NCT">NCT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => {
              if (!editing) return;
              if (!runAllValidation()) return;
              submitMutation.mutate(editing.id!);
            }} disabled={!editing || submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting…' : 'Submit for Review'}
            </Button>
            <Button className="btn-heritage" disabled={!editing || updateMutation.isPending} onClick={() => {
              if (!editing) return;
              // Run validation and block save if invalid
              if (!runAllValidation()) return;
              updateMutation.mutate({ id: editing.id!, data: {
                name: editForm.name || undefined,
                municipality: editForm.municipality || undefined,
                foundedYear: editForm.foundedYear ? Number(editForm.foundedYear) : undefined,
                address: editForm.address || undefined,
                latitude: editForm.latitude ? Number(editForm.latitude) : undefined,
                longitude: editForm.longitude ? Number(editForm.longitude) : undefined,
                architecturalStyle: editForm.architecturalStyle || undefined,
                historicalBackground: editForm.historicalBackground || undefined,
                massSchedules: editForm.massSchedules || undefined,
                assignedPriest: editForm.assignedPriest || undefined,
                classification: toClassification(editForm.classification),
              }});
            }}>
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ParishDashboard;
