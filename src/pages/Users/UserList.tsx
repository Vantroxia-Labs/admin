import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  SkeletonTableRows,
  SkeletonSidePanel,
} from "../../components/ui/skeleton/Skeleton";
import PageMeta from "../../components/common/PageMeta";
import TablePagination from "../../components/common/TablePagination";
import {
  userMgmtApi,
  aegisUserApi,
  roleApi,
  type UserSummary,
  type AegisUserSummary,
  type AegisUserDetail,
  type UpdateAegisUserProfilePayload,
  type RoleSummary,
  type CreateUserPayload,
  type CreateAegisUserPayload,
} from "../../lib/api";
import {
  USE_MOCK,
  MOCK_USERS,
  MOCK_AEGIS_USERS,
  MOCK_ROLES,
} from "../../lib/mockData";
import { useIsAdmin, useIsAegis } from "../../context/AuthContext";
import { usePermissions, Permission } from "../../hooks/usePermissions";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const STATUS_COLORS: Record<string, string> = {
  Active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const AEGIS_PERMISSION_GROUPS: {
  group: string;
  items: { value: string; label: string }[];
}[] = [
  {
    group: "Aegis Staff Management",
    items: [
      { value: "Aegis_users.create", label: "Create Staff" },
      { value: "Aegis_users.view", label: "View Staff" },
      { value: "Aegis_users.update_profile", label: "Update Profile" },
      { value: "Aegis_users.update_role", label: "Update Role" },
      { value: "Aegis_users.delete", label: "Delete Staff" },
      { value: "Aegis_users.activate", label: "Activate" },
      { value: "Aegis_users.deactivate", label: "Deactivate" },
      { value: "Aegis_users.reset_password", label: "Reset Password" },
    ],
  },
  {
    group: "Business Management",
    items: [
      { value: "business.create", label: "Create Business" },
      { value: "business.view", label: "View Businesses" },
      { value: "business.update", label: "Update Businesses" },
      { value: "business.manage_settings", label: "Manage Settings" },
      { value: "business.manage_branches", label: "Manage Branches" },
      { value: "business.manage_certificates", label: "Manage Certificates" },
    ],
  },
  {
    group: "Client User Management",
    items: [
      { value: "users.create", label: "Create Users" },
      { value: "users.view", label: "View Users" },
      { value: "users.update", label: "Update Users" },
      { value: "users.delete", label: "Delete Users" },
      { value: "users.activate", label: "Activate Users" },
      { value: "users.deactivate", label: "Deactivate Users" },
      { value: "users.reset_password", label: "Reset Passwords" },
    ],
  },
  {
    group: "Role Management",
    items: [
      { value: "roles.create", label: "Create Roles" },
      { value: "roles.view", label: "View Roles" },
      { value: "roles.update", label: "Update Roles" },
      { value: "roles.delete", label: "Delete Roles" },
      { value: "roles.assign", label: "Assign Roles" },
    ],
  },
  {
    group: "System & Reporting",
    items: [
      { value: "system.view_audit_logs", label: "View Audit Logs" },
      { value: "system.view_integration_logs", label: "View Integration Logs" },
      { value: "system.manage_integrations", label: "Manage Integrations" },
      { value: "tenant.manage", label: "Manage Tenant" },
      { value: "tenant.view_settings", label: "View Tenant Settings" },
      { value: "tenant.update_settings", label: "Update Tenant Settings" },
    ],
  },
];

const emptyClientForm: CreateUserPayload = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  roleIds: [],
};

const emptyAegisForm: CreateAegisUserPayload = {
  NRStName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  permissions: [],
};

// Checkbox that supports indeterminate state
function GroupCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
    />
  );
}

