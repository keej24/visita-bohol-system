import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { isPreconfiguredAccount } from '@/lib/auth-utils';
import { User, Shield, Save, Camera, Lock, Eye, EyeOff, Crown, Mail, Phone, MapPin, Edit, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

const AccountSettings = () => {
  const { userProfile, user, refreshUserProfile } = useAuth();
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
    phone: userProfile?.phoneNumber || '',
    address: '',
    office: userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : 'Chancery Office',
    diocese: userProfile?.diocese || 'tagbilaran'
  });

  // Sync phone number from userProfile when it changes
  useEffect(() => {
    if (userProfile) {
      console.log('🔍 [AccountSettings] UserProfile loaded:', {
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

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Validation states
  const [errors, setErrors] = useState({
    phone: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    currentPassword: '',
    confirmPassword: ''
  });

  // Validate phone number
  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return '';
    
    const phoneRegex = /^[\d\s\-()+]+$/;
    if (!phoneRegex.test(phone)) {
      return 'Please enter a valid phone number (numbers, spaces, hyphens, parentheses, and + allowed)';
    }

    const digitCount = phone.replace(/\D/g, '').length;
    if (digitCount < 7) {
      return 'Phone number must contain at least 7 digits';
    }

    if (digitCount > 15) {
      return 'Phone number cannot exceed 15 digits';
    }

    return '';
  };

  // Validate email
  const validateEmail = (email: string): string => {
    if (!email.trim()) return 'Email is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    return '';
  };

  // Validate name
  const validateName = (name: string, fieldName: string): string => {
    if (!name.trim()) return `${fieldName} is required`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
    return '';
  };

  // Validate password
  const validatePassword = (password: string): string => {
    if (!password) return '';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
    return '';
  };

  // Validate current password
  const validateCurrentPassword = (password: string): string => {
    if (!password) return 'Current password is required';
    return '';
  };

  // Validate password confirmation
  const validatePasswordConfirmation = (newPass: string, confirmPass: string): string => {
    if (!confirmPass) return 'Please confirm your new password';
    if (newPass !== confirmPass) return "New password and confirmation don't match";
    return '';
  };

  const handleProfileUpdate = async () => {
    if (!user || !userProfile) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      return;
    }

    // Validate all fields
    const phoneError = validatePhone(profileData.phone);
    const emailError = !isSystemAccount ? validateEmail(profileData.email) : '';
    const firstNameError = !isSystemAccount ? validateName(profileData.firstName, 'First name') : '';
    const lastNameError = !isSystemAccount ? validateName(profileData.lastName, 'Last name') : '';

    if (phoneError || emailError || firstNameError || lastNameError) {
      setErrors({
        phone: phoneError,
        email: emailError,
        firstName: firstNameError,
        lastName: lastNameError,
        password: '',
        currentPassword: '',
        confirmPassword: ''
      });
      
      toast({
        title: 'Validation Error',
        description: 'Please complete all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Clear errors
    // Clear errors
    setErrors({ phone: '', email: '', firstName: '', lastName: '', password: '', currentPassword: '', confirmPassword: '' });

    setIsLoading(true);
    try {
      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      const updateData: Record<string, string | null> = {
        phoneNumber: profileData.phone || null, // Use phoneNumber to match other components
        address: profileData.address || null,
      };

      // For non-system accounts, allow name updates
      if (!isSystemAccount) {
        updateData.name = `${profileData.firstName} ${profileData.lastName}`;
        updateData.firstName = profileData.firstName;
        updateData.lastName = profileData.lastName;
      }

      await updateDoc(userDocRef, updateData);
      
      console.log('✅ Phone number saved to user profile');
      
      // Refresh user profile to get the updated phone number
      await refreshUserProfile();

      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
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
        errorMessage = 'Current password is not correct';
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

  // Combined update handler for both profile and password
  const handleCombinedUpdate = async () => {
    setIsLoading(true);
    
    try {
      // Validate profile fields first
      const phoneError = validatePhone(profileData.phone);
      const emailError = !isSystemAccount ? validateEmail(profileData.email) : '';
      const firstNameError = !isSystemAccount ? validateName(profileData.firstName, 'First name') : '';
      const lastNameError = !isSystemAccount ? validateName(profileData.lastName, 'Last name') : '';

      if (phoneError || emailError || firstNameError || lastNameError) {
        setErrors({
          phone: phoneError,
          email: emailError,
          firstName: firstNameError,
          lastName: lastNameError,
          password: '',
          currentPassword: '',
          confirmPassword: ''
        });
        
        toast({
          title: 'Validation Error',
          description: 'Please complete all required fields',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Clear errors
      setErrors({ phone: '', email: '', firstName: '', lastName: '', password: '', currentPassword: '', confirmPassword: '' });
      
      // Only update password if password fields are filled
      const hasPasswordData = passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword;
      
      if (hasPasswordData) {
        // Validate current password
        const currentPasswordError = validateCurrentPassword(passwordData.currentPassword);
        if (currentPasswordError) {
          setErrors(prev => ({ ...prev, currentPassword: currentPasswordError }));
          toast({
            title: 'Validation Error',
            description: currentPasswordError,
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        // Validate new password
        const newPasswordError = validatePassword(passwordData.newPassword);
        if (newPasswordError) {
          setErrors(prev => ({ ...prev, password: newPasswordError }));
          toast({
            title: 'Invalid Password',
            description: newPasswordError,
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        // Validate password confirmation
        const confirmPasswordError = validatePasswordConfirmation(passwordData.newPassword, passwordData.confirmPassword);
        if (confirmPasswordError) {
          setErrors(prev => ({ ...prev, confirmPassword: confirmPasswordError }));
          toast({
            title: 'Validation Error',
            description: confirmPasswordError,
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        // Check if new password is same as current
        if (passwordData.newPassword === passwordData.currentPassword) {
          toast({
            title: 'Invalid Password',
            description: 'New password must be different from current password',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        if (!auth.currentUser || !userProfile?.email) {
          toast({
            title: 'Error',
            description: 'User not authenticated',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        // Update profile first
        await handleProfileUpdate();

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
            description: 'Profile and password updated successfully',
          });
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: unknown) {
          console.error('Password update failed:', error);
          let errorMessage = 'Failed to update password. Please try again.';

          const authError = error as { code?: string };
          if (authError.code === 'auth/wrong-password') {
            errorMessage = 'Current password is not correct';
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
          setIsLoading(false);
          return;
        }
      } else {
        // Profile only update
        await handleProfileUpdate();
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      }
      
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel edit and reset all changes
  const handleCancelEdit = () => {
    // Reset profile data to original values
    setProfileData({
      firstName: userProfile?.name?.split(' ')[0] || '',
      lastName: userProfile?.name?.split(' ').slice(1).join(' ') || '',
      email: userProfile?.email || '',
      phone: '',
      address: '',
      office: userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : 'Chancery Office',
      diocese: userProfile?.diocese || 'tagbilaran'
    });
    
    // Clear password data
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    // Clear all errors
    setErrors({ phone: '', email: '', firstName: '', lastName: '', password: '', currentPassword: '', confirmPassword: '' });
    
    // Exit edit mode
    setIsEditingProfile(false);
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
            Manage your account information and settings
          </p>
        </div>

        {/* Merged Edit Profile Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Edit Profile
              </CardTitle>
              {!isEditingProfile && (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {isSystemAccount && (
                    <p className="text-xs text-gray-500">Contact information and password</p>
                  )}
                </div>
              )}
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

            {/* Account Information Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Account Information
              </h4>
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
                          onChange={(e) => {
                            setProfileData(prev => ({ ...prev, phone: e.target.value }));
                            if (errors.phone) {
                              setErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                            }
                          }}
                          disabled={!isEditingProfile}
                          className={`mt-1 pl-10 ${errors.phone && isEditingProfile ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="+63 xxx xxx xxxx"
                          autoComplete="off"
                          data-form-type="other"
                        />
                      </div>
                      {errors.phone && isEditingProfile && (
                        <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                      )}
                      {!errors.phone && (
                        <p className="text-xs text-gray-500 mt-1">Primary contact number for the office</p>
                      )}
                    </div>
                  </>
                ) : (
                  // Regular User Accounts - Account Information
                  <>
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => {
                          setProfileData(prev => ({ ...prev, firstName: e.target.value }));
                          if (errors.firstName) {
                            setErrors(prev => ({ ...prev, firstName: validateName(e.target.value, 'First name') }));
                          }
                        }}
                        disabled={!isEditingProfile}
                        className={`mt-1 ${errors.firstName && isEditingProfile ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {errors.firstName && isEditingProfile && (
                        <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => {
                          setProfileData(prev => ({ ...prev, lastName: e.target.value }));
                          if (errors.lastName) {
                            setErrors(prev => ({ ...prev, lastName: validateName(e.target.value, 'Last name') }));
                          }
                        }}
                        disabled={!isEditingProfile}
                        className={`mt-1 ${errors.lastName && isEditingProfile ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {errors.lastName && isEditingProfile && (
                        <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          disabled
                          className="mt-1 pl-10 bg-gray-50"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Contact admin to change email address</p>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => {
                            setProfileData(prev => ({ ...prev, phone: e.target.value }));
                            if (errors.phone) {
                              setErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                            }
                          }}
                          disabled={!isEditingProfile}
                          className={`mt-1 pl-10 ${errors.phone && isEditingProfile ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="+63 xxx xxx xxxx"
                          autoComplete="off"
                          data-form-type="other"
                        />
                      </div>
                      {errors.phone && isEditingProfile && (
                        <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                      )}
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
            </div>

            {/* Password Section (only visible in edit mode) */}
            {isEditingProfile && (
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
                      type={showPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                        if (errors.currentPassword) {
                          setErrors(prev => ({ ...prev, currentPassword: '' }));
                        }
                      }}
                      className={`mt-1 pr-10 ${errors.currentPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-xs text-red-600 mt-1">{errors.currentPassword}</p>
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
                          if (errors.password) {
                            setErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }));
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value) {
                            setErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }));
                          }
                        }}
                        className={`mt-1 pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-600 mt-1">{errors.password}</p>
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
                        if (errors.confirmPassword) {
                          setErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }
                      }}
                      onBlur={(e) => {
                        if (passwordData.newPassword && e.target.value) {
                          setErrors(prev => ({ 
                            ...prev, 
                            confirmPassword: validatePasswordConfirmation(passwordData.newPassword, e.target.value) 
                          }));
                        }
                      }}
                      className={`mt-1 ${errors.confirmPassword || (passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword) ? 'border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
                    )}
                    {!errors.confirmPassword && passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Password Requirements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className={passwordData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                      • At least 8 characters long
                    </li>
                    <li className={/[A-Z]/.test(passwordData.newPassword) && /[a-z]/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                      • Contains uppercase and lowercase letters
                    </li>
                    <li className={/[0-9]/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                      • Contains at least one number
                    </li>
                    <li className={/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                      • Contains at least one special character
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Save/Cancel Buttons (only visible in edit mode) */}
            {isEditingProfile && (
              <div className="flex gap-3 pt-4">
                <Button onClick={handleCombinedUpdate} className="flex-1" disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AccountSettings;
