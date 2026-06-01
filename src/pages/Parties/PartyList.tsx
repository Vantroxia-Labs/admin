import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { normalizePhone } from "../../lib/phoneUtils";
import PageMeta from "../../components/common/PageMeta";
import TablePagination from "../../components/common/TablePagination";
import {
  SkeletonTableRows,
  SkeletonDot,
} from "../../components/ui/skeleton/Skeleton";
import {
  partyApi,
  tinValidationApi,
  NRSApi,
  type Party,
  type CreatePartyPayload,
  type FIRSState,
  type FIRSLga,
  type FIRSCountry,
} from "../../lib/api";
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
    lga: "",
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
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreatePartyPayload>(emptyForm);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [deactivateModal, setDeactivateModal] = useState<Party | null>(null);

  const [states, setStates] = useState<FIRSState[]>([]);
  const [allLgas, setAllLgas] = useState<FIRSLga[]>([]);
  const [countries, setCountries] = useState<FIRSCountry[]>([]);
  const filteredLgas = allLgas.filter(
    (l) => !form.address.state || l.state_code === form.address.state,
  );

  useEffect(() => {
    if (USE_MOCK) return;
    NRSApi.getStates()
      .then(setStates)
      .catch(() => {});
    NRSApi.getLgas()
      .then(setAllLgas)
      .catch(() => {});
    NRSApi.getCountries()
      .then(setCountries)
      .catch(() => {});
  }, []);

  // TIN validation (skipped in edit mode)
  const [tinStatus, setTinStatus] = useState<TinStatus>("idle");
  const [tinBusinessName, setTinBusinessName] = useState("");

  useEffect(() => {
    const tin = form.taxIdentificationNumber.trim();
    if (!tin) {
      setTinStatus("idle");
      setTinBusinessName("");
      return;
    }
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
      setTotalCount(MOCK_PARTIES.length);
      setTotalPages(Math.ceil(MOCK_PARTIES.length / ps));
      setParties(MOCK_PARTIES.slice((p - 1) * ps, p * ps) as Party[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    partyApi
      .list({ page: p, pageSize: ps })
      .then((r) => {
        setParties(r?.items ?? []);
        setTotalPages(r?.totalPages ?? 1);
        setTotalCount(r?.totalCount ?? 0);
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
        lga: party.address?.lga ?? "",
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
    if (
      !form.name ||
      !form.taxIdentificationNumber ||
      !form.email ||
      !form.phone ||
      !form.description
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (
      !form.address.street ||
      !form.address.city ||
      !form.address.state ||
      !form.address.country
    ) {
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
    const normalizedForm = { ...form, phone: normalizePhone(form.phone) };
    try {
      if (editingParty) {
        await partyApi.update(editingParty.id, normalizedForm);
        toast.success("Party updated successfully.");
      } else {
        await partyApi.create(normalizedForm);
        toast.success("Party created successfully.");
      }
      handleCancelForm();
      load(page, pageSize);
    } catch {
      toast.error(
        editingParty ? "Failed to update party." : "Failed to create party.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (party: Party) => setDeactivateModal(party);

  const confirmDeactivate = async () => {
    if (!deactivateModal) return;
    const id = deactivateModal.id;
    const name = deactivateModal.name;
    setDeactivateModal(null);
    if (USE_MOCK) {
      setParties((prev) => prev.filter((p) => p.id !== id));
      toast.success(`"${name}" deactivated.`);
      return;
    }
    try {
      await partyApi.deactivate(id);
      toast.success(`"${name}" deactivated.`);
      load(page, pageSize);
    } catch {
      toast.error("Failed to deactivate party.");
    }
  };

  return (
    <>
      <PageMeta
        title="Parties | Aegis EInvoicing Portal"
        description="Manage trading parties"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Parties
          </h1>
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
        <div
          className="fixed inset-0 z-9999999 flex"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCancelForm}
          />
          <div className="relative ml-auto w-full max-w-xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                  {editingParty ? "Edit Party" : "New Party"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {editingParty
                    ? "Update party details"
                    : "Add a new supplier or customer"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelForm}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Core info */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                    Basic Information
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Business Name *
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className={inputCls}
                        placeholder="e.g. Acme Ltd"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Tax Identification Number (TIN) *
                      </label>
                      <input
                        value={form.taxIdentificationNumber}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            taxIdentificationNumber: e.target.value,
                          }))
                        }
                        className={
                          editingParty
                            ? `${inputCls} opacity-60 cursor-not-allowed`
                            : inputCls
                        }
                        placeholder="e.g. 12345678-0001"
                        readOnly={!!editingParty}
                        required
                      />
                      {tinStatus === "checking" && (
                        <p className="text-xs text-gray-400 mt-1">
                          <SkeletonDot label="Validating TIN..." />
                        </p>
                      )}
                      {tinStatus === "valid" && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ TIN verified
                          {tinBusinessName ? ` — ${tinBusinessName}` : ""}
                        </p>
                      )}
                      {tinStatus === "invalid" && (
                        <p className="text-xs text-red-500 mt-1">
                          ✕ TIN not found or not enrolled on NRS
                        </p>
                      )}
                      {tinStatus === "error" && (
                        <p className="text-xs text-orange-500 mt-1">
                          ⚠ Could not verify TIN right now. Please try again.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Email *
                      </label>
                      <input
                        value={form.email}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className={inputCls}
                        placeholder="contact@party.com"
                        type="email"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Phone *
                      </label>
                      <input
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        className={inputCls}
                        placeholder="+234..."
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Description *
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        className={`${inputCls} resize-none`}
                        placeholder="Brief description of this party"
                        rows={2}
                        required
                      />
                    </div>
                  </div>
                </fieldset>
                {/* Address */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                    Address
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Street *
                      </label>
                      <input
                        value={form.address.street}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            address: { ...f.address, street: e.target.value },
                          }))
                        }
                        className={inputCls}
                        placeholder="123 Main Street"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        City *
                      </label>
                      <input
                        value={form.address.city}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            address: { ...f.address, city: e.target.value },
                          }))
                        }
                        className={inputCls}
                        placeholder="Lagos"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Country *
                      </label>
                      <select
                        value={form.address.country}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            address: { ...f.address, country: e.target.value },
                          }))
                        }
                        className={inputCls}
                        required
                      >
                        <option value="">Select country...</option>
                        {countries.map((c) => (
                          <option key={c.alpha_2} value={c.alpha_2}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        State *
                      </label>
                      <select
                        value={form.address.state}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            address: {
                              ...f.address,
                              state: e.target.value,
                              lga: "",
                            },
                          }))
                        }
                        className={inputCls}
                        required
                      >
                        <option value="">Select state…</option>
                        {states.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        LGA
                      </label>
                      <select
                        value={form.address.lga ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            address: { ...f.address, lga: e.target.value },
                          }))
                        }
                        className={inputCls}
                      >
                        <option value="">Select LGA…</option>
                        {filteredLgas.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Postal Code
                      </label>
                      <input
                        value={form.address.postalCode ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            address: {
                              ...f.address,
                              postalCode: e.target.value,
                            },
                          }))
                        }
                        className={inputCls}
                        placeholder="100001"
                      />
                    </div>
                  </div>
                </fieldset>
              </div>
              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-lg transition-colors"
                >
                  {saving
                    ? "Saving…"
                    : editingParty
                      ? "Update Party"
                      : "Create Party"}
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
            {totalCount > 0
              ? `${totalCount} part${totalCount !== 1 ? "ies" : "y"}`
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
            <table className="w-full text-sm">
              <tbody>
                <SkeletonTableRows
                  rows={10}
                  colWidths={["w-36", "w-28", "w-36", "w-24", "w-16"]}
                />
              </tbody>
            </table>
          </div>
        ) : parties?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              No parties found.
            </p>
            {canManage && (
              <button
                onClick={() => setShowForm(true)}
                className="text-brand-500 hover:text-brand-600 text-sm font-medium"
              >
                Add party →
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      TIN
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Phone
                    </th>
                    {canManage && (
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {parties?.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                        {p.name}
                      </td>
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
                              onClick={() => handleDeactivate(p)}
                              className="text-amber-500 hover:text-amber-600 text-xs font-medium"
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </>
        )}
      </div>

      {/* Deactivate confirmation modal */}
      {deactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">
              Deactivate Party
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Are you sure you want to deactivate{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {deactivateModal.name}
              </span>
              ? They will no longer appear in active records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivateModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeactivate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-xl transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
