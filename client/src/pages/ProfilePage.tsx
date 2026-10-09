import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { getStoredUser, setStoredUser } from '../api/axiosClient';
import { clearSession, sessionApi, signOut } from '../api/session';
import { authErrorMessage } from '../api/authFlowApi';
import type { ApiUserProfile } from '../api/authTypes';
import { authButtonClass, authInputClass } from '../features/auth/AuthShell';
import { NAV_PATHS, DEFAULT_NAV } from '../routes/navPaths';
import { formatDate } from '../features/projects/projectUi';

const MIN_LENGTH = 8;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2.5 text-[13px]">
    <dt className="text-[#9b9a97]">{label}</dt>
    <dd className="text-[#37352f]">{children}</dd>
  </div>
);

export default function ProfilePage() {
  const [profile, setProfile] = useState<ApiUserProfile | null>(getStoredUser());

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  // Refresh from the server so role/status changes show up, and so sessions
  // that predate the stored user still get one.
  useEffect(() => {
    let cancelled = false;
    sessionApi
      .me()
      .then((user) => {
        if (cancelled) return;
        setProfile(user);
        setStoredUser(user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < MIN_LENGTH) {
      setError(`New password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError('New password must be different from the current one.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await sessionApi.changePassword(current, next);
      // The server revokes every refresh token on a password change, so end
      // this session too and have the user sign in with the new password.
      setChanged(true);
      setTimeout(() => {
        clearSession();
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't change your password. Please try again."));
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f5] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-5">
        <Link
          to={NAV_PATHS[DEFAULT_NAV]}
          className="inline-flex items-center gap-1.5 text-xs text-[#5d5b54] hover:text-[#37352f]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to workspace
        </Link>

        <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">Profile &amp; Security</h1>

        {/* Account */}
        <section className="bg-white rounded-xl border border-[#e8e7e4] p-5">
          <h2 className="text-xs font-semibold text-[#37352f] uppercase tracking-wider mb-1">Account</h2>
          {profile ? (
            <dl className="divide-y divide-[#f1efed]">
              <Row label="Name">
                {profile.first_name} {profile.last_name}
              </Row>
              <Row label="Email">
                {profile.email}
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    profile.email_verified ? 'bg-[#d9f3e1] text-[#1aae39]' : 'bg-[#fef7d6] text-[#dd5b00]'
                  }`}
                >
                  {profile.email_verified ? 'Verified' : 'Not verified'}
                </span>
              </Row>
              <Row label="Role">{profile.role_name ?? '—'}</Row>
              <Row label="Status">{profile.status}</Row>
              <Row label="Member since">{formatDate(profile.created_at)}</Row>
            </dl>
          ) : (
            <p className="text-xs text-[#9b9a97] py-3">Loading…</p>
          )}
        </section>

        {/* Change password */}
        <section className="bg-white rounded-xl border border-[#e8e7e4] p-5">
          <h2 className="text-xs font-semibold text-[#37352f] uppercase tracking-wider mb-3">Change password</h2>
          {changed ? (
            <p className="text-xs text-[#1aae39] bg-[#d9f3e1] p-2 rounded-lg">
              Password changed. Signing you out so you can sign in again…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#5d5b54] block mb-1">Current password</label>
                <input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className={authInputClass}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="font-semibold text-[#5d5b54] block mb-1">New password</label>
                <input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className={authInputClass}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="font-semibold text-[#5d5b54] block mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={authInputClass}
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={!current || !next || !confirm || isSaving}
                className={authButtonClass}
              >
                {isSaving ? 'Saving…' : 'Change password'}
              </button>
            </form>
          )}
        </section>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e8e7e4] bg-white text-xs font-medium text-[#ba1a1a] hover:bg-[#fde0e0]/50"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
