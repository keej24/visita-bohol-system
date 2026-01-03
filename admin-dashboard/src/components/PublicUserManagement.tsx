import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  Loader2,
  MapPin,
  Clock,
  Info,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PublicUser {
  id: string;
  displayName: string;
  email: string;
  nationality?: string;
  phoneNumber?: string;
  location?: string;
  parish?: string;
  accountType: string;
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: any;
  createdAt: any;
  lastLoginAt?: any;
}

interface PublicUserManagementProps {
  churchId?: string;
}

export const PublicUserManagement: React.FC<PublicUserManagementProps> = ({ churchId }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Selected user for details/actions
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [isAccountViewOpen, setIsAccountViewOpen] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reactivate confirmation dialog state
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [userToReactivate, setUserToReactivate] = useState<{ id: string; name: string } | null>(null);

  // Fetch users from Firestore
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching public users from Firestore...');
      console.log('📊 Database instance:', db ? 'Connected' : 'Not connected');

      const usersRef = collection(db, 'users');
      console.log('📁 Users collection reference:', usersRef.path);

      // First, try to get all users to see what we have
      console.log('📥 Attempting to fetch all users...');
      const allUsersSnapshot = await getDocs(usersRef);
      console.log(`✅ Total users in database: ${allUsersSnapshot.size}`);

      // Try with accountType filter and order by registration date (newest first)
      console.log('🔎 Filtering for accountType="public" and ordering by createdAt desc...');
      const publicUsersQuery = query(
        usersRef,
        where('accountType', '==', 'public'),
        orderBy('createdAt', 'desc')
      );
      const publicSnapshot = await getDocs(publicUsersQuery);
      console.log(`📊 Public users found: ${publicSnapshot.size}`);

      // If no public users, try without accountType filter to see all users
      let snapshot = publicSnapshot;
      if (publicSnapshot.empty) {
        console.log('⚠️ No users with accountType="public", fetching all users...');
        snapshot = allUsersSnapshot;
      }

      const fetchedUsers: PublicUser[] = [];

      console.log('🔄 Processing user documents...');
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('👤 User document:', {
          id: doc.id,
          displayName: data.displayName || data.name,
          email: data.email,
          role: data.role,
          accountType: data.accountType
        });

        // Only include users that are NOT admin users (no role field or accountType is public)
        const isAdminUser = data.role && ['chancery_office', 'parish_secretary', 'museum_researcher'].includes(data.role);

        if (!isAdminUser) {
          console.log('✅ Including user:', doc.id);
          fetchedUsers.push({
            id: doc.id,
            displayName: data.displayName || data.name || 'Unknown User',
            email: data.email || '',
            nationality: data.nationality || undefined,
            phoneNumber: data.phoneNumber || undefined,
            location: data.location || undefined,
            parish: data.parish || 'Not specified',
            accountType: data.accountType || 'public',
            isActive: data.isActive !== undefined ? data.isActive : true,
            isBlocked: data.isBlocked || false,
            blockReason: data.blockReason || undefined,
            blockedAt: data.blockedAt || undefined,
            createdAt: data.createdAt || null,
            lastLoginAt: data.lastLoginAt || undefined,
          });
        } else {
          console.log('⏭️ Skipping admin user:', doc.id);
        }
      });

      console.log(`✨ Filtered public users: ${fetchedUsers.length}`);
      console.log('📋 User list:', fetchedUsers.map(u => ({ id: u.id, name: u.displayName, email: u.email })));

      setUsers(fetchedUsers);

      if (fetchedUsers.length === 0) {
        console.warn('⚠️ No public users found in the database');
      }
    } catch (err: any) {
      console.error('❌ Error fetching public users:', err);
      console.error('❌ Error code:', err?.code);
      console.error('❌ Error message:', err?.message);
      console.error('❌ Error stack:', err?.stack);

      let errorMessage = 'Failed to load public users. Please try again.';

      if (err?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please ensure you are logged in as a Chancery Office user.';
      } else if (err?.code === 'unavailable') {
        errorMessage = 'Firebase is unavailable. Please check your internet connection.';
      } else if (err?.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  // Handle deactivate user
  const handleDeactivateUser = async () => {
    if (!selectedUser || !currentUser || !deactivateReason.trim()) return;

    if (deactivateReason.trim().length < 10) {
      alert('Deactivation reason must be at least 10 characters.');
      return;
    }

    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', selectedUser.id);

      await updateDoc(userRef, {
        isBlocked: true,
        blockReason: deactivateReason.trim(),
        blockedAt: Timestamp.now(),
        blockedBy: currentUser.uid,
        lastUpdatedAt: Timestamp.now(),
      });

      setShowDeactivateModal(false);
      setDeactivateReason('');
      setSelectedUser(null);
      setIsAccountViewOpen(false);
      fetchUsers();
    } catch (err) {
      alert('Failed to deactivate user. Please try again.');
      console.error('Error deactivating user:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reactivate user - opens confirmation dialog
  const handleReactivateClick = (userId: string, userName: string) => {
    setUserToReactivate({ id: userId, name: userName });
    setReactivateDialogOpen(true);
  };

  // Confirm reactivate user - executes the action
  const handleConfirmReactivate = async () => {
    if (!userToReactivate) return;

    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userToReactivate.id);

      await updateDoc(userRef, {
        isBlocked: false,
        blockReason: null,
        blockedAt: null,
        blockedBy: null,
        lastUpdatedAt: Timestamp.now(),
      });

      fetchUsers();
    } catch (err) {
      alert('Failed to reactivate user. Please try again.');
      console.error('Error reactivating user:', err);
    } finally {
      setActionLoading(false);
      setReactivateDialogOpen(false);
      setUserToReactivate(null);
    }
  };

  // Filter users based on search and status
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !user.isBlocked && user.isActive) ||
      (statusFilter === 'deactivated' && user.isBlocked);

    return matchesSearch && matchesStatus;
  });

  const activeUsers = users.filter(u => !u.isBlocked && u.isActive).length;
  const deactivatedUsers = users.filter(u => u.isBlocked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Public User Management
              </h2>
              <p className="text-gray-600 mt-1 text-sm">Manage mobile app users</p>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">{users.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Active</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-1">{activeUsers}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">Deactivated</span>
              </div>
              <p className="text-2xl font-bold text-red-900 mt-1">{deactivatedUsers}</p>
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
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'deactivated')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="default"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh user list"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-gray-600">Loading users...</p>
                </div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={fetchUsers}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : filteredUsers.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {searchTerm || statusFilter !== 'all'
                    ? 'No users found matching your criteria. Try adjusting your filters.'
                    : 'No public users have registered yet.'}
                </AlertDescription>
              </Alert>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {user.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-semibold">{user.displayName}</h3>
                          <Badge className={user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {user.isBlocked ? (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Deactivated
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            )}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {user.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Joined: {user.createdAt?.toDate?.()
                              ? new Date(user.createdAt.toDate()).toLocaleDateString()
                              : 'Unknown'}
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

      {/* Account View Dialog */}
      <Dialog open={isAccountViewOpen} onOpenChange={setIsAccountViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Account Details
            </DialogTitle>
            <DialogDescription>
              View and manage public user account
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Account Information Card */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Display Name</p>
                    <p className="text-base font-semibold text-gray-900">{selectedUser.displayName}</p>
                  </div>
                  
                  <div className="col-span-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Email Address</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{selectedUser.email}</p>
                  </div>

                  {selectedUser.phoneNumber && (
                    <div className="col-span-3">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Phone Number</p>
                      <p className="text-sm text-gray-900">{selectedUser.phoneNumber}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Status</p>
                    <Badge className={selectedUser.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.isBlocked ? 'Deactivated' : 'Active'}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Nationality</p>
                    <p className="text-sm text-gray-900">{selectedUser.nationality || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Location</p>
                    <p className="text-sm text-gray-900">{selectedUser.location || 'Not specified'}</p>
                  </div>
                  
                  <div className="col-span-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Joined</p>
                    <p className="text-sm text-gray-700">
                      {selectedUser.createdAt?.toDate?.()
                        ? new Date(selectedUser.createdAt.toDate()).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Unknown'}
                    </p>
                  </div>

                  {selectedUser.lastLoginAt && (
                    <div className="col-span-3">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Last Login</p>
                      <p className="text-sm text-gray-700">
                        {selectedUser.lastLoginAt?.toDate?.()
                          ? new Date(selectedUser.lastLoginAt.toDate()).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Deactivation Info if deactivated */}
              {selectedUser.isBlocked && (
                <Alert className="bg-red-50 border-red-200">
                  <Ban className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <p className="font-semibold mb-1">Account Deactivated</p>
                    <p className="text-sm"><strong>Reason:</strong> {selectedUser.blockReason || 'No reason provided'}</p>
                    <p className="text-sm">
                      <strong>Deactivated At:</strong>{' '}
                      {selectedUser.blockedAt?.toDate?.()
                        ? new Date(selectedUser.blockedAt.toDate()).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {selectedUser.isBlocked ? (
                  <Button
                    variant="default"
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setUserToReactivate({ id: selectedUser.id, name: selectedUser.displayName });
                      setIsAccountViewOpen(false);
                      setReactivateDialogOpen(true);
                    }}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Activate Account
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsAccountViewOpen(false);
                      setShowDeactivateModal(true);
                    }}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Deactivate Account
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAccountViewOpen(false);
                setSelectedUser(null);
              }}
            >
              Exit Account View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateModal} onOpenChange={(open) => {
        if (!open) {
          setShowDeactivateModal(false);
          setDeactivateReason('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              Deactivate Account
            </DialogTitle>
            <DialogDescription>
              This will prevent the user from accessing the VISITA mobile app.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Are you sure you want to deactivate this account?
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-semibold">User Name:</span>
                  <span className="text-sm ml-2">{selectedUser.displayName}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold">Email:</span>
                  <span className="text-sm ml-2">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold">Current Status:</span>
                  <Badge className="ml-2 bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Deactivation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="Enter reason for deactivation (minimum 10 characters)..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <p className="text-xs text-gray-500">
                  {deactivateReason.length} / 10 characters minimum
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeactivateModal(false);
                setDeactivateReason('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeactivateUser} 
              disabled={actionLoading || deactivateReason.trim().length < 10}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate User Confirmation Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent className="bg-white border shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              Activate User?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {userToReactivate && (
                <>
                  You are about to activate <strong className="text-foreground">{userToReactivate.name}</strong>.
                  <br /><br />
                  This user will regain access to the VISITA mobile app and can log in again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReactivate}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Activate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PublicUserManagement;
