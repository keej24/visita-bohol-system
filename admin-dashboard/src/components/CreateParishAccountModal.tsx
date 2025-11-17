import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import type { Diocese } from '@/hooks/useAuth';
import { createAuthUserWithoutAffectingSession, generateTempPassword } from '@/lib/accounts';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Copy, Eye, EyeOff, Wand2, CheckCircle2 } from 'lucide-react';

interface Props {
  diocese: Diocese;
  trigger?: React.ReactNode;
}

export const CreateParishAccountModal = ({ diocese, trigger }: Props) => {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [parishName, setParishName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      if (!userProfile) throw new Error('Not authenticated');
      
      // Check if email already exists in Firestore
      const emailLower = email.trim().toLowerCase();
      const emailCheck = await getDocs(
        query(collection(db, 'users'), where('email', '==', emailLower))
      );
      
      if (!emailCheck.empty) {
        throw new Error('An account with this email already exists. Please use a different email or check existing parish accounts.');
      }
      
      // Validate password is required
      if (!password || password.trim().length === 0) {
        throw new Error('Password is required. Please enter a password or use the Generate button.');
      }
      
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      if (password !== confirm) {
        throw new Error('Passwords do not match');
      }
      
      const finalPassword = password;
      
      const cred = await createAuthUserWithoutAffectingSession(emailLower, finalPassword);
      const uid = cred.user.uid;
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: emailLower,
        role: 'parish_secretary',
        name: parishName,
        diocese,
        parish: parishName,
        createdAt: serverTimestamp(),
        createdBy: { uid: userProfile.uid, email: userProfile.email, name: userProfile.name },
      });
      setCredentials({ email: emailLower, password: finalPassword });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create account';
      // Improve error messages for common Firebase Auth errors
      let displayMessage = message;
      
      if (message.includes('auth/email-already-in-use')) {
        displayMessage = 'This email is already registered in the system. Please use a different email address or check if an account already exists for this parish.';
      } else if (message.includes('auth/invalid-email')) {
        displayMessage = 'Invalid email format. Please enter a valid email address (e.g., parish@example.com).';
      } else if (message.includes('auth/operation-not-allowed')) {
        displayMessage = 'Email/password accounts are not enabled. Please contact system administrator.';
      } else if (message.includes('auth/weak-password')) {
        displayMessage = 'Password is too weak. Please use at least 8 characters with a mix of letters, numbers, and symbols.';
      }
      
      setError(displayMessage);
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!credentials) return;
    const text = `VISITA Parish Secretary Credentials\nEmail: ${credentials.email}\nTemp Password: ${credentials.password}\nLogin URL: ${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('Failed to copy');
      setTimeout(() => setError(null), 2000);
    }
  };

  const reset = () => {
    setEmail('');
    setParishName('');
    setPassword('');
    setConfirm('');
    setCredentials(null);
    setError(null);
    setShow(false);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="btn-heritage">Add Parish Account</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Parish Account</DialogTitle>
          <DialogDescription>Create a parish secretary account under the {diocese} diocese and share credentials.</DialogDescription>
        </DialogHeader>

        {!credentials ? (
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label>Parish name</Label>
              <Input value={parishName} onChange={(e) => setParishName(e.target.value)} required placeholder="e.g., St. Joseph the Worker Parish" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@parish.ph" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password <span className="text-destructive">*</span></Label>
                <button type="button" className="text-xs text-primary inline-flex items-center gap-1" onClick={() => {
                  const p = generateTempPassword();
                  setPassword(p);
                  setConfirm(p);
                }} title="Generate strong password">
                  <Wand2 className="w-3 h-3" /> Generate
                </button>
              </div>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password or click Generate" minLength={8} autoComplete="new-password" required />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" minLength={8} autoComplete="new-password" required />
              <p className="text-xs text-muted-foreground">Required. Min 8 characters. Use the Generate button for a strong password.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={creating} className="btn-heritage w-full">{creating ? 'Creating…' : 'Create Account'}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Account created. Share credentials securely with the parish secretary.</p>
            <div className="p-3 rounded border bg-secondary/40 text-sm">
              <div>Email: <code className="px-1 bg-background rounded">{credentials.email}</code></div>
              <div>Temp Password: <code className="px-1 bg-background rounded font-semibold">{credentials.password}</code></div>
              <div className="mt-2">Login URL: <code className="px-1 bg-background rounded">{`${window.location.origin}/login`}</code></div>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={copy} aria-live="polite">
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1 text-success" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" /> Copy Details
                    </>
                  )}
                </Button>
                {copied && <span className="text-xs text-success">Details copied</span>}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateParishAccountModal;

