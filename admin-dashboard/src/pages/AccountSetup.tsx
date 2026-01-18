// Account Setup Component - Use this to create pre-configured accounts
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { createPreConfiguredAccounts, testLogin } from '@/lib/setup-accounts';
import { checkAndFixAccounts } from '@/lib/check-accounts';
import { CheckCircle, AlertCircle, Users, Key, Shield, RefreshCw } from 'lucide-react';

interface AccountResult {
  success: boolean;
  email: string;
  uid?: string;
  role?: string;
  diocese?: string;
  error?: string;
  action?: 'profile_created' | 'profile_exists' | 'failed';
}

const AccountSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<AccountResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const handleCreateAccounts = async () => {
    setIsCreating(true);
    setResults([]);
    
    try {
      // First, try to check and fix existing accounts
      const fixResults = await checkAndFixAccounts();
      setResults(fixResults);
      setIsComplete(true);
    } catch (error) {
      console.error('Error checking accounts:', error);
      // If that fails, try creating new accounts
      try {
        const accountResults = await createPreConfiguredAccounts();
        setResults(accountResults);
        setIsComplete(true);
      } catch (createError) {
        console.error('Error creating accounts:', createError);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const testLoginHandler = async (email: string, password: string) => {
    const result = await testLogin(email, password);
    console.log('Test login result:', result);
  };

  const preConfiguredCredentials = [
    {
      role: 'Chancery Office - Tagbilaran',
      email: 'dioceseoftagbilaran1941@gmail.com',
      password: 'ChanceryTagbilaran2025!',
      access: 'Diocese of Tagbilaran management'
    },
    {
      role: 'Chancery Office - Talibon',
      email: 'talibonchancery@gmail.com',
      password: 'ChanceryTalibon2025!',
      access: 'Diocese of Talibon management'
    },
    {
      role: 'Museum Researcher',
      email: 'bohol@nationalmuseum.gov.ph',
  password: 'HeritageResearcher2024!',
      access: 'Heritage validation across both dioceses'
    }
  ];

  return (
    <div className="min-h-screen bg-heritage-cream p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">VISITA Account Setup</h1>
          <p className="text-muted-foreground">Create pre-configured accounts for Chancery Office and Museum Researchers</p>
        </div>

        {!isComplete && (
          <Card className="heritage-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pre-configured Accounts
              </CardTitle>
              <CardDescription>
                Click the button below to create administrator accounts for the VISITA system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {preConfiguredCredentials.map((account, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-sm">{account.role}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{account.access}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Email:</span>
                        <code className="bg-background px-1 rounded">{account.email}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Password:</span>
                        <code className="bg-background px-1 rounded">{account.password}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  These accounts will be created in Firebase Authentication with corresponding user profiles in Firestore.
                  Make sure your Firebase project is properly configured.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleCreateAccounts}
                disabled={isCreating}
                className="w-full btn-heritage"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking & Fixing Accounts...
                  </>
                ) : (
                  'Check & Fix Pre-configured Accounts'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card className="heritage-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Account Creation Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  result.success ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{result.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.success 
                          ? `Action: ${result.action} | Role: ${result.role} | Diocese: ${result.diocese}` 
                          : result.error}
                      </p>
                    </div>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'Created' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              ))}

              {isComplete && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Account setup complete! You can now use the credentials above to log in to the VISITA system.
                    Navigate to <code>/login</code> to test the accounts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AccountSetup;

