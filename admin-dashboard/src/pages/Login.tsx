// Login page for VISITA admin dashboard
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Church, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Success",
        description: "Password reset email sent! Check your inbox.",
      });
      setIsForgotPasswordOpen(false);
      setResetEmail('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      
      if (errorMessage.includes('auth/user-not-found')) {
        toast({
          title: "Error",
          description: "No account found with this email address",
          variant: "destructive"
        });
      } else if (errorMessage.includes('auth/invalid-email')) {
        toast({
          title: "Error",
          description: "Invalid email address",
          variant: "destructive"
        });
      } else if (errorMessage.includes('auth/too-many-requests')) {
        toast({
          title: "Error",
          description: "Too many requests. Please try again later.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send password reset email",
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
    if (!email.trim() || !password.trim()) {
      setError('Please enter username and password.');
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login';

      // Translate Firebase errors to user-friendly messages
      if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
        setError('Your account has been deactivated. Please contact the administrator.');
      } else if (errorMessage.includes('auth/invalid-credential') ||
          errorMessage.includes('auth/wrong-password') ||
          errorMessage.includes('auth/user-not-found') ||
          errorMessage.includes('auth/invalid-login-credentials')) {
        setError('Invalid username or password.');
      } else if (errorMessage.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (errorMessage.includes('auth/too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else if (errorMessage.includes('auth/user-disabled')) {
        setError('This account has been disabled. Contact the Chancery Office.');
      } else if (errorMessage.includes('auth/network-request-failed')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-heritage-cream p-4">
      <Card className="w-full max-w-md heritage-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Church className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">VISITA Admin</CardTitle>
          <CardDescription>
            Bohol Churches Information System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Hidden dummy fields to absorb browser autofill */}
            <input type="text" name="email" autoComplete="username" tabIndex={-1} aria-hidden="true" className="hidden" />
            <input type="password" name="password" autoComplete="new-password" tabIndex={-1} aria-hidden="true" className="hidden" />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                name="login_email"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                name="login_password"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full btn-heritage" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>For account access, contact the Chancery Office</p>
          </div>
        </CardContent>
      </Card>

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
  );
};

export default Login;

