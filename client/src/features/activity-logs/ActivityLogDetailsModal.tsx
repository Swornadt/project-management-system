import type { ActivityLogResponse } from "../../api/activityLogApi";

interface ActivityLogDetailsModalProps {
  log: ActivityLogResponse;
  onClose: () => void;
}

const ActivityLogDetailsModal = ({ log, onClose }: ActivityLogDetailsModalProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#e03131";
      case "warning":
        return "#dd5b00";
      default:
        return "#0075de";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#e5e3df]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-1">
                Activity Log Details
              </h2>
              <p className="text-sm text-[#787671]">{formatDate(log.created_at)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#787671] hover:text-[#1a1a1a] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                User
              </p>
              {log.user ? (
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {log.user.first_name} {log.user.last_name}
                  </p>
                  <p className="text-sm text-[#787671]">{log.user.email}</p>
                </div>
              ) : (
                <p className="text-sm text-[#787671]">System</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                Severity
              </p>
              <span
                className="inline-block px-3 py-1 text-sm font-medium rounded-lg"
                style={{
                  backgroundColor: `${getSeverityColor(log.severity)}20`,
                  color: getSeverityColor(log.severity),
                }}
              >
                {log.severity}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                Entity Type
              </p>
              <p className="text-sm text-[#1a1a1a] font-medium">{log.entity_type}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                Action
              </p>
              <span className="inline-block px-3 py-1 text-sm font-medium bg-[#f6f5f4] text-[#37352f] rounded">
                {log.action}
              </span>
            </div>

            {log.project && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                  Project
                </p>
                <p className="text-sm text-[#1a1a1a] font-medium">{log.project.name}</p>
              </div>
            )}
          </div>

          {log.description && (
            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-sm text-[#37352f]">{log.description}</p>
            </div>
          )}

          {log.ip_address && (
            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                IP Address
              </p>
              <p className="text-sm text-[#37352f] font-mono">{log.ip_address}</p>
            </div>
          )}

          {log.before_data && Object.keys(log.before_data).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                Before
              </p>
              <pre className="text-xs bg-[#f6f5f4] p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(log.before_data, null, 2)}
              </pre>
            </div>
          )}

          {log.after_data && Object.keys(log.after_data).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                After
              </p>
              <pre className="text-xs bg-[#f6f5f4] p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(log.after_data, null, 2)}
              </pre>
            </div>
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#787671] uppercase tracking-wider mb-2">
                Metadata
              </p>
              <pre className="text-xs bg-[#f6f5f4] p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#e5e3df] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#5645d4] hover:bg-[#4534b3] text-white font-medium text-sm rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogDetailsModal;
