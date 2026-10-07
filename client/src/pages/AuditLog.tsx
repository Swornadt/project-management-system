import { useState, useEffect } from "react";
import { auditLogApi, type ActivityLogResponse } from "../api/activityLogApi";
import AppNav from "../components/layout/AppNav";
import ActivityLogFilters from "../features/activity-logs/ActivityLogFilters";
import ActivityLogTable from "../features/activity-logs/ActivityLogTable";
import ActivityLogDetailsModal from "../features/activity-logs/ActivityLogDetailsModal";

const AuditLog = () => {
  const [logs, setLogs] = useState<ActivityLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<ActivityLogResponse | null>(null);

  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    severity: "",
    q: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await auditLogApi.search({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        order: "desc",
      });
      setLogs(response.data);
      if (response.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.pagination!.total,
          totalPages: response.pagination!.totalPages,
        }));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters, pagination.page]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-[#f6f5f4]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-5xl font-semibold text-[#1a1a1a] mb-2" style={{ letterSpacing: "-1px" }}>
              Audit Logs
            </h1>
            <p className="text-lg text-[#5d5b54]">
              Track all system activities and changes
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-[#fde0ec] border border-[#e03131]/20">
              <p className="text-sm text-[#e03131]">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#e5e3df] p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#1a1a1a]">Activity Logs</h2>
            </div>

            <ActivityLogFilters
              filters={filters}
              onFilterChange={setFilters}
              onRefresh={loadLogs}
            />

            <ActivityLogTable
              logs={logs}
              loading={loading}
              onViewDetails={setSelectedLog}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {selectedLog && (
          <ActivityLogDetailsModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}
      </div>
    </>
  );
};

export default AuditLog;
