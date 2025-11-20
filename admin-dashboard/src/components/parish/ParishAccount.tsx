import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Church,
  Save,
  Edit,
  Eye,
  EyeOff,
  Key,
  X
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
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [parishName, setParishName] = useState<string>('Loading...');

  // Profile form state - Initialize from userProfile
  const [profileData, setProfileData] = useState({
    parishName: 'Loading...',
    email: userProfile?.email || '',
    phone: userProfile?.phoneNumber || '',
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
            
            const name = parishChurch.fullName || parishChurch.name || userProfile.parish;
            setParishName(name);
            setProfileData(prev => ({ ...prev, parishName: name }));
            
            // Sync church phone to form if available
            if (parishChurch.contactInfo?.phone) {
              console.log('📞 [ParishAccount] Syncing phone from church:', parishChurch.contactInfo.phone);
              setProfileData(prev => ({ ...prev, phone: parishChurch.contactInfo.phone || prev.phone }));
            }
          } else {
            console.warn('⚠️ [ParishAccount] Church not found for parish ID:', userProfile.parish);
            setParishName(userProfile.parish);
            setProfileData(prev => ({ ...prev, parishName: userProfile.parish }));
          }
        } catch (error) {
          console.error('❌ [ParishAccount] Error fetching parish name:', error);
          setParishName(userProfile.parish);
          setProfileData(prev => ({ ...prev, parishName: userProfile.parish }));
        }
      }
    };

    fetchParishName();
  }, [userProfile?.parish, userProfile?.diocese]);

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

  const handleProfileSave = () => {
    // Validate required fields
    const requiredFields = [
      { value: profileData.email, name: 'Email' },
      { value: profileData.phone, name: 'Phone' }
    ];

    const emptyFields = requiredFields.filter(field => !field.value.trim());

    if (emptyFields.length > 0) {
      toast({ 
        title: "Validation Error", 
        description: "Please complete all required fields.",
        variant: "destructive"
      });
      return; // Prevent save
    }

    // Additional email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      toast({ 
        title: "Invalid Email", 
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Phone number validation
    if (profileData.phone && profileData.phone.trim()) {
      // Phone number should contain only numbers, spaces, hyphens, parentheses, and plus sign
      const phoneRegex = /^[\d\s\-()+]+$/;
      if (!phoneRegex.test(profileData.phone)) {
        toast({ 
          title: "Invalid Phone Number", 
          description: "Please enter a valid phone number (numbers, spaces, hyphens, parentheses, and + allowed)",
          variant: "destructive"
        });
        return;
      }

      // Check if phone has at least 7 digits (minimum for valid phone numbers)
      const digitCount = profileData.phone.replace(/\D/g, '').length;
      if (digitCount < 7) {
        toast({ 
          title: "Invalid Phone Number", 
          description: "Phone number must contain at least 7 digits",
          variant: "destructive"
        });
        return;
      }

      // Check if phone doesn't exceed 15 digits (international standard)
      if (digitCount > 15) {
        toast({ 
          title: "Invalid Phone Number", 
          description: "Phone number cannot exceed 15 digits",
          variant: "destructive"
        });
        return;
      }
    }

    // Save if all validations pass
    toast({ 
      title: "Profile Updated", 
      description: "Your profile information has been saved successfully." 
    });
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ 
        title: "Password Mismatch", 
        description: "New password and confirmation don't match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({ 
        title: "Password Too Short", 
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    toast({ 
      title: "Password Updated", 
      description: "Your password has been changed successfully!" 
    });
    
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  // Combined update handler for both profile and password
  const handleCombinedUpdate = async () => {
    setIsLoading(true);
    
    try {
      // First validate and save profile
      const requiredFields = [
        { value: profileData.email, name: 'Email' },
        { value: profileData.phone, name: 'Phone' }
      ];

      const emptyFields = requiredFields.filter(field => !field.value.trim());

      if (emptyFields.length > 0) {
        toast({ 
          title: "Validation Error", 
          description: "Please complete all required fields",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        toast({ 
          title: "Invalid Email", 
          description: "Please enter a valid email address",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Phone validation
      if (profileData.phone && profileData.phone.trim()) {
        const phoneRegex = /^[\d\s\-()+]+$/;
        if (!phoneRegex.test(profileData.phone)) {
          toast({ 
            title: "Invalid Phone Number", 
            description: "Please enter a valid phone number (numbers, spaces, hyphens, parentheses, and + allowed)",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        const digitCount = profileData.phone.replace(/\D/g, '').length;
        if (digitCount < 7) {
          toast({ 
            title: "Invalid Phone Number", 
            description: "Phone number must contain at least 7 digits",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (digitCount > 15) {
          toast({ 
            title: "Invalid Phone Number", 
            description: "Phone number cannot exceed 15 digits",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }

      // Update user profile in Firestore with phone number
      if (user && userProfile) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            phoneNumber: profileData.phone
          });
          
          console.log('✅ Phone number saved to user profile');
          
          // Refresh user profile to get the updated phone number
          await refreshUserProfile();
        } catch (error) {
          console.error('Error updating user profile:', error);
          // Don't fail the whole operation if this fails
        }
      }

      // Check if password fields have data
      const hasPasswordData = passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword;

      if (hasPasswordData) {
        // Validate all password fields are filled
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
          toast({ 
            title: "Validation Error", 
            description: "Please complete all required fields",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Validate password requirements
        if (!validatePassword(passwordData.newPassword)) {
          setErrors(prev => ({ ...prev, password: 'Please complete all required fields' }));
          toast({ 
            title: "Validation Error", 
            description: "Please complete all required fields",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Validate password match
        if (!validatePasswordConfirmation()) {
          toast({ 
            title: "Password Mismatch", 
            description: "New password and confirmation don't match",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Update password via Firebase Auth
        if (user) {
          try {
            // Re-authenticate user before password change
            const credential = EmailAuthProvider.credential(
              user.email!,
              passwordData.currentPassword
            );
            
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, passwordData.newPassword);
            
            // Clear password fields
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });

            toast({ 
              title: "Account Updated", 
              description: "Your profile and password have been updated successfully!" 
            });
          } catch (error: unknown) {
            console.error('Password update error:', error);
            
            if (error && typeof error === 'object' && 'code' in error) {
              const firebaseError = error as { code: string };
              
              if (firebaseError.code === 'auth/wrong-password') {
                setErrors(prev => ({ ...prev, currentPassword: 'Current password is not correct' }));
                toast({ 
                  title: "Authentication Error", 
                  description: "Current password is not correct",
                  variant: "destructive"
                });
              } else if (firebaseError.code === 'auth/weak-password') {
                setErrors(prev => ({ ...prev, password: 'Please complete all required fields' }));
                toast({ 
                  title: "Weak Password", 
                  description: "Please complete all required fields",
                  variant: "destructive"
                });
              } else if (firebaseError.code === 'auth/requires-recent-login') {
                toast({ 
                  title: "Re-authentication Required", 
                  description: "Please log out and log in again before changing your password",
                  variant: "destructive"
                });
              } else {
                const errorMessage = error && typeof error === 'object' && 'message' in error 
                  ? String(error.message) 
                  : "Failed to update password. Please try again.";
                toast({ 
                  title: "Error", 
                  description: errorMessage,
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
            setIsLoading(false);
            return;
          }
        }
      } else {
        // Profile only updated
        toast({ 
          title: "Profile Updated", 
          description: "Your profile information has been saved successfully" 
        });
      }

      setIsEditing(false);
    } catch (error: unknown) {
      console.error('Update error:', error);
      toast({ 
        title: "Error", 
        description: (error as Error).message || "Failed to update account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel edit and reset all changes
  const handleCancelEdit = () => {
    // Reset profile data to original values
    setProfileData({
      parishName: userProfile?.parish || userProfile?.name || 'St. Mary\'s Parish',
      email: userProfile?.email || '',
      phone: '',
      diocese: 'Diocese of Tagbilaran'
    });

    // Clear password data
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    // Exit edit mode
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parish Account</h1>
          <p className="text-gray-600 mt-1">Manage parish information and account settings</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Merged Edit Profile Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Church className="w-5 h-5" />
              Edit Profile
            </CardTitle>
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture & Basic Info */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profileData.parishName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {profileData.parishName}
              </h3>
              <p className="text-gray-600">Parish Account</p>
              <div className="flex items-center gap-1 mt-1">
                <Church className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{profileData.diocese}</span>
              </div>
            </div>
          </div>

          {/* Account Information Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
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
                  Parish Email Address
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
                <Label htmlFor="phone" className="flex items-center gap-1">
                  Parish Contact Number
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className={`mt-1 pl-10 ${isEditing && !profileData.phone.trim() ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="+63 xxx xxx xxxx"
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
                {isEditing && !profileData.phone.trim() && (
                  <p className="text-xs text-red-600 mt-1">Phone is required</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="diocese">Diocese</Label>
                <Input
                  id="diocese"
                  value={profileData.diocese}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Contact admin to change diocese assignment</p>
              </div>
            </div>
          </div>

          {/* Password Section (only visible in edit mode) */}
          {isEditing && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Change Password (Optional)
              </h4>
              <p className="text-sm text-gray-500">Leave blank if you don't want to change your password</p>
              
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
            </div>
          )}

          {/* Save/Cancel Buttons (only visible in edit mode) */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleCombinedUpdate} 
                className="flex-1"
                disabled={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelEdit}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};