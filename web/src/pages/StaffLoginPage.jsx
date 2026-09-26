import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth.jsx";

const ROLE_HOME = { admin: "/admin", kitchen: "/kitchen", waiter: "/waiter" };

export default function StaffLoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_HOME[user.role] || "/");
    } catch {
      setError(t("staff.login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-olive-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md"
      >
        <h1 className="mb-6 text-center text-2xl font-bold text-olive-800">
          {t("staff.login.title")}
        </h1>
        <label className="mb-1 block text-sm font-medium text-olive-700">
          {t("staff.login.email")}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-olive-200 px-3 py-2 focus:border-olive-500 focus:outline-none"
        />
        <label className="mb-1 block text-sm font-medium text-olive-700">
          {t("staff.login.password")}
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-olive-200 px-3 py-2 focus:border-olive-500 focus:outline-none"
        />
        {error && <p className="mb-4 text-sm text-brick-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-olive-600 py-2 font-medium text-white hover:bg-olive-700 disabled:opacity-60"
        >
          {t("staff.login.submit")}
        </button>
      </form>
    </div>
  );
}
