import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Password Reset Success Page
 * 
 * This page is shown to MOBILE APP users after they successfully reset their password.
 * It provides a friendly confirmation message and instructions to return to the app.
 * 
 * Admin users are redirected to /login instead (configured in Cloud Functions).
 */
export default function PasswordResetSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white rounded-2xl shadow-xl p-8">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Password Reset Successful!
        </h1>
        
        {/* Description */}
        <p className="text-gray-600">
          Your password has been changed successfully. You can now close this page and log in to the <strong>VISITA app</strong> with your new password.
        </p>
        
        {/* Close Button */}
        <div className="pt-4">
          <Button 
            onClick={() => window.close()}
            className="w-full"
          >
            Close This Page
          </Button>
        </div>
        
        {/* Fallback Instructions */}
        <p className="text-sm text-gray-500">
          If the button doesn't work, simply close this browser tab and open the VISITA app.
        </p>
        
        {/* Branding */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            VISITA Bohol Churches Information System
          </p>
        </div>
      </div>
    </div>
  );
}
