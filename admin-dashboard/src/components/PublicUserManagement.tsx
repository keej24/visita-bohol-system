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
  Eye,
  Ban,
  Loader2,
  MapPin,
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
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

  // Selected user for details/actions
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
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

      // Try with accountType filter
      console.log('🔎 Filtering for accountType="public"...');
      const publicUsersQuery = query(usersRef, where('accountType', '==', 'public'));
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Public User Management</h2>
          <p className="text-gray-600 mt-1">Manage mobile app users</p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-800">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-800">{activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Deactivated Users</p>
              <p className="text-2xl font-bold text-gray-800">{deactivatedUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'deactivated')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex items-center text-red-600 mb-4">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No public users have registered yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {user.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                          <div className="text-sm text-gray-500">{user.nationality || 'Not specified'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate max-w-xs">{user.email}</span>
                      </div>
                      {user.phoneNumber && (
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {user.phoneNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.location ? (
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {user.location}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isBlocked ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Deactivated
                        </span>
                      ) : user.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {user.isBlocked ? (
                          <button
                            onClick={() => handleReactivateClick(user.id, user.displayName)}
                            disabled={actionLoading}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Reactivate User"
                          >
                            <UserCheck className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeactivateModal(true);
                            }}
                            disabled={actionLoading}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Deactivate User"
                          >
                            <Ban className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && !showDeactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Display Name</p>
                    <p className="font-medium">{selectedUser.displayName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium break-all">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nationality</p>
                    <p className="font-medium">{selectedUser.nationality || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedUser.phoneNumber || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{selectedUser.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Parish</p>
                    <p className="font-medium">{selectedUser.parish}</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Account Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Joined</p>
                    <p className="font-medium">
                      {selectedUser.createdAt?.toDate?.()
                        ? new Date(selectedUser.createdAt.toDate()).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Login</p>
                    <p className="font-medium">
                      {selectedUser.lastLoginAt?.toDate?.()
                        ? new Date(selectedUser.lastLoginAt.toDate()).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account Status</p>
                    <p className="font-medium">{selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account Type</p>
                    <p className="font-medium">{selectedUser.accountType}</p>
                  </div>
                </div>
              </div>

              {/* Deactivation Info if deactivated */}
              {selectedUser.isBlocked && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Deactivation Information</h4>
                  <p className="text-sm text-red-600 mb-1">
                    <strong>Reason:</strong> {selectedUser.blockReason || 'No reason provided'}
                  </p>
                  <p className="text-sm text-red-600">
                    <strong>Deactivated At:</strong>{' '}
                    {selectedUser.blockedAt?.toDate?.()
                      ? new Date(selectedUser.blockedAt.toDate()).toLocaleString()
                      : 'Unknown'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Deactivate User</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                You are about to deactivate <strong>{selectedUser.displayName}</strong>. Please provide a reason.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deactivation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="Enter reason for deactivation (minimum 10 characters)..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {deactivateReason.length} / 10 characters minimum
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivateReason('');
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateUser}
                disabled={actionLoading || deactivateReason.trim().length < 10}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Deactivate User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
