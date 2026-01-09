import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import type { Diocese } from '@/hooks/useAuth';
import { createAuthUserWithoutAffectingSession, generateTempPassword } from '@/lib/accounts';
import { generateParishId, formatParishFullName, getMunicipalitiesByDiocese } from '@/lib/parish-utils';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Copy, Eye, EyeOff, Wand2, CheckCircle2, AlertTriangle, Loader2, Mail, Send } from 'lucide-react';

interface Props {
  diocese: Diocese;
  trigger?: React.ReactNode;
}

export const CreateParishAccountModal = ({ diocese, trigger }: Props) => {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [parishName, setParishName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [similarChurches, setSimilarChurches] = useState<Array<{ municipality: string; email: string }>>([]);

  // Real-time duplicate checking
  const checkForDuplicates = useCallback(async (name: string, mun: string) => {
    if (!name || !mun) {
      setDuplicateWarning(null);
      setSimilarChurches([]);
      return;
    }

    setCheckingDuplicate(true);
    const similar: Array<{ municipality: string; email: string }> = [];
    
    try {
      const parishId = generateParishId(diocese, mun, name);
      console.log('🔍 Checking for duplicates:', { name, mun, diocese, generatedParishId: parishId });
      console.log('🎯 Target parish ID we are looking for:', parishId);
      
      // Get ALL parish secretary accounts in this diocese
      const allAccountsCheck = await getDocs(
        query(
          collection(db, 'users'),
          where('diocese', '==', diocese),
          where('role', '==', 'parish_secretary')
        )
      );

      console.log('📋 All accounts in diocese:', allAccountsCheck.size, 'accounts');
      console.log('📌 Looking for duplicate of:', `${name} in ${mun}`);

      // Check each account
      for (const doc of allAccountsCheck.docs) {
        const data = doc.data();
        console.log('  Checking account:', {
          email: data.email,
          parish: data.parish,
          municipality: data.municipality,
          parishId: data.parishId,
          name: data.name
        });
        console.log('  📍 Existing parishId:', data.parishId);
        console.log('  📍 Looking for parishId:', parishId);
        
        // Method 1: Direct parishId match (for new accounts)
        if (data.parishId && data.parishId === parishId) {
          console.log('  ❌ DUPLICATE FOUND (direct parishId match)!');
          console.log('  Match details:', {
            existingParishId: data.parishId,
            searchingForParishId: parishId,
            email: data.email
          });
          const existingMunicipality = data.municipality || data.parishInfo?.municipality || 'unknown location';
          setDuplicateWarning(`An account for "${name}" in ${existingMunicipality} already exists (${data.email})`);
          setCheckingDuplicate(false);
          setSimilarChurches([]);
          return;
        } else if (data.parishId) {
          console.log('  ℹ️ No match on direct parishId:', {
            existing: data.parishId,
            searching: parishId
          });
        }

        // Method 2: Check if existing parishId matches when we apply same normalization
        // This catches accounts created before normalization was updated
        if (data.parishId) {
          // Try to regenerate parishId from the stored parish field or name
          const storedParishName = data.name || data.parish;
          const storedMunicipality = data.municipality || data.parishInfo?.municipality;
          
          // Only check if we have ACTUAL stored municipality data
          // Don't use fallback to avoid false positives when municipality is different
          if (storedParishName && storedMunicipality) {
            const regeneratedId = generateParishId(diocese, storedMunicipality, storedParishName);
            console.log('  🔄 Regenerated ID from stored name:', regeneratedId, 'vs', parishId);
            console.log('  🔄 Used municipality:', storedMunicipality, '(stored:', data.municipality, ')');
            
            if (regeneratedId === parishId) {
              console.log('  ❌ DUPLICATE FOUND (regenerated match)!');
              setDuplicateWarning(`An account for this parish already exists in ${storedMunicipality} (${data.email})`);
              setCheckingDuplicate(false);
              setSimilarChurches([]);
              return;
            }
            
            // Track similar church names in different municipalities
            if (storedParishName.toLowerCase().includes(name.toLowerCase()) && storedMunicipality !== mun) {
              similar.push({ municipality: storedMunicipality, email: data.email });
            }
          }
        }

        // Method 3: Legacy accounts without parishId but with municipality info
        if (!data.parishId && data.parish) {
          const storedMunicipality = data.municipality || data.parishInfo?.municipality;
          
          // Only check if we have ACTUAL stored municipality data
          // This prevents false positives when the municipality is genuinely different
          if (storedMunicipality) {
            const legacyParishId = generateParishId(diocese, storedMunicipality, data.parish);
            console.log('  🔄 Generated legacy parishId:', legacyParishId, 'vs', parishId);
            
            if (legacyParishId === parishId) {
              console.log('  ❌ DUPLICATE FOUND (legacy match)!');
              setDuplicateWarning(`An account for this parish already exists in ${storedMunicipality} (${data.email})`);
              setCheckingDuplicate(false);
              setSimilarChurches([]);
              return;
            }
            
            // Track similar church names in different municipalities
            if (data.parish.toLowerCase().includes(name.toLowerCase()) && storedMunicipality !== mun) {
              similar.push({ municipality: storedMunicipality, email: data.email });
            }
          }
        }
      }

      // No duplicates found
      console.log('✅ No duplicates found');
      setDuplicateWarning(null);
      setSimilarChurches(similar);
    } catch (err) {
      console.error('❌ Error checking duplicates:', err);
      setDuplicateWarning(null);
      setSimilarChurches([]);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [diocese]);

  // Real-time email duplicate checking
  const checkEmailDuplicate = useCallback(async (emailToCheck: string) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailToCheck || !emailRegex.test(emailToCheck)) {
      setEmailWarning(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const emailLower = emailToCheck.trim().toLowerCase();
      console.log('🔍 Checking for duplicate email:', emailLower);
      
      const emailCheck = await getDocs(
        query(collection(db, 'users'), where('email', '==', emailLower))
      );

      if (!emailCheck.empty) {
        const existingUser = emailCheck.docs[0].data();
        console.log('  ❌ EMAIL ALREADY EXISTS:', existingUser.email);
        setEmailWarning(`This email is already registered${existingUser.name ? ` for ${existingUser.name}` : ''}`);
      } else {
        console.log('✅ Email is available');
        setEmailWarning(null);
      }
    } catch (err) {
      console.error('❌ Error checking email:', err);
      setEmailWarning(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  // Real-time duplicate checking when parish name or municipality changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (parishName && municipality) {
        checkForDuplicates(parishName, municipality);
      }
    }, 500); // Debounce for 500ms to avoid too many checks while typing

    return () => clearTimeout(timeoutId);
  }, [parishName, municipality, checkForDuplicates]);

  // Real-time email checking when email changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (email) {
        checkEmailDuplicate(email);
      } else {
        setEmailWarning(null);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [email, checkEmailDuplicate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      if (!userProfile) throw new Error('Not authenticated');
      
      // Validate all required fields
      if (!parishName || !municipality || !email || !password || !confirm) {
        throw new Error('Please complete all required fields.');
      }
      
      // Validate municipality is selected
      if (!municipality || municipality.trim().length === 0) {
        throw new Error('Please select a municipality. This is required to create unique parish identifiers.');
      }
      
      // Generate unique parish ID using diocese + municipality + parish name
      const parishId = generateParishId(diocese, municipality, parishName);
      const parishFullName = formatParishFullName(parishName, municipality);
      
      // Check if account already exists for this specific parish (not just email)
      const parishCheck = await getDocs(
        query(
          collection(db, 'users'),
          where('parishId', '==', parishId),
          where('role', '==', 'parish_secretary'),
          where('status', '==', 'active')
        )
      );
      
      if (!parishCheck.empty) {
        throw new Error(`An active parish account already exists for ${parishFullName}. Only one account per parish is allowed.`);
      }
      
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
        
        // NEW: Use unique parish identifier
        parishId: parishId,
        
        // NEW: Store structured parish information
        parishInfo: {
          name: parishName,
          municipality: municipality,
          fullName: parishFullName
        },
        
        // DEPRECATED: Keep for backward compatibility during migration
        parish: parishId,
        
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: { uid: userProfile.uid, email: userProfile.email, name: userProfile.name },
      });
      
      setCredentials({ email: emailLower, password: finalPassword });
      
      // Automatically send password reset email to the parish user
      try {
        setSendingEmail(true);
        await sendPasswordResetEmail(auth, emailLower, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false
        });
        setEmailSent(true);
        console.log('✅ Password reset email sent to:', emailLower);
      } catch (emailErr) {
        console.error('❌ Failed to send password reset email:', emailErr);
        setEmailError('Account created but failed to send email. You can resend from User Management.');
      } finally {
        setSendingEmail(false);
      }
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
      // Don't reset copied state - keep it true so user can close the dialog
    } catch (e) {
      setError('Failed to copy');
      setTimeout(() => setError(null), 2000);
    }
  };

  // Resend welcome email with password reset link
  const resendEmail = async () => {
    if (!credentials?.email) return;
    setSendingEmail(true);
    setEmailError(null);
    try {
      await sendPasswordResetEmail(auth, credentials.email);
      setEmailSent(true);
      console.log('✅ Password reset email resent to:', credentials.email);
    } catch (err) {
      console.error('❌ Failed to resend email:', err);
      setEmailError('Failed to send email. Please try again or use User Management.');
    } finally {
      setSendingEmail(false);
    }
  };

  const reset = () => {
    setEmail('');
    setParishName('');
    setMunicipality('');
    setPassword('');
    setConfirm('');
    setCredentials(null);
    setError(null);
    setShow(false);
    setCopied(false);
    setEmailSent(false);
    setSendingEmail(false);
    setEmailError(null);
    setDuplicateWarning(null);
    setCheckingDuplicate(false);
    setSimilarChurches([]);
    setEmailWarning(null);
    setCheckingEmail(false);
  };

  const handleOpenChange = (v: boolean) => {
    // If trying to close and credentials exist but not copied, prevent closing
    if (!v && credentials && !copied) {
      setError('Please copy the credentials before closing. You cannot view them again.');
      return;
    }
    setOpen(v);
    if (!v) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="btn-heritage">Add Parish Account</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Parish Account</DialogTitle>
          <DialogDescription>Create a parish account under the {diocese} diocese and share credentials.</DialogDescription>
        </DialogHeader>

        {!credentials ? (
          <form onSubmit={onSubmit} className="space-y-3" autoComplete="off">
            <Alert className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Each parish can have only ONE parish account. 
                If a parish already has an account, you cannot create another one.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-1.5">
              <Label className="text-sm">Parish name *</Label>
              <Input value={parishName} onChange={(e) => setParishName(e.target.value)} placeholder="e.g., San Isidro Labrador Parish" autoComplete="off" className="h-9" />
              <p className="text-xs text-muted-foreground">
                System treats "St." and "Saint", "Sto." and "Santo" as the same.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm">Municipality *</Label>
              <Select value={municipality} onValueChange={setMunicipality}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select municipality" />
                </SelectTrigger>
                <SelectContent>
                  {getMunicipalitiesByDiocese(diocese).map((mun) => (
                    <SelectItem key={mun} value={mun}>
                      {mun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Duplicate Warning - Shows in real-time */}
            {checkingDuplicate && parishName && municipality && (
              <Alert className="bg-gray-50 border-gray-200 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                <AlertDescription className="text-sm text-gray-900">
                  Checking for existing accounts...
                </AlertDescription>
              </Alert>
            )}
            
            {duplicateWarning && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {duplicateWarning}
                </AlertDescription>
              </Alert>
            )}
            
            {parishName && municipality && !checkingDuplicate && !duplicateWarning && (
              <Alert className="bg-blue-50 border-blue-200 py-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Account will be created for:</strong><br />
                  {formatParishFullName(parishName, municipality)}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-1.5">
              <Label className="text-sm">Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@parish.ph" autoComplete="off" className="h-9" />
              
              {/* Email validation feedback */}
              {checkingEmail && email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Checking email availability...</span>
                </div>
              )}
              
              {emailWarning && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{emailWarning}</span>
                </div>
              )}
              
              {email && !checkingEmail && !emailWarning && email.includes('@') && (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Email is available</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Password <span className="text-destructive">*</span></Label>
                <button type="button" className="text-xs text-primary inline-flex items-center gap-1" onClick={() => {
                  const p = generateTempPassword();
                  setPassword(p);
                  setConfirm(p);
                }} title="Generate strong password">
                  <Wand2 className="w-3 h-3" /> Generate
                </button>
              </div>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password or click Generate" minLength={8} autoComplete="new-password" className="h-9 pr-9" />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" minLength={8} autoComplete="new-password" className="h-9" />
            </div>
            
            {/* Preview/Confirmation Banner - Shows all details before submission */}
            {parishName && municipality && email && password && confirm && !duplicateWarning && !emailWarning && (
              <Alert className="bg-amber-50 border-amber-500 border-2 py-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertDescription>
                  <p className="font-semibold text-amber-900 mb-3">⚠️ Please review these details carefully before creating the account:</p>
                  
                  <div className="bg-white rounded-lg p-3 space-y-2 border border-amber-200">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-600 uppercase">Parish Name:</span>
                      <span className="text-sm font-semibold text-gray-900 text-right">{parishName}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-600 uppercase">Municipality:</span>
                      <span className="text-sm font-semibold text-gray-900 text-right">{municipality}</span>
                    </div>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-600 uppercase">Email:</span>
                      <span className="text-sm font-mono text-gray-900 text-right break-all">{email}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-600 uppercase">Password:</span>
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">{password}</code>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="py-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter className="pt-2">
              <Button 
                type="submit" 
                disabled={creating || checkingDuplicate || !!duplicateWarning || checkingEmail || !!emailWarning} 
                className="btn-heritage w-full h-9"
              >
                {creating ? 'Creating…' : (checkingDuplicate || checkingEmail) ? 'Checking...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <Alert className="bg-green-50 border-green-200 py-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Account created successfully!</strong>
              </AlertDescription>
            </Alert>
            
            {/* Email Status */}
            {sendingEmail && (
              <Alert className="bg-blue-50 border-blue-200 py-3">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>Sending welcome email...</strong> Please wait.
                </AlertDescription>
              </Alert>
            )}
            
            {emailSent && !sendingEmail && (
              <Alert className="bg-emerald-50 border-emerald-200 py-3">
                <Mail className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-900 text-sm">
                  <strong>✓ Email sent!</strong> A password setup link has been sent to <span className="font-mono">{credentials.email}</span>.
                  The parish secretary can click the link to set their own password.
                </AlertDescription>
              </Alert>
            )}
            
            {emailError && (
              <Alert className="bg-amber-50 border-amber-200 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-sm flex items-center justify-between">
                  <span>{emailError}</span>
                  <Button size="sm" variant="outline" onClick={resendEmail} disabled={sendingEmail} className="ml-2">
                    <Send className="w-3 h-3 mr-1" /> Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <Alert className="bg-amber-50 border-amber-200 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                <strong>Important:</strong> Copy these credentials as backup. 
                The temporary password below can be used if the email is not received.
              </AlertDescription>
            </Alert>            <div className="p-3 rounded border bg-secondary/40 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <code className="px-2 py-1 bg-background rounded">{credentials.email}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Temp Password:</span>
                <code className="px-2 py-1 bg-background rounded font-semibold">{credentials.password}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Login URL:</span>
                <code className="px-2 py-1 bg-background rounded text-xs">{`${window.location.origin}/login`}</code>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={copy} className="flex-1" aria-live="polite">
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1 text-success" /> Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" /> Copy All Details
                  </>
                )}
              </Button>
            </div>
            
            {copied && (
              <Alert className="bg-blue-50 border-blue-200 py-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-xs">
                  Credentials copied! You can now paste them in an email or document to share with the parish secretary.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <DialogFooter>
              <Button 
                onClick={() => {
                  if (!copied) {
                    setError('Please copy the credentials before closing. You cannot view them again.');
                    return;
                  }
                  setOpen(false);
                }} 
                disabled={!copied}
                className="w-full btn-heritage"
              >
                {copied ? 'Done' : 'Copy Credentials First'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateParishAccountModal;

