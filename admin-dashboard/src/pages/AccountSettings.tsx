import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { isPreconfiguredAccount } from '@/lib/auth-utils';
import { User, Shield, Save, Camera, Lock, Eye, EyeOff, Crown, Mail, Phone, MapPin, Edit, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

const AccountSettings = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isSystemAccount = userProfile?.email ? isPreconfiguredAccount(userProfile.email) : false;
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: userProfile?.name?.split(' ')[0] || '',
    lastName: userProfile?.name?.split(' ').slice(1).join(' ') || '',
    email: userProfile?.email || '',
    phone: '',
    address: '',
    office: userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : 'Chancery Office',
    diocese: userProfile?.diocese || 'tagbilaran'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = async () => {
    if (!user || !userProfile) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      const updateData: Record<string, string | null> = {
        phone: profileData.phone || null,
        address: profileData.address || null,
      };

      // For non-system accounts, allow name updates
      if (!isSystemAccount) {
        updateData.name = `${profileData.firstName} ${profileData.lastName}`;
        updateData.firstName = profileData.firstName;
        updateData.lastName = profileData.lastName;
      }

      await updateDoc(userDocRef, updateData);

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Profile update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive'
      });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive'
      });
      return;
    }

    if (!auth.currentUser || !userProfile?.email) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        userProfile.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      console.error('Password update failed:', error);
      let errorMessage = 'Failed to update password. Please try again.';

      const authError = error as { code?: string };
      if (authError.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (authError.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in before changing your password';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Account Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your personal information and account settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {isEditingProfile ? 'Cancel' : isSystemAccount ? 'Edit Contact Info' : 'Edit Profile'}
                    </Button>
                    {isSystemAccount && (
                      <p className="text-xs text-gray-500">Contact information only</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture & Basic Info */}
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {profileData.firstName[0]}{profileData.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {profileData.firstName} {profileData.lastName}
                    </h3>
                    <p className="text-gray-600">
                      {userProfile?.role === 'museum_researcher' ? 'Heritage Reviewer' : 'Chancery Office'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {userProfile?.role === 'museum_researcher' ? (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                          <Crown className="w-3 h-3 mr-1" />
                          Heritage Specialist
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                          Diocese of {profileData.diocese}
                        </Badge>
                      )}
                      {isSystemAccount && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          System Account
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isSystemAccount ? (
                    // System Account - Institutional Display
                    <>
                      <div>
                        <Label htmlFor="institutionName" className="flex items-center gap-2">
                          Institution Name
                          <Lock className="w-3 h-3 text-gray-400" />
                        </Label>
                        <Input
                          id="institutionName"
                          value={profileData.firstName + ' ' + profileData.lastName}
                          disabled
                          className="mt-1 bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">Official institutional name</p>
                      </div>
                      <div>
                        <Label htmlFor="institutionEmail" className="flex items-center gap-2">
                          Official Email
                          <Lock className="w-3 h-3 text-gray-400" />
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <Input
                            id="institutionEmail"
                            type="email"
                            value={profileData.email}
                            disabled
                            className="mt-1 pl-10 bg-gray-50"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Official institutional email</p>
                      </div>
                      <div>
                        <Label htmlFor="phone">Contact Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                            disabled={!isEditingProfile}
                            className="mt-1 pl-10"
                            placeholder="+63 xxx xxx xxxx"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Primary contact number for the office</p>
                      </div>
                    </>
                  ) : (
                    // Regular User Accounts - Personal Information
                    <>
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                          disabled={!isEditingProfile}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                          disabled={!isEditingProfile}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                            disabled={!isEditingProfile}
                            className="mt-1 pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                            disabled={!isEditingProfile}
                            className="mt-1 pl-10"
                            placeholder="+63 xxx xxx xxxx"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <Input
                            id="address"
                            value={profileData.address}
                            onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                            disabled={!isEditingProfile}
                            className="mt-1 pl-10"
                            placeholder="Complete address"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleProfileUpdate} className="flex-1" disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Change Password Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="mt-1 pr-10"
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="mt-1 pr-10"
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="mt-1"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Password Requirements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Contains uppercase and lowercase letters</li>
                    <li>• Contains at least one number</li>
                    <li>• Contains at least one special character</li>
                  </ul>
                </div>

                <Button 
                  onClick={handlePasswordUpdate}
                  disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || isLoading}
                  className="w-full"
                >
                  <Key className="w-4 h-4 mr-2" />
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AccountSettings;
