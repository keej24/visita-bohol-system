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
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth, type Diocese } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  UserPlus,
  Key,
  UserX,
  UserCheck
} from 'lucide-react';

interface UserAccount {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'chancery_office' | 'parish_secretary' | 'museum_researcher';
  diocese: Diocese;
  parish?: string;
  status: 'active' | 'inactive' | 'pending';
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [submitting, setSubmitting] = useState(false);

  // New user form state (Parish Secretary only)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    parish: ''
  });

  // Load users and parishes
  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.diocese) return;

      try {
        setLoading(true);

        // Load parish secretary users from the diocese only
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
          // Only include parish secretary accounts
          if (data.role === 'parish_secretary') {
            userData.push({
              id: doc.id,
              uid: data.uid || doc.id,
              name: data.name || 'Unknown User',
              email: data.email || '',
              role: data.role,
              diocese: data.diocese,
              parish: data.parish,
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

    loadData();
  }, [diocese, userProfile, toast]);

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.parish) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

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
        parish: newUser.parish,
        status: 'active',
        createdAt: new Date(),
        createdBy: userProfile?.uid || 'system'
      };

      await addDoc(collection(db, 'users'), userData);

      // Send password reset email so user can set their own password
      await sendPasswordResetEmail(auth, newUser.email);

      toast({
        title: "Success",
        description: "User account created. Password reset email sent to user.",
      });

      // Reset form and close modal
      setNewUser({ name: '', email: '', parish: '' });
      setIsCreateModalOpen(false);

      // Reload users
      window.location.reload();

    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user account';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);

      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        name: selectedUser.name,
        parish: selectedUser.parish,
        status: selectedUser.status,
        updatedAt: new Date()
      });

      toast({
        title: "Success",
        description: "User account updated successfully",
      });

      setIsEditModalOpen(false);
      setSelectedUser(null);

      // Reload users
      window.location.reload();

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user account",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: UserAccount) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} the account for ${user.name}?`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: userProfile?.uid || 'system'
      });

      toast({
        title: "Success",
        description: `User account ${action}d successfully`,
      });

      // Reload users
      window.location.reload();

    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} user account`,
        variant: "destructive"
      });
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Success",
        description: "Password reset email sent",
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive"
      });
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
                Manage parish accounts and assignments
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Parish Account
            </Button>
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
                <span className="font-semibold text-red-900">Inactive</span>
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
            <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
                            <span className="ml-1">{user.status}</span>
                          </Badge>
                          <Badge className={`${getRoleColor(user.role)} text-xs`}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          {user.parish && (
                            <div className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {parishes.find(p => p.id === user.parish)?.name || user.parish}
                            </div>
                          )}
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
                          onClick={() => handleSendPasswordReset(user.email)}
                          title="Send Password Reset"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                          className={user.status === 'active' ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                          title={user.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Parish Account</DialogTitle>
            <DialogDescription>
              Create a new parish account for the {diocese} diocese. A password reset email will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="parish">Assign Parish</Label>
              <Select value={newUser.parish} onValueChange={(value) => setNewUser(prev => ({ ...prev, parish: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a parish" />
                </SelectTrigger>
                <SelectContent>
                  {parishes.map((parish) => (
                    <SelectItem key={parish.id} value={parish.id}>
                      {parish.name} - {parish.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Edit Parish Secretary Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Parish Account</DialogTitle>
            <DialogDescription>
              Update parish account information and settings.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Full Name</Label>
                <Input
                  id="editName"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email Address</Label>
                <Input
                  id="editEmail"
                  value={selectedUser.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="editParish">Assign Parish</Label>
                <Select value={selectedUser.parish || ''} onValueChange={(value) => setSelectedUser(prev => prev ? ({ ...prev, parish: value }) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parish" />
                  </SelectTrigger>
                  <SelectContent>
                    {parishes.map((parish) => (
                      <SelectItem key={parish.id} value={parish.id}>
                        {parish.name} - {parish.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select value={selectedUser.status} onValueChange={(value: string) => setSelectedUser(prev => prev ? ({ ...prev, status: value }) : null)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Parish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};