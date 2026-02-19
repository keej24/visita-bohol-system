import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Mail,
  Phone,
  Church,
  Save,
  Edit,
  Eye,
  EyeOff,
  Key,
  X,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { ChurchService } from '@/services/churchService';

interface ParishAccountProps {
  onClose: () => void;
}

export const ParishAccount: React.FC<ParishAccountProps> = ({
  onClose
}) => {
  const { toast } = useToast();
  const { userProfile, user, refreshUserProfile } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [parishName, setParishName] = useState<string>('Loading...');

  // Profile form state - Initialize from userProfile
  const [profileData, setProfileData] = useState({
    parishName: 'Loading...',
    email: userProfile?.email || '',
    phone: userProfile?.phoneNumber || '+63 ',
    diocese: userProfile?.diocese 
      ? `Diocese of ${userProfile.diocese.charAt(0).toUpperCase() + userProfile.diocese.slice(1)}`
      : 'Diocese of Tagbilaran'
  });

  // Sync email and phone from userProfile on mount and when it changes
  useEffect(() => {
    if (userProfile) {
      console.log('🔍 [ParishAccount] UserProfile loaded:', {
        email: userProfile.email,
        phoneNumber: userProfile.phoneNumber,
        hasPhone: !!userProfile.phoneNumber
      });
      
      setProfileData(prev => ({
        ...prev,
        email: userProfile.email || prev.email,
        phone: userProfile.phoneNumber || prev.phone
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.email, userProfile?.phoneNumber]);

  // Fetch parish name from church document
  useEffect(() => {
    const fetchParishName = async () => {
      if (userProfile?.parish && userProfile?.diocese) {
        try {
          console.log('🔍 [ParishAccount] Fetching church data for parish:', userProfile.parish);
          
          const churches = await ChurchService.getChurches({
            diocese: userProfile.diocese
          });
          
          console.log('📋 [ParishAccount] Found churches:', churches.length);
          
          // Find the church matching the parish ID
          const parishChurch = churches.find(church => church.id === userProfile.parish);
          
          if (parishChurch) {
            console.log('✅ [ParishAccount] Found parish church:', {
              name: parishChurch.fullName || parishChurch.name,
              hasContactInfo: !!parishChurch.contactInfo,
              phone: parishChurch.contactInfo?.phone
            });
            
            const name = parishChurch.fullName || parishChurch.name || userProfile.parishInfo?.name || userProfile.name || userProfile.parish;
            setParishName(name);
            setProfileData(prev => ({ ...prev, parishName: name }));
            
            // Sync church phone to form if available
            if (parishChurch.contactInfo?.phone) {
              console.log('📞 [ParishAccount] Syncing phone from church:', parishChurch.contactInfo.phone);
              setProfileData(prev => ({ ...prev, phone: parishChurch.contactInfo.phone || prev.phone }));
            }
          } else {
            console.warn('⚠️ [ParishAccount] Church not found for parish ID:', userProfile.parish);
            const fallbackName = userProfile.parishInfo?.name || userProfile.name || userProfile.parish;
            setParishName(fallbackName);
            setProfileData(prev => ({ ...prev, parishName: fallbackName }));
          }
        } catch (error) {
          console.error('❌ [ParishAccount] Error fetching parish name:', error);
          const fallbackName = userProfile.parishInfo?.name || userProfile.name || userProfile.parish;
          setParishName(fallbackName);
          setProfileData(prev => ({ ...prev, parishName: fallbackName }));
        }
      }
    };

    fetchParishName();
  }, [userProfile?.parish, userProfile?.diocese, userProfile?.parishInfo?.name, userProfile?.name]);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Validation states
  const [errors, setErrors] = useState({
    phone: '',
    email: '',
    password: '',
    currentPassword: '',
    confirmPassword: ''
  });

  // Validation functions
  const validatePassword = (password: string): boolean => {
    if (!password) return false;
    
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  const validateCurrentPassword = (): boolean => {
    if (!passwordData.currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: 'Please complete all required fields' }));
      return false;
    }
    setErrors(prev => ({ ...prev, currentPassword: '' }));
    return true;
  };

  const validatePasswordConfirmation = (): boolean => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please complete all required fields' }));
      return false;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "New password and confirmation don't match" }));
      return false;
    }
    
    setErrors(prev => ({ ...prev, confirmPassword: '' }));
    return true;
  };

  // Check password requirements
  const passwordRequirements = {
    minLength: passwordData.newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(passwordData.newPassword),
    hasLowerCase: /[a-z]/.test(passwordData.newPassword),
    hasNumber: /[0-9]/.test(passwordData.newPassword),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)
  };

  const handleProfileSave = async () => {
    // Validate required fields
    if (!profileData.phone.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Phone number is required.",
        variant: "destructive"
      });
      return;
    }

    // Phone number validation
    const phoneRegex = /^[\d\s\-()+]+$/;
    if (!phoneRegex.test(profileData.phone)) {
      toast({ 
        title: "Invalid Phone Number", 
        description: "Please enter a valid phone number (numbers, spaces, hyphens, parentheses, and + allowed)",
        variant: "destructive"
      });
      return;
    }

    const digitCount = profileData.phone.replace(/\D/g, '').length;
    if (digitCount < 7) {
      toast({ 
        title: "Invalid Phone Number", 
        description: "Phone number must contain at least 7 digits",
        variant: "destructive"
      });
      return;
    }

    if (digitCount > 15) {
      toast({ 
        title: "Invalid Phone Number", 
        description: "Phone number cannot exceed 15 digits",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingProfile(true);
    try {
      // Update user profile in Firestore with phone number
      if (user && userProfile) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          phoneNumber: profileData.phone
        });
        
        console.log('✅ Phone number saved to user profile');
        
        // Sync phone number to church document's contactInfo
        const parishIdentifier = userProfile.parishId || userProfile.parish;
        if (parishIdentifier && profileData.phone) {
          try {
            const churches = await ChurchService.getChurches({ diocese: userProfile.diocese });
            const parishChurch = churches.find(c => c.id === parishIdentifier);
            
            if (parishChurch) {
              const churchDocRef = doc(db, 'churches', parishChurch.id);
              await updateDoc(churchDocRef, {
                'contactInfo.phone': profileData.phone
              });
              console.log('✅ Phone number synced to church document');
            }
          } catch (syncError) {
            console.error('Error syncing phone to church:', syncError);
            // Don't fail the whole operation if church sync fails
          }
        }
        
        // Refresh user profile to get the updated phone number
        await refreshUserProfile();
      }

      toast({ 
        title: "Profile Updated", 
        description: "Your profile information has been saved successfully." 
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    // Validate all password fields are filled
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate password requirements
    if (!validatePassword(passwordData.newPassword)) {
      setErrors(prev => ({ ...prev, password: 'Password does not meet requirements' }));
      toast({ 
        title: "Invalid Password", 
        description: "Password must meet all requirements.",
        variant: "destructive"
      });
      return;
    }

    // Validate password match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Passwords don't match" }));
      toast({ 
        title: "Password Mismatch", 
        description: "New password and confirmation don't match.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingPassword(true);
    try {
      if (user) {
        // Re-authenticate user before password change
        const credential = EmailAuthProvider.credential(
          user.email!,
          passwordData.currentPassword
        );
        
        await reauthenticateWithCredential(user, credential);
        
        // Update password
        await updatePassword(user, passwordData.newPassword);
        
        // Clear password fields and errors
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setErrors(prev => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }));

        toast({ 
          title: "Password Updated", 
          description: "Your password has been changed successfully!" 
        });
        setIsEditingPassword(false);
      }
    } catch (error: unknown) {
      console.error('Password update error:', error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        
        if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          setErrors(prev => ({ ...prev, currentPassword: 'Current password is incorrect' }));
          toast({ 
            title: "Authentication Error", 
            description: "Current password is incorrect",
            variant: "destructive"
          });
        } else if (firebaseError.code === 'auth/weak-password') {
          setErrors(prev => ({ ...prev, password: 'Password is too weak' }));
          toast({ 
            title: "Weak Password", 
            description: "Please choose a stronger password",
            variant: "destructive"
          });
        } else if (firebaseError.code === 'auth/requires-recent-login') {
          toast({ 
            title: "Re-authentication Required", 
            description: "Please log out and log in again before changing your password",
            variant: "destructive"
          });
        } else if (firebaseError.code === 'auth/too-many-requests') {
          toast({ 
            title: "Too Many Attempts", 
            description: "Too many failed attempts. Please try again later.",
            variant: "destructive"
          });
        } else {
          toast({ 
            title: "Error", 
            description: "Failed to update password. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to update password. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoadingPassword(false);
    }
  };

  // Cancel profile edit and reset changes
  const handleCancelProfileEdit = () => {
    // Reset profile data to original values
    setProfileData(prev => ({
      ...prev,
      phone: userProfile?.phoneNumber || ''
    }));
    
    // Clear profile errors
    setErrors(prev => ({ ...prev, phone: '', email: '' }));
    
    // Exit edit mode
    setIsEditingProfile(false);
  };

  // Cancel password edit and reset changes
  const handleCancelPasswordEdit = () => {
    // Clear password data
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // Clear password errors
    setErrors(prev => ({ ...prev, password: '', currentPassword: '', confirmPassword: '' }));
    
    // Exit edit mode
    setIsEditingPassword(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Edit Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Church className="w-5 h-5" />
              Parish Account
            </CardTitle>
            {!isEditingProfile && (
              <Button
                variant="outline"
                onClick={() => setIsEditingProfile(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture & Basic Info */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(userProfile?.name || profileData.parishName).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {userProfile?.name || profileData.parishName}
              </h3>
              <p className="text-gray-600">
                {userProfile?.position === 'parish_priest' ? 'Parish Priest' : 'Parish Secretary'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Church className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{profileData.diocese}</span>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={userProfile?.name || ''}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input
                  value={userProfile?.position === 'parish_priest' ? 'Parish Priest' : 'Parish Secretary'}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
              {userProfile?.parishInfo?.municipality && (
                <div>
                  <Label>Municipality</Label>
                  <Input
                    value={userProfile.parishInfo.municipality}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
              )}
              <div>
                <Label>Account Created</Label>
                <Input
                  value={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Parish Information Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Church className="w-4 h-4" />
              Parish Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="parishName">Parish Name</Label>
                <Input
                  id="parishName"
                  value={profileData.parishName}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Contact admin to change parish name</p>
              </div>
              <div>
                <Label htmlFor="email" className="flex items-center gap-1">
                   Email Address
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="mt-1 pl-10 bg-gray-50"
                    placeholder="parish@example.com"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Contact admin to change email address</p>
              </div>
              <div>
                <Label htmlFor="phone">
                  Parish Contact Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={profileData.phone || '+63 '}
                    onChange={(e) => {
                      // Ensure +63 prefix is maintained
                      const value = e.target.value;
                      const newValue = !value.startsWith('+63') 
                        ? '+63 ' + value.replace(/^\+63\s*/, '')
                        : value;
                      setProfileData(prev => ({ ...prev, phone: newValue }));
                    }}
                    disabled={!isEditingProfile}
                    className={`mt-1 pl-10 ${!isEditingProfile ? 'bg-gray-50' : ''}`}
                    placeholder="9XX XXX XXXX"
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">This will sync with your Church Profile</p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="diocese">Diocese</Label>
                <Input
                  id="diocese"
                  value={profileData.diocese}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                
              </div>
            </div>
          </div>

          {/* Save/Cancel Buttons (only visible in edit mode) */}
          {isEditingProfile && (
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleProfileSave} className="flex-1" disabled={isLoadingProfile}>
                <Save className="w-4 h-4 mr-2" />
                {isLoadingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelProfileEdit}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Change Password Card - Separate Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </CardTitle>
            {!isEditingPassword && (
              <Button
                variant="outline"
                onClick={() => setIsEditingPassword(true)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            )}
          </div>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditingPassword ? (
            <div className="text-sm text-gray-500">
              Click the button above to change your password.
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                      setErrors(prev => ({ ...prev, currentPassword: '' }));
                    }}
                    className={`mt-1 pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                        setErrors(prev => ({ ...prev, password: '' }));
                      }}
                      className={`mt-1 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                    className={`mt-1 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Confirm new password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {passwordData.newPassword && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Password Requirements:</h4>
                  <ul className="text-sm space-y-1">
                    <li className={passwordRequirements.minLength ? 'text-green-600' : 'text-gray-600'}>
                      {passwordRequirements.minLength ? '✓' : '•'} At least 8 characters long
                    </li>
                    <li className={passwordRequirements.hasUpperCase ? 'text-green-600' : 'text-gray-600'}>
                      {passwordRequirements.hasUpperCase ? '✓' : '•'} Contains uppercase letter
                    </li>
                    <li className={passwordRequirements.hasLowerCase ? 'text-green-600' : 'text-gray-600'}>
                      {passwordRequirements.hasLowerCase ? '✓' : '•'} Contains lowercase letter
                    </li>
                    <li className={passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-600'}>
                      {passwordRequirements.hasNumber ? '✓' : '•'} Contains at least one number
                    </li>
                    <li className={passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-600'}>
                      {passwordRequirements.hasSpecialChar ? '✓' : '•'} Contains at least one special character
                    </li>
                  </ul>
                </div>
              )}

              {/* Save/Cancel Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={handlePasswordSave} 
                  className="flex-1"
                  disabled={isLoadingPassword}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoadingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelPasswordEdit}
                  className="flex-1"
                  disabled={isLoadingPassword}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};