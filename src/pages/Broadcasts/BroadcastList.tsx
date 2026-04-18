import { useEffect, useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import {
  broadcastApi,
  vendorApi,
  vendorGroupApi,
  type BroadcastSummary,
  type Vendor,
  type VendorGroup,
} from "../../lib/api";
import {
  USE_MOCK,
  MOCK_BROADCASTS,
  MOCK_VENDORS,
  MOCK_VENDOR_GROUPS,
  MOCK_PAGE_SIZE,
} from "../../lib/mockData";
import { useIsAdmin } from "../../context/AuthContext";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Deactivated: "bg-gray-100 text-gray-500",
};

type CreateForm = {
  title: string;
  invoiceTypeCode: string;
  dueDate: string;
  requiresApproval: boolean;
  currency: string;
  note: string;
  vendorGroupId: string;
  vendorIds: string[];
  frontendBaseUrl: string;
};

const emptyForm: CreateForm = {
  title: "",
  invoiceTypeCode: "396",
  dueDate: "",
  requiresApproval: false,
  currency: "NGN",
  note: "",
  vendorGroupId: "",
  vendorIds: [],
  frontendBaseUrl: window.location.origin,
};

export default function BroadcastList() {
  const isAdmin = useIsAdmin();

  const [broadcasts, setBroadcasts] = useState<BroadcastSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [groups, setGroups] = useState<VendorGroup[]>([]);

  const load = async (p = page) => {
    if (USE_MOCK) {
      setTotalCount(MOCK_BROADCASTS.length);
      setTotalPages(Math.ceil(MOCK_BROADCASTS.length / MOCK_PAGE_SIZE));
      setBroadcasts(
        MOCK_BROADCASTS.slice(
          (p - 1) * MOCK_PAGE_SIZE,
          p * MOCK_PAGE_SIZE,
        ) as BroadcastSummary[],
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await broadcastApi.list({ page: p, pageSize: 10 });
      setBroadcasts(res.items ?? []);
      setTotalCount(res.totalCount ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      toast.error("Failed to load broadcasts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
    if (USE_MOCK) {
      setGroups(MOCK_VENDOR_GROUPS as VendorGroup[]);
      setVendors(MOCK_VENDORS as Vendor[]);
      return;
    }
    vendorGroupApi
      .list({ pageSize: 100 })
      .then((r) => setGroups(r.items ?? []))
      .catch(() => {});
    vendorApi
      .list({ pageSize: 200 })
      .then((r) => setVendors(r.items ?? []))
      .catch(() => {});
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await broadcastApi.create({
        ...form,
        vendorIds: form.vendorIds.length ? form.vendorIds : undefined,
        vendorGroupId: form.vendorGroupId || undefined,
        note: form.note || undefined,
        frontendBaseUrl: form.frontendBaseUrl || undefined,
      });
      toast.success("Broadcast created");
      setShowForm(false);
      setForm(emptyForm);
      load(1);
    } catch {
      toast.error("Failed to create broadcast");
    } finally {
      setSaving(false);
    }
  };

  const toggleVendor = (id: string) => {
    setForm((f) => ({
      ...f,
      vendorIds: f.vendorIds.includes(id)
        ? f.vendorIds.filter((v) => v !== id)
        : [...f.vendorIds, id],
    }));
  };

  return (
    <>
      <PageMeta
        title="Invoice Broadcasts"
        description="Manage vendor invoice broadcast campaigns"
      />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Invoice Broadcasts
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalCount} broadcasts total
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition"
            >
              + New Broadcast
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : broadcasts.length === 0 ? (
          <p className="text-sm text-gray-500">No broadcasts found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-right">Vendors</th>
                  <th className="px-4 py-3 text-right">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {broadcasts.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {b.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(b.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {b.totalVendors}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {b.submittedCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/broadcasts/${b.id}`}
                        className="text-brand-500 hover:underline text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 my-8"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Invoice Broadcast
            </h2>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Title *
              </label>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Invoice Type Code
                </label>
                <input
                  className={inputCls}
                  value={form.invoiceTypeCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoiceTypeCode: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Currency
                </label>
                <input
                  className={inputCls}
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Due Date *
              </label>
              <input
                type="date"
                className={inputCls}
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Note
              </label>
              <textarea
                className={inputCls}
                rows={2}
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={form.requiresApproval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requiresApproval: e.target.checked }))
                }
                className="rounded"
              />
              <label
                htmlFor="requiresApproval"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Requires manual approval
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Vendor Group (optional)
              </label>
              <select
                className={inputCls}
                value={form.vendorGroupId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vendorGroupId: e.target.value }))
                }
              >
                <option value="">— Select group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Individual Vendors (optional)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                {vendors.map((v) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.vendorIds.includes(v.id)}
                      onChange={() => toggleVendor(v.id)}
                      className="rounded"
                    />
                    {v.businessName}{" "}
                    <span className="text-xs text-gray-400">({v.email})</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Frontend Base URL (for vendor link)
              </label>
              <input
                className={inputCls}
                value={form.frontendBaseUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, frontendBaseUrl: e.target.value }))
                }
                placeholder="https://portal.yourapp.com"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Broadcast"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
