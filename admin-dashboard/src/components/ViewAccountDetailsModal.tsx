import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  Mail, 
  MapPin, 
  Building, 
  Calendar,
  Key,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Shield
} from 'lucide-react';

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: string;
  diocese: string;
  parish?: string;
  parishId?: string;
  parishInfo?: {
    name: string;
    municipality: string;
    fullName: string;
  };
  municipality?: string;
  status: string;
  createdAt: Date;
  createdBy?: string | {
    uid: string;
    email: string;
    name: string;
  };
  lastLogin?: Date;
}

interface Props {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewAccountDetailsModal = ({ user, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const handleSendPasswordReset = async () => {
    setSendingReset(true);
    setResetSent(false);
    
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      toast({
        title: "Password Reset Sent",
        description: `A password reset email has been sent to ${user.email}`,
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingReset(false);
    }
  };

  const copyAccountDetails = async () => {
    const details = `
VISITA Parish Account Details
============================
Parish: ${user.parishInfo?.fullName || user.name}
Email: ${user.email}
Municipality: ${user.parishInfo?.municipality || user.municipality || 'N/A'}
Diocese: ${user.diocese}
Status: ${user.status}
Created: ${user.createdAt.toLocaleString()}
Login URL: ${window.location.origin}/login

Note: To set or reset the password, use the "Send Password Reset Email" button.
The parish secretary will receive an email with instructions to create their own password.
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Account details copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Account Details
          </DialogTitle>
          <DialogDescription>
            View account information and manage password reset
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{user.name}</h3>
              <div className="flex items-center gap-2">
                <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {user.status}
                </Badge>
                <Badge variant="outline">
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 p-2 rounded bg-secondary/40">
                <Mail className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">Email</div>
                  <div className="font-mono">{user.email}</div>
                </div>
              </div>

              {(user.parishInfo?.municipality || user.municipality) && (
                <div className="flex items-start gap-2 p-2 rounded bg-secondary/40">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-0.5">Municipality</div>
                    <div>{user.parishInfo?.municipality || user.municipality}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-2 rounded bg-secondary/40">
                <Building className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">Diocese</div>
                  <div className="capitalize">{user.diocese}</div>
                </div>
              </div>

              {user.parishId && (
                <div className="flex items-start gap-2 p-2 rounded bg-secondary/40">
                  <Shield className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-0.5">Parish ID</div>
                    <div className="font-mono text-xs">{user.parishId}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-2 rounded bg-secondary/40">
                <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">Created</div>
                  <div>{user.createdAt.toLocaleString()}</div>
                  {user.createdBy && (
                    <div className="text-xs text-muted-foreground mt-1">
                      by {typeof user.createdBy === 'string' ? user.createdBy : (user.createdBy.name || user.createdBy.email)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Password Management Section */}
          <div className="space-y-3">
            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Password Management
              </h4>
              
              <Alert className="bg-blue-50 border-blue-200 py-2 mb-3">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-xs">
                  For security reasons, passwords cannot be viewed or retrieved. 
                  However, you can send a password reset email to allow the user to create a new password.
                </AlertDescription>
              </Alert>

              {resetSent && (
                <Alert className="bg-green-50 border-green-200 py-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 text-xs">
                    Password reset email sent successfully! The user will receive instructions to create a new password.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleSendPasswordReset}
                disabled={sendingReset}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {sendingReset ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Send Password Reset Email
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Copy Details Section */}
          <div className="border-t pt-3">
            <Button 
              onClick={copyAccountDetails}
              variant="secondary"
              className="w-full"
              size="sm"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Account Details
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Copy all account details to share with the parish secretary
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full btn-heritage">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAccountDetailsModal;
