import type { UserStatsResponse } from "../../api/userApi";

interface UserStatsProps {
  stats: UserStatsResponse;
}

const UserStats = ({ stats }: UserStatsProps) => {
  const statCards = [
    { label: "Total Users", value: stats.total, color: "#5645d4" },
    { label: "Active", value: stats.active, color: "#1aae39" },
    { label: "Inactive", value: stats.inactive, color: "#787671" },
    { label: "Suspended", value: stats.suspended, color: "#e03131" },
    { label: "Verified", value: stats.verified, color: "#2a9d99" },
    { label: "Unverified", value: stats.unverified, color: "#dd5b00" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-lg border border-[#e5e3df] p-5 hover:shadow-sm transition-shadow"
        >
          <p className="text-sm text-[#787671] mb-1">{stat.label}</p>
          <p
            className="text-3xl font-semibold"
            style={{ color: stat.color }}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default UserStats;
