/**
 * FILE PURPOSE: Term Ended Page
 *
 * This page is shown to chancellors and museum researchers whose accounts
 * have been archived after they approved their successor. It provides
 * a clear message about the account transition and preserves dignity
 * of the outgoing staff member.
 *
 * FEATURES:
 * - Clear status message about archived state
 * - Shows successor name (if available)
 * - Thank you message for service
 * - Option to go back to login
 *
 * ROUTE: /term-ended
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Info,
  Clock,
  Shield,
} from 'lucide-react';

interface LocationState {
  name?: string;
  role?: 'chancellor' | 'museum_researcher';
  successorName?: string;
}

const TermEnded: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState | null;

  const roleLabel = state?.role === 'museum_researcher'
    ? 'Museum Researcher'
    : 'Chancellor';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Term Ended</CardTitle>
          <CardDescription>
            Your account has been archived
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Thank you message */}
          <div className="text-center space-y-2">
            {state?.name && (
              <p className="text-lg font-medium">
                Thank you, {state.name}!
              </p>
            )}
            <p className="text-muted-foreground">
              Your term as <strong>{roleLabel}</strong> has ended.
              {state?.successorName && (
                <> You have successfully approved <strong>{state.successorName}</strong> as your successor.</>
              )}
            </p>
          </div>

          {/* What this means */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What does this mean?</AlertTitle>
            <AlertDescription className="text-sm space-y-2 mt-2">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>Your account is archived — you can no longer access the admin dashboard</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>All your actions and audit history have been preserved</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0" />
                <span>Your term records are available in the system's history</span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Contact info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-sm">Need assistance?</h3>
            <p className="text-sm text-muted-foreground">
              If you believe this was done in error or you need to regain access, 
              please contact the current {roleLabel.toLowerCase()} or diocese administration.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Link to="/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>

          <p className="text-xs text-center text-muted-foreground">
            Thank you for your service and dedication to the VISITA system.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TermEnded;
