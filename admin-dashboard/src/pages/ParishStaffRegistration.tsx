/**
 * FILE PURPOSE: Parish Staff Self-Registration Page
 *
 * This page allows new parish secretaries and parish priests to register their own accounts.
 * After registration, the account is in 'pending' status until approved
 * by the current parish staff.
 *
 * FEATURES:
 * - Email and password registration
 * - Diocese and parish selection
 * - Position selection (Secretary or Priest) - stored as position field with role='parish_secretary'
 * - Name and contact information
 * - Clear feedback on registration status
 * - Redirect to pending approval page after success
 *
 * ROUTE: /parish-register
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Church,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Eye,
  EyeOff,
  Shield,
  Info,
} from 'lucide-react';
import { ParishStaffService, type ParishStaffPosition } from '@/services/parishStaffService';
import { ChurchService } from '@/services/churchService';
import { useToast } from '@/components/ui/use-toast';
import type { Diocese } from '@/contexts/AuthContext';
import type { Church as ChurchType } from '@/types/church';

interface ParishOption {
  id: string;
  name: string;
  municipality: string;
  label: string;
}

const ParishStaffRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    diocese: '' as Diocese | '',
    parishId: '',
    position: '' as ParishStaffPosition | '',
  });

  // Parish selection state
  const [parishes, setParishes] = useState<ParishOption[]>([]);
  const [loadingParishes, setLoadingParishes] = useState(false);
  const [selectedParish, setSelectedParish] = useState<ParishOption | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const password = formData.password;
    const defaultChecks = { length: false, lowercase: false, uppercase: false, number: false, special: false };
    if (!password) return { score: 0, label: '', color: '', checks: defaultChecks };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score <= 2) return { score: score * 20, label: 'Weak', color: 'bg-red-500', checks };
    if (score <= 3) return { score: score * 20, label: 'Fair', color: 'bg-yellow-500', checks };
    if (score <= 4) return { score: score * 20, label: 'Good', color: 'bg-blue-500', checks };
    return { score: 100, label: 'Strong', color: 'bg-green-500', checks };
  }, [formData.password]);

  // Form completion progress
  const formProgress = useMemo(() => {
    const fields = [
      formData.diocese,
      formData.parishId,
      formData.position,
      formData.name.trim(),
      formData.email.trim(),
      formData.password,
      formData.confirmPassword,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [formData]);

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Load parishes when diocese changes
  useEffect(() => {
    const loadParishes = async () => {
      if (!formData.diocese) {
        setParishes([]);
        setFormData(prev => ({ ...prev, parishId: '' }));
        setSelectedParish(null);
        return;
      }

      setLoadingParishes(true);
      try {
        const churches = await ChurchService.getChurchesForDiocese(formData.diocese as Diocese);
        const parishOptions: ParishOption[] = churches
          .filter((church: ChurchType) => church.status === 'approved')
          .map((church: ChurchType) => ({
            id: church.id,
            name: church.name,
            municipality: church.municipality || '',
            label: `${church.name}${church.municipality ? ` - ${church.municipality}` : ''}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setParishes(parishOptions);
      } catch (err) {
        console.error('[ParishStaffRegistration] Error loading parishes:', err);
        setError('Failed to load parishes. Please try again.');
      } finally {
        setLoadingParishes(false);
      }
    };

    loadParishes();
  }, [formData.diocese]);

  // Form validation
  const validateForm = (): string | null => {
    if (!formData.diocese) return 'Please select your diocese';
    if (!formData.parishId) return 'Please select your parish';
    if (!formData.position) return 'Please select your position';
    if (!formData.name.trim()) return 'Full name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!isValidEmail(formData.email)) return 'Please enter a valid email address (e.g., name@example.com)';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (passwordStrength.score < 40) return 'Please use a stronger password with uppercase, lowercase, and numbers';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('[ParishStaffRegistration] Form submitted');

    // Validate
    const validationError = validateForm();
    if (validationError) {
      console.log('[ParishStaffRegistration] Validation error:', validationError);
      setError(validationError);
      return;
    }

    setLoading(true);
    console.log('[ParishStaffRegistration] Calling registerParishStaff service...');

    try {
      const result = await ParishStaffService.registerParishStaff({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        diocese: formData.diocese as Diocese,
        parishId: formData.parishId,
        parishName: selectedParish?.name || '',
        municipality: selectedParish?.municipality || '',
        position: formData.position as ParishStaffPosition,
      });

      console.log('[ParishStaffRegistration] Service result:', result);

      if (result.success) {
        console.log('[ParishStaffRegistration] Registration successful');
        setSuccess(true);
        toast({
          title: '✓ Registration Successful!',
          description: 'Your account has been created. Awaiting approval from the parish administrator.',
          duration: 4000,
        });
        // Redirect to pending approval page after a short delay
        setTimeout(() => {
          navigate('/pending-approval', {
            state: {
              name: formData.name,
              diocese: formData.diocese,
              email: formData.email,
              parish: selectedParish?.name,
              role: 'parish',
            },
          });
        }, 2000);
      } else {
        console.log('[ParishStaffRegistration] Registration failed:', result.message);
        setError(result.message);
        toast({
          title: 'Registration Failed',
          description: result.message,
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('[ParishStaffRegistration] Submit error:', err);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Handle parish selection
  const handleParishChange = (parishId: string) => {
    const parish = parishes.find(p => p.id === parishId);
    setSelectedParish(parish || null);
    setFormData(prev => ({ ...prev, parishId }));
    setError(null);
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Registration Successful!</h2>
            <p className="text-muted-foreground mb-4">
              Your account has been created and is pending approval from the Chancery Office.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Church className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Parish Staff Registration</CardTitle>
          <CardDescription>
            Register as a new parish secretary or parish priest. Your account will need to be approved
            by the Chancery Office before you can access the system.
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Form Progress</span>
              <span>{formProgress}%</span>
            </div>
            <Progress value={formProgress} className="h-2" />
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Section: Parish Assignment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 border-b border-blue-200 pb-2">
                <MapPin className="h-4 w-4" />
                Parish Assignment
              </div>

              {/* Diocese Selection */}
              <div className="space-y-2">
                <Label htmlFor="diocese" className="flex items-center gap-2">
                  Diocese <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.diocese}
                  onValueChange={(value) => handleChange('diocese', value)}
                >
                  <SelectTrigger id="diocese">
                    <SelectValue placeholder="Select your diocese" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tagbilaran">Diocese of Tagbilaran</SelectItem>
                    <SelectItem value="talibon">Diocese of Talibon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Parish Selection */}
              <div className="space-y-2">
                <Label htmlFor="parish" className="flex items-center gap-2">
                  Parish <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.parishId}
                  onValueChange={handleParishChange}
                  disabled={!formData.diocese || loadingParishes}
                >
                  <SelectTrigger id="parish">
                    <SelectValue placeholder={
                      loadingParishes ? 'Loading parishes...' :
                      !formData.diocese ? 'Select diocese first' :
                    parishes.length === 0 ? 'No parishes available' :
                    'Select your parish'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {parishes.map((parish) => (
                    <SelectItem key={parish.id} value={parish.id}>
                      {parish.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.diocese && parishes.length === 0 && !loadingParishes && (
                <p className="text-sm text-muted-foreground">
                  No approved parishes found for this diocese. Please contact the Chancery Office.
                </p>
              )}
              </div>

              {/* Position Selection */}
              <div className="space-y-2">
                <Label htmlFor="position" className="flex items-center gap-2">
                  Position <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => handleChange('position', value)}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Select your position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parish_secretary">Parish Secretary</SelectItem>
                    <SelectItem value="parish_priest">Parish Priest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section: Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 border-b border-blue-200 pb-2">
                <User className="h-4 w-4" />
                Personal Information
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={formData.position === 'parish_priest' ? 
                    'e.g., Rev. Fr. Juan Dela Cruz' : 
                    'e.g., Maria Santos'}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Section: Account Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 border-b border-blue-200 pb-2">
                <Shield className="h-4 w-4" />
                Account Credentials
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading}
                  className={formData.email && !isValidEmail(formData.email) ? 'border-red-300 focus-visible:ring-red-500' : ''}
                />
                {formData.email && !isValidEmail(formData.email) && (
                  <p className="text-xs text-red-500">Please enter a valid email address</p>
                )}
              </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.label === 'Weak' ? 'text-red-500' :
                      passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                      passwordStrength.label === 'Good' ? 'text-blue-500' :
                      'text-green-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.checks?.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`h-3 w-3 ${passwordStrength.checks?.length ? '' : 'opacity-30'}`} />
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks?.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`h-3 w-3 ${passwordStrength.checks?.uppercase ? '' : 'opacity-30'}`} />
                      Uppercase letter
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks?.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`h-3 w-3 ${passwordStrength.checks?.lowercase ? '' : 'opacity-30'}`} />
                      Lowercase letter
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks?.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`h-3 w-3 ${passwordStrength.checks?.number ? '' : 'opacity-30'}`} />
                      Number
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={loading}
                  className={`pr-10 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>
            </div>

            {/* Info box */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">What happens next?</AlertTitle>
              <AlertDescription className="text-sm text-blue-700">
                After registration, your account will be in pending status until the Chancery Office
                approves it. You'll receive an email notification once approved.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || (formData.diocese !== '' && parishes.length === 0)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Register Account'
              )}
            </Button>

            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Link to="/login" className="hover:underline">
                Back to Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ParishStaffRegistration;
