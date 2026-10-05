import { useState } from "react";
import type { UserResponse } from "../../api/userApi";

interface EditUserModalProps {
  user: UserResponse;
  onClose: () => void;
  onUpdate: (id: string, data: any) => Promise<void>;
}

const EditUserModal = ({ user, onClose, onUpdate }: EditUserModalProps) => {
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      await onUpdate(user.user_id, updateData);
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
            <h2 className="text-2xl font-semibold text-[#1a1a1a]">Edit User</h2>
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
              New Password (leave blank to keep current)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full h-11 px-4 rounded-lg border ${
                errors.password ? "border-[#e03131]" : "border-[#c8c4be]"
              } bg-white text-[#1a1a1a] text-sm focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20`}
              placeholder="Enter new password"
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-[#e03131]">{errors.password}</p>
            )}
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
              {loading ? "Updating..." : "Update User"}
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

export default EditUserModal;
