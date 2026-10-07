import { useNavigate, useLocation } from "react-router-dom";

const AppNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/projects", label: "Projects" },
    { path: "/admin/tasks", label: "Tasks" },
    { path: "/admin/content", label: "Content" },
    { path: "/admin/audit-logs", label: "Audit Logs" },
  ];

  return (
    <nav className="bg-white border-b border-[#e5e3df] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Admin Portal</h1>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? "bg-[#5645d4] text-white"
                    : "text-[#787671] hover:bg-[#f6f5f4]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-[#787671] hover:text-[#1a1a1a] transition-colors"
        >
          Log out
        </button>
      </div>
    </nav>
  );
};

export default AppNav;
