import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { isPreconfiguredAccount } from '@/lib/auth-utils';
import { User, Shield, Save, Camera, Lock, Eye, EyeOff, Crown, Mail, Phone, MapPin, Edit, Key, Loader2, Briefcase } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth, storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

const AccountSettings = () => {
  const { userProfile, user, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isSystemAccount = userProfile?.email ? isPreconfiguredAccount(userProfile.email) : false;
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    firstName: userProfile?.name?.split(' ')[0] || '',
    lastName: userProfile?.name?.split(' ').slice(1).join(' ') || '',
    email: userProfile?.email || '',
    phone: userProfile?.phoneNumber || '',
    address: userProfile?.address || '',
    office: userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : 'Chancery Office',
    diocese: userProfile?.diocese || 'tagbilaran',
    position: userProfile?.position || '',
    department: userProfile?.department || '',
    profileImageUrl: userProfile?.profileImageUrl || '',
    institutionName: userProfile?.institutionName || (userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : userProfile?.name || '')
  });

  // Sync profile data from userProfile when it changes
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
        phone: userProfile.phoneNumber || prev.phone,
        address: userProfile.address || prev.address,
        position: userProfile.position || prev.position,
        department: userProfile.department || prev.department,
        profileImageUrl: userProfile.profileImageUrl || prev.profileImageUrl,
        institutionName: userProfile.institutionName || userProfile.name || prev.institutionName
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.email, userProfile?.phoneNumber, userProfile?.profileImageUrl, userProfile?.institutionName]);

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

  // Handle profile photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPEG, PNG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // Compress image before upload
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 400,
        useWebWorker: true,
        fileType: 'image/jpeg' as const
      });

      // Delete old profile image if exists
      if (profileData.profileImageUrl) {
        try {
          const oldImageRef = ref(storage, profileData.profileImageUrl);
          await deleteObject(oldImageRef);
        } catch (deleteError) {
          console.warn('Could not delete old profile image:', deleteError);
        }
      }

      // Upload new image
      const storageRef = ref(storage, `profile-images/${user.uid}/${Date.now()}_profile.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile, {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString()
        }
      });

      // Wait for upload to complete
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          () => resolve()
        );
      });

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        profileImageUrl: downloadURL
      });

      // Update local state
      setProfileData(prev => ({ ...prev, profileImageUrl: downloadURL }));

      // Refresh user profile
      await refreshUserProfile();

      toast({
        title: 'Success',
        description: 'Profile photo updated successfully'
      });
    } catch (error) {
      console.error('Photo upload failed:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile photo. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

    setIsLoadingProfile(true);
    try {
      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      const updateData: Record<string, string | null> = {
        address: profileData.address || null,
        position: profileData.position || null,
        department: profileData.department || null
      };

      // For system accounts (chancery/museum), save institution name but not phone
      // For parish secretaries, save phone number
      if (isSystemAccount) {
        updateData.institutionName = profileData.institutionName || null;
        updateData.name = profileData.institutionName || null;
        // Only save phone for parish secretary
        if (userProfile?.role === 'parish_secretary') {
          updateData.phoneNumber = profileData.phone || null;
        }
      } else {
        // For non-system accounts, allow name and phone updates
        updateData.name = `${profileData.firstName} ${profileData.lastName}`;
        updateData.firstName = profileData.firstName;
        updateData.lastName = profileData.lastName;
        updateData.phoneNumber = profileData.phone || null;
      }

      await updateDoc(userDocRef, updateData);
      
      console.log('✅ Phone number saved to user profile');
      
      // Sync phone number to church profile for parish secretaries
      if (userProfile?.role === 'parish_secretary' && profileData.phone) {
        try {
          const parishId = userProfile.parishId || userProfile.parish;
          if (parishId) {
            // Try to find church by parishId first (document ID)
            const churchDocRef = doc(db, 'churches', parishId);
            await updateDoc(churchDocRef, {
              'contactInfo.phone': profileData.phone
            });
            console.log('✅ Phone number synced to church profile');
          }
        } catch (churchError) {
          // Church might not exist yet or parishId doesn't match - try query by parishId field
          try {
            const churchesQuery = query(
              collection(db, 'churches'),
              where('parishId', '==', userProfile.parishId || userProfile.parish)
            );
            const snapshot = await getDocs(churchesQuery);
            if (!snapshot.empty) {
              const churchDoc = snapshot.docs[0];
              await updateDoc(churchDoc.ref, {
                'contactInfo.phone': profileData.phone
              });
              console.log('✅ Phone number synced to church profile (via query)');
            }
          } catch (queryError) {
            console.warn('Could not sync phone to church profile:', queryError);
            // Non-critical - don't fail the whole operation
          }
        }
      }
      
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
      setIsLoadingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    // Validate current password is provided
    if (!passwordData.currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: 'Current password is required' }));
      return;
    }

    // Validate new password
    const passwordError = validatePassword(passwordData.newPassword);
    if (passwordError) {
      setErrors(prev => ({ ...prev, password: passwordError }));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
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

    setIsLoadingPassword(true);
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
      setErrors(prev => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }));
      setIsEditingPassword(false);
    } catch (error: unknown) {
      console.error('Password update failed:', error);
      let errorMessage = 'Failed to update password. Please try again.';

      const authError = error as { code?: string };
      // Handle Firebase Auth error codes (including newer 'invalid-credential' code)
      if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        errorMessage = 'Current password is incorrect';
        setErrors(prev => ({ ...prev, currentPassword: errorMessage }));
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
        setErrors(prev => ({ ...prev, password: errorMessage }));
      } else if (authError.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in before changing your password';
      } else if (authError.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPassword(false);
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

  // Cancel profile edit and reset changes
  const handleCancelProfileEdit = () => {
    // Reset profile data to original values
    setProfileData({
      firstName: userProfile?.name?.split(' ')[0] || '',
      lastName: userProfile?.name?.split(' ').slice(1).join(' ') || '',
      email: userProfile?.email || '',
      phone: userProfile?.phoneNumber || '',
      address: userProfile?.address || '',
      office: userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : 'Chancery Office',
      diocese: userProfile?.diocese || 'tagbilaran',
      position: userProfile?.position || '',
      department: userProfile?.department || '',
      profileImageUrl: userProfile?.profileImageUrl || '',
      institutionName: userProfile?.institutionName || (userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : userProfile?.name || '')
    });
    
    // Clear profile errors
    setErrors(prev => ({ ...prev, phone: '', email: '', firstName: '', lastName: '' }));
    
    // Exit edit mode
    setIsEditingProfile(false);
  };

  // Cancel password edit and reset changes
  const handleCancelPasswordEdit = () => {
    // Clear password data
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    // Clear password errors
    setErrors(prev => ({ ...prev, password: '', currentPassword: '', confirmPassword: '' }));
    
    // Exit edit mode
    setIsEditingPassword(false);
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
                <Button
                  variant="outline"
                  onClick={() => setIsEditingProfile(true)}
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
              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                  id="profile-photo-input"
                  aria-label="Upload profile photo"
                />
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden cursor-pointer transition-all hover:ring-4 hover:ring-blue-200"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingPhoto ? (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                    </div>
                  ) : profileData.profileImageUrl ? (
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={profileData.profileImageUrl} alt="Profile" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                        {isSystemAccount 
                          ? (profileData.institutionName || 'IN').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                          : `${profileData.firstName[0] || ''}${profileData.lastName[0] || ''}`}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {isSystemAccount 
                        ? (profileData.institutionName || 'IN').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                        : `${profileData.firstName[0] || ''}${profileData.lastName[0] || ''}`}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 transition-colors"
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-3 h-3 animate-spin text-gray-600" />
                  ) : (
                    <Camera className="w-3 h-3 text-gray-600" />
                  )}
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {isSystemAccount ? (profileData.institutionName || userProfile?.institutionName || userProfile?.name || 'Institution Name') : `${profileData.firstName} ${profileData.lastName}`}
                </h3>
                <p className="text-gray-600">
                  {userProfile?.role === 'museum_researcher' ? 'Museum Researcher' : userProfile?.role === 'parish_secretary' ? 'Parish Secretary' : 'Chancery Office'}
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
                <p className="text-xs text-gray-500 mt-2">Click photo to upload a new image</p>
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
                      <Label htmlFor="institutionName">Institution Name</Label>
                      <Input
                        id="institutionName"
                        value={profileData.institutionName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, institutionName: e.target.value }))}
                        disabled={!isEditingProfile}
                        className="mt-1"
                        placeholder={userProfile?.role === 'museum_researcher' ? 'National Museum of the Philippines - Bohol' : 'Institution name'}
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
                    {userProfile?.role === 'parish_secretary' && (
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
                          <p className="text-xs text-gray-500 mt-1">Primary contact number for the parish</p>
                        )}
                      </div>
                    )}
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
                          value={profileData.phone || '+63 '}
                          onChange={(e) => {
                            // Ensure +63 prefix is maintained
                            const value = e.target.value;
                            const newValue = !value.startsWith('+63') 
                              ? '+63 ' + value.replace(/^\+63\s*/, '')
                              : value;
                            setProfileData(prev => ({ ...prev, phone: newValue }));
                            if (errors.phone) {
                              setErrors(prev => ({ ...prev, phone: validatePhone(newValue) }));
                            }
                          }}
                          disabled={!isEditingProfile}
                          className={`mt-1 pl-10 ${errors.phone && isEditingProfile ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="9XX XXX XXXX"
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
                    <div>
                      <Label htmlFor="position">Position / Title</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="position"
                          value={profileData.position}
                          onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                          disabled={!isEditingProfile}
                          className="mt-1 pl-10"
                          placeholder={userProfile?.role === 'museum_researcher' ? 'Heritage Specialist' : userProfile?.role === 'parish_secretary' ? 'Parish Secretary' : 'Administrator'}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Your job title or position</p>
                    </div>
                    {userProfile?.role === 'museum_researcher' && (
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={profileData.department}
                          onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                          disabled={!isEditingProfile}
                          className="mt-1"
                          placeholder="e.g., Cultural Properties Division"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your department or division</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Save/Cancel Buttons (only visible in edit mode) */}
            {isEditingProfile && (
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleProfileUpdate} className="flex-1" disabled={isLoadingProfile}>
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

                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handlePasswordUpdate} className="flex-1" disabled={isLoadingPassword}>
                    <Save className="w-4 h-4 mr-2" />
                    {isLoadingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelPasswordEdit}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AccountSettings;
