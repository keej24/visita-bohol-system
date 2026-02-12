/**
 * =============================================================================
 * LOGIN.TSX - Authentication Page
 * =============================================================================
 *
 * PURPOSE:
 * This is the login page where admin users (Chancery, Parish Secretaries,
 * Museum Researchers) authenticate to access the admin dashboard.
 *
 * FEATURES:
 * 1. Email/password authentication via Firebase
 * 2. "Forgot Password" functionality with email reset
 * 3. User-friendly error messages for various auth failures
 * 4. Loading overlay during authentication
 * 5. Browser autofill prevention (for security)
 *
 * AUTHENTICATION FLOW:
 * 1. User enters email + password
 * 2. handleSubmit validates inputs
 * 3. Calls login() from AuthContext (Firebase signInWithEmailAndPassword)
 * 4. On success: Shows toast, redirects to / (DioceseRouter handles routing)
 * 5. On failure: Shows appropriate error message
 *
 * ERROR HANDLING:
 * Firebase throws cryptic errors like "auth/invalid-credential"
 * This component translates them to user-friendly messages:
 * - "auth/invalid-credential" → "Invalid email or password"
 * - "auth/too-many-requests" → "Too many failed attempts"
 * - "auth/user-disabled" → "Account has been disabled"
 *
 * PASSWORD RESET FLOW:
 * 1. User clicks "Forgot Password?"
 * 2. Dialog opens asking for email
 * 3. Calls Firebase sendPasswordResetEmail()
 * 4. Firebase sends reset email to user
 * 5. User clicks link in email → changes password
 *
 * SECURITY FEATURES:
 * - Hidden dummy input fields absorb browser autofill
 * - Passwords are never stored locally
 * - Rate limiting on reset emails (Firebase handles this)
 *
 * RELATED FILES:
 * - contexts/AuthContext.tsx: Provides login() function
 * - lib/firebase.ts: Firebase auth instance
 * - App.tsx: /login route definition
 * - DioceseRouter.tsx: Post-login routing based on user role
 */

// Login page for VISITA admin dashboard
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Church, Loader2, Eye, EyeOff, Mail, Building2, Landmark, ArrowLeft, AlertCircle } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { resolveUsernameToEmail, isValidAdminUsername, getUsernameDisplayName, getKnownAccountProfile } from '@/lib/auth-utils';
import type { UserRole } from '@/contexts/AuthContext';
import visitaLogo from '@/assets/visita-logo.png';

// Role type for selection
type LoginRole = 'chancery_office' | 'museum_researcher' | 'parish' | null;

