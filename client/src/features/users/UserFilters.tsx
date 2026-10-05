interface UserFiltersProps {
  filters: {
    q: string;
    role: string;
    status: string;
    email_verified: boolean | undefined;
  };
  onFilterChange: (filters: any) => void;
  onRefresh: () => void;
}

const UserFilters = ({ filters, onFilterChange, onRefresh }: UserFiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <input
        type="text"
        placeholder="Search by name or email..."
        value={filters.q}
        onChange={(e) => onFilterChange({ ...filters, q: e.target.value })}
        className="col-span-2 h-11 px-4 rounded-lg border border-[#c8c4be] bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20 transition-colors"
      />

      <select
        value={filters.role}
        onChange={(e) => onFilterChange({ ...filters, role: e.target.value })}
        className="h-11 px-4 rounded-lg border border-[#c8c4be] bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20 transition-colors"
      >
        <option value="">All Roles</option>
        <option value="Admin">Admin</option>
        <option value="Manager">Manager</option>
        <option value="Employee">Employee</option>
      </select>

      <select
        value={filters.status}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        className="h-11 px-4 rounded-lg border border-[#c8c4be] bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20 transition-colors"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
      </select>

      <button
        onClick={onRefresh}
        className="h-11 px-4 bg-white hover:bg-[#f6f5f4] border border-[#c8c4be] text-[#1a1a1a] font-medium text-sm rounded-lg transition-colors"
      >
        Refresh
      </button>
    </div>
  );
};

export default UserFilters;
