import type { ActivityLogResponse } from "../../api/activityLogApi";

interface ActivityLogTableProps {
  logs: ActivityLogResponse[];
  loading: boolean;
  onViewDetails: (log: ActivityLogResponse) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}

const ActivityLogTable = ({ logs, loading, onViewDetails, pagination, onPageChange }: ActivityLogTableProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-[#fde0ec] text-[#e03131]";
      case "warning":
        return "bg-[#fff4e0] text-[#dd5b00]";
      default:
        return "bg-[#e0f2fe] text-[#0075de]";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      onPageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      onPageChange(pagination.page + 1);
    }
  };

  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[#787671]">Loading audit logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#787671]">No audit logs found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e5e3df]">
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#787671] uppercase tracking-wider">
                Timestamp
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#787671] uppercase tracking-wider">
                User
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#787671] uppercase tracking-wider">
                Entity
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#787671] uppercase tracking-wider">
                Action
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#787671] uppercase tracking-wider">
                Severity
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#787671] uppercase tracking-wider">
                Description
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[#787671] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.activity_id}
                className="border-b border-[#e5e3df] hover:bg-[#fafaf9] transition-colors"
              >
                <td className="py-3 px-4 text-sm text-[#37352f]">
                  {formatDate(log.created_at)}
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    {log.user ? (
                      <>
                        <p className="font-medium text-[#1a1a1a]">
                          {log.user.first_name} {log.user.last_name}
                        </p>
                        <p className="text-xs text-[#787671]">{log.user.email}</p>
                      </>
                    ) : (
                      <p className="text-sm text-[#787671]">System</p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-[#37352f] font-medium">
                    {log.entity_type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs font-medium bg-[#f6f5f4] text-[#37352f] rounded">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(
                      log.severity
                    )}`}
                  >
                    {log.severity}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-[#37352f] max-w-xs truncate">
                  {log.description || "—"}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => onViewDetails(log)}
                    className="text-sm text-[#5645d4] hover:text-[#4534b3] font-medium"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#e5e3df]">
        <p className="text-sm text-[#787671]">
          Showing {startIndex} to {endIndex} of {pagination.total} logs
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm font-medium text-[#787671] border border-[#e5e3df] rounded-lg hover:bg-[#f6f5f4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[#787671]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={pagination.page >= pagination.totalPages}
            className="px-4 py-2 text-sm font-medium text-[#787671] border border-[#e5e3df] rounded-lg hover:bg-[#f6f5f4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogTable;
