import { useState, useEffect } from "react";
import axios from "axios";

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}

interface Role {
  role_id: string;
  name: string;
}

const CreateUserModal = ({ onClose, onCreate }: CreateUserModalProps) => {
  const [formData, setFormData] = useState({
    role_id: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    status: "active",
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await axios.get("/api/v1/roles", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setRoles(response.data.data || []);
        if (response.data.data?.length > 0) {
          setFormData((prev) => ({ ...prev, role_id: response.data.data[0].role_id }));
        }
      } catch (err) {
        console.error("Failed to load roles", err);
      }
    };
    loadRoles();
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!formData.role_id) newErrors.role_id = "Role is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onCreate(formData);
    } catch (err: any) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e5e3df] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[#1a1a1a]">Create New User</h2>
            <button
              onClick={onClose}
              className="text-[#787671] hover:text-[#1a1a1a] text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className={`w-full h-11 px-4 rounded-lg border ${
                errors.first_name ? "border-[#e03131]" : "border-[#c8c4be]"
              } bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20`}
            />
            {errors.first_name && (
              <p className="mt-1.5 text-sm text-[#e03131]">{errors.first_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className={`w-full h-11 px-4 rounded-lg border ${
                errors.last_name ? "border-[#e03131]" : "border-[#c8c4be]"
              } bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20`}
            />
            {errors.last_name && (
              <p className="mt-1.5 text-sm text-[#e03131]">{errors.last_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full h-11 px-4 rounded-lg border ${
                errors.email ? "border-[#e03131]" : "border-[#c8c4be]"
              } bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20`}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-[#e03131]">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full h-11 px-4 rounded-lg border ${
                errors.password ? "border-[#e03131]" : "border-[#c8c4be]"
              } bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20`}
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-[#e03131]">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              Role
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className={`w-full h-11 px-4 rounded-lg border ${
                errors.role_id ? "border-[#e03131]" : "border-[#c8c4be]"
              } bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20`}
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role_id && (
              <p className="mt-1.5 text-sm text-[#e03131]">{errors.role_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-11 px-4 rounded-lg border border-[#c8c4be] bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {errors.general && (
            <div className="p-3 rounded-lg bg-[#fde0ec] border border-[#e03131]/20">
              <p className="text-sm text-[#e03131]">{errors.general}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-[#5645d4] hover:bg-[#4534b3] text-white font-medium text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-white hover:bg-[#f6f5f4] border border-[#c8c4be] text-[#1a1a1a] font-medium text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
