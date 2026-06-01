import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { normalizePhone } from "../../lib/phoneUtils";
import PageMeta from "../../components/common/PageMeta";
import TablePagination from "../../components/common/TablePagination";
import { SkeletonTableRows } from "../../components/ui/skeleton/Skeleton";
import {
  vendorApi,
  vendorGroupApi,
  type Vendor,
  type VendorGroup,
} from "../../lib/api";
import {
  USE_MOCK,
  MOCK_VENDORS,
  MOCK_VENDOR_GROUPS,
  MOCK_PAGE_SIZE,
} from "../../lib/mockData";
import { useIsAdmin } from "../../context/AuthContext";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

type FormData = {
  businessName: string;
  email: string;
  phone: string;
  vendorGroupId: string;
};
const emptyForm: FormData = {
  businessName: "",
  email: "",
  phone: "",
  vendorGroupId: "",
};

const statusColor: Record<string, string> = {
  true: "bg-green-100 text-green-700",
  false: "bg-gray-100 text-gray-500",
};

export default function VendorList() {
  const isAdmin = useIsAdmin();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [groups, setGroups] = useState<VendorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleModal, setToggleModal] = useState<Vendor | null>(null);

  const load = async (p = page) => {
    if (USE_MOCK) {
      let filtered = MOCK_VENDORS;
      if (search)
        filtered = filtered.filter(
          (v) =>
            v.businessName.toLowerCase().includes(search.toLowerCase()) ||
            v.email.toLowerCase().includes(search.toLowerCase()),
        );
      if (groupFilter)
        filtered = filtered.filter((v) => v.vendorGroupId === groupFilter);
      setTotalCount(filtered.length);
      setTotalPages(Math.ceil(filtered.length / MOCK_PAGE_SIZE));
      setVendors(
        filtered.slice(
          (p - 1) * MOCK_PAGE_SIZE,
          p * MOCK_PAGE_SIZE,
        ) as Vendor[],
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await vendorApi.list({
        page: p,
        pageSize: 10,
        searchTerm: search || undefined,
        vendorGroupId: groupFilter || undefined,
      });
      setVendors(res?.items ?? []);
      setTotalCount(res?.totalCount ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (USE_MOCK) {
      setGroups(MOCK_VENDOR_GROUPS as VendorGroup[]);
      return;
    }
    vendorGroupApi
      .list({ pageSize: 100 })
      .then((r) => setGroups(r?.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load(1);
    setPage(1);
  }, [search, groupFilter]);
  useEffect(() => {
    load(page);
  }, [page]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({
      businessName: v.businessName,
      email: v.email,
      phone: v.phone ?? "",
      vendorGroupId: v.vendorGroupId ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await vendorApi.update(editing.id, {
          businessName: form.businessName,
          phone: form.phone ? normalizePhone(form.phone) : undefined,
          vendorGroupId: form.vendorGroupId || undefined,
        });
        toast.success("Vendor updated");
      } else {
        await vendorApi.create({
          businessName: form.businessName,
          email: form.email,
          phone: form.phone ? normalizePhone(form.phone) : undefined,
          vendorGroupId: form.vendorGroupId || undefined,
        });
        toast.success("Vendor created");
      }
      setShowForm(false);
      load(1);
    } catch (err: unknown) {
      const e = err as {
        response?: {
          data?: { errors?: Record<string, string[]>; message?: string };
        };
      };
      const apiErrors = e?.response?.data?.errors;
      if (apiErrors) {
        Object.values(apiErrors)
          .flat()
          .forEach((msg) => toast.error(msg));
      } else {
        toast.error(e?.response?.data?.message || "Failed to save vendor");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (vendor: Vendor) => {
    setToggleModal(vendor);
  };

  const confirmToggle = async () => {
    if (!toggleModal) return;
    const vendor = toggleModal;
    setToggleModal(null);
    setToggling(vendor.id);
    try {
      if (!USE_MOCK) await vendorApi.toggleStatus(vendor.id);
      toast.success(
        `${vendor.businessName} ${vendor.isActive ? "deactivated" : "activated"}.`,
      );
      load(page);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to update status.");
    } finally {
      setToggling(null);
    }
  };

  return (
    <>
      <PageMeta
        title="Vendors"
        description="Manage vendors for invoice broadcasts"
      />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Vendors
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalCount} vendors total
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition"
            >
              + New Vendor
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            className={inputCls + " max-w-xs"}
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={inputCls + " max-w-xs"}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">All Groups</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <SkeletonTableRows
                    rows={8}
                    colWidths={["w-36", "w-40", "w-28", "w-28", "w-20", "w-16"]}
                  />
                </tbody>
              </table>
            </div>
          ) : vendors?.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">
                No vendors found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Business Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Group
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {vendors?.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {v.businessName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{v.email}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {v.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {v.vendorGroupName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[String(v.isActive)]}`}
                        >
                          {v.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => openEdit(v)}
                            className="text-brand-500 hover:underline text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggle(v)}
                            disabled={toggling === v.id}
                            className={`text-xs font-medium disabled:opacity-40 transition-colors ${
                              v.isActive
                                ? "text-amber-600 hover:text-amber-700"
                                : "text-green-600 hover:text-green-700"
                            }`}
                          >
                            {v.isActive ? "Deactivate" : "Activate"}
                          </button>
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
      </div>

      {/* ── Toggle Status Confirmation Modal ── */}
      {toggleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                {toggleModal.isActive ? "Deactivate" : "Activate"} Vendor
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
                {toggleModal.isActive ? "Deactivate" : "Activate"}{" "}
                <span className="font-semibold text-gray-800 dark:text-white">
                  {toggleModal.businessName}
                </span>
                ?
              </p>
              {toggleModal.isActive && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  This vendor will no longer be able to submit invoices.
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
                onClick={confirmToggle}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors text-white ${
                  toggleModal.isActive
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {toggleModal.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-9999999 flex" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">{editing ? "Edit Vendor" : "New Vendor"}</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Business Name *</label>
                  <input className={inputCls} value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} required />
                </div>
                {!editing && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Email *</label>
                    <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Phone</label>
                  <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Group</label>
                  <select className={inputCls} value={form.vendorGroupId} onChange={(e) => setForm((f) => ({ ...f, vendorGroupId: e.target.value }))}>
                    <option value="">— No Group —</option>
                    {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-lg transition-colors">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
