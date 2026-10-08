import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { setAccessToken } from "../api/axiosClient";
import { NAV_PATHS, DEFAULT_NAV } from "../routes/navPaths";

type AuthMode = "login" | "register";

interface FormData {
  name?: string;
  email: string;
  password: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (mode === "register" && !formData.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (mode === "register" && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (mode === "login") {
        const response = await axios.post("/api/v1/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        if (response.data.success) {
          setMessage("Login successful");
          setAccessToken(response.data.data.accessToken);
          setTimeout(() => {
            window.location.href = NAV_PATHS[DEFAULT_NAV];
          }, 1000);
        }
      } else {
        const response = await axios.post("/api/v1/auth/register", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });

        if (response.data.success) {
          setMessage(
            "Registration successful. Please check your email to verify your account.",
          );
          setTimeout(() => {
            setMode("login");
            setFormData({ email: formData.email, password: "", name: "" });
          }, 2000);
        }
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Something went wrong";
      setErrors({ general: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setErrors({});
    setMessage("");
    setFormData({ email: "", password: "", name: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f5f4] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-semibold text-[#1a1a1a] mb-3"
            style={{ letterSpacing: "-1px" }}
          >
            {mode === "login" ? "Welcome back" : "Get started"}
          </h1>
          <p className="text-lg text-[#5d5b54]">
            {mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e3df] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-[#37352f] mb-2"
                >
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full h-11 px-4 rounded-lg border ${
                    errors.name ? "border-[#e03131]" : "border-[#c8c4be]"
                  } bg-white text-[#1a1a1a] text-base focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20 transition-colors`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-[#e03131]">{errors.name}</p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#37352f] mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={`w-full h-11 px-4 rounded-lg border ${
                  errors.email ? "border-[#e03131]" : "border-[#c8c4be]"
                } bg-white text-[#1a1a1a] text-base focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20 transition-colors`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-[#e03131]">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#37352f] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className={`w-full h-11 px-4 rounded-lg border ${
                  errors.password ? "border-[#e03131]" : "border-[#c8c4be]"
                } bg-white text-[#1a1a1a] text-base focus:outline-none focus:border-[#5645d4] focus:ring-2 focus:ring-[#5645d4]/20 transition-colors`}
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-[#e03131]">
                  {errors.password}
                </p>
              )}
            </div>

            {errors.general && (
              <div className="p-3 rounded-lg bg-[#fde0ec] border border-[#e03131]/20">
                <p className="text-sm text-[#e03131]">{errors.general}</p>
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-[#d9f3e1] border border-[#1aae39]/20">
                <p className="text-sm text-[#1aae39]">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#5645d4] hover:bg-[#4534b3] active:bg-[#3a2a99] text-white font-medium text-sm rounded-lg transition-colors disabled:bg-[#e5e3df] disabled:text-[#bbb8b1] disabled:cursor-not-allowed"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-[#0075de] hover:text-[#005bab] font-medium transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>

          {mode === "login" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-[#787671] hover:text-[#37352f] transition-colors"
              >
                <Link
                  to="/forgot-password"
                  className="text-[#5645d4] hover:underline"
                >
                  Forgot password?
                </Link>
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#787671]">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