// Role configuration with visual properties
const roleConfig = {
  chancery_office: {
    title: 'Chancery Office',
    description: 'Diocese administrators for Tagbilaran or Talibon',
    icon: Building2,
    color: 'indigo',
    bgGradient: 'from-indigo-500 to-blue-600',
    borderColor: 'border-indigo-200 hover:border-indigo-400',
    bgHover: 'hover:bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  museum_researcher: {
    title: 'Museum Researcher',
    description: 'Heritage site validators for ICP/NCT churches',
    icon: Landmark,
    color: 'amber',
    bgGradient: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-200 hover:border-amber-400',
    bgHover: 'hover:bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  parish: {
    title: 'Parish',
    description: 'Parish priest or secretary management',
    icon: Church,
    color: 'emerald',
    bgGradient: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    bgHover: 'hover:bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

const Login = () => {
  const [selectedRole, setSelectedRole] = useState<LoginRole>(null);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Remember last selected role for returning users
  useEffect(() => {
    const savedRole = localStorage.getItem('visita_last_login_role') as LoginRole;
    if (savedRole && roleConfig[savedRole]) {
      // Don't auto-select, but could show a hint
    }
  }, []);
  
  // Clear error when switching roles
  useEffect(() => {
    setError('');
    setUsernameOrEmail('');
    setPassword('');
    setUsernameHint(null);
  }, [selectedRole]);

  // Show hint when user types a valid admin username that matches the selected role
  const handleUsernameChange = (value: string) => {
    setUsernameOrEmail(value);
    
    if (isValidAdminUsername(value) && selectedRole) {
      // Get the email for this username, then check if the role matches
      const email = resolveUsernameToEmail(value);
      const profile = getKnownAccountProfile(email);
      
      // Only show hint if the username's role matches the selected role
      if (profile && profile.role === selectedRole) {
        setUsernameHint(getUsernameDisplayName(value));
      } else {
        setUsernameHint(null);
      }
    } else {
      setUsernameHint(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setResetLoading(true);
    try {
      // Use Cloud Function for branded password reset email (same as mobile app)
      const sendPasswordResetEmailFn = httpsCallable(functions, 'sendPasswordResetEmail');
      await sendPasswordResetEmailFn({ email: resetEmail, source: 'admin' });
      
      toast({
        title: "Success",
        description: "Password reset email sent! Check your inbox.",
      });
      setIsForgotPasswordOpen(false);
      setResetEmail('');
    } catch (error: unknown) {
      const errorCode = (error as { code?: string }).code;
      
      if (errorCode === 'auth/user-not-found') {
        // Don't reveal if user exists - show success anyway for security
        toast({
          title: "Success",
          description: "If an account exists with this email, a reset link has been sent.",
        });
        setIsForgotPasswordOpen(false);
        setResetEmail('');
      } else if (errorCode === 'auth/invalid-email') {
        toast({
          title: "Error",
          description: "Invalid email address",
          variant: "destructive"
        });
      } else if (errorCode === 'auth/too-many-requests') {
        toast({
          title: "Error",
          description: "Too many requests. Please try again later.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send password reset email. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate empty fields
    if (!usernameOrEmail.trim() || !password.trim()) {
      setError('Please enter username and password.');
      setLoading(false);
      return;
    }

    // Ensure role is selected (shouldn't happen but safety check)
    if (!selectedRole) {
      setError('Please select your role first.');
      setLoading(false);
      return;
    }

    try {
      // Resolve username to email if needed
      const email = resolveUsernameToEmail(usernameOrEmail);
      const userCredential = await login(email, password);
      
      // Fetch user profile from Firestore to validate role
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        // User authenticated but no profile exists
        await signOut(auth);
        setError('Account not set up. Please contact the administrator.');
        setLoading(false);
        return;
      }

      const userProfile = userDoc.data();
      const actualRole = userProfile.role as UserRole;
      
      // Check if the account is deactivated/inactive
      if (userProfile.status === 'inactive' || userProfile.isActive === false) {
        await signOut(auth);
        setError(`Your account has been deactivated. Please contact the Chancery Office for assistance.\n\nDiocese of Tagbilaran: dioceseoftagbilaran1941@gmail.com\nDiocese of Talibon: talibonchancery@gmail.com`);
        setLoading(false);
        return;
      }

      // Check if the account is pending approval
      if (userProfile.status === 'pending') {
        await signOut(auth);
        setError('Your account is pending approval. Please wait for the administrator to approve your registration.');
        setLoading(false);
        return;
      }

      // Validate that the selected role matches the user's actual role
      if (actualRole !== selectedRole) {
        // Sign out the user immediately
        await signOut(auth);
        
        // Get the friendly name for the actual role
        const actualRoleConfig = roleConfig[actualRole];
        const selectedRoleConfig = roleConfig[selectedRole];
        
        if (actualRoleConfig) {
          setError(
            `This account is not a ${selectedRoleConfig.title} account. Please select "${actualRoleConfig.title}" to continue.`
          );
        } else {
          setError('Invalid account role. Please contact the administrator.');
        }
        
        setLoading(false);
        return;
      }
      
      // Save selected role for next time
      localStorage.setItem('visita_last_login_role', selectedRole);
      
      // Show success toast
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to your dashboard...",
        duration: 5000,
      });
      
      // Wait to show the loading overlay and toast
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to dashboard
      navigate('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login';
      const errorCode = (error as { code?: string }).code;

      // Translate Firebase errors to user-friendly messages
      if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
        setError('Your account has been deactivated. Please contact the Chancery Office for assistance.');
      } else if (errorCode === 'auth/invalid-credential' ||
          errorCode === 'auth/wrong-password' ||
          errorCode === 'auth/user-not-found' ||
          errorCode === 'auth/invalid-login-credentials' ||
          errorMessage.includes('auth/invalid-credential') ||
          errorMessage.includes('auth/wrong-password') ||
          errorMessage.includes('auth/user-not-found') ||
          errorMessage.includes('auth/invalid-login-credentials')) {
        setError('Invalid email or password.');
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (errorCode === 'auth/too-many-requests' || errorMessage.includes('auth/too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else if (errorCode === 'auth/user-disabled' || errorMessage.includes('auth/user-disabled')) {
        setError('This account has been disabled. Please contact the Chancery Office for assistance.');
      } else if (errorCode === 'auth/network-request-failed' || errorMessage.includes('auth/network-request-failed')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Login Loading Overlay - Shows while logging in */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center space-y-6">
              {/* Animated Spinner */}
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary/20"></div>
              </div>
              
              {/* Message */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Logging In</h3>
                <p className="text-muted-foreground">
                  Authenticating your credentials...
                </p>
                <p className="text-sm text-muted-foreground/80 pt-2">
                  Please wait
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        {/* Step 1: Role Selection */}
        {!selectedRole ? (
          <div className="w-full max-w-4xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-28 h-28 rounded-full overflow-hidden bg-white shadow-xl border-4 border-indigo-100 mb-6">
                <img 
                  src={visitaLogo} 
                  alt="VISITA Logo" 
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">VISITA Admin</h1>
              <p className="text-slate-600 text-lg">Bohol Churches Information System</p>
              <p className="text-slate-500 mt-4">Select your role to continue</p>
            </div>
            
            {/* Role Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {(Object.keys(roleConfig) as Array<keyof typeof roleConfig>).map((role) => {
                const config = roleConfig[role];
                const IconComponent = config.icon;
                
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`
                      group relative bg-white rounded-2xl p-6 border-2 transition-all duration-300
                      ${config.borderColor} ${config.bgHover}
                      hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                      text-left
                    `}
                  >
                    {/* Icon */}
                    <div className={`w-14 h-14 ${config.iconBg} rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                      <IconComponent className={`w-7 h-7 ${config.iconColor}`} />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {config.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {config.description}
                    </p>
                    
                    {/* Hover Arrow */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                For account access, contact the Chancery Office
              </p>
            </div>
          </div>
        ) : (
          /* Step 2: Login Form */
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRole(null)}
                className="absolute left-4 top-4 text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              
              {/* VISITA Logo */}
              <div className="pt-2 mb-2">
                <div className="mx-auto w-20 h-20 rounded-full overflow-hidden bg-white shadow-lg border-4 border-indigo-100">
                  <img 
                    src={visitaLogo} 
                    alt="VISITA Logo" 
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
              </div>
              
              {/* Role Badge */}
              <div className="pt-2">
                {selectedRole && (
                  <Badge className={`${roleConfig[selectedRole].badgeClass} mb-3`}>
                    {(() => {
                      const IconComp = roleConfig[selectedRole].icon;
                      return <IconComp className="w-3 h-3 mr-1 inline" />;
                    })()}
                    {roleConfig[selectedRole].title}
                  </Badge>
                )}
              </div>
              
              <CardTitle className="text-2xl font-bold text-slate-800">Welcome Back</CardTitle>
              <CardDescription className="text-slate-500">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {/* Hidden dummy fields to absorb browser autofill */}
                <input type="text" name="email" autoComplete="username" tabIndex={-1} aria-hidden="true" className="hidden" />
                <input type="password" name="password" autoComplete="new-password" tabIndex={-1} aria-hidden="true" className="hidden" />
                
                {error && (
                  <Alert variant="destructive" className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="username"
                    type="email"
                    value={usernameOrEmail}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Enter your email address"
                    disabled={loading}
                    name="login_username"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="h-11"
                  />
                  {usernameHint && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span>✓</span> {usernameHint}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={loading}
                      name="login_password"
                      autoComplete="new-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="pr-10 h-11"
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
                </div>
                
                <Button 
                  type="submit" 
                  className={`w-full h-11 bg-gradient-to-r ${selectedRole ? roleConfig[selectedRole].bgGradient : 'from-indigo-600 to-blue-600'} hover:opacity-90 transition-opacity`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Forgot Password Link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
                    disabled={loading}
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
              
              <div className="mt-6 pt-4 border-t text-center text-sm text-slate-500">
                <p>Need help? Contact the Chancery Office</p>
                {selectedRole === 'chancery_office' && (
                  <p className="mt-2">
                    <a 
                      href="/chancellor-register" 
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                    >
                      New Chancellor? Register here →
                    </a>
                  </p>
                )}
                {selectedRole === 'museum_researcher' && (
                  <p className="mt-2">
                    <a 
                      href="/museum-register" 
                      className="text-amber-600 hover:text-amber-800 hover:underline font-medium"
                    >
                      New Museum Researcher? Register here →
                    </a>
                  </p>
                )}
                {selectedRole === 'parish' && (
                  <p className="mt-2">
                    <a 
                      href="/parish-register" 
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                    >
                      New Parish Staff? Register here →
                    </a>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={resetLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleForgotPassword();
                  }
                }}
              />
            </div>
            
            <Alert>
              <AlertDescription className="text-sm">
                You will receive an email with instructions to reset your password.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsForgotPasswordOpen(false);
                setResetEmail('');
              }}
              disabled={resetLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default Login;

