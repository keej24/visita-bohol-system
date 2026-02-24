/**
 * FILE PURPOSE: Pending Approval Page
 *
 * This page is shown to users (chancellors, parish staff, museum staff)
 * who have registered but are still waiting for approval.
 *
 * FEATURES:
 * - Role-aware messaging (parish, chancellor, museum)
 * - Clear status message about pending state
 * - Contact information for the diocese
 * - Option to go back to login
 *
 * ROUTE: /pending-approval
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Clock,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle2,
  Info,
  Building2,
} from 'lucide-react';

interface LocationState {
  name?: string;
  diocese?: string;
  email?: string;
  parish?: string;
  role?: 'parish' | 'museum' | string;
}

const PendingApproval: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState | null;

  const isParish = state?.role === 'parish';
  const isMuseum = state?.role === 'museum';

  const dioceseName = state?.diocese === 'tagbilaran' 
    ? 'Diocese of Tagbilaran' 
    : state?.diocese === 'talibon'
    ? 'Diocese of Talibon'
    : 'your diocese';

  // Role-specific messaging
  const roleLabel = isParish
    ? `parish${state?.parish ? ` (${state.parish})` : ''}`
    : isMuseum
    ? 'museum researcher'
    : 'chancery office';

  const reviewerLabel = isParish
    ? 'current parish user for your parish'
    : isMuseum
    ? 'current museum researcher'
    : 'current chancellor';

  const submissionText = isParish
    ? (<>Your registration for <strong>{state?.parish || 'your parish'}</strong> in the <strong>{dioceseName}</strong> has been submitted successfully.</>)
    : isMuseum
    ? (<>Your registration as a museum researcher has been submitted successfully.</>)
    : (<>Your registration for the <strong>{dioceseName}</strong> chancery office has been submitted successfully.</>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Awaiting Approval</CardTitle>
          <CardDescription>
            Your account registration is pending review
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status message */}
          <div className="text-center space-y-2">
            {state?.name && (
              <p className="text-lg font-medium">
                Hello, {state.name}!
              </p>
            )}
            <p className="text-muted-foreground">
              {submissionText}
            </p>
          </div>

          {/* What happens next */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What happens next?</AlertTitle>
            <AlertDescription className="text-sm space-y-2 mt-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>The {reviewerLabel} will review your registration</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Once approved, you will receive full access to the system</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>You can then log in with your registered email and password</span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Contact information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Need assistance?
            </h3>
            <p className="text-sm text-muted-foreground">
              If you need to expedite your approval or have questions, please contact
              the {isParish ? 'current parish administrator or your chancery office' : isMuseum ? 'current museum researcher or your chancery office' : 'current chancellor'} directly:
            </p>
            <div className="space-y-2 text-sm">
              {state?.diocese === 'tagbilaran' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>dioceseoftagbilaran1941@gmail.com</span>
                  </div>
                </>
              ) : state?.diocese === 'talibon' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>talibonchancery@gmail.com</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground italic">
                  Contact your diocese's chancery office for assistance.
                </p>
              )}
            </div>
          </div>

          {/* Account details reminder */}
          {state?.email && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Registered email: <strong>{state.email}</strong></p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Link to="/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>

          <p className="text-xs text-center text-muted-foreground">
            Once approved, simply log in with your email and password.
            No further action is required from you.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PendingApproval;
