import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell, authButtonClass, authInputClass } from '../features/auth/AuthShell';
import { authFlowApi, authErrorMessage } from '../api/authFlowApi';

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthShell title="Reset password">
        <div className="space-y-4 text-xs">
          <p className="text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">This reset link is missing its token.</p>
          <Link to="/forgot-password" className="block text-center text-[#5645d4] hover:underline">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="space-y-4 text-xs">
          <p className="text-[#1aae39] bg-[#d9f3e1] p-2 rounded-lg">
            Your password has been reset. You've been signed out of all other sessions.
          </p>
          <Link to="/login" className="block text-center text-[#5645d4] hover:underline">
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await authFlowApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't reset your password. The link may have expired."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="font-semibold text-[#5d5b54] block mb-1">New password</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
          />
        </div>
        <div>
          <label className="font-semibold text-[#5d5b54] block mb-1">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
          />
        </div>

        {error && (
          <div className="text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg space-y-1">
            <p>{error}</p>
            <Link to="/forgot-password" className="underline">
              Request a new link
            </Link>
          </div>
        )}

        <button type="submit" disabled={!password || !confirm || isSubmitting} className={authButtonClass}>
          {isSubmitting ? 'Saving…' : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  );
}
