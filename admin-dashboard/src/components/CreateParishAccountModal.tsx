import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import type { Diocese } from '@/hooks/useAuth';
import { createAuthUserAndSendPasswordReset } from '@/lib/accounts';
import { generateParishId, formatParishFullName, getMunicipalitiesByDiocese } from '@/lib/parish-utils';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, AlertTriangle, Loader2, Mail } from 'lucide-react';

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
  const [success, setSuccess] = useState(false); // Tracks successful account creation
  const [createdEmail, setCreatedEmail] = useState(''); // Store the email for success message
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
      
      // Get only ACTIVE parish secretary accounts in this diocese
      const allAccountsCheck = await getDocs(
        query(
          collection(db, 'users'),
          where('diocese', '==', diocese),
          where('role', '==', 'parish_secretary'),
          where('status', '==', 'active')
        )
      );

      console.log('📋 Active accounts in diocese:', allAccountsCheck.size, 'accounts');
      console.log('📌 Looking for duplicate of:', `${name} in ${mun}`);

      // Check each active account
      for (const doc of allAccountsCheck.docs) {
        const data = doc.data();
        console.log('  Checking account:', {
          email: data.email,
          parish: data.parish,
          municipality: data.municipality,
          parishId: data.parishId,
          name: data.name,
          status: data.status
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
      
      // Only check active accounts - deactivated accounts can have their email reused
      // Note: Firebase Auth may still block if the email exists there
      const emailCheck = await getDocs(
        query(
          collection(db, 'users'), 
          where('email', '==', emailLower),
          where('status', '==', 'active')
        )
      );

      if (!emailCheck.empty) {
        const existingUser = emailCheck.docs[0].data();
        console.log('  ❌ EMAIL ALREADY EXISTS (active account):', existingUser.email);
        setEmailWarning(`This email is already registered${existingUser.name ? ` for ${existingUser.name}` : ''} (active account)`);
      } else {
        console.log('✅ Email is available (no active account)');
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
      if (!parishName || !municipality || !email) {
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
      
      // Check if email already exists in Firestore (only active accounts)
      const emailLower = email.trim().toLowerCase();
      const emailCheck = await getDocs(
        query(
          collection(db, 'users'), 
          where('email', '==', emailLower),
          where('status', '==', 'active')
        )
      );
      
      if (!emailCheck.empty) {
        throw new Error('An active account with this email already exists. Please use a different email or reactivate the existing account.');
      }
      
      // Create user and send password reset email (user sets their own password)
      const cred = await createAuthUserAndSendPasswordReset(emailLower);
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
        
        // Email verification - will be true after user clicks password reset link
        emailVerified: false,
        passwordResetEmailSentAt: serverTimestamp(),
        
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: { uid: userProfile.uid, email: userProfile.email, name: userProfile.name },
      });
      
      setCreatedEmail(emailLower);
      setSuccess(true);
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

  const reset = () => {
    setEmail('');
    setParishName('');
    setMunicipality('');
    setSuccess(false);
    setCreatedEmail('');
    setError(null);
    setDuplicateWarning(null);
    setCheckingDuplicate(false);
    setSimilarChurches([]);
    setEmailWarning(null);
    setCheckingEmail(false);
  };

  const handleOpenChange = (v: boolean) => {
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
          <DialogDescription>Create a parish account under the {diocese} diocese.</DialogDescription>
        </DialogHeader>

        {!success ? (
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
              
              <p className="text-xs text-muted-foreground">
                A password setup email will be sent to this address.
              </p>
            </div>
            
            {/* Preview/Confirmation Banner - Shows all details before submission */}
            {parishName && municipality && email && !duplicateWarning && !emailWarning && email.includes('@') && (
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
                  </div>
                  
                  <p className="text-xs text-amber-800 mt-2">
                    <Mail className="h-3 w-3 inline mr-1" />
                    A password setup email will be sent to this address after account creation.
                  </p>
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
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200 py-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-900">
                <p className="font-semibold text-base mb-1">Account created successfully!</p>
                <p className="text-sm">A password setup email has been sent to:</p>
                <code className="block mt-2 p-2 bg-white rounded border text-sm font-mono">{createdEmail}</code>
              </AlertDescription>
            </Alert>
            
            <Alert className="bg-blue-50 border-blue-200 py-3">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <p className="font-medium mb-2">What happens next:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>The parish secretary will receive an email with a link to set their password</li>
                  <li>After setting their password, their email will be automatically verified</li>
                  <li>They can then log in to the VISITA admin dashboard</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <Alert className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Tip:</strong> If the parish secretary doesn't receive the email, they can use the 
                "Forgot Password" link on the login page, or you can resend from User Management.
              </AlertDescription>
            </Alert>
            
            <DialogFooter>
              <Button 
                onClick={() => setOpen(false)} 
                className="w-full btn-heritage"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateParishAccountModal;

