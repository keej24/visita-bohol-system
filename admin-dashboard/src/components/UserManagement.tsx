import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth, type Diocese } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { generateParishId, formatParishFullName, getMunicipalitiesByDiocese } from '@/lib/parish-utils';
import { CreateParishAccountModal } from '@/components/CreateParishAccountModal';
import { AuditService } from '@/services/auditService';
import {
  Users,
  Plus,
  Mail,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  UserPlus,
  Key,
  UserX,
  UserCheck,
  RefreshCw,
  Info,
  Pencil
} from 'lucide-react';

interface UserAccount {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'chancery_office' | 'parish_secretary' | 'museum_researcher';
  diocese: Diocese;
  parish?: string;
  parishId?: string;
  municipality?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending' | 'deleted';
  createdAt: Date;
  lastLogin?: Date;
  createdBy: string;
}

interface Parish {
  id: string;
  name: string;
  location: string;
  assignedSecretary?: string;
}

interface UserManagementProps {
  diocese: Diocese;
}

export const UserManagement: React.FC<UserManagementProps> = ({ diocese }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAccountViewOpen, setIsAccountViewOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<UserAccount | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    municipality: ''
  });

  // New user form state (Parish Secretary only)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    municipality: '' // NEW: Required to create unique parish ID
  });

  // Load users and parishes
  const loadData = async () => {
    if (!userProfile?.diocese) return;

    try {
      setLoading(true);

      // Load parish secretary users from the diocese only
      // Exclude users with 'deleted' status (users removed from Firebase Auth)
      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('diocese', '==', diocese),
        where('role', '==', 'parish_secretary'),
        orderBy('createdAt', 'desc')
      );

      const usersSnapshot = await getDocs(usersQuery);
      const userData: UserAccount[] = [];

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include parish secretary accounts that are NOT deleted
        // This filters out users that were removed from Firebase Authentication
        if (data.role === 'parish_secretary' && data.status !== 'deleted') {
          userData.push({
            id: doc.id,
            uid: data.uid || doc.id,
            name: data.name || 'Unknown User',
            email: data.email || '',
            role: data.role,
            diocese: data.diocese,
            parish: data.parish,
            parishId: data.parishId,
            municipality: data.parishInfo?.municipality || data.municipality || '',
            address: data.address || '',
            status: data.status || 'active',
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLogin: data.lastLogin?.toDate(),
            createdBy: data.createdBy || 'system'
          });
        }
      });

      setUsers(userData);

      // Load parishes (simplified - could come from churches collection)
      const churchesRef = collection(db, 'churches');
      const churchesQuery = query(
        churchesRef,
        where('diocese', '==', diocese)
      );

      const churchesSnapshot = await getDocs(churchesQuery);
      const parishData: Parish[] = [];

      churchesSnapshot.forEach((doc) => {
        const data = doc.data();
        parishData.push({
          id: doc.id,
          name: data.name || data.fullName || 'Unknown Parish',
          location: data.municipality || data.location || 'Unknown Location',
          assignedSecretary: data.assignedSecretary
        });
      });

      setParishes(parishData);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diocese, userProfile]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "User list has been updated",
    });
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.municipality) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields (Parish Name, Municipality, and Email)",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast({
        title: "Validation Error",
        description: "Invalid email format",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      // Generate unique parish ID using diocese + municipality + parish name
      const parishId = generateParishId(diocese, newUser.municipality, newUser.name);
      const parishFullName = formatParishFullName(newUser.name, newUser.municipality);

      // Check if account already exists for this specific parish
      const existingAccountQuery = query(
        collection(db, 'users'),
        where('parishId', '==', parishId),
        where('role', '==', 'parish_secretary'),
        where('status', '==', 'active')
      );

      const existingAccounts = await getDocs(existingAccountQuery);

      if (!existingAccounts.empty) {
        toast({
          title: "Account Already Exists",
          description: `An active parish account already exists for ${parishFullName}. Only one account per parish is allowed.`,
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      // Create temporary password (user will need to reset)
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, tempPassword);
      const user = userCredential.user;

      // Create user document in Firestore (Parish Secretary only)
      const userData = {
        uid: user.uid,
        name: newUser.name,
        email: newUser.email,
        role: 'parish_secretary',
        diocese: diocese,
        
        // NEW: Use unique parish identifier
        parishId: parishId,
        
        // NEW: Store structured parish information
        parishInfo: {
          name: newUser.name,
          municipality: newUser.municipality,
          fullName: parishFullName
        },
        
        // DEPRECATED: Keep for backward compatibility during migration
        parish: parishId,
        
        status: 'active',
        createdAt: new Date(),
        createdBy: userProfile?.uid || 'system'
      };

      const userDocRef = await addDoc(collection(db, 'users'), userData);

      // Log the user creation for audit trail
      if (userProfile) {
        await AuditService.logAction(
          userProfile,
          'user.create',
          'user',
          userDocRef.id,
          {
            resourceName: parishFullName,
            metadata: {
              userEmail: newUser.email,
              userRole: 'parish_secretary',
              parishId: parishId,
              municipality: newUser.municipality,
            },
          }
        );
      }

      // Send password reset email so user can set their own password
      await sendPasswordResetEmail(auth, newUser.email);

      toast({
        title: "Success",
        description: `Parish account created for ${parishFullName}. Password reset email sent.`,
      });

      // Reset form and close modal
      setNewUser({ name: '', email: '', municipality: '' });
      setIsCreateModalOpen(false);

      // Reload users
      window.location.reload();

    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user account';

      // Translate Firebase errors to user-friendly messages
      let displayMessage = errorMessage;

      if (errorMessage.includes('auth/email-already-in-use')) {
        displayMessage = 'Email address already in use. Please use a different email.';
      } else if (errorMessage.includes('auth/invalid-email')) {
        displayMessage = 'Invalid email format';
      } else if (errorMessage.includes('auth/weak-password')) {
        displayMessage = 'Password is too weak. Please use a stronger password.';
      } else if (errorMessage.includes('auth/operation-not-allowed')) {
        displayMessage = 'Account creation is currently disabled. Contact support.';
      } else if (errorMessage.includes('auth/network-request-failed')) {
        displayMessage = 'Network error. Please check your connection and try again.';
      } else {
        displayMessage = 'Failed to create user account';
      }

      toast({
        title: "Error",
        description: displayMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async () => {
    if (!userToToggle || !userProfile) return;

    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    const auditAction = newStatus === 'active' ? 'user.reactivate' : 'user.deactivate';

    try {
      setSubmitting(true);

      const userRef = doc(db, 'users', userToToggle.id);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: userProfile?.uid || 'system'
      });

      // Log the action for audit trail
      await AuditService.logAction(
        userProfile,
        auditAction as 'user.reactivate' | 'user.deactivate',
        'user',
        userToToggle.id,
        {
          resourceName: userToToggle.name,
          changes: [{ field: 'status', oldValue: userToToggle.status, newValue: newStatus }],
          metadata: {
            userEmail: userToToggle.email,
            userRole: userToToggle.role,
          },
        }
      );

      toast({
        title: "Success",
        description: `User account ${action}d successfully`,
      });

      setIsStatusDialogOpen(false);
      setUserToToggle(null);

      // Reload users
      window.location.reload();

    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} user account`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle opening the edit modal
  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      municipality: user.municipality || ''
    });
    setIsAccountViewOpen(false);
    setIsEditModalOpen(true);
  };

  // Handle updating user account details
  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // Validate required fields
    if (!editFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Parish name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      const userRef = doc(db, 'users', editingUser.id);
      
      // Prepare update data
      const updateData: Record<string, unknown> = {
        name: editFormData.name.trim(),
        updatedAt: new Date(),
        updatedBy: userProfile?.uid || 'system'
      };

      // If municipality changed, update parishInfo and regenerate parishId
      if (editFormData.municipality && editFormData.municipality !== editingUser.municipality) {
        const newParishId = generateParishId(diocese, editFormData.municipality, editFormData.name);
        const newFullName = formatParishFullName(editFormData.name, editFormData.municipality);
        
        updateData.parishId = newParishId;
        updateData.parish = newParishId; // Keep backward compatibility
        updateData.parishInfo = {
          name: editFormData.name.trim(),
          municipality: editFormData.municipality,
          fullName: newFullName
        };
      } else if (editFormData.name !== editingUser.name) {
        // Name changed but not municipality - update parishInfo.name and parishInfo.fullName
        const municipality = editFormData.municipality || editingUser.municipality || '';
        if (municipality) {
          const newParishId = generateParishId(diocese, municipality, editFormData.name);
          const newFullName = formatParishFullName(editFormData.name, municipality);
          
          updateData.parishId = newParishId;
          updateData.parish = newParishId;
          updateData.parishInfo = {
            name: editFormData.name.trim(),
            municipality: municipality,
            fullName: newFullName
          };
        }
      }

      await updateDoc(userRef, updateData);

      toast({
        title: "Success",
        description: "Parish account updated successfully",
      });

      setIsEditModalOpen(false);
      setEditingUser(null);
      
      // Reload users to reflect changes
      await loadData();

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update parish account",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <AlertTriangle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Deactivated';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'chancery_office': return 'bg-blue-100 text-blue-800';
      case 'parish_secretary': return 'bg-green-100 text-green-800';
      case 'museum_researcher': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Parish Account Management - {diocese.charAt(0).toUpperCase() + diocese.slice(1)} Diocese
              </CardTitle>
              <CardDescription>
                View and manage existing parish secretary accounts
              </CardDescription>
            </div>
            <CreateParishAccountModal 
              diocese={diocese}
              trigger={
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Parish Account
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Total Parishes</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Active</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">Deactivated</span>
              </div>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.inactive}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive' | 'pending')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="default"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh user list - Click after deleting accounts from Firebase Console"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>No users found matching your criteria.</AlertDescription>
              </Alert>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{user.name}</h3>
                          <Badge className={`${getStatusColor(user.status)} text-xs`}>
                            {getStatusIcon(user.status)}
                            <span className="ml-1">{getStatusDisplayText(user.status)}</span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created: {user.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsAccountViewOpen(true);
                          }}
                          title="View Account Details"
                        >
                          <Info className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Parish Secretary Modal */}
      {/* 
        DEPRECATED: Create Parish Account Modal
        This modal is disabled because it has issues with session disruption and document ID generation.
        Use CreateParishAccountModal component instead (available in dashboard header).
        
        Issues with this implementation:
        1. Uses createUserWithEmailAndPassword on main auth (logs out current user)
        2. Uses addDoc() which creates random IDs instead of using UID
        3. Violates Firestore security rules (expects doc ID = UID)
        
        Kept here for reference only - DO NOT RE-ENABLE without fixing these issues.
      */}
      {/* Modal disabled - see comment above */}
      {process.env.NODE_ENV === 'never' && (
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Parish Account</DialogTitle>
            <DialogDescription>
              Create a parish account for the {diocese} diocese. The account will be assigned to manage a specific parish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Each parish can have only ONE parish account. 
                If a parish already has an account, you cannot create another one.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="name">Parish Name *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., San Isidro Labrador Parish"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the full parish name (e.g., "San Isidro Labrador Parish", "Santo Niño Parish")
              </p>
            </div>
            
            <div>
              <Label htmlFor="municipality">Municipality *</Label>
              <Select
                value={newUser.municipality}
                onValueChange={(value) => setNewUser(prev => ({ ...prev, municipality: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select municipality" />
                </SelectTrigger>
                <SelectContent>
                  {getMunicipalitiesByDiocese(diocese).map((municipality) => (
                    <SelectItem key={municipality} value={municipality}>
                      {municipality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This ensures parishes with the same name in different locations are kept separate
              </p>
            </div>
            
            {newUser.name && newUser.municipality && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Account will be created for:</strong><br />
                  {formatParishFullName(newUser.name, newUser.municipality)}
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="email">Parish Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g., stjoseph@parish.ph"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Parish Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Account View Dialog */}
      <Dialog open={isAccountViewOpen} onOpenChange={setIsAccountViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Account Details
            </DialogTitle>
            <DialogDescription>
              View and manage parish secretary account
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Account Information Card */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Parish Name</p>
                    <p className="text-base font-semibold text-gray-900">{selectedUser.name}</p>
                  </div>
                  
                  <div className="col-span-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Email Address</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{selectedUser.email}</p>
                  </div>

                  {selectedUser.municipality && (
                    <div className="col-span-3">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Municipality</p>
                      <p className="text-sm text-gray-900">{selectedUser.municipality}</p>
                    </div>
                  )}

                  {selectedUser.address && (
                    <div className="col-span-3">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Address</p>
                      <p className="text-sm text-gray-900">{selectedUser.address}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Status</p>
                    <Badge className={selectedUser.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {selectedUser.status}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Diocese</p>
                    <p className="text-sm text-gray-900 capitalize">{selectedUser.diocese}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Role</p>
                    <p className="text-sm text-gray-900">Parish Secretary</p>
                  </div>
                  
                  <div className="col-span-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Created</p>
                    <p className="text-sm text-gray-700">
                      {selectedUser.createdAt.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-row gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant={selectedUser?.status === 'active' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => {
                  setUserToToggle(selectedUser);
                  setIsAccountViewOpen(false);
                  setIsStatusDialogOpen(true);
                }}
              >
                {selectedUser?.status === 'active' ? (
                  <>
                    <UserX className="w-4 h-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedUser && handleOpenEditModal(selectedUser)}
                title="Edit parish name and municipality"
                className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100 transition-colors"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAccountViewOpen(false);
                setSelectedUser(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {userToToggle?.status === 'active' ? (
                <>
                  <UserX className="w-5 h-5 text-red-600" />
                  Deactivate Account
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5 text-green-600" />
                  Activate Account
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {userToToggle?.status === 'active' 
                ? 'This will prevent the user from accessing their account.'
                : 'This will restore the user\'s access to their account.'}
            </DialogDescription>
          </DialogHeader>
          {userToToggle && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Are you sure you want to {userToToggle.status === 'active' ? 'deactivate' : 'activate'} this account?
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-semibold">Parish Name:</span>
                  <span className="text-sm ml-2">{userToToggle.name}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold">Email:</span>
                  <span className="text-sm ml-2">{userToToggle.email}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold">Current Status:</span>
                  <Badge className={`ml-2 ${userToToggle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {userToToggle.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsStatusDialogOpen(false);
                setUserToToggle(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              variant={userToToggle?.status === 'active' ? 'destructive' : 'default'}
              onClick={handleToggleUserStatus} 
              disabled={submitting}
            >
              {submitting 
                ? (userToToggle?.status === 'active' ? 'Deactivating...' : 'Activating...') 
                : (userToToggle?.status === 'active' ? 'Deactivate Account' : 'Activate Account')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Parish Account Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Edit Parish Account
            </DialogTitle>
            <DialogDescription>
              Update the parish account details. Email address cannot be changed.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Parish Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., San Isidro Labrador Parish"
                />
              </div>

              <div>
                <Label htmlFor="edit-municipality">Municipality</Label>
                <Select
                  value={editFormData.municipality}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, municipality: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select municipality" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMunicipalitiesByDiocese(diocese).map((municipality) => (
                      <SelectItem key={municipality} value={municipality}>
                        {municipality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Email Address (cannot be changed)</p>
                <p className="text-sm font-mono text-gray-600">{editingUser.email}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};