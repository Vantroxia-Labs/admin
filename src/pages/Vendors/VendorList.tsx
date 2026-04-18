import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
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
      setVendors(res.items ?? []);
      setTotalCount(res.totalCount ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      toast.error("Failed to load vendors");
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
      .then((r) => setGroups(r.items ?? []))
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
          phone: form.phone || undefined,
          vendorGroupId: form.vendorGroupId || undefined,
        });
        toast.success("Vendor updated");
      } else {
        await vendorApi.create({
          businessName: form.businessName,
          email: form.email,
          phone: form.phone || undefined,
          vendorGroupId: form.vendorGroupId || undefined,
        });
        toast.success("Vendor created");
      }
      setShowForm(false);
      load(1);
    } catch {
      toast.error("Failed to save vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      await vendorApi.toggleStatus(id);
      toast.success("Status updated");
      load(page);
    } catch {
      toast.error("Failed to toggle status");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    try {
      await vendorApi.delete(id);
      toast.success("Vendor deleted");
      load(page);
    } catch {
      toast.error("Failed to delete vendor");
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
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-gray-500">No vendors found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Business Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Group</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {vendors.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
                          onClick={() => handleToggle(v.id)}
                          disabled={toggling === v.id}
                          className="text-yellow-500 hover:underline text-xs"
                        >
                          {v.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    )}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editing ? "Edit Vendor" : "New Vendor"}
            </h2>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Business Name *
              </label>
              <input
                className={inputCls}
                value={form.businessName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, businessName: e.target.value }))
                }
                required
              />
            </div>
            {!editing && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Email *
                </label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Phone
              </label>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Group
              </label>
              <select
                className={inputCls}
                value={form.vendorGroupId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vendorGroupId: e.target.value }))
                }
              >
                <option value="">— No Group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
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
