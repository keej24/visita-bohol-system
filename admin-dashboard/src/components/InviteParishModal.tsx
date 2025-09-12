import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createParishInvite } from '@/lib/invites';
import { useAuth } from '@/contexts/AuthContext';
import type { Diocese } from '@/contexts/AuthContext';
import { Copy } from 'lucide-react';

interface InviteParishModalProps {
  diocese: Diocese;
  trigger?: React.ReactNode;
}

export const InviteParishModal = ({ diocese, trigger }: InviteParishModalProps) => {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [parishName, setParishName] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ id: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      if (!userProfile) throw new Error('Not authenticated');
      const res = await createParishInvite({
        diocese,
        parishName: parishName.trim(),
        email: email.trim(),
        createdBy: { uid: userProfile.uid, email: userProfile.email, name: userProfile.name },
      });
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invite';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const copyDetails = async () => {
    if (!result) return;
    const url = `${window.location.origin}/register?invite=${result.id}`;
    const text = `Parish Secretary Invite\nParish: ${parishName}\nDiocese: ${diocese}\nRegistration link: ${url}\nInvite code: ${result.token}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // ignore clipboard errors
    }
  };

  const reset = () => {
    setEmail('');
    setParishName('');
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="btn-heritage">Add Parish Account</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Parish Secretary</DialogTitle>
          <DialogDescription>Send an invite for a parish secretary to register under the {diocese} diocese.</DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parish">Parish name</Label>
              <Input id="parish" value={parishName} onChange={(e) => setParishName(e.target.value)} required placeholder="e.g., St. Joseph the Worker Parish" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Secretary email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@parish.ph" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={creating} className="btn-heritage w-full">{creating ? 'Creating…' : 'Create Invite'}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Invite created successfully. Share the registration link and invite code below.</p>
            <div className="p-3 rounded border bg-secondary/40 text-sm">
              <div className="flex items-center justify-between"><span>Registration link</span>
                <Button variant="ghost" size="icon" onClick={copyDetails} title="Copy"><Copy className="w-4 h-4" /></Button>
              </div>
              <code className="block mt-1 break-all">{`${window.location.origin}/register?invite=${result.id}`}</code>
              <div className="mt-2">Invite code: <code className="px-1 rounded bg-background font-semibold">{result.token}</code></div>
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

export default InviteParishModal;
