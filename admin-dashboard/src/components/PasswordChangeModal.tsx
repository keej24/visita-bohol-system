/**
 * PASSWORD CHANGE MODAL
 *
 * Forces users to change their password on first login.
 * This modal cannot be dismissed until the user successfully changes their password.
 *
 * Used for pre-configured accounts (Chancery Office, Museum Researcher)
 * that have default passwords and need to set secure passwords on first login.
 */

import { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { passwordChangeSchema } from '@/lib/validations/user';

interface PasswordChangeModalProps {
  isOpen: boolean;
  userEmail: string;
  userId: string;
  onPasswordChanged: () => void;
}

export const PasswordChangeModal = ({
  isOpen,
  userEmail,
  userId,
  onPasswordChanged
}: PasswordChangeModalProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePasswordStrength = (password: string): string[] => {
    const issues: string[] = [];

    if (password.length < 8) {
      issues.push('At least 8 characters');
    }
    if (!/[a-z]/.test(password)) {
      issues.push('One lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      issues.push('One uppercase letter');
    }
    if (!/\d/.test(password)) {
      issues.push('One number');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      issues.push('One special character (!@#$%^&*)');
    }

    return issues;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate using Zod schema
      const validation = passwordChangeSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        throw new Error(firstError.message);
      }

      // Additional password strength validation
      const strengthIssues = validatePasswordStrength(newPassword);
      if (strengthIssues.length > 0) {
        throw new Error(`Password must contain: ${strengthIssues.join(', ')}`);
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);

      // Update requirePasswordChange flag in Firestore
      await updateDoc(doc(db, 'users', userId), {
        requirePasswordChange: false,
        lastUpdatedAt: new Date(),
        passwordChangedAt: new Date(),
      });

      setSuccess(true);

      // Wait a moment to show success message, then notify parent
      setTimeout(() => {
        onPasswordChanged();
      }, 1500);

    } catch (err) {
      console.error('Password change error:', err);

      if (err instanceof Error) {
        // Handle Firebase auth errors
        if (err.message.includes('auth/requires-recent-login')) {
          setError('For security, please log out and log in again before changing your password.');
        } else if (err.message.includes('auth/weak-password')) {
          setError('Password is too weak. Please use a stronger password.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrengthIssues = newPassword ? validatePasswordStrength(newPassword) : [];
  const showPasswordStrength = newPassword.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-[500px]" hideCloseButton>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Change Your Password
          </DialogTitle>
          <DialogDescription className="text-center">
            For security reasons, you must change your password before accessing the system.
            <br />
            <span className="text-sm text-muted-foreground">
              Account: {userEmail}
            </span>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-green-600">
              Password Changed Successfully!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <p className="text-xs text-muted-foreground">
                This is the temporary password you received
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                disabled={loading}
                autoComplete="new-password"
              />

              {showPasswordStrength && (
                <div className="mt-2">
                  {passwordStrengthIssues.length === 0 ? (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Password meets all requirements
                    </p>
                  ) : (
                    <div className="text-xs text-amber-600">
                      <p className="font-medium mb-1">Password must contain:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        {passwordStrengthIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                disabled={loading}
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600">
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-medium mb-1">
                Password Requirements:
              </p>
              <ul className="text-xs text-blue-700 space-y-0.5 ml-4 list-disc">
                <li>Minimum 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || newPassword !== confirmPassword || passwordStrengthIssues.length > 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
