import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell, authButtonClass, authInputClass } from '../features/auth/AuthShell';
import { authFlowApi, authErrorMessage } from '../api/authFlowApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await authFlowApi.forgotPassword(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      // e.g. the rate limiter's "too many requests" message
      setError(authErrorMessage(err, "Couldn't send the reset email. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <div className="space-y-4 text-xs">
          <p className="text-[#5d5b54]">
            If an account exists for <span className="font-semibold text-[#37352f]">{sentTo}</span>, we've sent a
            link to reset your password. It's valid for 1 hour.
          </p>
          <Link to="/login" className="block text-center text-[#5645d4] hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="font-semibold text-[#5d5b54] block mb-1">Email</label>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={authInputClass}
          />
        </div>

        {error && <p className="text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">{error}</p>}

        <button type="submit" disabled={!email.trim() || isSubmitting} className={authButtonClass}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>

        <Link to="/login" className="block text-center text-[#5645d4] hover:underline pt-1">
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
}
