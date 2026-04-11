import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import DatePicker from "../../components/form/date-picker";
import {
  invoiceApi,
  partyApi,
  businessItemApi,
  NRSApi,
  type Party,
  type BusinessItemSummary,
  type TaxCategory,
  type CreateInvoicePayload,
  type InvoiceItemPayload,
  type DocumentReferenceDto,
  type InvoiceSummary,
  type SubmitInvoiceResult,
} from "../../lib/api";
import {
  USE_MOCK,
  MOCK_INVOICES,
  MOCK_PARTIES,
  MOCK_ITEMS,
  MOCK_TAX_CATEGORIES,
} from "../../lib/mockData";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const INVOICE_TYPES = [
  { code: "380", label: "Commercial Invoice (380)" },
  { code: "381", label: "Credit Note (381)" },
  { code: "383", label: "Debit Note (383)" },
  { code: "386", label: "Prepayment Invoice (386)" },
  { code: "388", label: "Tax Invoice (388)" },
];

const PAYMENT_MEANS = [
  { code: "10", label: "Cash (10)" },
  { code: "20", label: "Cheque (20)" },
  { code: "30", label: "Bank Transfer (30)" },
  { code: "48", label: "Bank Card (48)" },
  { code: "97", label: "Clearing between partners (97)" },
];

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

interface LineItem extends InvoiceItemPayload {
  _itemCode?: string;
  _description?: string;
  _taxCategoryCode?: string;
  _discountType: "amount" | "percent";
  _discountPercent: number;
}

