import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { normalizePhone } from "../../lib/phoneUtils";
import PageMeta from "../../components/common/PageMeta";
import TablePagination from "../../components/common/TablePagination";
import {
  SkeletonTableRows,
  SkeletonPlanCards,
} from "../../components/ui/skeleton/Skeleton";
import {
  businessesApi,
  paymentApi,
  NRSApi,
  type BusinessSummary,
  type BusinessDetail,
  type SubscriptionPlan,
  type CreateBusinessByAdminPayload,
  type UpdateBusinessByAdminPayload,
  type FIRSState,
  type FIRSLga,
  type FIRSCountry,
} from "../../lib/api";
import { USE_MOCK, MOCK_BUSINESSES } from "../../lib/mockData";
import { usePermissions } from "../../hooks/usePermissions";

const STATUS_COLORS: Record<string, string> = {
  Active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Inactive: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const TIER_COLORS: Record<string, string> = {
  SaaS: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
  SFTP: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ApiOnly: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

export default function BusinessList() {
  const { can, isAegisUser } = usePermissions();
  const canCreateBusiness = isAegisUser || can("business.create");

  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create Business panel state
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<0 | 1>(0);
  const [createForm, setCreateForm] = useState({
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
    businessName: "",
    businessDescription: "",
    tin: "",
    industry: "",
    businessRegistrationNumber: "",
    serviceId: "",
    nrsBusinessId: "",
    paymentReference: "",
    paymentAmountNaira: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Business panel state
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editBusiness, setEditBusiness] = useState<BusinessSummary | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    industry: "",
    description: "",
    invoicePrefix: "",
    contactEmail: "",
    contactPhone: "",
    street: "",
    city: "",
    state: "",
    country: "NG",
    postalCode: "",
    lga: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [firsStates, setFirsStates] = useState<FIRSState[]>([]);
  const [allLgas, setAllLgas] = useState<FIRSLga[]>([]);
  const [allCountries, setAllCountries] = useState<FIRSCountry[]>([]);

  const load = () => {
    if (USE_MOCK) {
      setAllBusinesses(MOCK_BUSINESSES as BusinessSummary[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    businessesApi
      .list({ page, pageSize })
      .then((result) => {
        setAllBusinesses(result?.items ?? []);
        setTotalPages(result?.totalPages ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (USE_MOCK) return;
    NRSApi.getStates()
      .then(setFirsStates)
      .catch(() => {});
    NRSApi.getLgas()
      .then(setAllLgas)
      .catch(() => {});
    NRSApi.getCountries()
      .then(setAllCountries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const filtered = search.trim()
      ? allBusinesses.filter(
          (b) =>
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            b.tin?.toLowerCase().includes(search.toLowerCase()) ||
            b.contactEmail?.toLowerCase().includes(search.toLowerCase()),
        )
      : allBusinesses;
    const total = Math.ceil(filtered.length / pageSize);
    setTotalPages(total > 0 ? total : 1);
    setBusinesses(filtered.slice((page - 1) * pageSize, page * pageSize));
  }, [page, pageSize, allBusinesses, search]);

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const openCreatePanel = () => {
    setShowCreatePanel(true);
    if (plans?.length === 0) {
      setLoadingPlans(true);
      paymentApi
        .getPlans()
        .then(setPlans)
        .catch(() => toast.error("Failed to load plans."))
        .finally(() => setLoadingPlans(false));
    }
  };

  const closeCreatePanel = () => {
    setShowCreatePanel(false);
    setSelectedPlans([]);
    setBillingCycle(0);
    setCreateErrors({});
    setSearch("");
    setCreateForm({
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPhone: "",
      businessName: "",
      businessDescription: "",
      tin: "",
      industry: "",
      businessRegistrationNumber: "",
      serviceId: "",
      nrsBusinessId: "",
      paymentReference: "",
      paymentAmountNaira: "",
    });
  };

  const validateCreateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!createForm.adminFirstName.trim())
      errs.adminFirstName = "First name is required";
    if (!createForm.adminLastName.trim())
      errs.adminLastName = "Last name is required";
    if (!createForm.adminEmail.trim()) errs.adminEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.adminEmail))
      errs.adminEmail = "Invalid email";
    if (!createForm.adminPhone.trim()) errs.adminPhone = "Phone is required";
    if (!createForm.businessName.trim())
      errs.businessName = "Business name is required";
    if (!createForm.businessDescription.trim())
      errs.businessDescription = "Business description is required";
    if (!createForm.tin.trim()) errs.tin = "TIN is required";
    if (!createForm.paymentReference.trim())
      errs.paymentReference = "Payment reference is required";
    if (!createForm.paymentAmountNaira.trim())
      errs.paymentAmountNaira = "Payment amount is required";
    else if (
      isNaN(Number(createForm.paymentAmountNaira.replace(/,/g, ""))) ||
      Number(createForm.paymentAmountNaira.replace(/,/g, "")) <= 0
    )
      errs.paymentAmountNaira = "Enter a valid amount";
    if (selectedPlans.length === 0) errs.plans = "Select at least one plan";
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateBusiness = async () => {
    if (!validateCreateForm()) return;
    setCreateLoading(true);
    const payload: CreateBusinessByAdminPayload = {
      adminFirstName: createForm.adminFirstName,
      adminLastName: createForm.adminLastName,
      adminEmail: createForm.adminEmail,
      adminPhone: normalizePhone(createForm.adminPhone),
      businessName: createForm.businessName,
      businessDescription: createForm.businessDescription,
      tin: createForm.tin,
      industry: createForm.industry || undefined,
      businessRegistrationNumber:
        createForm.businessRegistrationNumber || undefined,
      serviceId: createForm.serviceId || undefined,
      nrsBusinessId: createForm.nrsBusinessId || undefined,
      platformSubscriptionIds: selectedPlans.map((p) => p.id),
      billingCycle,
      paymentReference: createForm.paymentReference,
      paymentAmountNaira: Number(
        createForm.paymentAmountNaira.replace(/,/g, ""),
      ),
    };
    try {
      const result = await businessesApi.createByAdmin(payload);
      toast.success(result.message ?? "Business created successfully.");
      closeCreatePanel();
      load();
    } catch (err: unknown) {
      const e = err as {
        response?: {
          data?: { message?: string; errors?: Record<string, string[]> };
        };
      };
      const data = e?.response?.data;
      if (data?.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors)) {
          mapped[k.charAt(0).toLowerCase() + k.slice(1)] = Array.isArray(v)
            ? v[0]
            : String(v);
        }
        setCreateErrors(mapped);
      }
      toast.error(data?.message ?? "Failed to create business.");
    } finally {
      setCreateLoading(false);
    }
  };

  const INDUSTRIES = [
    "Agriculture",
    "Automotive",
    "Banking & Finance",
    "Construction",
    "Education",
    "Energy & Utilities",
    "Food & Beverage",
    "Healthcare",
    "Hospitality & Tourism",
    "ICT & Telecommunications",
    "Insurance",
    "Legal & Professional Services",
    "Logistics & Transportation",
    "Manufacturing",
    "Media & Entertainment",
    "Mining & Metals",
    "Oil & Gas",
    "Pharmaceutical",
    "Real Estate",
    "Retail & FMCG",
    "Textile & Apparel",
    "Other",
  ];

  const openEditPanel = async (business: BusinessSummary) => {
    setEditBusiness(business);
    setEditErrors({});
    setShowEditPanel(true);
    try {
      const detail: BusinessDetail = await businessesApi.getById(business.id);
      setEditForm({
        industry: detail.industry ?? "",
        description: detail.description ?? "",
        invoicePrefix: detail.invoicePrefix ?? "",
        contactEmail: detail.contactEmail ?? "",
        contactPhone: detail.contactPhone ?? "",
        street: detail.registeredAddress?.street ?? "",
        city: detail.registeredAddress?.city ?? "",
        state: detail.registeredAddress?.state ?? "",
        country: detail.registeredAddress?.country ?? "NG",
        postalCode: detail.registeredAddress?.postalCode ?? "",
        lga: detail.registeredAddress?.lga ?? "",
      });
    } catch {
      toast.error("Failed to load business details.");
    }
  };

  const closeEditPanel = () => {
    setShowEditPanel(false);
    setEditBusiness(null);
    setEditErrors({});
  };

  const validateEditForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!editForm.contactEmail.trim()) errs.contactEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.contactEmail))
      errs.contactEmail = "Invalid email";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEditBusiness = async () => {
    if (!editBusiness || !validateEditForm()) return;
    setEditLoading(true);
    const payload: UpdateBusinessByAdminPayload = {
      industry: editForm.industry || "Other",
      description: editForm.description || "N/A",
      invoicePrefix: editForm.invoicePrefix || "INV",
      contactEmail: editForm.contactEmail,
      contactPhone: normalizePhone(editForm.contactPhone) || "N/A",
      registeredAddress: {
        street: editForm.street || "N/A",
        city: editForm.city || "N/A",
        state: editForm.state || "N/A",
        country: editForm.country || "NG",
        postalCode: editForm.postalCode || "N/A",
        lga: editForm.lga || undefined,
      },
    };
    try {
      await businessesApi.update(editBusiness.id, payload);
      toast.success(`${editBusiness.name} updated successfully.`);
      closeEditPanel();
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to update business.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleStatusAction = async (
    business: BusinessSummary,
    action: "suspend" | "activate",
  ) => {
    if (USE_MOCK) {
      setAllBusinesses((prev) =>
        prev.map((b) =>
          b.id === business.id
            ? { ...b, status: action === "suspend" ? "Suspended" : "Active" }
            : b,
        ),
      );
      toast.success(
        `${business.name} ${action === "suspend" ? "suspended" : "activated"}.`,
      );
      return;
    }
    setActionLoading(business.id);
    try {
      if (action === "suspend") {
        await businessesApi.suspend(business.id);
        toast.success(`${business.name} suspended.`);
      } else {
        await businessesApi.activate(business.id);
        toast.success(`${business.name} activated.`);
      }
      // Refresh the list
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || `Failed to ${action} business.`,
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <PageMeta
        title="Businesses | Aegis EInvoicing Platform"
        description="Manage tenant businesses on the Aegis platform"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Businesses
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            All registered tenant businesses on the platform
          </p>
        </div>
        {canCreateBusiness && (
          <button
            onClick={openCreatePanel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Create Business
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, TIN or email…"
          autoComplete="new-password"
          className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {allBusinesses.length > 0
              ? `${allBusinesses.length} business${allBusinesses.length !== 1 ? "es" : ""}`
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
            </select>
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <SkeletonTableRows
                  rows={10}
                  colWidths={[
                    "w-40",
                    "w-28",
                    "w-20",
                    "w-24",
                    "w-24",
                    "w-24",
                    "w-16",
                  ]}
                />
              </tbody>
            </table>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">
              No businesses found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    TIN
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Industry
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Registered
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {businesses.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white">
                        {b.name}
                      </p>
                      {b.contactEmail && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {b.contactEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {b.tin ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {b.subscriptionTier && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            TIER_COLORS[b.subscriptionTier] ??
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {b.subscriptionTier}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {b.industry ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {b.registeredAt
                        ? new Date(b.registeredAt).toLocaleDateString("en-NG", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString("en-NG", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAegisUser && (
                          <button
                            onClick={() => openEditPanel(b)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {b.status === "Active" ? (
                          <button
                            onClick={() => handleStatusAction(b, "suspend")}
                            disabled={actionLoading === b.id}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === b.id ? "…" : "Suspend"}
                          </button>
                        ) : b.status === "Suspended" ? (
                          <button
                            onClick={() => handleStatusAction(b, "activate")}
                            disabled={actionLoading === b.id}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === b.id ? "…" : "Activate"}
                          </button>
                        ) : null}
                      </div>
                    </td>
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

      {/* ── Create Business Overlay Panel ─────────────────────────── */}
      {showCreatePanel && (
        <div
          className="fixed inset-0 z-9999999 flex"
          aria-modal="true"
          role="dialog"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeCreatePanel}
          />
          {/* panel */}
          <div className="relative ml-auto w-full max-w-xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            {/* header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                  Create Business
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Provision a new business directly (payment already received)
                </p>
              </div>
              <button
                onClick={closeCreatePanel}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                ✕
              </button>
            </div>

            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateBusiness();
              }}
              className="flex-1 flex flex-col min-h-0 overflow-y-auto"
            >
              <div className="flex-1 px-6 py-5 space-y-5">
                {/* Admin details */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Admin Contact
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        First Name *
                      </label>
                      <input
                        value={createForm.adminFirstName}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            adminFirstName: e.target.value,
                          }))
                        }
                        autoComplete="given-name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      {createErrors.adminFirstName && (
                        <p className="text-xs text-red-500 mt-1">
                          {createErrors.adminFirstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Last Name *
                      </label>
                      <input
                        value={createForm.adminLastName}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            adminLastName: e.target.value,
                          }))
                        }
                        autoComplete="family-name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      {createErrors.adminLastName && (
                        <p className="text-xs text-red-500 mt-1">
                          {createErrors.adminLastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={createForm.adminEmail}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          adminEmail: e.target.value,
                        }))
                      }
                      autoComplete="email"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {createErrors.adminEmail && (
                      <p className="text-xs text-red-500 mt-1">
                        {createErrors.adminEmail}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={createForm.adminPhone}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          adminPhone: e.target.value,
                        }))
                      }
                      autoComplete="tel"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {createErrors.adminPhone && (
                      <p className="text-xs text-red-500 mt-1">
                        {createErrors.adminPhone}
                      </p>
                    )}
                  </div>
                </fieldset>

                {/* Business details */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Business Details
                  </legend>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Business Name *
                    </label>
                    <input
                      value={createForm.businessName}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          businessName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {createErrors.businessName && (
                      <p className="text-xs text-red-500 mt-1">
                        {createErrors.businessName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Business Description *
                    </label>
                    <textarea
                      value={createForm.businessDescription}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          businessDescription: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Brief description of the business"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                    {createErrors.businessDescription && (
                      <p className="text-xs text-red-500 mt-1">
                        {createErrors.businessDescription}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      TIN *
                    </label>
                    <input
                      value={createForm.tin}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, tin: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {createErrors.tin && (
                      <p className="text-xs text-red-500 mt-1">
                        {createErrors.tin}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Business Reg. Number
                    </label>
                    <input
                      value={createForm.businessRegistrationNumber}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          businessRegistrationNumber: e.target.value,
                        }))
                      }
                      placeholder="e.g. RC1234567"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      FIRS Service ID
                    </label>
                    <input
                      value={createForm.serviceId}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          serviceId: e.target.value,
                        }))
                      }
                      placeholder="8-character FIRS service ID"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      NRS Business ID
                    </label>
                    <input
                      value={createForm.nrsBusinessId}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          nrsBusinessId: e.target.value,
                        }))
                      }
                      placeholder="FIRS-assigned Business UUID"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Industry
                    </label>
                    <select
                      value={createForm.industry}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          industry: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">— Select industry —</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>

                {/* Plan selection */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Subscription Plan(s) *
                  </legend>
                  {/* Billing cycle toggle */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium ${billingCycle === 0 ? "text-brand-500" : "text-gray-400"}`}
                    >
                      Monthly
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBillingCycle(billingCycle === 0 ? 1 : 0)
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none ${billingCycle === 1 ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${billingCycle === 1 ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                    <span
                      className={`text-xs font-medium ${billingCycle === 1 ? "text-brand-500" : "text-gray-400"}`}
                    >
                      Annual
                    </span>
                  </div>
                  {loadingPlans ? (
                    <div className="py-2">
                      <SkeletonPlanCards />
                    </div>
                  ) : plans?.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No subscription plans found. Please seed the database.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {plans?.map((plan) => {
                        const isSelected = selectedPlans.some(
                          (p) => p.id === plan.id,
                        );
                        const price =
                          billingCycle === 1
                            ? plan.annualPrice
                            : plan.monthlyPrice;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() =>
                              setSelectedPlans((prev) =>
                                isSelected
                                  ? prev.filter((p) => p.id !== plan.id)
                                  : [...prev, plan],
                              )
                            }
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all
                            ${isSelected ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-gray-200 dark:border-gray-700 hover:border-brand-300"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? "border-brand-500 bg-brand-500" : "border-gray-300 dark:border-gray-600"}`}
                              >
                                {isSelected && (
                                  <span className="text-white text-xs leading-none">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-medium text-gray-800 dark:text-white">
                                {plan.planName}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                              ₦{price.toLocaleString()}/
                              {billingCycle === 1 ? "yr" : "mo"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {createErrors.plans && (
                    <p className="text-xs text-red-500">{createErrors.plans}</p>
                  )}
                  {selectedPlans.length > 0 && (
                    <div className="flex justify-between items-center px-1 pt-1">
                      <span className="text-xs text-gray-500">
                        {selectedPlans.map((p) => p.planName).join(" + ")}
                      </span>
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                        Total: ₦
                        {selectedPlans
                          .reduce(
                            (s, p) =>
                              s +
                              (billingCycle === 1
                                ? p.annualPrice
                                : p.monthlyPrice),
                            0,
                          )
                          .toLocaleString()}
                      </span>
                    </div>
                  )}
                </fieldset>

                {/* Payment details */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Payment Record
                  </legend>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Payment Reference *
                    </label>
                    <input
                      value={createForm.paymentReference}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          paymentReference: e.target.value,
                        }))
                      }
                      placeholder="e.g. TRF-20240101-001"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                    />
                    {createErrors.paymentReference && (
                      <p className="text-xs text-red-500 mt-1">
                        {createErrors.paymentReference}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Amount Received (₦) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={createForm.paymentAmountNaira}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^\d.]/g, "");
                        const parts = digits.split(".");
                        parts[0] = parts[0].replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          ",",
                        );
                        setCreateForm((f) => ({
                          ...f,
                          paymentAmountNaira: parts.join("."),
                        }));
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {createErrors.paymentAmountNaira && (
                      <p className="text-xs text-red-500 mt-1">
                        {createErrors.paymentAmountNaira}
                      </p>
                    )}
                  </div>
                </fieldset>
              </div>

              {/* footer */}
              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-3">
                <button
                  type="button"
                  onClick={closeCreatePanel}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-lg transition-colors"
                >
                  {createLoading ? "Creating…" : "Create Business"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Business Overlay Panel ──────────────────────────── */}
      {showEditPanel && editBusiness && (
        <div
          className="fixed inset-0 z-9999999 flex"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeEditPanel}
          />
          <div className="relative ml-auto w-full max-w-xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                  Edit Business
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {editBusiness.name}
                </p>
              </div>
              <button
                onClick={closeEditPanel}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                ✕
              </button>
            </div>

            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                handleEditBusiness();
              }}
              className="flex-1 flex flex-col min-h-0 overflow-y-auto"
            >
              <div className="flex-1 px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Industry
                  </label>
                  <select
                    value={editForm.industry}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, industry: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">— Select industry —</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={editForm.contactEmail}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        contactEmail: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {editErrors.contactEmail && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.contactEmail}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.contactPhone}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        contactPhone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Invoice Prefix
                  </label>
                  <input
                    value={editForm.invoicePrefix}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        invoicePrefix: e.target.value,
                      }))
                    }
                    placeholder="e.g. INV"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Registered Address
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Street
                      </label>
                      <input
                        value={editForm.street}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, street: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        City
                      </label>
                      <input
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, city: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Country
                      </label>
                      <select
                        value={editForm.country}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            country: e.target.value,
                            state: "",
                            lga: "",
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select country…</option>
                        {allCountries.map((c) => (
                          <option key={c.alpha_2} value={c.alpha_2}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        State
                      </label>
                      <select
                        value={editForm.state}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            state: e.target.value,
                            lga: "",
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select state…</option>
                        {firsStates.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        LGA
                      </label>
                      <select
                        value={editForm.lga}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, lga: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select LGA…</option>
                        {allLgas
                          .filter(
                            (l) =>
                              !editForm.state ||
                              l.state_code === editForm.state,
                          )
                          .map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Postal Code
                      </label>
                      <input
                        value={editForm.postalCode}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            postalCode: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-3">
                <button
                  type="button"
                  onClick={closeEditPanel}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-lg transition-colors"
                >
                  {editLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
