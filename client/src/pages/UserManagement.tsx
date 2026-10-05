import { useState, useEffect } from "react";
import { userApi, type UserResponse, type UserStatsResponse } from "../api/userApi";
import UserTable from "../features/users/UserTable";
import UserStats from "../features/users/UserStats";
import UserFilters from "../features/users/UserFilters";
import CreateUserModal from "../features/users/CreateUserModal";
import EditUserModal from "../features/users/EditUserModal";
import AppNav from "../components/layout/AppNav";

const UserManagement = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const [filters, setFilters] = useState({
    q: "",
    role: "",
    status: "",
    email_verified: undefined as boolean | undefined,
  });
  
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
  });

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await userApi.search({
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
      });
      setUsers(response.data);
      if (response.meta) {
        setPagination((prev) => ({ ...prev, total: response.meta!.total }));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await userApi.getStats();
      setStats(response.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [filters, pagination.offset]);

  const handleCreateUser = async (data: any) => {
    try {
      await userApi.create(data);
      setSuccessMsg("User created successfully");
      setShowCreateModal(false);
      loadUsers();
      loadStats();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to create user");
    }
  };

  const handleUpdateUser = async (id: string, data: any) => {
    try {
      await userApi.update(id, data);
      setSuccessMsg("User updated successfully");
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to update user");
    }
  };

  const handleChangeRole = async (id: string, role_id: string) => {
    if (!confirm("Change this user's role?")) return;
    try {
      await userApi.changeRole(id, role_id);
      setSuccessMsg("Role changed successfully");
      loadUsers();
      loadStats();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to change role");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleChangeStatus = async (id: string, status: string) => {
    if (!confirm(`Set user status to ${status}?`)) return;
    try {
      await userApi.updateStatus(id, status);
      setSuccessMsg("Status updated successfully");
      loadUsers();
      loadStats();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update status");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user? This action can be undone.")) return;
    try {
      await userApi.delete(id);
      setSuccessMsg("User deleted successfully");
      loadUsers();
      loadStats();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete user");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handlePageChange = (newOffset: number) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  };

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-[#f6f5f4]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-5xl font-semibold text-[#1a1a1a] mb-2" style={{ letterSpacing: "-1px" }}>
              User Management
            </h1>
            <p className="text-lg text-[#5d5b54]">
              Manage users, roles, and permissions
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-[#fde0ec] border border-[#e03131]/20">
              <p className="text-sm text-[#e03131]">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-lg bg-[#d9f3e1] border border-[#1aae39]/20">
              <p className="text-sm text-[#1aae39]">{successMsg}</p>
            </div>
          )}

          {stats && <UserStats stats={stats} />}

          <div className="bg-white rounded-xl border border-[#e5e3df] p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[#1a1a1a]">Users</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-[#5645d4] hover:bg-[#4534b3] text-white font-medium text-sm rounded-lg transition-colors"
              >
                Create User
              </button>
            </div>

            <UserFilters
              filters={filters}
              onFilterChange={setFilters}
              onRefresh={loadUsers}
            />

            <UserTable
              users={users}
              loading={loading}
              onEdit={setEditingUser}
              onChangeRole={handleChangeRole}
              onChangeStatus={handleChangeStatus}
              onDelete={handleDeleteUser}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateUser}
          />
        )}

        {editingUser && (
          <EditUserModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onUpdate={handleUpdateUser}
          />
        )}
      </div>
    </>
  );
};

export default UserManagement;
