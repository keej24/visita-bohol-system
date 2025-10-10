// Test Login Component for debugging
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { debugAccountIssues } from '@/lib/debug-accounts';
import { testFirestoreAccess } from '@/lib/test-firestore';

interface TestResult {
  success: boolean;
  message: string;
}

const TestLogin = () => {
  const [result, setResult] = useState<TestResult | null>(null);
  const [debugResults, setDebugResults] = useState<unknown[]>([]);
  const { login, user, userProfile, loading } = useAuth();

  const handleDebugAccounts = async () => {
    const results = await debugAccountIssues();
    setDebugResults(results);
  };

  const handleTestFirestore = async () => {
    // Test with Tagbilaran account
    await testFirestoreAccess('dioceseoftagbilaran1941@gmail.com', 'ChanceryTagbilaran2025!');
  };

  const testAccounts = [
    {
      email: 'dioceseoftagbilaran1941@gmail.com',
      password: 'ChanceryTagbilaran2025!',
      role: 'Chancery Tagbilaran'
    },
    {
      email: 'talibonchancery@gmail.com',
      password: 'ChanceryTalibon2025!',
      role: 'Chancery Talibon'
    },
    {
      email: 'researcher.heritage@museum.ph',
      password: 'HeritageResearcher2024!',
      role: 'Museum Researcher'
    }
  ];

  const handleTestLogin = async (email: string, password: string, role: string) => {
    try {
      console.log('Attempting login for:', email);
      await login(email, password);
      setResult({ success: true, message: `Successfully logged in as ${role}` });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.error('Login error:', error);
      setResult({ success: false, message: errorMessage });
    }
  };

  return (
    <div className="min-h-screen bg-heritage-cream p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="heritage-card mb-6">
          <CardHeader>
            <CardTitle>Debug - Test Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>User:</strong> {user ? user.email : 'None'}</p>
              <p><strong>Profile:</strong> {userProfile ? `${userProfile.role} - ${userProfile.diocese}` : 'None'}</p>
            </div>

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleDebugAccounts}
                className="w-full mb-2"
                variant="destructive"
              >
                🔍 Debug Account Issues
              </Button>
              
              <Button
                onClick={handleTestFirestore}
                className="w-full mb-4"
                variant="secondary"
              >
                🔥 Test Firestore Access
              </Button>
              
              {testAccounts.map((account, index) => (
                <Button
                  key={index}
                  onClick={() => handleTestLogin(account.email, account.password, account.role)}
                  className="w-full"
                  variant="outline"
                >
                  Test Login: {account.role}
                </Button>
              ))}
            </div>

            {debugResults.length > 0 && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Debug Results:</h3>
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(debugResults, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestLogin;

