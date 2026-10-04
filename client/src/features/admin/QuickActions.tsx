import { useNavigate } from "react-router-dom";

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: "👥",
      color: "#5645d4",
      path: "/admin/users",
    },
    {
      title: "Project Management",
      description: "View and manage all projects",
      icon: "📁",
      color: "#0075de",
      path: "/admin/projects",
    },
    {
      title: "Task Management",
      description: "Oversee all tasks across projects",
      icon: "✓",
      color: "#1aae39",
      path: "/admin/tasks",
    },
    {
      title: "Content Management",
      description: "Manage content and approvals",
      icon: "📝",
      color: "#dd5b00",
      path: "/admin/content",
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      icon: "⚙️",
      color: "#787671",
      path: "/admin/settings",
    },
    {
      title: "Reports & Analytics",
      description: "View system reports",
      icon: "📊",
      color: "#2a9d99",
      path: "/admin/reports",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e5e3df] p-6">
      <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="flex items-center gap-4 p-4 rounded-lg border border-[#e5e3df] hover:border-[#c8c4be] hover:bg-[#fafaf9] transition-all text-left"
          >
            <div
              className="text-3xl w-12 h-12 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: `${action.color}20` }}
            >
              {action.icon}
            </div>
            <div className="flex-1">
              <h3
                className="font-semibold text-sm mb-0.5"
                style={{ color: action.color }}
              >
                {action.title}
              </h3>
              <p className="text-xs text-[#787671]">{action.description}</p>
            </div>
            <svg className="w-5 h-5 text-[#a4a097]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
