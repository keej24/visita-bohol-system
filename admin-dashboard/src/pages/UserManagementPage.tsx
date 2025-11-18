import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { UserManagement } from '@/components/UserManagement';
import { PublicUserManagement } from '@/components/PublicUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Users, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

const UserManagementPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'admin' | 'public'>('admin');

  // Check if user has permission to manage users
  if (!userProfile || userProfile.role !== 'chancery_office') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Access Restricted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Only Chancery Office users can manage user accounts. Please contact your administrator if you need access.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage admin users and public mobile app users</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('admin')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'admin'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <UserCog className="w-4 h-4" />
              Parish Users
              <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                Staff
              </span>
            </button>

            <button
              onClick={() => setActiveTab('public')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'public'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Users className="w-4 h-4" />
              Public Users
              <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full">
                Mobile App
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'admin' ? (
            <UserManagement diocese={userProfile.diocese} />
          ) : (
            <PublicUserManagement />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UserManagementPage;