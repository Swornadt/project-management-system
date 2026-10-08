import { useState, useEffect } from "react";

interface ActivityLogFiltersProps {
  filters: {
    entityType: string;
    action: string;
    severity: string;
    q: string;
  };
  onFilterChange: (filters: any) => void;
  onRefresh: () => void;
}

const ActivityLogFilters = ({ filters, onFilterChange, onRefresh }: ActivityLogFiltersProps) => {
  const [localQ, setLocalQ] = useState(filters.q);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ ...filters, q: localQ });
    }, 500);
    return () => clearTimeout(timer);
  }, [localQ]);

  const handleClear = () => {
    setLocalQ("");
    onFilterChange({
      entityType: "",
      action: "",
      severity: "",
      q: "",
    });
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <input
          type="text"
          placeholder="Search logs..."
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          className="px-4 py-2.5 text-sm border border-[#e5e3df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5645d4] focus:border-transparent"
        />

        <select
          value={filters.entityType}
          onChange={(e) => onFilterChange({ ...filters, entityType: e.target.value })}
          className="px-4 py-2.5 text-sm border border-[#e5e3df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5645d4] focus:border-transparent"
        >
          <option value="">All Entities</option>
          <option value="User">User</option>
          <option value="Project">Project</option>
          <option value="Task">Task</option>
          <option value="Content">Content</option>
          <option value="File">File</option>
        </select>

        <select
          value={filters.action}
          onChange={(e) => onFilterChange({ ...filters, action: e.target.value })}
          className="px-4 py-2.5 text-sm border border-[#e5e3df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5645d4] focus:border-transparent"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </select>

        <select
          value={filters.severity}
          onChange={(e) => onFilterChange({ ...filters, severity: e.target.value })}
          className="px-4 py-2.5 text-sm border border-[#e5e3df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5645d4] focus:border-transparent"
        >
          <option value="">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-[#787671] border border-[#e5e3df] rounded-lg hover:bg-[#f6f5f4] transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onRefresh}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-[#5645d4] border border-[#5645d4] rounded-lg hover:bg-[#5645d4] hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogFilters;
