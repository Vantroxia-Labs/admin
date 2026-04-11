import { useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { authApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { EyeCloseIcon, EyeIcon } from "../../icons";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const pf =
    (field: keyof typeof pwForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setPwForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !pwForm.currentPassword ||
      !pwForm.newPassword ||
      !pwForm.confirmNewPassword
    ) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword(pwForm);
      toast.success("Password changed. Please sign in again.");
      await logout();
      navigate("/signin");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to change password.";
      toast.error(msg);
    } finally {
      setSavingPw(false);
    }
  };

  const initials = user
    ? `${user.NRStName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
      "U"
    : "U";

  const roleLabel = user?.isAegisUser
    ? "Aegis Platform Admin"
    : user?.roles.includes("Admin")
      ? "Business Admin"
      : user?.roles.includes("User")
        ? "Business User"
        : "User";

  return (
    <>
      <PageMeta
        title="Profile | Aegis EInvoicing Portal"
        description="Your account profile"
      />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          My Profile
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your account details and security
        </p>
      </div>

      <div className="space-y-5">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {user?.NRStName} {user?.lastName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
              <span className="mt-1 inline-block text-xs bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 rounded-full px-3 py-0.5 font-medium">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <Section
          title="Account Information"
          description="Your account details from the system"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                NRSt Name
              </p>
              <p className="text-gray-800 dark:text-white">
                {user?.NRStName || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                Last Name
              </p>
              <p className="text-gray-800 dark:text-white">
                {user?.lastName || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                Email
              </p>
              <p className="text-gray-800 dark:text-white font-mono text-xs">
                {user?.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                Role
              </p>
              <p className="text-gray-800 dark:text-white">{roleLabel}</p>
            </div>
            {user?.subscriptionTier && (
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                  Subscription Plan
                </p>
                <span className="inline-block text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full px-2.5 py-0.5 font-medium">
                  {user.subscriptionTier}
                </span>
              </div>
            )}
            {user?.permissions && user.permissions.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
                  Permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user.permissions.map((p) => (
                    <span
                      key={p}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-2 py-0.5"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Change Password */}
        <Section
          title="Change Password"
          description="Use a strong password of at least 8 characters"
        >
          <form onSubmit={handleChangePassword}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Current Password <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={pwForm.currentPassword}
                    onChange={pf("currentPassword")}
                    className={inputCls}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <span
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-3 top-1/2"
                  >
                    {showCurrent ? (
                      <EyeIcon className="fill-gray-400 size-4" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-400 size-4" />
                    )}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  New Password <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={pwForm.newPassword}
                    onChange={pf("newPassword")}
                    className={inputCls}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <span
                    onClick={() => setShowNew(!showNew)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-3 top-1/2"
                  >
                    {showNew ? (
                      <EyeIcon className="fill-gray-400 size-4" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-400 size-4" />
                    )}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Confirm New Password <span className="text-error-500">*</span>
                </label>
                <input
                  type="password"
                  value={pwForm.confirmNewPassword}
                  onChange={pf("confirmNewPassword")}
                  className={inputCls}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex justify-start mt-5">
              <button
                type="submit"
                disabled={savingPw}
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              >
                {savingPw ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </Section>
      </div>
    </>
  );
}
