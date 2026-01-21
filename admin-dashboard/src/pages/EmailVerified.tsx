import { CheckCircle } from "lucide-react";

const EmailVerified = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Email Verified!
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. You can now close this page and return to the VISITA mobile app.
          </p>

          {/* App Badge */}
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
            <span className="text-lg"></span>
            VISITA Bohol Churches
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-400 mt-8">
            © 2026 VISITA Bohol Heritage Churches
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerified;
