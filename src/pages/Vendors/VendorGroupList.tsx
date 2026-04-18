import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { vendorGroupApi, type VendorGroup } from "../../lib/api";
import {
  USE_MOCK,
  MOCK_VENDOR_GROUPS,
  MOCK_PAGE_SIZE,
} from "../../lib/mockData";
import { useIsAdmin } from "../../context/AuthContext";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

type FormData = { name: string; description: string };
const emptyForm: FormData = { name: "", description: "" };

export default function VendorGroupList() {
  const isAdmin = useIsAdmin();

  const [groups, setGroups] = useState<VendorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editing, setEditing] = useState<VendorGroup | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async (p = page) => {
    if (USE_MOCK) {
      const filtered = search
        ? MOCK_VENDOR_GROUPS.filter((g) =>
            g.name.toLowerCase().includes(search.toLowerCase()),
          )
        : MOCK_VENDOR_GROUPS;
      setTotalCount(filtered.length);
      setTotalPages(Math.ceil(filtered.length / MOCK_PAGE_SIZE));
      setGroups(
        filtered.slice(
          (p - 1) * MOCK_PAGE_SIZE,
          p * MOCK_PAGE_SIZE,
        ) as VendorGroup[],
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await vendorGroupApi.list({
        page: p,
        pageSize: 10,
        searchTerm: search || undefined,
      });
      setGroups(res.items ?? []);
      setTotalCount(res.totalCount ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      toast.error("Failed to load vendor groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    setPage(1);
  }, [search]);
  useEffect(() => {
    load(page);
  }, [page]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEdit = (g: VendorGroup) => {
    setEditing(g);
    setForm({ name: g.name, description: g.description ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (USE_MOCK) {
      toast.success(editing ? "Group updated (mock)" : "Group created (mock)");
      setShowForm(false);
      setSaving(false);
      return;
    }
    try {
      if (editing) {
        await vendorGroupApi.update(editing.id, form);
        toast.success("Group updated");
      } else {
        await vendorGroupApi.create(form);
        toast.success("Group created");
      }
      setShowForm(false);
      load(1);
    } catch {
      toast.error("Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Delete this vendor group? All vendors in it will need to be reassigned.",
      )
    )
      return;
    setDeleting(id);
    if (USE_MOCK) {
      toast.success("Group deleted (mock)");
      setDeleting(null);
      return;
    }
    try {
      await vendorGroupApi.delete(id);
      toast.success("Group deleted");
      load(page);
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageMeta
        title="Vendor Groups"
        description="Manage vendor groups for invoice broadcasts"
      />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Vendor Groups
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalCount} groups total
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition"
            >
              + New Group
            </button>
          )}
        </div>

        <input
          className={inputCls + " max-w-xs"}
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500">No vendor groups found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Vendors</th>
                  <th className="px-4 py-3 text-right">Created</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {groups.map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {g.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {g.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {g.vendorCount}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {new Date(g.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEdit(g)}
                          className="text-brand-500 hover:underline text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          disabled={deleting === g.id}
                          className="text-red-500 hover:underline text-xs"
                        >
                          {deleting === g.id ? "Deleting..." : "Delete"}
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editing ? "Edit Vendor Group" : "New Vendor Group"}
            </h2>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Name *
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Description
              </label>
              <textarea
                className={inputCls}
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
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
