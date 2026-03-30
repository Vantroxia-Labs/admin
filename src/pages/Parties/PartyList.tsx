import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { partyApi, tinValidationApi, type Party, type CreatePartyPayload } from "../../lib/api";
import { USE_MOCK, MOCK_PARTIES } from "../../lib/mockData";
import { useIsAdmin, useIsAegis } from "../../context/AuthContext";

type TinStatus = "idle" | "checking" | "valid" | "invalid" | "error";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const emptyForm: CreatePartyPayload = {
  name: "",
  phone: "",
  email: "",
  taxIdentificationNumber: "",
  description: "",
  address: {
    street: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  },
};

export default function PartyList() {
  const isAdmin = useIsAdmin();
  const isAegis = useIsAegis();
  const canManage = isAdmin || isAegis;

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreatePartyPayload>(emptyForm);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  // TIN validation (skipped in edit mode)
  const [tinStatus, setTinStatus] = useState<TinStatus>("idle");
  const [tinBusinessName, setTinBusinessName] = useState("");

  useEffect(() => {
    const tin = form.taxIdentificationNumber.trim();
    if (!tin) { setTinStatus("idle"); setTinBusinessName(""); return; }
    setTinStatus("checking");
    const timer = setTimeout(async () => {
      if (USE_MOCK) {
        setTinStatus("valid");
        setTinBusinessName(form.name || "Verified Business");
        return;
      }
      try {
        const result = await tinValidationApi.validate(tin);
        if (result.isValid && result.isEnrolled) {
          setTinStatus("valid");
          setTinBusinessName(result.businessName ?? "");
        } else {
          setTinStatus("invalid");
          setTinBusinessName("");
        }
      } catch {
        setTinStatus("error");
        setTinBusinessName("");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [form.taxIdentificationNumber]);

  const load = (p: number, ps: number) => {
    if (USE_MOCK) {
      setTotalPages(Math.ceil(MOCK_PARTIES.length / ps));
      setParties(MOCK_PARTIES.slice((p - 1) * ps, p * ps) as Party[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    partyApi
      .list({ page: p, pageSize: ps })
      .then((r) => {
        setParties(r.items);
        setTotalPages(r.totalPages);
      })
      .catch(() => toast.error("Failed to load parties."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page, pageSize);
  }, [page, pageSize]);

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setForm({
      name: party.name,
      phone: party.phone ?? "",
      email: party.email ?? "",
      taxIdentificationNumber: party.taxIdentificationNumber ?? "",
      description: party.description ?? "",
      address: {
        street: party.address?.street ?? "",
        city: party.address?.city ?? "",
        state: party.address?.state ?? "",
        country: party.address?.country ?? "",
        postalCode: party.address?.postalCode ?? "",
      },
    });
    setTinStatus("valid");
    setTinBusinessName(party.name);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingParty(null);
    setForm(emptyForm);
    setTinStatus("idle");
    setTinBusinessName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.taxIdentificationNumber || !form.email || !form.phone || !form.description) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!form.address.street || !form.address.city || !form.address.state || !form.address.country) {
      toast.error("Street, City, State and Country are required.");
      return;
    }
    if (!editingParty) {
      if (tinStatus === "checking") {
        toast.error("TIN validation is in progress. Please wait.");
        return;
      }
      if (tinStatus !== "valid") {
        toast.error("Please provide a valid and NRS-enrolled TIN.");
        return;
      }
    }
    setSaving(true);
    try {
      if (editingParty) {
        await partyApi.update(editingParty.id, form);
        toast.success("Party updated successfully.");
      } else {
        await partyApi.create(form);
        toast.success("Party created successfully.");
      }
      handleCancelForm();
      load(page, pageSize);
    } catch {
      toast.error(editingParty ? "Failed to update party." : "Failed to create party.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await partyApi.delete(id);
      toast.success("Party deleted.");
      load(page, pageSize);
    } catch {
      toast.error("Failed to delete party.");
    }
  };

  return (
    <>
      <PageMeta title="Parties | Aegis NRS Portal" description="Manage trading parties" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Parties</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your suppliers and customers
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            + Add Party
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6"
        >
          <h2 className="text-base font-semibold text-gray-700 dark:text-white mb-4">
            {editingParty ? "Edit Party" : "New Party"}
          </h2>

          {/* Core info */}
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Basic Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Business Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Acme Ltd"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tax Identification Number (TIN) *</label>
              <input
                value={form.taxIdentificationNumber}
                onChange={(e) => setForm((f) => ({ ...f, taxIdentificationNumber: e.target.value }))}
                className={editingParty ? `${inputCls} opacity-60 cursor-not-allowed` : inputCls}
                placeholder="e.g. 12345678-0001"
                readOnly={!!editingParty}
                required
              />
              {tinStatus === "checking" && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Validating TIN...
                </p>
              )}
              {tinStatus === "valid" && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ TIN verified{tinBusinessName ? ` — ${tinBusinessName}` : ""}
                </p>
              )}
              {tinStatus === "invalid" && (
                <p className="text-xs text-red-500 mt-1">✕ TIN not found or not enrolled on NRS</p>
              )}
              {tinStatus === "error" && (
                <p className="text-xs text-orange-500 mt-1">⚠ Could not verify TIN right now. Please try again.</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email *</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
                placeholder="contact@party.com"
                type="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone *</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
                placeholder="+234..."
                required
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${inputCls} resize-none`}
                placeholder="Brief description of this party"
                rows={2}
                required
              />
            </div>
          </div>

          {/* Address */}
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Street *</label>
              <input
                value={form.address.street}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                className={inputCls}
                placeholder="123 Main Street"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">City *</label>
              <input
                value={form.address.city}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                className={inputCls}
                placeholder="Lagos"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">State *</label>
              <input
                value={form.address.state}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                className={inputCls}
                placeholder="Lagos"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Country *</label>
              <input
                value={form.address.country}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, country: e.target.value } }))}
                className={inputCls}
                placeholder="Nigeria"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Postal Code</label>
              <input
                value={form.address.postalCode ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, postalCode: e.target.value } }))}
                className={inputCls}
                placeholder="100001"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : editingParty ? "Update Party" : "Create Party"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-3">No parties found.</p>
            {canManage && (
              <button
                onClick={() => setShowForm(true)}
                className="text-brand-500 hover:text-brand-600 text-sm font-medium"
              >
                Add your NRSt party →
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">TIN</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Phone</th>
                  {canManage && (
                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {parties.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                      {p.taxIdentificationNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {p.email}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {p.phone}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-brand-500 hover:text-brand-600 text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="text-red-500 hover:text-red-600 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </>
  );
}
