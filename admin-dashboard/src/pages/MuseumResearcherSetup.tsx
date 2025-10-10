// Museum Researcher Setup Page
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Crown, CheckCircle, AlertTriangle } from "lucide-react";
import { setupMuseumResearcher } from "@/scripts/setup-museum-researcher";

interface SetupResult {
  success: boolean;
  message?: string;
  error?: string;
  credentials?: {
    email: string;
    password: string;
  };
}

export function MuseumResearcherSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const setupResult = await setupMuseumResearcher();
      setResult(setupResult);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Setup failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-heritage-cream p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-primary">Museum Researcher Setup</h1>
          </div>
          <p className="text-muted-foreground">
            Set up the Museum Researcher account for heritage validation
          </p>
        </div>

        <Card className="heritage-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              Heritage Validation Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 text-sm">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2">Account Details</h3>
                <div className="space-y-1">
                  <p><strong>Email:</strong> researcher.heritage@museum.ph</p>
                  <p><strong>Role:</strong> Museum Researcher</p>
                  <p><strong>Permissions:</strong> Heritage validation, cross-diocese access</p>
                  <p><strong>Primary Diocese:</strong> Tagbilaran (with Talibon access)</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Capabilities</h3>
                <ul className="text-blue-700 space-y-1">
                  <li>• Review and validate heritage church submissions</li>
                  <li>• Approve Important Cultural Property (ICP) designations</li>
                  <li>• Grant National Cultural Treasure (NCT) status</li>
                  <li>• Access church data across both dioceses</li>
                  <li>• Enhance cultural content and historical accuracy</li>
                </ul>
              </div>
            </div>

            <Button 
              onClick={handleSetup} 
              disabled={loading || (result?.success)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up account...
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Account Ready
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Setup Museum Researcher
                </>
              )}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                    {result.success ? result.message : `Error: ${result.error}`}
                    {result.credentials && (
                      <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                        <strong>Login Credentials:</strong><br />
                        Email: {result.credentials.email}<br />
                        Password: {result.credentials.password}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {result?.success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Next Steps</h3>
                <ol className="text-green-700 space-y-1 text-sm">
                  <li>1. Navigate to the login page</li>
                  <li>2. Use the credentials: researcher.heritage@museum.ph</li>
                  <li>3. Access the Museum Researcher Dashboard</li>
                  <li>4. Begin heritage validation workflow</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
