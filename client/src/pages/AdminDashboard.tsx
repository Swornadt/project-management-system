import { useState, useEffect } from "react";
import { adminApi, type AdminDashboardStats } from "../api/adminApi";
import AppNav from "../components/layout/AppNav";
import StatsOverview from "../features/admin/StatsOverview";
import QuickActions from "../features/admin/QuickActions";

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminApi.getDashboardStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-[#f6f5f4]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-5xl font-semibold text-[#1a1a1a] mb-2" style={{ letterSpacing: "-1px" }}>
              Admin Dashboard
            </h1>
            <p className="text-lg text-[#5d5b54]">
              System overview and management
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-[#fde0ec] border border-[#e03131]/20">
              <p className="text-sm text-[#e03131]">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-[#787671]">Loading dashboard...</p>
            </div>
          ) : stats ? (
            <>
              <StatsOverview stats={stats} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <QuickActions />
                
                <div className="bg-white rounded-xl border border-[#e5e3df] p-6">
                  <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Recent Activity</h2>
                  <p className="text-sm text-[#787671]">Activity log coming soon</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
