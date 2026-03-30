import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { userMgmtApi, type UserSummary, type CreateUserPayload } from "../../lib/api";
import { USE_MOCK, MOCK_USERS, MOCK_PAGE_SIZE } from "../../lib/mockData";
import { useIsAdmin, useIsAegis } from "../../context/AuthContext";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ROLE_OPTIONS = [
  { id: "Admin", label: "Client Admin" },
  { id: "User", label: "Client User" },
];

const emptyForm: CreateUserPayload = {
  NRStName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  roleId: "User",
};

export default function UserList() {
  const isAdmin = useIsAdmin();
  const isAegis = useIsAegis();
  const canManage = isAdmin || isAegis;

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [actioning, setActioning] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);

  const load = () => {
    if (USE_MOCK) {
      setAllUsers(MOCK_USERS as UserSummary[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    userMgmtApi
      .list()
      .then(setAllUsers)
      .catch(() => toast.error("Failed to load users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const total = Math.ceil(allUsers.length / pageSize);
    setTotalPages(total > 0 ? total : 1);
    setUsers(allUsers.slice((page - 1) * pageSize, page * pageSize));
  }, [page, pageSize, allUsers]);

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.NRStName || !form.lastName || !form.email) {
      toast.error("NRSt name, last name and email are required.");
      return;
    }
    setSaving(true);
    try {
      await userMgmtApi.create(form);
      toast.success("User created. They will receive a temporary password by email.");
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch {
      toast.error("Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserSummary) => {
    setActioning(user.id);
    try {
      if (user.status === "Active") {
        await userMgmtApi.deactivate(user.id);
        toast.success(`${user.NRStName} deactivated.`);
      } else {
        await userMgmtApi.activate(user.id);
        toast.success(`${user.NRStName} activated.`);
      }
      load();
    } catch {
      toast.error("Action failed.");
    } finally {
      setActioning(null);
    }
  };

  const handleResetPassword = async (user: UserSummary) => {
    if (!window.confirm(`Reset password for ${user.NRStName} ${user.lastName}?`)) return;
    setActioning(user.id);
    try {
      await userMgmtApi.resetPassword(user.id);
      toast.success(`Password reset email sent to ${user.email}.`);
    } catch {
      toast.error("Failed to reset password.");
    } finally {
      setActioning(null);
    }
  };

  return (
    <>
      <PageMeta title="Users | Aegis NRS Portal" description="Manage portal users" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage portal access and user roles
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            + Invite User
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6"
        >
          <h2 className="text-base font-semibold text-gray-700 dark:text-white mb-4">Invite New User</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                NRSt Name *
              </label>
              <input
                value={form.NRStName}
                onChange={(e) => setForm((f) => ({ ...f, NRStName: e.target.value }))}
                className={inputCls}
                placeholder="NRSt name"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Last Name *
              </label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className={inputCls}
                placeholder="Last name"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email *</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
                placeholder="user@example.com"
                type="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
              <input
                value={form.phoneNumber ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                className={inputCls}
                placeholder="+234..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Role</label>
              <select
                value={form.roleId}
                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                className={inputCls}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? "Sending invite…" : "Invite User"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-3">No users found.</p>
            {canManage && (
              <button
                onClick={() => setShowForm(true)}
                className="text-brand-500 hover:text-brand-600 text-sm font-medium"
              >
                Invite your NRSt user →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Roles</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Last Login
                  </th>
                  {canManage && (
                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                      {u.NRStName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleDateString("en-NG", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Never"}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={actioning === u.id}
                            className={`text-xs font-medium disabled:opacity-40 transition-colors ${
                              u.status === "Active"
                                ? "text-amber-600 hover:text-amber-700"
                                : "text-green-600 hover:text-green-700"
                            }`}
                          >
                            {u.status === "Active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            disabled={actioning === u.id}
                            className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-40 transition-colors"
                          >
                            Reset PWD
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={e => handlePageSizeChange(Number(e.target.value))}
                  className="block w-full pl-2 pr-8 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