export default function UserList() {
  const isAdmin = useIsAdmin();
  const isAegis = useIsAegis();
  const { can } = usePermissions();
  const [availableRoles, setAvailableRoles] = useState<RoleSummary[]>([]);
  const canManageUsers = isAegis || can(Permission.CreateUsers);
  const canActivate = isAegis || can(Permission.ActivateUsers);
  const canDeactivate = isAegis || can(Permission.DeactivateUsers);
  const canResetPwd = isAegis || can(Permission.ResetPasswords);
  const canManage = isAdmin || isAegis || canManageUsers;

  const [users, setUsers] = useState<(UserSummary | AegisUserSummary)[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientForm, setClientForm] =
    useState<CreateUserPayload>(emptyClientForm);
  const [aegisForm, setAegisForm] =
    useState<CreateAegisUserPayload>(emptyAegisForm);
  const [actioning, setActioning] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<
    UserSummary | AegisUserSummary | null
  >(null);
  const [toggleModal, setToggleModal] = useState<
    UserSummary | AegisUserSummary | null
  >(null);
  const [editUser, setEditUser] = useState<AegisUserSummary | null>(null);
  const [editForm, setEditForm] = useState<{
    NRStName: string;
    lastName: string;
    phoneNumber: string;
    aegisEmployeeId: string;
    aegisDepartment: string;
    permissions: string[];
  }>({
    NRStName: "",
    lastName: "",
    phoneNumber: "",
    aegisEmployeeId: "",
    aegisDepartment: "",
    permissions: [],
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [editCollapsedGroups, setEditCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const toggleGroup = (group: string) =>
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      n.has(group) ? n.delete(group) : n.add(group);
      return n;
    });
  const toggleEditGroup = (group: string) =>
    setEditCollapsedGroups((prev) => {
      const n = new Set(prev);
      n.has(group) ? n.delete(group) : n.add(group);
      return n;
    });

  const [allUsers, setAllUsers] = useState<(UserSummary | AegisUserSummary)[]>(
    [],
  );

  const load = () => {
    if (USE_MOCK) {
      setAllUsers(
        isAegis
          ? (MOCK_AEGIS_USERS as AegisUserSummary[])
          : (MOCK_USERS as UserSummary[]),
      );
      if (!isAegis) setAvailableRoles(MOCK_ROLES as RoleSummary[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchPromise = isAegis ? aegisUserApi.list() : userMgmtApi.list();
    fetchPromise
      .then(setAllUsers)
      .catch(() => toast.error("Failed to load users."))
      .finally(() => setLoading(false));
    if (!isAegis) {
      roleApi
        .listForBusiness()
        .then(setAvailableRoles)
        .catch(() => {});
    }
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
    const form = isAegis ? aegisForm : clientForm;
    const firstName = isAegis ? aegisForm.NRStName : clientForm.firstName;
    if (!firstName || !form.lastName || !form.email) {
      toast.error("First name, last name and email are required.");
      return;
    }
    setSaving(true);
    try {
      if (isAegis) {
        if (!USE_MOCK) await aegisUserApi.create(aegisForm);
        toast.success(
          "Aegis staff user created. They will receive a temporary password by email.",
        );
        setAegisForm(emptyAegisForm);
      } else {
        if (!USE_MOCK) await userMgmtApi.create(clientForm);
        toast.success(
          "User created. They will receive a temporary password by email.",
        );
        setClientForm(emptyClientForm);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          data?: { errors?: Record<string, string[]>; message?: string };
        };
      };
      const apiErrors = axiosErr?.response?.data?.errors;
      if (apiErrors) {
        Object.values(apiErrors)
          .flat()
          .forEach((msg) => toast.error(msg));
      } else {
        toast.error(
          axiosErr?.response?.data?.message || "Failed to create user.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (user: UserSummary | AegisUserSummary) => {
    setToggleModal(user);
  };

  const confirmToggleStatus = async () => {
    if (!toggleModal) return;
    const user = toggleModal;
    setToggleModal(null);
    setActioning(user.id);
    try {
      if (user.status === "Active") {
        if (!USE_MOCK) {
          isAegis
            ? await aegisUserApi.deactivate(user.id)
            : await userMgmtApi.deactivate(user.id);
        }
        toast.success(`${user.NRStName} deactivated.`);
      } else {
        if (!USE_MOCK) {
          isAegis
            ? await aegisUserApi.activate(user.id)
            : await userMgmtApi.activate(user.id);
        }
        toast.success(`${user.NRStName} activated.`);
      }
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, status: user.status === "Active" ? "Inactive" : "Active" }
            : u,
        ),
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Action failed.");
    } finally {
      setActioning(null);
    }
  };

  const handleResetPassword = (user: UserSummary | AegisUserSummary) => {
    setResetModal(user);
  };

  const confirmResetPassword = async () => {
    if (!resetModal) return;
    const user = resetModal;
    setResetModal(null);
    setActioning(user.id);
    try {
      if (!USE_MOCK) {
        isAegis
          ? await aegisUserApi.resetPassword(user.id)
          : await userMgmtApi.resetPassword(user.id);
      }
      toast.success(`Password reset email sent to ${user.email}.`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message || "Failed to reset password.",
      );
    } finally {
      setActioning(null);
    }
  };

  const handleEditUser = async (user: AegisUserSummary) => {
    setEditUser(user);
    setEditLoading(true);
    setEditCollapsedGroups(new Set());
    try {
      const detail: AegisUserDetail = USE_MOCK
        ? {
            ...user,
            phoneNumber: "",
            aegisEmployeeId: "",
            aegisDepartment: "",
            permissions: [],
          }
        : await aegisUserApi.getDetail(user.id);
      setEditForm({
        NRStName: detail.NRStName,
        lastName: detail.lastName,
        phoneNumber: (detail as AegisUserDetail).phoneNumber ?? "",
        aegisEmployeeId: (detail as AegisUserDetail).aegisEmployeeId ?? "",
        aegisDepartment: (detail as AegisUserDetail).aegisDepartment ?? "",
        permissions: detail.permissions ?? [],
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message || "Failed to load user details.",
      );
      setEditUser(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      if (!USE_MOCK) {
        const profilePayload: UpdateAegisUserProfilePayload = {
          NRStName: editForm.NRStName,
          lastName: editForm.lastName,
          phoneNumber: editForm.phoneNumber || undefined,
          aegisEmployeeId: editForm.aegisEmployeeId || undefined,
          aegisDepartment: editForm.aegisDepartment || undefined,
        };
        await aegisUserApi.updateProfile(editUser.id, profilePayload);
        await aegisUserApi.updatePermissions(editUser.id, editForm.permissions);
      }
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? { ...u, NRStName: editForm.NRStName, lastName: editForm.lastName }
            : u,
        ),
      );
      toast.success("User updated successfully.");
      setEditUser(null);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          data?: { errors?: Record<string, string[]>; message?: string };
        };
      };
      const apiErrors = axiosErr?.response?.data?.errors;
      if (apiErrors) {
        Object.values(apiErrors)
          .flat()
          .forEach((msg) => toast.error(msg));
      } else {
        toast.error(
          axiosErr?.response?.data?.message || "Failed to update user.",
        );
      }
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <PageMeta
        title={
          isAegis
            ? "Aegis Staff | Aegis EInvoicing Platform"
            : "Users | Aegis EInvoicing Portal"
        }
        description={
          isAegis ? "Manage Aegis platform staff users" : "Manage portal users"
        }
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {isAegis ? "Aegis Staff" : "Users"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAegis
              ? "Manage Aegis platform staff accounts and roles"
              : "Manage portal access and user roles"}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            + Invite {isAegis ? "Staff" : "User"}
          </button>
        )}
      </div>

      {/* ── Invite Panel ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-9999999 flex"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative ml-auto w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                  Invite {isAegis ? "New Staff" : "New User"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  They will receive a temporary password by email
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleCreate}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                {/* Basic fields */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        First Name *
                      </label>
                      <input
                        value={
                          isAegis ? aegisForm.NRStName : clientForm.firstName
                        }
                        onChange={(e) =>
                          isAegis
                            ? setAegisForm((f) => ({
                                ...f,
                                NRStName: e.target.value,
                              }))
                            : setClientForm((f) => ({
                                ...f,
                                firstName: e.target.value,
                              }))
                        }
                        className={inputCls}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Last Name *
                      </label>
                      <input
                        value={
                          isAegis ? aegisForm.lastName : clientForm.lastName
                        }
                        onChange={(e) =>
                          isAegis
                            ? setAegisForm((f) => ({
                                ...f,
                                lastName: e.target.value,
                              }))
                            : setClientForm((f) => ({
                                ...f,
                                lastName: e.target.value,
                              }))
                        }
                        className={inputCls}
                        placeholder="Last name"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Email *
                      </label>
                      <input
                        value={isAegis ? aegisForm.email : clientForm.email}
                        onChange={(e) =>
                          isAegis
                            ? setAegisForm((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                            : setClientForm((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                        }
                        className={inputCls}
                        placeholder={
                          isAegis ? "staff@aegisnrs.com" : "user@example.com"
                        }
                        type="email"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Phone
                      </label>
                      <input
                        value={
                          (isAegis
                            ? aegisForm.phoneNumber
                            : clientForm.phoneNumber) ?? ""
                        }
                        onChange={(e) =>
                          isAegis
                            ? setAegisForm((f) => ({
                                ...f,
                                phoneNumber: e.target.value,
                              }))
                            : setClientForm((f) => ({
                                ...f,
                                phoneNumber: e.target.value,
                              }))
                        }
                        className={inputCls}
                        placeholder="+234..."
                      />
                    </div>
                    {!isAegis && (
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Role
                        </label>
                        <select
                          value={clientForm.roleIds[0] ?? ""}
                          onChange={(e) =>
                            setClientForm((f) => ({
                              ...f,
                              roleIds: e.target.value ? [e.target.value] : [],
                            }))
                          }
                          className={inputCls}
                        >
                          <option value="">Select a role</option>
                          {availableRoles?.length > 0
                            ? availableRoles?.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))
                            : null}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aegis: role badge + permissions */}
                {isAegis && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Permissions
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        AegisAdmin
                      </span>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                      {AEGIS_PERMISSION_GROUPS.map((group) => {
                        const groupValues = group.items.map((i) => i.value);
                        const perms = aegisForm.permissions ?? [];
                        const selectedCount = groupValues.filter((v) =>
                          perms.includes(v),
                        ).length;
                        const allSelected =
                          selectedCount === groupValues.length;
                        const someSelected = selectedCount > 0 && !allSelected;
                        const isCollapsed = collapsedGroups.has(group.group);
                        return (
                          <div key={group.group}>
                            <div className="flex items-center gap-2 mb-2">
                              <GroupCheckbox
                                checked={allSelected}
                                indeterminate={someSelected}
                                onChange={(on) =>
                                  setAegisForm((f) => ({
                                    ...f,
                                    permissions: on
                                      ? [
                                          ...new Set([
                                            ...(f.permissions ?? []),
                                            ...groupValues,
                                          ]),
                                        ]
                                      : (f.permissions ?? []).filter(
                                          (p) => !groupValues.includes(p),
                                        ),
                                  }))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => toggleGroup(group.group)}
                                className="flex items-center gap-1.5 flex-1 text-left cursor-pointer"
                              >
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                  {group.group}
                                </span>
                                {selectedCount > 0 && (
                                  <span className="text-xs text-brand-500 font-medium">
                                    ({selectedCount}/{groupValues.length})
                                  </span>
                                )}
                                <svg
                                  className={`w-3 h-3 text-gray-400 ml-auto transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            </div>
                            {!isCollapsed && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 pl-5">
                                {group.items.map((item) => {
                                  const checked = perms.includes(item.value);
                                  return (
                                    <label
                                      key={item.value}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) =>
                                          setAegisForm((f) => ({
                                            ...f,
                                            permissions: e.target.checked
                                              ? [
                                                  ...(f.permissions ?? []),
                                                  item.value,
                                                ]
                                              : (f.permissions ?? []).filter(
                                                  (p) => p !== item.value,
                                                ),
                                          }))
                                        }
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                      />
                                      <span className="text-xs text-gray-600 dark:text-gray-300">
                                        {item.label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Leave all unchecked to grant full AegisAdmin access.
                    </p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-lg transition-colors"
                >
                  {saving ? "Sending invite…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {allUsers.length > 0
              ? `${allUsers.length} user${allUsers.length !== 1 ? "s" : ""}`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Rows
            </label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody>
                <SkeletonTableRows
                  rows={10}
                  colWidths={["w-32", "w-40", "w-24", "w-20", "w-24", "w-16"]}
                />
              </tbody>
            </table>
          </div>
        ) : users?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              No users found.
            </p>
            {canManage && (
              <button
                onClick={() => setShowForm(true)}
                className="text-brand-500 hover:text-brand-600 text-sm font-medium"
              >
                {isAegis
                  ? "Invite a staff member →"
                  : "Invite your first user →"}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {isAegis ? "Permissions" : "Roles"}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
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
                {users?.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                      {u.NRStName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {isAegis ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                            AegisAdmin
                          </span>
                        ) : (
                          (u as UserSummary).roles?.map((role) => (
                            <span
                              key={role}
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                            >
                              {role}
                            </span>
                          ))
                        )}
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
                      {(u.lastLoginAt ?? u.lastLogin)
                        ? new Date(
                            (u.lastLoginAt ?? u.lastLogin)!,
                          ).toLocaleDateString("en-NG", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Never"}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isAegis && (
                            <button
                              onClick={() =>
                                handleEditUser(u as AegisUserSummary)
                              }
                              disabled={actioning === u.id}
                              className="text-xs font-medium text-blue-500 hover:text-blue-600 disabled:opacity-40 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {(u.status === "Active"
                            ? canDeactivate
                            : canActivate) && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={actioning === u.id}
                              className={`text-xs font-medium disabled:opacity-40 transition-colors ${
                                u.status === "Active"
                                  ? "text-amber-600 hover:text-amber-700"
                                  : "text-green-600 hover:text-green-700"
                              }`}
                            >
                              {u.status === "Active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          )}
                          {canResetPwd && (
                            <button
                              onClick={() => handleResetPassword(u)}
                              disabled={actioning === u.id}
                              className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-40 transition-colors"
                            >
                              Reset PWD
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>

      {/* ── Reset Password Confirmation Modal ── */}
      {resetModal && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                Reset Password
              </h2>
              <button
                onClick={() => setResetModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Send a password reset email to{" "}
                <span className="font-semibold text-gray-800 dark:text-white">
                  {resetModal.NRStName} {resetModal.lastName}
                </span>
                ?
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {resetModal.email}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setResetModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetPassword}
                className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors"
              >
                Send Reset Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Activate / Deactivate Confirmation Modal ── */}
      {toggleModal && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                {toggleModal.status === "Active" ? "Deactivate" : "Activate"}{" "}
                User
              </h2>
              <button
                onClick={() => setToggleModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {toggleModal.status === "Active" ? "Deactivate" : "Activate"}{" "}
                <span className="font-semibold text-gray-800 dark:text-white">
                  {toggleModal.NRStName} {toggleModal.lastName}
                </span>
                ?
              </p>
              {toggleModal.status === "Active" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  This user will no longer be able to log in.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setToggleModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleStatus}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors text-white ${
                  toggleModal.status === "Active"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {toggleModal.status === "Active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Edit Aegis User Panel ── */}
      {editUser && (
        <div
          className="fixed inset-0 z-9999999 flex"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditUser(null)}
          />
          <div className="relative ml-auto w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                  Edit Staff — {editUser.NRStName} {editUser.lastName}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {editUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                ✕
              </button>
            </div>
            {editLoading ? (
              <SkeletonSidePanel />
            ) : (
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                {/* Profile fields */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Profile
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        First Name *
                      </label>
                      <input
                        value={editForm.NRStName}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            NRStName: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Last Name *
                      </label>
                      <input
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            lastName: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="Last name"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Phone
                      </label>
                      <input
                        value={editForm.phoneNumber}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            phoneNumber: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="+234..."
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Employee ID
                      </label>
                      <input
                        value={editForm.aegisEmployeeId}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            aegisEmployeeId: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="EMP-001"
                      />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Department
                      </label>
                      <input
                        value={editForm.aegisDepartment}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            aegisDepartment: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="e.g. Operations"
                      />
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Permissions
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                    {AEGIS_PERMISSION_GROUPS.map((group) => {
                      const groupValues = group.items.map((i) => i.value);
                      const perms = editForm.permissions;
                      const selectedCount = groupValues.filter((v) =>
                        perms.includes(v),
                      ).length;
                      const allSelected = selectedCount === groupValues.length;
                      const someSelected = selectedCount > 0 && !allSelected;
                      const isCollapsed = editCollapsedGroups.has(group.group);
                      return (
                        <div key={group.group}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <GroupCheckbox
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={(on) =>
                                setEditForm((f) => ({
                                  ...f,
                                  permissions: on
                                    ? [
                                        ...new Set([
                                          ...f.permissions,
                                          ...groupValues,
                                        ]),
                                      ]
                                    : f.permissions.filter(
                                        (p) => !groupValues.includes(p),
                                      ),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => toggleEditGroup(group.group)}
                              className="flex items-center gap-1.5 flex-1 text-left"
                            >
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {group.group}
                              </span>
                              {selectedCount > 0 && (
                                <span className="text-xs text-brand-500 font-medium">
                                  ({selectedCount}/{groupValues.length})
                                </span>
                              )}
                              <svg
                                className={`w-3 h-3 text-gray-400 ml-auto transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          </div>
                          {!isCollapsed && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 pl-5">
                              {group.items.map((item) => {
                                const checked = perms.includes(item.value);
                                return (
                                  <label
                                    key={item.value}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          permissions: e.target.checked
                                            ? [...f.permissions, item.value]
                                            : f.permissions.filter(
                                                (p) => p !== item.value,
                                              ),
                                        }))
                                      }
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                    />
                                    <span className="text-xs text-gray-600 dark:text-gray-300">
                                      {item.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Leave all unchecked to grant full AegisAdmin access.
                  </p>
                </div>
              </div>
            )}
            <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-3">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving || editLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-lg transition-colors"
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
