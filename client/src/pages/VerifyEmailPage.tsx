import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { AuthShell } from '../features/auth/AuthShell';
import { authFlowApi, authErrorMessage } from '../api/authFlowApi';

type Result = { ok: true } | { ok: false; message: string };

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [result, setResult] = useState<Result | null>(
    token ? null : { ok: false, message: 'This verification link is missing its token.' }
  );

  // The token is single-use: the server clears it on success, so a second call
  // would report "invalid". React StrictMode runs effects twice in dev, hence
  // the ref guard to make sure we only ever call the API once.
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    authFlowApi
      .verifyEmail(token)
      .then(() => setResult({ ok: true }))
      .catch((err) =>
        setResult({
          ok: false,
          message: authErrorMessage(
            err,
            "We couldn't verify your email. The link may have expired or already been used."
          ),
        })
      );
  }, [token]);

  return (
    <AuthShell title="Verify your email">
      {result === null ? (
        <div className="flex items-center gap-2 text-xs text-[#5d5b54] py-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Verifying…
        </div>
      ) : result.ok ? (
        <div className="space-y-4 text-xs">
          <p className="text-[#1aae39] bg-[#d9f3e1] p-2 rounded-lg">
            Your email is verified and your account is active.
          </p>
          <Link to="/login" className="block text-center text-[#5645d4] hover:underline">
            Sign in
          </Link>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          <p className="text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">{result.message}</p>
          <p className="text-[#5d5b54]">If you've already verified, you can just sign in.</p>
          <Link to="/login" className="block text-center text-[#5645d4] hover:underline">
            Go to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
