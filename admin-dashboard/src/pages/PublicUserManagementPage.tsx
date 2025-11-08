import React from 'react';
import { Navigate } from 'react-router-dom';
import { PublicUserManagement } from '../components/PublicUserManagement';
import { useAuth } from '../contexts/AuthContext';

export const PublicUserManagementPage: React.FC = () => {
  const { user, userProfile } = useAuth();

  // Check authentication
  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Check authorization - only chancery_office and parish_secretary can access
  const canAccess = userProfile.role === 'chancery_office' || userProfile.role === 'parish_secretary';

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the Public User Management page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // For parish secretaries, pass their church ID to filter users
  const churchId = userProfile.role === 'parish_secretary' ? userProfile.parish : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PublicUserManagement churchId={churchId} />
      </div>
    </div>
  );
};

export default PublicUserManagementPage;