function parseTaxPercent(percent: string): number {
  const n = parseFloat(percent);
  return isNaN(n) ? 0 : n;
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-block cursor-help align-middle">
      <svg
        className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg bg-gray-800 dark:bg-gray-700 px-3 py-2 text-xs text-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg leading-relaxed">
        {text}
      </span>
    </span>
  );
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<BusinessItemSummary[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategory[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDocRefs, setShowDocRefs] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushingToNRS, setPushingToNRS] = useState(false);
  const [pushSummary, setPushSummary] = useState<SubmitInvoiceResult | null>(
    null,
  );

  const [form, setForm] = useState({
    partyId: "",
    issueDate: new Date().toISOString().substring(0, 10),
    dueDate: "",
    currencyCode: "NGN",
    invoiceTypeCode: "380",
    paymentMeansCode: "30",
    note: "",
    orderReference: "",
  });

  const [docRefs, setDocRefs] = useState<{
    billingReference: DocumentReferenceDto[];
    dispatchDocumentReference: DocumentReferenceDto | null;
    receiptDocumentReference: DocumentReferenceDto | null;
    originatorDocumentReference: DocumentReferenceDto | null;
    contractDocumentReference: DocumentReferenceDto | null;
    additionalDocumentReferences: DocumentReferenceDto[];
  }>({
    billingReference: [],
    dispatchDocumentReference: null,
    receiptDocumentReference: null,
    originatorDocumentReference: null,
    contractDocumentReference: null,
    additionalDocumentReferences: [],
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      businessItemId: "",
      quantity: 1,
      unitPrice: 0,
      lineDiscount: 0,
      _description: "",
      _itemCode: "",
      _taxCategoryCode: "",
      _discountType: "amount",
      _discountPercent: 0,
    },
  ]);

  useEffect(() => {
    if (USE_MOCK) {
      setParties(MOCK_PARTIES as Party[]);
      setItems(MOCK_ITEMS as unknown as BusinessItemSummary[]);
      setTaxCategories(MOCK_TAX_CATEGORIES as TaxCategory[]);
      setInvoices(MOCK_INVOICES as InvoiceSummary[]);
      setLoadingLookups(false);
      return;
    }
    Promise.all([
      partyApi
        .list({ pageSize: 200 })
        .then((r) => r.items)
        .catch(() => [] as Party[]),
      businessItemApi
        .list({ pageSize: 200 })
        .then((r) => r.items)
        .catch(() => [] as BusinessItem[]),
      NRSApi.getTaxCategories().catch(() => [] as TaxCategory[]),
      invoiceApi
        .list({ pageSize: 500 })
        .then((r) => r.items)
        .catch(() => [] as InvoiceSummary[]),
    ])
      .then(([p, bi, tc, inv]) => {
        setParties(p);
        setItems(bi);
        setTaxCategories(tc);
        setInvoices(inv);
      })
      .finally(() => setLoadingLookups(false));
  }, []);

  const handleFieldChange =
    (field: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const invoicesWithIRN = invoices.filter((inv) => !!inv.irn);
  const irnToRef = (irn: string): DocumentReferenceDto | null => {
    const inv = invoicesWithIRN.find((i) => i.irn === irn);
    return inv ? { irn, issueDate: inv.issueDate } : null;
  };
  const setSingleRef = (
    key:
      | "dispatchDocumentReference"
      | "receiptDocumentReference"
      | "originatorDocumentReference"
      | "contractDocumentReference",
    irn: string,
  ) => setDocRefs((prev) => ({ ...prev, [key]: irn ? irnToRef(irn) : null }));
  const addToArrayRef = (
    key: "billingReference" | "additionalDocumentReferences",
    irn: string,
  ) => {
    const ref = irnToRef(irn);
    if (!ref) return;
    setDocRefs((prev) => ({
      ...prev,
      [key]: (prev[key] as DocumentReferenceDto[]).some((r) => r.irn === irn)
        ? prev[key]
        : [...(prev[key] as DocumentReferenceDto[]), ref],
    }));
  };
  const removeFromArrayRef = (
    key: "billingReference" | "additionalDocumentReferences",
    irn: string,
  ) =>
    setDocRefs((prev) => ({
      ...prev,
      [key]: (prev[key] as DocumentReferenceDto[]).filter((r) => r.irn !== irn),
    }));

  const handleItemSelect = async (index: number, businessItemId: string) => {
    // First update with summary data so the UI responds immediately
    const summary = items.find((i) => i.id === businessItemId);
    setLineItems((prev) =>
      prev.map((li, i) =>
        i === index
          ? {
              ...li,
              businessItemId,
              unitPrice: summary?.unitPrice ?? 0,
              _description: "",
              _itemCode: summary?.itemId ?? "",
              _taxCategoryCode: "",
              lineDiscount: 0,
              _discountPercent: 0,
            }
          : li,
      ),
    );

    if (!businessItemId) return;

    // Fetch full item to get taxCategories and itemDescription
    try {
      const full = USE_MOCK
        ? null
        : await businessItemApi.getById(businessItemId);
      const taxCode = full?.taxCategories?.[0]?.code ?? "";
      setLineItems((prev) =>
        prev.map((li, i) =>
          i === index
            ? {
                ...li,
                _description: full?.itemDescription ?? summary?.name ?? "",
                _itemCode: full?.itemId ?? summary?.itemId ?? "",
                _taxCategoryCode: taxCode,
              }
            : li,
        ),
      );
    } catch {
      // leave description/taxCode empty — user can fill manually
    }
  };

  const handleLineChange = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== index) return li;
        const updated = { ...li, [field]: value };
        if (field === "_discountPercent") {
          const pct = value as number;
          if (li._discountType === "percent") {
            updated.lineDiscount =
              updated.unitPrice * updated.quantity * (pct / 100);
          }
        }
        return updated;
      }),
    );
  };

  const toggleDiscountType = (index: number) => {
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== index) return li;
        const newType = li._discountType === "amount" ? "percent" : "amount";
        return {
          ...li,
          _discountType: newType,
          lineDiscount: 0,
          _discountPercent: 0,
        };
      }),
    );
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      {
        businessItemId: "",
        quantity: 1,
        unitPrice: 0,
        lineDiscount: 0,
        _description: "",
        _itemCode: "",
        _taxCategoryCode: "",
        _discountType: "amount",
        _discountPercent: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const lineSubtotal = (li: LineItem) => li.unitPrice * li.quantity;
  const lineDiscountAmt = (li: LineItem) =>
    li._discountType === "percent"
      ? lineSubtotal(li) * (li._discountPercent / 100)
      : (li.lineDiscount ?? 0);
  const lineNet = (li: LineItem) => lineSubtotal(li) - lineDiscountAmt(li);
  const lineTax = (li: LineItem) => {
    const tc = taxCategories.find((t) => t.code === li._taxCategoryCode);
    const rate = tc ? parseTaxPercent(tc.percent) : 0;
    return lineNet(li) * (rate / 100);
  };

  const grandSubtotal = lineItems.reduce((s, li) => s + lineNet(li), 0);

  const taxBreakdown = lineItems.reduce<
    Record<string, { label: string; amount: number }>
  >((acc, li) => {
    const tc = taxCategories.find((t) => t.code === li._taxCategoryCode);
    if (!tc || parseTaxPercent(tc.percent) === 0) return acc;
    const key = tc.code;
    if (!acc[key])
      acc[key] = { label: `${tc.value} (${tc.percent}%)`, amount: 0 };
    acc[key].amount += lineTax(li);
    return acc;
  }, {});

  const totalTax = Object.values(taxBreakdown).reduce(
    (s, v) => s + v.amount,
    0,
  );
  const grandTotal = grandSubtotal + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partyId) {
      toast.error("Please select a buyer/party.");
      return;
    }
    if (lineItems.some((li) => !li.businessItemId)) {
      toast.error("Please select an item for all line items.");
      return;
    }
    if (lineItems.some((li) => li.quantity <= 0)) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    const payload: CreateInvoicePayload = {
      partyId: form.partyId,
      issueDate: form.issueDate,
      dueDate: form.dueDate || undefined,
      currencyCode: form.currencyCode,
      invoiceTypeCode: form.invoiceTypeCode,
      paymentMeansCode: form.paymentMeansCode || undefined,
      note: form.note || undefined,
      orderReference: form.orderReference || undefined,
      billingReference:
        docRefs.billingReference.length > 0
          ? docRefs.billingReference
          : undefined,
      dispatchDocumentReference: docRefs.dispatchDocumentReference ?? undefined,
      receiptDocumentReference: docRefs.receiptDocumentReference ?? undefined,
      originatorDocumentReference:
        docRefs.originatorDocumentReference ?? undefined,
      contractDocumentReference: docRefs.contractDocumentReference ?? undefined,
      additionalDocumentReferences:
        docRefs.additionalDocumentReferences.length > 0
          ? docRefs.additionalDocumentReferences
          : undefined,
      items: lineItems.map(
        (li) =>
          ({
            businessItemId: li.businessItemId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            lineDiscount: lineDiscountAmt(li) || undefined,
          }) satisfies InvoiceItemPayload,
      ),
    };

    setSubmitting(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 800));
        const mockId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        toast.success("Invoice created successfully.");
        setCreatedInvoiceId(mockId);
        setShowPushModal(true);
      } else {
        const result = await invoiceApi.create(payload);
        toast.success("Invoice created successfully.");
        setCreatedInvoiceId(result.id);
        setShowPushModal(true);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create invoice.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePushToNRS = async () => {
    if (!createdInvoiceId) return;
    setPushingToNRS(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 1200));
        const mockSummary: SubmitInvoiceResult = {
          invoiceId: createdInvoiceId,
          irn: `INV-MOCK-${Date.now()}`,
          currentStatus: "TRANSMITTED",
          message: "Invoice submitted successfully through the entire pipeline",
          pipeline: {
            validate: {
              success: true,
              message: "Invoice validated successfully",
            },
            sign: { success: true, message: "Invoice signed successfully" },
            transmit: {
              success: true,
              message: "Invoice transmitted to NRS successfully",
            },
          },
        };
        setShowPushModal(false);
        setPushSummary(mockSummary);
      } else {
        const result = await invoiceApi.submitToNRS(createdInvoiceId);
        setShowPushModal(false);
        setPushSummary(result);
      }
    } catch {
      toast.error("Failed to push invoice to NRS.");
    } finally {
      setPushingToNRS(false);
    }
  };

  const handleSkipPush = () => {
    setShowPushModal(false);
    navigate("/invoices");
  };

  const handleIssueDateChange = useCallback((_: Date[], dateStr: string) => {
    setForm((prev) => ({ ...prev, issueDate: dateStr }));
  }, []);

  const handleDueDateChange = useCallback((_: Date[], dateStr: string) => {
    setForm((prev) => ({ ...prev, dueDate: dateStr }));
  }, []);

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Create Invoice | Aegis EInvoicing Portal"
        description="Create a new e-invoice"
      />

      <div className="mb-6">
        <button
          onClick={() => navigate("/invoices")}
          className="group flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors mb-3"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Invoices
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Create Invoice
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Invoice will go through approval then be submitted to NRS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Invoice Details */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Invoice Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Buyer / Party <span className="text-error-500">*</span>
              </label>
              <select
                value={form.partyId}
                onChange={handleFieldChange("partyId")}
                className={inputCls}
                required
              >
                <option value="">Select party...</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.taxIdentificationNumber}
                  </option>
                ))}
              </select>
              {parties.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No parties found.{" "}
                  <a href="/parties" className="underline">
                    Add one NRSt.
                  </a>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Invoice Type <span className="text-error-500">*</span>
              </label>
              <select
                value={form.invoiceTypeCode}
                onChange={handleFieldChange("invoiceTypeCode")}
                className={inputCls}
              >
                {INVOICE_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Currency
              </label>
              <select
                value={form.currencyCode}
                onChange={handleFieldChange("currencyCode")}
                className={inputCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Issue Date <span className="text-error-500">*</span>
              </label>
              <DatePicker
                id="invoice-issue-date"
                placeholder="Select issue date"
                defaultDate={form.issueDate}
                onChange={handleIssueDateChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Due Date
              </label>
              <DatePicker
                id="invoice-due-date"
                placeholder="Select due date (optional)"
                defaultDate={form.dueDate || undefined}
                onChange={handleDueDateChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Payment Method
              </label>
              <select
                value={form.paymentMeansCode}
                onChange={handleFieldChange("paymentMeansCode")}
                className={inputCls}
              >
                <option value="">— None —</option>
                {PAYMENT_MEANS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Note (optional)
              </label>
              <textarea
                value={form.note}
                onChange={handleFieldChange("note")}
                rows={2}
                placeholder="Any notes to the buyer..."
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {/* Document References */}
          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setShowDocRefs((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showDocRefs ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Document References (optional)
            </button>
            {showDocRefs && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Order Reference */}
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Order Reference
                    <InfoTooltip text="The order number tied to an invoice." />
                  </label>
                  <input
                    value={form.orderReference}
                    onChange={handleFieldChange("orderReference")}
                    className={inputCls}
                    placeholder="PO-2025-001"
                  />
                </div>

                {/* Contract Document Reference */}
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Contract Reference
                    <InfoTooltip text="Links the invoice to a contract governing the transaction." />
                  </label>
                  <select
                    value={docRefs.contractDocumentReference?.irn ?? ""}
                    onChange={(e) =>
                      setSingleRef("contractDocumentReference", e.target.value)
                    }
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {invoicesWithIRN.map((inv) => (
                      <option key={inv.irn} value={inv.irn!}>
                        {inv.partyName} — {inv.irn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dispatch Document Reference */}
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Dispatch Document Reference
                    <InfoTooltip text="Refers to the document used to track the dispatch of goods." />
                  </label>
                  <select
                    value={docRefs.dispatchDocumentReference?.irn ?? ""}
                    onChange={(e) =>
                      setSingleRef("dispatchDocumentReference", e.target.value)
                    }
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {invoicesWithIRN.map((inv) => (
                      <option key={inv.irn} value={inv.irn!}>
                        {inv.partyName} — {inv.irn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Receipt Document Reference */}
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Receipt Document Reference
                    <InfoTooltip text="Links the invoice to a receipt document associated with this invoice." />
                  </label>
                  <select
                    value={docRefs.receiptDocumentReference?.irn ?? ""}
                    onChange={(e) =>
                      setSingleRef("receiptDocumentReference", e.target.value)
                    }
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {invoicesWithIRN.map((inv) => (
                      <option key={inv.irn} value={inv.irn!}>
                        {inv.partyName} — {inv.irn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Originator Document Reference */}
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Originator Document Reference
                    <InfoTooltip text="Identifies the original document that initiated this invoice." />
                  </label>
                  <select
                    value={docRefs.originatorDocumentReference?.irn ?? ""}
                    onChange={(e) =>
                      setSingleRef(
                        "originatorDocumentReference",
                        e.target.value,
                      )
                    }
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {invoicesWithIRN.map((inv) => (
                      <option key={inv.irn} value={inv.irn!}>
                        {inv.partyName} — {inv.irn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Billing Reference — multi */}
                <div className="sm:col-span-2">
                  <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Billing Reference
                    <InfoTooltip text="Links this invoice to previous billing documents, e.g. credit notes, debit notes, or prior invoices." />
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        addToArrayRef("billingReference", e.target.value);
                    }}
                    className={inputCls}
                  >
                    <option value="">
                      + Select to add billing reference...
                    </option>
                    {invoicesWithIRN
                      .filter(
                        (inv) =>
                          !docRefs.billingReference.some(
                            (r) => r.irn === inv.irn,
                          ),
                      )
                      .map((inv) => (
                        <option key={inv.irn} value={inv.irn!}>
                          {inv.partyName} — {inv.irn}
                        </option>
                      ))}
                  </select>
                  {docRefs.billingReference.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {docRefs.billingReference.map((ref) => (
                        <span
                          key={ref.irn}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-xs border border-brand-200 dark:border-brand-800"
                        >
                          {
                            invoicesWithIRN.find((i) => i.irn === ref.irn)
                              ?.partyName
                          }{" "}
                          — {ref.irn}
                          <button
                            type="button"
                            onClick={() =>
                              removeFromArrayRef("billingReference", ref.irn)
                            }
                            className="text-brand-400 hover:text-red-500 transition-colors leading-none"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Document References — multi */}
                <div className="sm:col-span-2">
                  <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Additional Document References
                    <InfoTooltip text="General reference field for any additional documents related to this invoice." />
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        addToArrayRef(
                          "additionalDocumentReferences",
                          e.target.value,
                        );
                    }}
                    className={inputCls}
                  >
                    <option value="">
                      + Select to add additional reference...
                    </option>
                    {invoicesWithIRN
                      .filter(
                        (inv) =>
                          !docRefs.additionalDocumentReferences.some(
                            (r) => r.irn === inv.irn,
                          ),
                      )
                      .map((inv) => (
                        <option key={inv.irn} value={inv.irn!}>
                          {inv.partyName} — {inv.irn}
                        </option>
                      ))}
                  </select>
                  {docRefs.additionalDocumentReferences.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {docRefs.additionalDocumentReferences.map((ref) => (
                        <span
                          key={ref.irn}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs border border-gray-200 dark:border-gray-600"
                        >
                          {
                            invoicesWithIRN.find((i) => i.irn === ref.irn)
                              ?.partyName
                          }{" "}
                          — {ref.irn}
                          <button
                            type="button"
                            onClick={() =>
                              removeFromArrayRef(
                                "additionalDocumentReferences",
                                ref.irn,
                              )
                            }
                            className="text-gray-400 hover:text-red-500 transition-colors leading-none"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Line Items
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-3">
            <div className="hidden lg:grid lg:grid-cols-12 gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 px-1">
              <div className="col-span-4">Item</div>
              <div className="col-span-2 text-right">Unit Price (₦)</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-3">Discount (₦ or %)</div>
              <div className="col-span-1 text-right">Net</div>
              <div className="col-span-1 text-right">Tax</div>
            </div>

            {lineItems.map((li, index) => {
              const tc = taxCategories.find(
                (t) => t.code === li._taxCategoryCode,
              );
              const taxRate = tc ? parseTaxPercent(tc.percent) : 0;
              const net = lineNet(li);
              const tax = lineTax(li);
              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start border border-gray-100 dark:border-gray-700 rounded-xl p-3 lg:border-0 lg:p-0 lg:rounded-none"
                >
                  {/* Item */}
                  <div className="col-span-12 lg:col-span-4">
                    <label className="text-xs text-gray-400 lg:hidden mb-0.5 block">
                      Item
                    </label>
                    <select
                      value={li.businessItemId}
                      onChange={(e) => handleItemSelect(index, e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="">Select item...</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.itemId} — {it.name}
                        </option>
                      ))}
                    </select>
                    {tc && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {tc.value}
                        {taxRate > 0 ? ` · ${taxRate}%` : " · Tax exempt"}
                      </p>
                    )}
                  </div>

                  {/* Unit Price — read-only, snapshotted from business item */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="text-xs text-gray-400 lg:hidden mb-0.5 block">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      value={li.unitPrice}
                      readOnly
                      tabIndex={-1}
                      className={`${inputCls} text-right bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 cursor-default select-none`}
                    />
                  </div>

                  {/* Qty */}
                  <div className="col-span-6 lg:col-span-1">
                    <label className="text-xs text-gray-400 lg:hidden mb-0.5 block">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={li.quantity}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className={`${inputCls} text-center`}
                      required
                    />
                  </div>

                  {/* Discount */}
                  <div className="col-span-11 lg:col-span-3">
                    <label className="text-xs text-gray-400 lg:hidden mb-0.5 block">
                      Discount
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleDiscountType(index)}
                        title="Toggle between fixed amount and percentage"
                        className="flex-shrink-0 w-10 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
                      >
                        {li._discountType === "percent" ? "%" : "₦"}
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          li._discountType === "percent"
                            ? li._discountPercent
                            : (li.lineDiscount ?? 0)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (li._discountType === "percent") {
                            handleLineChange(index, "_discountPercent", val);
                          } else {
                            handleLineChange(index, "lineDiscount", val);
                          }
                        }}
                        className={`${inputCls} text-right`}
                      />
                    </div>
                    {li._discountType === "percent" &&
                      li._discountPercent > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 text-right">
                          = ₦
                          {lineDiscountAmt(li).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                  </div>

                  {/* Net */}
                  <div className="col-span-6 lg:col-span-1 flex flex-col items-end justify-center">
                    <label className="text-xs text-gray-400 lg:hidden mb-0.5">
                      Net
                    </label>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      ₦
                      {net.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  {/* Tax */}
                  <div className="col-span-5 lg:col-span-1 flex flex-col items-end justify-center">
                    <label className="text-xs text-gray-400 lg:hidden mb-0.5">
                      Tax
                    </label>
                    <span
                      className={`text-xs font-medium ${taxRate > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}
                    >
                      {taxRate > 0
                        ? `₦${tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "Exempt"}
                    </span>
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex items-center justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lineItems.length === 1}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              No business items found.{" "}
              <a href="/items" className="underline">
                Add items NRSt.
              </a>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="max-w-xs ml-auto space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal (after discounts)</span>
              <span className="font-medium text-gray-800 dark:text-white">
                ₦
                {grandSubtotal.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {Object.entries(taxBreakdown).map(([code, { label, amount }]) => (
              <div
                key={code}
                className="flex justify-between text-gray-600 dark:text-gray-400"
              >
                <span>{label}</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  ₦
                  {amount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
            {Object.keys(taxBreakdown).length === 0 && (
              <div className="flex justify-between text-gray-400 dark:text-gray-500">
                <span>Tax</span>
                <span>—</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 font-semibold text-gray-900 dark:text-white">
              <span>Total (incl. tax)</span>
              <span className="text-brand-500">
                ₦
                {grandTotal.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="px-5 py-2.5 border border-red-500 dark:border-red-500 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>

      {/* NRS Submission Summary Modal */}
      {pushSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                NRS Submission Summary
              </h2>
              <button
                onClick={() => {
                  setPushSummary(null);
                  navigate("/invoices");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

            <div className="p-6 space-y-5">
              {/* Invoice + Status header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Invoice Reference
                  </p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {pushSummary.irn}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      pushSummary.pipeline.transmit?.success
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    }`}
                  >
                    {pushSummary.currentStatus}
                  </span>
                </div>
              </div>

              {/* Pipeline Steps */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pipeline Steps
                </h3>

                {(["validate", "sign", "transmit"] as const).map(
                  (step, idx) => {
                    const s = pushSummary.pipeline[step];
                    const labels = ["1. Validate", "2. Sign", "3. Transmit"];
                    return (
                      <div
                        key={step}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            s?.success
                              ? "bg-green-100 dark:bg-green-900/30"
                              : "bg-red-100 dark:bg-red-900/30"
                          }`}
                        >
                          {s?.success ? (
                            <svg
                              className="w-5 h-5 text-green-600 dark:text-green-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-600 dark:text-red-400"
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
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {labels[idx]}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {s?.message || `${step} step completed`}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Overall message */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {pushSummary.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setPushSummary(null);
                  navigate("/invoices");
                }}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push to NRS Confirmation Modal */}
      {showPushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Invoice Created!
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your invoice has been created successfully.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Would you like to push this invoice to NRS now? This will
                validate, sign, and transmit the invoice through the NRS system.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">This will:</p>
                    <ul className="space-y-1 ml-3">
                      <li>• Validate your invoice against NRS requirements</li>
                      <li>• Digitally sign the invoice via NRS</li>
                      <li>• Transmit the signed invoice to NRS</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSkipPush}
                disabled={pushingToNRS}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Not Now
              </button>
              <button
                onClick={handlePushToNRS}
                disabled={pushingToNRS}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors min-w-[140px] flex items-center justify-center gap-2"
              >
                {pushingToNRS ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Pushing...
                  </>
                ) : (
                  "Yes, Push to NRS"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
