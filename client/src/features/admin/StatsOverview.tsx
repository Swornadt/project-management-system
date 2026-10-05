import type { AdminDashboardStats } from "../../api/adminApi";

interface StatsOverviewProps {
  stats: AdminDashboardStats;
}

const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const mainStats = [
    { label: "Total Users", value: stats.users.total, color: "#5645d4", sublabel: `${stats.users.active} active` },
    { label: "Total Projects", value: stats.projects.total, color: "#0075de", sublabel: `${stats.projects.active} active` },
    { label: "Total Tasks", value: stats.tasks.total, color: "#1aae39", sublabel: `${stats.tasks.completed} completed` },
    { label: "Content Items", value: stats.content.total, color: "#dd5b00", sublabel: `${stats.content.published} published` },
  ];

  const detailedStats = [
    { label: "New Users (30d)", value: stats.users.recentlyCreated, color: "#2a9d99" },
    { label: "New Projects (30d)", value: stats.projects.recentlyCreated, color: "#7b3ff2" },
    { label: "In Progress", value: stats.tasks.inProgress, color: "#f5d75e" },
    { label: "Draft Content", value: stats.content.draft, color: "#a4a097" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {mainStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#e5e3df] p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-[#787671] mb-1">{stat.label}</p>
            <p
              className="text-4xl font-semibold mb-1"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
            <p className="text-xs text-[#a4a097]">{stat.sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {detailedStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-[#e5e3df] p-4 hover:shadow-sm transition-shadow"
          >
            <p className="text-xs text-[#787671] mb-1">{stat.label}</p>
            <p
              className="text-2xl font-semibold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#e5e3df] p-6">
          <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Projects by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats.projects.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-[#37352f]">{status}</span>
                <span className="text-sm font-medium text-[#5645d4]">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e3df] p-6">
          <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats.tasks.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-[#37352f]">{status}</span>
                <span className="text-sm font-medium text-[#1aae39]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default StatsOverview;
