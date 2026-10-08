import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface AuthCardProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message ?? 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-xl border border-[#e8e7e4] shadow-lg p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-[#37352f]">Sign in</h1>
        <p className="text-xs text-[#5d5b54] mt-1">Enter your credentials to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="font-semibold text-[#5d5b54] block mb-1">Email</label>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
          />
        </div>
        <div>
          <label className="font-semibold text-[#5d5b54] block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
          />
        </div>

        <div className="text-right -mt-1">
          <Link to="/forgot-password" className="text-[#5645d4] hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={!email.trim() || !password || isSubmitting}
          className="w-full px-4 py-2 text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};
