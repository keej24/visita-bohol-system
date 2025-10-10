import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getInvite, markInviteAccepted, type ParishInvite } from '@/lib/invites';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Register = () => {
  const [params] = useSearchParams();
  const inviteId = params.get('invite') ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<(ParishInvite & { id: string }) | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!inviteId) throw new Error('Missing invite id');
        const inv = await getInvite(inviteId);
        if (!inv) throw new Error('Invite not found');
        if (inv.status !== 'pending') throw new Error('Invite is not valid');
        setInvite(inv);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load invite';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteId]);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (code.trim() !== invite.token) {
      setError('Incorrect invite code');
      return;
    }
    try {
      setError(null);
      // Create Auth user
      const cred = await createUserWithEmailAndPassword(auth, invite.email, password);
      const user = cred.user;
      // Create profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'parish_secretary',
        name,
        diocese: invite.diocese,
        parish: invite.parishName,
        createdAt: serverTimestamp(),
      });
      // Mark invite accepted
      await markInviteAccepted(invite.id, { uid: user.uid, email: user.email || '', name });
      navigate('/login');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-heritage-cream p-4 flex items-center justify-center">
      <Card className="w-full max-w-md heritage-card">
        <CardHeader>
          <CardTitle>Parish Secretary Registration</CardTitle>
          <CardDescription>Complete your account using the invite from the chancery.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm">Loading…</p>
          ) : error ? (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={onRegister} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={invite.email} disabled />
              </div>
              <div>
                <Label>Parish</Label>
                <Input value={invite.parishName} disabled />
              </div>
              <div>
                <Label>Invite code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter the code sent to you" required />
              </div>
              <div>
                <Label>Your full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Create password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </div>
              <Button type="submit" className="w-full btn-heritage">Create Account</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

