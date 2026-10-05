import { useNavigate, useLocation } from 'react-router-dom';
import { AuthCard } from '../features/auth/AuthCard';
import { authApi, setAccessToken, setStoredUser } from '../api/axiosClient';
import { NAV_PATHS, DEFAULT_NAV } from '../routes/navPaths';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.data.accessToken);
    setStoredUser(res.data.user);

    // RequireAuth stashes where the visitor was headed before it redirected
    // them here (state.from) — send them back there, or the default
    // section for a fresh /login visit with nothing to return to.
    const from = (location.state as { from?: Location })?.from;
    navigate(from ? `${from.pathname}${from.search ?? ''}` : NAV_PATHS[DEFAULT_NAV], {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f5] px-4">
      <AuthCard onSubmit={handleLogin} />
    </div>
  );
}
