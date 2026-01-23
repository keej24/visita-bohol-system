import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

/**
 * Custom Firebase Auth Action Handler
 * 
 * This page handles Firebase auth actions like email verification.
 * It replaces the default Firebase action handler to provide a branded experience.
 * 
 * URL format: /auth/action?mode=verifyEmail&oobCode=xxx&continueUrl=xxx
 */
const AuthAction = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const handleAction = async () => {
      const mode = searchParams.get("mode");
      const oobCode = searchParams.get("oobCode");
      const continueUrl = searchParams.get("continueUrl");

      if (!oobCode) {
        setStatus("error");
        setMessage("Invalid verification link. Please request a new verification email.");
        return;
      }

      try {
        switch (mode) {
          case "verifyEmail": {
            // First check the action code to get email
            const info = await checkActionCode(auth, oobCode);
            setEmail(info.data.email || null);
            
            // Apply the action code to verify email
            await applyActionCode(auth, oobCode);
            setStatus("success");
            setMessage("Your email has been verified successfully!");
            
            // Auto-redirect after 3 seconds
            setTimeout(() => {
              if (continueUrl) {
                window.location.href = continueUrl;
              } else {
                navigate("/email-verified");
              }
            }, 3000);
            break;
          }

          case "resetPassword": {
            // Redirect to password reset page with the code
            navigate(`/reset-password?oobCode=${oobCode}`);
            break;
          }

          default:
            setStatus("error");
            setMessage("Unknown action type. Please try again.");
        }
      } catch (error: unknown) {
        console.error("Auth action error:", error);
        setStatus("error");
        
        const firebaseError = error as { code?: string };
        switch (firebaseError.code) {
          case "auth/expired-action-code":
            setMessage("This verification link has expired. Please request a new one.");
            break;
          case "auth/invalid-action-code":
            setMessage("This verification link is invalid or has already been used.");
            break;
          case "auth/user-disabled":
            setMessage("This account has been disabled. Please contact support.");
            break;
          default:
            setMessage("An error occurred while verifying your email. Please try again.");
        }
      }
    };

    handleAction();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === "loading" && (
            <>
              {/* Loading Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Verifying Your Email
              </h1>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              {/* Success Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Email Verified!
              </h1>

              {/* Email display */}
              {email && (
                <p className="text-green-600 font-medium mb-4">
                  {email}
                </p>
              )}

              {/* Message */}
              <p className="text-gray-600 mb-6">
                {message}
              </p>

              {/* Redirect notice */}
              <p className="text-sm text-gray-500 mb-6">
                Redirecting you automatically in 3 seconds...
              </p>

              {/* App Badge */}
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <span className="text-lg">⛪</span>
                VISITA Bohol Churches
              </div>
            </>
          )}

          {status === "error" && (
            <>
              {/* Error Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-white" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Verification Failed
              </h1>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                {message}
              </p>

              {/* Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  Return to the VISITA app and tap "Resend Verification Email" to get a new link.
                </p>
              </div>

              {/* App Badge */}
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
                <span className="text-lg">⛪</span>
                VISITA Bohol Churches
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-xs text-gray-400 mt-8">
            © 2026 VISITA Bohol Heritage Churches
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthAction;
