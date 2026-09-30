import type { UserResponse } from "../../api/userApi";

interface UserTableProps {
  users: UserResponse[];
  loading: boolean;
  onEdit: (user: UserResponse) => void;
  onChangeRole: (id: string, role_id: string) => void;
  onChangeStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  onPageChange: (newOffset: number) => void;
}

const UserTable = ({
  users,
  loading,
  onEdit,
  onChangeStatus,
  onDelete,
  pagination,
  onPageChange,
}: UserTableProps) => {
  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-[#d9f3e1] text-[#1aae39]",
      inactive: "bg-[#f0eeec] text-[#787671]",
      suspended: "bg-[#fde0ec] text-[#e03131]",
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getRoleBadge = (roleName: string) => {
    const colors = {
      Admin: "bg-[#e6e0f5] text-[#5645d4]",
      Manager: "bg-[#dcecfa] text-[#0075de]",
      Employee: "bg-[#ffe8d4] text-[#dd5b00]",
    };
    return colors[roleName as keyof typeof colors] || "bg-[#f0eeec] text-[#787671]";
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[#787671]">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#787671]">No users found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e5e3df]">
              <th className="text-left py-3 px-4 text-sm font-semibold text-[#37352f]">Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[#37352f]">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[#37352f]">Role</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[#37352f]">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[#37352f]">Verified</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[#37352f]">Created</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-[#37352f]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="border-b border-[#ede9e4] hover:bg-[#fafaf9]">
                <td className="py-3 px-4">
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {user.first_name} {user.last_name}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-[#5d5b54]">{user.email}</p>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${getRoleBadge(user.role?.name || "")}`}>
                    {user.role?.name || "N/A"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusBadge(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-[#5d5b54]">
                    {user.email_verified ? "✓ Yes" : "✗ No"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-[#787671]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="px-3 py-1.5 text-xs font-medium text-[#0075de] hover:bg-[#dcecfa] rounded-md transition-colors"
                    >
                      Edit
                    </button>
                    
                    {user.status === "active" ? (
                      <button
                        onClick={() => onChangeStatus(user.user_id, "inactive")}
                        className="px-3 py-1.5 text-xs font-medium text-[#dd5b00] hover:bg-[#ffe8d4] rounded-md transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => onChangeStatus(user.user_id, "active")}
                        className="px-3 py-1.5 text-xs font-medium text-[#1aae39] hover:bg-[#d9f3e1] rounded-md transition-colors"
                      >
                        Activate
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(user.user_id)}
                      className="px-3 py-1.5 text-xs font-medium text-[#e03131] hover:bg-[#fde0ec] rounded-md transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#e5e3df]">
        <p className="text-sm text-[#787671]">
          Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} users
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(0, pagination.offset - pagination.limit))}
            disabled={pagination.offset === 0}
            className="px-4 py-2 text-sm font-medium text-[#1a1a1a] bg-white hover:bg-[#f6f5f4] border border-[#c8c4be] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-[#787671]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.offset + pagination.limit)}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-4 py-2 text-sm font-medium text-[#1a1a1a] bg-white hover:bg-[#f6f5f4] border border-[#c8c4be] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default UserTable;
