import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router";
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
  type FIRSCurrency,
  type FIRSInvoiceType,
  type FIRSPaymentMeans,
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
import {
  SkeletonCreateInvoice,
  SkeletonDots,
} from "../../components/ui/skeleton/Skeleton";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const INVOICE_KINDS = [
  { code: "B2B", label: "B2B — Business to Business" },
  { code: "B2C", label: "B2C — Business to Consumer" },
  { code: "B2G", label: "B2G — Business to Government" },
];

/** Lightweight tax entry stored per line item — carries the rate configured on the business item itself */
interface ItemTaxEntry {
  code: string;
  name: string;
  isPercentage: boolean;
  /** Percentage rate (e.g. 8 for 8%) — from the item, NOT from the NRS reference list */
  percent: number;
  /** Flat amount (when isPercentage = false) */
  flatAmount?: number;
}

interface LineItem extends InvoiceItemPayload {
  _itemCode?: string;
  _description?: string;
  /** All active tax entries for this line, carrying the item's own configured rates */
  _taxCategories: ItemTaxEntry[];
  _discountType: "amount" | "percent";
  _discountPercent: number;
}

function parseTaxPercent(percent: string): number {
  const match = percent.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * A helper component for a delimited currency/price input (read-only version for CreateInvoice).
 */
function PriceInput({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={`${className} bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 flex items-center justify-end px-3 select-none`}
    >
      {formatted}
    </div>
  );
}

interface ItemTaxEntry {
  code: string;
  name: string;
  isPercentage: boolean;
  /** Percentage rate (e.g. 8 for 8%) — from the item, NOT from the NRS reference list */
  percent: number;
  /** Flat amount (when isPercentage = false) */
  flatAmount?: number;
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

function NoteTypeToggle({
  value,
  locked,
  onChange,
}: {
  value: string;
  locked: boolean;
  onChange: (code: string) => void;
}) {
  return (
    <div
      className={`flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm shrink-0 ${locked ? "opacity-60 pointer-events-none" : ""}`}
    >
      {[
        { code: "381", label: "Credit Note" },
        { code: "383", label: "Debit Note" },
      ].map((opt) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => onChange(opt.code)}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            value === opt.code
              ? "bg-brand-500 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// State passed via navigate() when raising a note from an existing invoice
interface FromInvoiceState {
  noteType: "credit" | "debit" | "note";
  fromInvoice?: {
    irn: string;
    issueDate: string;
    partyName: string;
  };
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromState = (location.state ?? {}) as Partial<FromInvoiceState>;
  const noteType = fromState.noteType ?? null;
  const fromInvoice = fromState.fromInvoice ?? null;

  // Derived constants for note mode
  const isNote =
    noteType === "credit" || noteType === "debit" || noteType === "note";
  // When specific type was chosen (from invoice detail), lock the invoice type field
  const isNoteTypeLocked = noteType === "credit" || noteType === "debit";
  const noteTypeCode =
    noteType === "credit"
      ? "381"
      : noteType === "debit"
        ? "383"
        : noteType === "note"
          ? "381"
          : null;
  const noteLabel =
    noteType === "credit"
      ? "Credit Note"
      : noteType === "debit"
        ? "Debit Note"
        : noteType === "note"
          ? "Credit / Debit Note"
          : null;

  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<BusinessItemSummary[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategory[]>([]);
  const [currencies, setCurrencies] = useState<FIRSCurrency[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<FIRSInvoiceType[]>([]);
  const [paymentMeans, setPaymentMeans] = useState<FIRSPaymentMeans[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(
    searchParams.get("draftId"),
  );
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
    invoiceTypeCode: noteTypeCode ?? "380",
    invoiceKind: "B2B",
    paymentMeansCode: "30",
    note: "",
    orderReference: "",
    deliveryStartDate: new Date().toISOString().substring(0, 10),
    deliveryEndDate: new Date().toISOString().substring(0, 10),
  });

  const [docRefs, setDocRefs] = useState<{
    billingReference: DocumentReferenceDto[];
    dispatchDocumentReference: DocumentReferenceDto | null;
    receiptDocumentReference: DocumentReferenceDto | null;
    originatorDocumentReference: DocumentReferenceDto | null;
    contractDocumentReference: DocumentReferenceDto | null;
    additionalDocumentReferences: DocumentReferenceDto[];
  }>({
    billingReference: fromInvoice?.irn
      ? [{ irn: fromInvoice.irn, issueDate: fromInvoice.issueDate }]
      : [],
    dispatchDocumentReference: null,
    receiptDocumentReference: null,
    originatorDocumentReference: null,
    contractDocumentReference: null,
    additionalDocumentReferences: [],
  });

  // billingRefResolved: in note mode, user has picked the original invoice
  const billingRefResolved = isNote && docRefs.billingReference.length > 0;

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      businessItemId: "",
      quantity: 1,
      unitPrice: 0,
      lineDiscount: 0,
      _description: "",
      _itemCode: "",
      _taxCategories: [],
      _discountType: "amount",
      _discountPercent: 0,
    },
  ]);

  // Auto-open doc refs panel when in note mode
  useEffect(() => {
    if (isNote) setShowDocRefs(true);
  }, [isNote]);

  // When entering generic note mode (noteType === "note"), default to Credit Note.
  // Also handles same-path navigation where useState initializer won't re-run.
  useEffect(() => {
    if (noteType === "note") {
      setForm((prev) => ({ ...prev, invoiceTypeCode: "381" }));
    }
  }, [noteType]);

  // Auto-match party from partyName once parties list loads
  useEffect(() => {
    if (!fromInvoice?.partyName || !parties?.length) return;
    const matched = parties?.find(
      (p) => p.name.toLowerCase() === fromInvoice.partyName.toLowerCase(),
    );
    if (matched) {
      setForm((prev) => ({ ...prev, partyId: matched.id }));
    }
  }, [parties, fromInvoice?.partyName]);

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
        .list({ pageSize: 100 })
        .then((r) => r?.items ?? [])
        .catch(() => [] as Party[]),
      businessItemApi
        .list({ pageSize: 100 })
        .then((r) => r?.items ?? [])
        .catch(() => [] as BusinessItemSummary[]),
      NRSApi.getTaxCategories().catch(() => [] as TaxCategory[]),
      invoiceApi
        .list({ pageSize: 100 })
        .then((r) => r?.items ?? [])
        .catch(() => [] as InvoiceSummary[]),
      NRSApi.getCurrencies().catch(() => [] as FIRSCurrency[]),
      NRSApi.getInvoiceTypes().catch(() => [] as FIRSInvoiceType[]),
      NRSApi.getPaymentMeans().catch(() => [] as FIRSPaymentMeans[]),
    ])
      .then(([p, bi, tc, inv, cur, invTypes, pmeans]) => {
        setParties(p);
        setItems(bi);
        setTaxCategories(tc);
        setInvoices(inv);
        setCurrencies(cur);
        setInvoiceTypes(invTypes);
        setPaymentMeans(pmeans);
      })
      .finally(() => setLoadingLookups(false));
  }, []);

  // Resume draft: load and populate form when draftId is present in URL
  useEffect(() => {
    const resumeId = searchParams.get("draftId");
    if (!resumeId || USE_MOCK) return;
    invoiceApi
      .listDrafts()
      .then((drafts) => {
        const draft = drafts?.find((d) => d.id === resumeId);
        if (!draft) {
          toast.error("Draft not found.");
          return;
        }
        try {
          const saved = JSON.parse(draft.draftPayload) as {
            form?: typeof form;
            lineItems?: LineItem[];
            docRefs?: typeof docRefs;
          };
          if (saved.form) setForm(saved.form);
          if (saved.lineItems) setLineItems(saved.lineItems);
          if (saved.docRefs) setDocRefs(saved.docRefs);
          setDraftId(resumeId);
          toast.success("Draft loaded. Continue where you left off.", {
            id: "draft-loaded",
          });
        } catch {
          toast.error("Could not parse draft data.");
        }
      })
      .catch(() => toast.error("Failed to load draft."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange =
    (field: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const invoicesWithIRN = invoices?.filter((inv) => !!inv.irn);
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
    const summary = items?.find((i) => i.id === businessItemId);
    setLineItems((prev) =>
      prev.map((li, i) =>
        i === index
          ? {
              ...li,
              businessItemId,
              unitPrice: summary?.unitPrice ?? 0,
              _description: "",
              _itemCode: summary?.itemId ?? "",
              _taxCategories: [],
              lineDiscount: 0,
              _discountPercent: 0,
            }
          : li,
      ),
    );

    if (!businessItemId) return;

    // Fetch full item to get ALL tax categories with their configured rates
    try {
      let itemDescription: string;
      let itemCode: string;
      let taxEntries: ItemTaxEntry[];

      if (USE_MOCK) {
        const mockFull = MOCK_ITEMS.find((m) => m.id === businessItemId);
        itemDescription = mockFull?.itemDescription ?? summary?.name ?? "";
        itemCode = mockFull?.itemId ?? summary?.itemId ?? "";
        taxEntries = (mockFull?.taxCategories ?? []).map((tc: any) => ({
          code: tc.code,
          name: tc.name,
          isPercentage: tc.isPercentage ?? true,
          percent: tc.percent ?? 0,
          flatAmount: tc.flatAmount,
        }));
      } else {
        const full = await businessItemApi.getById(businessItemId);
        itemDescription = full?.itemDescription ?? summary?.name ?? "";
        itemCode = full?.itemId ?? summary?.itemId ?? "";
        // Use the rates stored on the item — NOT the NRS reference list
        taxEntries = (full?.taxCategories ?? []).map((tc) => ({
          code: tc.code,
          name: tc.name,
          isPercentage: tc.isPercentage,
          percent: tc.percent ?? 0,
          flatAmount: tc.flatAmount,
        }));
      }

      setLineItems((prev) =>
        prev.map((li, i) =>
          i === index
            ? {
                ...li,
                _description: itemDescription,
                _itemCode: itemCode,
                _taxCategories: taxEntries,
              }
            : li,
        ),
      );
    } catch {
      // leave description/taxCategories empty — user can fill manually
    }
  };

  /** Add a tax category to a line — creates an entry using the NRS reference rate as default */
  const addTaxToLine = (index: number, code: string) => {
    if (!code) return;
    const nrsCat = taxCategories.find((t) => t.code === code);
    if (!nrsCat) return;
    const parsedRate = parseTaxPercent(nrsCat.percent);
    setLineItems((prev) =>
      prev.map((li, i) =>
        i === index
          ? {
              ...li,
              _taxCategories: li._taxCategories.some((t) => t.code === code)
                ? li._taxCategories
                : [
                    ...li._taxCategories,
                    {
                      code,
                      name: nrsCat.value,
                      isPercentage: true,
                      percent: parsedRate,
                    },
                  ],
            }
          : li,
      ),
    );
  };

  /** Remove a tax category from a line */
  const removeTaxFromLine = (index: number, code: string) => {
    setLineItems((prev) =>
      prev.map((li, i) =>
        i === index
          ? {
              ...li,
              _taxCategories: li._taxCategories.filter((t) => t.code !== code),
            }
          : li,
      ),
    );
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
        _taxCategories: [],
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
  /** Sum of all tax amounts for a single line using each tax entry's own stored rate */
  const lineTax = (li: LineItem) => {
    const net = lineNet(li);
    return li._taxCategories.reduce((sum, entry) => {
      if (entry.isPercentage) {
        return sum + net * (entry.percent / 100);
      }
      // Flat amount tax
      return sum + (entry.flatAmount ?? 0);
    }, 0);
  };

  const grandSubtotal = lineItems.reduce((s, li) => s + lineNet(li), 0);

  /** Group taxes by category code across all line items, using the item's stored rates */
  const taxBreakdown = lineItems.reduce<
    Record<string, { label: string; amount: number }>
  >((acc, li) => {
    const net = lineNet(li);
    li._taxCategories.forEach((entry) => {
      const taxAmt = entry.isPercentage
        ? net * (entry.percent / 100)
        : (entry.flatAmount ?? 0);
      if (taxAmt === 0 && entry.isPercentage) return; // skip zero-rate percentage entries
      const key = entry.code;
      const label = entry.isPercentage
        ? `${entry.name} (${entry.percent}%)`
        : `${entry.name} (flat)`;
      if (!acc[key]) acc[key] = { label, amount: 0 };
      acc[key].amount += taxAmt;
    });
    return acc;
  }, {});

  const totalTax = Object.values(taxBreakdown).reduce(
    (s, v) => s + v.amount,
    0,
  );
  const grandTotal = grandSubtotal + totalTax;

  const handleSaveDraft = async () => {
    if (USE_MOCK) {
      toast.success("Draft saved (mock).");
      return;
    }
    const payload = JSON.stringify({ form, lineItems, docRefs });
    const partyName =
      parties?.find((p) => p.id === form.partyId)?.name ?? undefined;
    setSavingDraft(true);
    try {
      if (draftId) {
        await invoiceApi.updateDraft(draftId, {
          draftPayload: payload,
          partyName,
          issueDate: form.issueDate,
        });
        toast.success("Draft updated.");
      } else {
        const result = await invoiceApi.saveDraft({
          draftPayload: payload,
          partyName,
          issueDate: form.issueDate,
        });
        setDraftId(result.draftId);
        toast.success("Draft saved.");
      }
    } catch {
      toast.error("Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNote && !billingRefResolved) {
      toast.error("Please select the original invoice this note references.");
      return;
    }
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

    // Resolve nested objects from loaded lookup arrays (fall back to code-only if not loaded yet)
    const selectedCurrency = currencies.find(
      (c) => c.code === form.currencyCode,
    );
    const selectedInvoiceType = invoiceTypes.find(
      (t) => t.code === form.invoiceTypeCode,
    );
    const selectedPaymentMeans = paymentMeans.find(
      (m) => m.code === form.paymentMeansCode,
    );

    const payload: CreateInvoicePayload = {
      partyId: form.partyId,
      issueDate: form.issueDate,
      dueDate: form.dueDate || undefined,
      invoiceType: {
        name: selectedInvoiceType?.value ?? form.invoiceTypeCode,
        code: parseInt(form.invoiceTypeCode, 10),
      },
      currency: {
        name: selectedCurrency?.name ?? form.currencyCode,
        code: form.currencyCode,
      },
      deliveryPeriod: {
        startDate: form.deliveryStartDate || form.issueDate,
        endDate: form.deliveryEndDate || form.dueDate || form.issueDate,
      },
      paymentMeans: {
        code: form.paymentMeansCode,
        name: selectedPaymentMeans?.value ?? form.paymentMeansCode,
      },
      invoiceKind: form.invoiceKind || undefined,
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
      invoiceItems: lineItems.map((li) => {
        const discountAmt = lineDiscountAmt(li);
        // FeeStandardUnit: 1 = Percent, 2 = NGN (flat amount)
        const discountCode = li._discountType === "percent" ? 1 : 2;
        return {
          businessItemId: li.businessItemId,
          quantity: li.quantity,
          discountFee:
            discountAmt > 0
              ? { amount: discountAmt, code: discountCode }
              : undefined,
        } satisfies InvoiceItemPayload;
      }),
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
        // Toast removed to prevent double-toast as the modal already confirms creation
        setCreatedInvoiceId(result.invoiceId);
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

  // Clear billing ref so user can re-select (only allowed in sidebar note flow, not from invoice detail)
  const clearBillingRef = () => {
    setDocRefs((prev) => ({ ...prev, billingReference: [] }));
    setForm((prev) => ({ ...prev, partyId: "" }));
  };

  // Called when user selects the billing invoice from the sidebar note flow
  const handleBillingRefSelect = (irn: string) => {
    if (!irn) return;
    const inv = invoicesWithIRN.find((i) => i.irn === irn);
    if (!inv) return;
    setDocRefs((prev) => ({
      ...prev,
      billingReference: [{ irn, issueDate: inv.issueDate }],
    }));
    // Auto-match party by name
    const matched = parties?.find(
      (p) => p.name.toLowerCase() === (inv.partyName ?? "").toLowerCase(),
    );
    if (matched) setForm((prev) => ({ ...prev, partyId: matched.id }));
  };

  const resetForm = () => {
    const today = new Date().toISOString().substring(0, 10);
    setForm({
      partyId: "",
      issueDate: today,
      dueDate: "",
      currencyCode: "NGN",
      invoiceTypeCode: noteTypeCode ?? "380",
      invoiceKind: "B2B",
      paymentMeansCode: "30",
      note: "",
      orderReference: "",
      deliveryStartDate: today,
      deliveryEndDate: today,
    });
    setDocRefs({
      billingReference: [],
      dispatchDocumentReference: null,
      receiptDocumentReference: null,
      originatorDocumentReference: null,
      contractDocumentReference: null,
      additionalDocumentReferences: [],
    });
    setLineItems([
      {
        businessItemId: "",
        quantity: 1,
        unitPrice: 0,
        lineDiscount: 0,
        _description: "",
        _itemCode: "",
        _taxCategories: [],
        _discountType: "amount",
        _discountPercent: 0,
      },
    ]);
    setCreatedInvoiceId(null);
    setPushSummary(null);
    setDraftId(null);
  };

  const handleSkipPush = () => {
    setShowPushModal(false);
    navigate("/invoices");
  };

  const handleIssueDateChange = useCallback((_: Date[], dateStr: string) => {
    setForm((prev) => ({
      ...prev,
      issueDate: dateStr,
      // Keep deliveryStartDate in sync with issueDate unless user has changed it independently
      deliveryStartDate:
        prev.deliveryStartDate === prev.issueDate
          ? dateStr
          : prev.deliveryStartDate,
    }));
  }, []);

  const handleDueDateChange = useCallback((_: Date[], dateStr: string) => {
    setForm((prev) => ({
      ...prev,
      dueDate: dateStr,
      // Keep deliveryEndDate in sync with dueDate unless user has changed it independently
      deliveryEndDate:
        prev.deliveryEndDate === prev.dueDate ? dateStr : prev.deliveryEndDate,
    }));
  }, []);

  const handleDeliveryStartDateChange = useCallback(
    (_: Date[], dateStr: string) => {
      setForm((prev) => ({ ...prev, deliveryStartDate: dateStr }));
    },
    [],
  );

  const handleDeliveryEndDateChange = useCallback(
    (_: Date[], dateStr: string) => {
      setForm((prev) => ({ ...prev, deliveryEndDate: dateStr }));
    },
    [],
  );

  if (loadingLookups) {
    return <SkeletonCreateInvoice />;
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
          {isNote ? `New ${noteLabel}` : "Create Invoice"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {isNote && !billingRefResolved
            ? `Select the original invoice below${noteType === "note" ? " and choose the note type" : ""} to begin.`
            : isNote && billingRefResolved
              ? `Referencing ${docRefs.billingReference[0]?.irn} · will go through approval then submitted to NRS`
              : "Invoice will go through approval then be submitted to NRS"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Note mode: Billing reference step (always shown first) ── */}
        {isNote && (
          <div
            className={`rounded-2xl border p-5 ${
              billingRefResolved
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-600"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold ${
                  billingRefResolved
                    ? "bg-green-500 text-white"
                    : "bg-amber-400 text-white"
                }`}
              >
                {billingRefResolved ? "✓" : "1"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  {billingRefResolved ? (
                    <>
                      Original Invoice
                      <svg
                        className="inline w-3.5 h-3.5 ml-1.5 text-gray-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-label="locked"
                      >
                        <path d="M17 8h-1V6A4 4 0 1 0 8 6v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6zm4 9.73V17a2 2 0 1 1-4 0v-1.27A2 2 0 0 1 12 12a2 2 0 0 1 2 3.73z" />
                      </svg>
                    </>
                  ) : (
                    "Step 1 — Select the original invoice and note type"
                  )}
                </h3>
                {billingRefResolved ? (
                  /* Resolved: [badge] [Change] ··· [toggle at far right] */
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl text-xs font-mono">
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      {fromInvoice?.partyName ??
                        invoicesWithIRN.find(
                          (i) => i.irn === docRefs.billingReference[0]?.irn,
                        )?.partyName}{" "}
                      — {docRefs.billingReference[0]?.irn}
                    </span>
                    {!fromInvoice && (
                      <button
                        type="button"
                        onClick={clearBillingRef}
                        className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
                      >
                        Change
                      </button>
                    )}
                    <div className="ml-auto">
                      <NoteTypeToggle
                        value={form.invoiceTypeCode}
                        locked={isNoteTypeLocked}
                        onChange={(code) =>
                          setForm((prev) => ({
                            ...prev,
                            invoiceTypeCode: code,
                          }))
                        }
                      />
                    </div>
                  </div>
                ) : (
                  /* Unresolved: [invoice picker (flex-1)] ··· [toggle at far right] */
                  <>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                      Only signed invoices with an IRN are listed. All other
                      fields are locked until you select one.
                    </p>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 min-w-0">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value)
                              handleBillingRefSelect(e.target.value);
                          }}
                          className={inputCls}
                        >
                          <option value="">
                            Select the original invoice...
                          </option>
                          {invoicesWithIRN.map((inv) => (
                            <option key={inv.irn} value={inv.irn!}>
                              {inv.partyName} — {inv.irn}
                            </option>
                          ))}
                        </select>
                        {invoicesWithIRN.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            No signed invoices found. Only invoices that have
                            been signed and have an IRN can be referenced.
                          </p>
                        )}
                      </div>
                      <NoteTypeToggle
                        value={form.invoiceTypeCode}
                        locked={isNoteTypeLocked}
                        onChange={(code) =>
                          setForm((prev) => ({
                            ...prev,
                            invoiceTypeCode: code,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Main form — disabled until billing ref is resolved in note mode ── */}
        <div
          className={`space-y-5 ${isNote && !billingRefResolved ? "pointer-events-none opacity-40 select-none" : ""}`}
        >
          {/* Invoice Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Invoice Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Buyer / Party <span className="text-error-500">*</span>
                  {isNote && (
                    <svg
                      className="inline w-3 h-3 ml-1 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-label="locked"
                    >
                      <path d="M17 8h-1V6A4 4 0 1 0 8 6v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6zm4 9.73V17a2 2 0 1 1-4 0v-1.27A2 2 0 0 1 12 12a2 2 0 0 1 2 3.73z" />
                    </svg>
                  )}
                </label>
                <select
                  value={form.partyId}
                  onChange={handleFieldChange("partyId")}
                  disabled={isNote}
                  className={`${inputCls} ${isNote ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700" : ""}`}
                  required
                >
                  <option value="">Select party...</option>
                  {parties?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.taxIdentificationNumber}
                    </option>
                  ))}
                </select>
                {parties?.length === 0 && !isNote && (
                  <p className="text-xs text-amber-600 mt-1">
                    No parties found.{" "}
                    <Link to="/parties" className="underline">
                      Add one.
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Invoice Kind <span className="text-error-500">*</span>
                  <InfoTooltip text="B2B: selling to another business. B2C: selling to an individual consumer. B2G: selling to a government entity." />
                </label>
                <select
                  value={form.invoiceKind}
                  onChange={handleFieldChange("invoiceKind")}
                  className={inputCls}
                >
                  {INVOICE_KINDS.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>

              {!isNote && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Invoice Type <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={form.invoiceTypeCode}
                    onChange={handleFieldChange("invoiceTypeCode")}
                    className={inputCls}
                  >
                    {invoiceTypes.length > 0 ? (
                      invoiceTypes.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.value} ({t.code})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="380">Commercial Invoice (380)</option>
                        <option value="381">Credit Note (381)</option>
                        <option value="383">Debit Note (383)</option>
                        <option value="386">Prepayment Invoice (386)</option>
                        <option value="388">Tax Invoice (388)</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Currency
                </label>
                <select
                  value={form.currencyCode}
                  onChange={handleFieldChange("currencyCode")}
                  className={inputCls}
                >
                  {currencies.length > 0 ? (
                    currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                      <option value="EUR">EUR</option>
                    </>
                  )}
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
                  Payment Method <span className="text-error-500">*</span>
                </label>
                <select
                  value={form.paymentMeansCode}
                  onChange={handleFieldChange("paymentMeansCode")}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {paymentMeans.length > 0 ? (
                    paymentMeans.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.value} ({m.code})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="10">Cash (10)</option>
                      <option value="20">Cheque (20)</option>
                      <option value="30">Bank Transfer (30)</option>
                      <option value="48">Bank Card (48)</option>
                      <option value="97">Clearing between partners (97)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Delivery Start Date <span className="text-error-500">*</span>
                  <InfoTooltip text="Start of the delivery period for goods/services on this invoice (required by FIRS)." />
                </label>
                <DatePicker
                  id="invoice-delivery-start-date"
                  placeholder="Delivery start date"
                  defaultDate={form.deliveryStartDate}
                  onChange={handleDeliveryStartDateChange}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Delivery End Date <span className="text-error-500">*</span>
                  <InfoTooltip text="End of the delivery period for goods/services on this invoice (required by FIRS)." />
                </label>
                <DatePicker
                  id="invoice-delivery-end-date"
                  placeholder="Delivery end date"
                  defaultDate={form.deliveryEndDate}
                  onChange={handleDeliveryEndDateChange}
                />
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
                        setSingleRef(
                          "contractDocumentReference",
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

                  {/* Dispatch Document Reference */}
                  <div>
                    <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Dispatch Document Reference
                      <InfoTooltip text="Refers to the document used to track the dispatch of goods." />
                    </label>
                    <select
                      value={docRefs.dispatchDocumentReference?.irn ?? ""}
                      onChange={(e) =>
                        setSingleRef(
                          "dispatchDocumentReference",
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

                  {/* Billing Reference — only shown here for plain invoices; in note mode it's handled by the top card */}
                  {!isNote && (
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
                                  removeFromArrayRef(
                                    "billingReference",
                                    ref.irn,
                                  )
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
                  )}

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
                const net = lineNet(li);
                const tax = lineTax(li);
                const hasTax = tax > 0;
                // Tax codes already applied — for filtering the add-tax dropdown
                const appliedCodes = li._taxCategories.map((t) => t.code);
                // NRS categories NOT yet applied to this line
                const availableTaxCats = taxCategories.filter(
                  (t) => !appliedCodes.includes(t.code),
                );
                return (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-start border border-gray-100 dark:border-gray-700 rounded-xl p-3 lg:border-0 lg:p-0 lg:rounded-none"
                  >
                    {/* Item + multi-tax badges */}
                    <div className="col-span-12 lg:col-span-4">
                      <label className="text-xs text-gray-400 lg:hidden mb-0.5 block">
                        Item
                      </label>
                      <select
                        value={li.businessItemId}
                        onChange={(e) =>
                          handleItemSelect(index, e.target.value)
                        }
                        className={inputCls}
                        required
                      >
                        <option value="">Select item...</option>
                        {items?.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.itemId} — {it.name}
                          </option>
                        ))}
                      </select>

                      {/* Tax category tags — shown once an item is selected */}
                      {li.businessItemId && (
                        <div className="mt-1.5 space-y-1">
                          {li._taxCategories.length === 0 && (
                            <span className="inline-block text-xs text-gray-400 italic">
                              No tax / Exempt
                            </span>
                          )}
                          {li._taxCategories.map((entry) => {
                            const lineNetAmt = lineNet(li);
                            const taxAmt = entry.isPercentage
                              ? lineNetAmt * (entry.percent / 100)
                              : (entry.flatAmount ?? 0);
                            const rateLabel = entry.isPercentage
                              ? `${entry.percent}%`
                              : "flat";
                            return (
                              <span
                                key={entry.code}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                              >
                                <span>
                                  {entry.name} ({rateLabel}) = ₦
                                  {taxAmt.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeTaxFromLine(index, entry.code)
                                  }
                                  className="text-amber-400 hover:text-red-500 transition-colors leading-none text-sm"
                                  title="Remove tax"
                                >
                                  &times;
                                </button>
                              </span>
                            );
                          })}

                          {/* Add-tax dropdown — only shows if there are still available NRS categories */}
                          {availableTaxCats.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value)
                                  addTaxToLine(index, e.target.value);
                              }}
                              className={`${inputCls} text-xs mt-0.5`}
                            >
                              <option value="">+ Add tax category...</option>
                              {availableTaxCats.map((cat) => (
                                <option key={cat.code} value={cat.code}>
                                  {cat.value} ({cat.percent}%)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Unit Price — read-only, snapshotted from business item */}
                    <div className="col-span-6 lg:col-span-2">
                      <label className="text-xs text-gray-400 lg:hidden mb-0.5 block">
                        Unit Price
                      </label>
                      <PriceInput
                        value={li.unitPrice}
                        className={`${inputCls} h-[38px]`}
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
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Tax — total across all tax categories for this line */}
                    <div className="col-span-5 lg:col-span-1 flex flex-col items-end justify-center">
                      <label className="text-xs text-gray-400 lg:hidden mb-0.5">
                        Tax
                      </label>
                      <span
                        className={`text-xs font-medium ${hasTax ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}
                      >
                        {!li.businessItemId
                          ? "—"
                          : hasTax
                            ? `₦${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

            {items?.length === 0 && (
              <div className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                No business items found.{" "}
                <Link to="/items" className="underline">
                  Add items.
                </Link>
              </div>
            )}
          </div>
        </div>
        {/* end disabled wrapper */}

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
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {savingDraft
              ? "Saving..."
              : draftId
                ? "Update Draft"
                : "Save Draft"}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            {submitting
              ? "Creating..."
              : isNote
                ? `Create ${noteLabel}`
                : "Create Invoice"}
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
                  resetForm();
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
                      pushSummary.pipeline.transmit?.success ||
                      pushSummary.pipeline.transmit?.status === "SUCCESS"
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
                    const stepOk =
                      s?.success === true || s?.status === "SUCCESS";
                    const labels = ["1. Validate", "2. Sign", "3. Transmit"];
                    return (
                      <div
                        key={step}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            stepOk
                              ? "bg-green-100 dark:bg-green-900/30"
                              : "bg-red-100 dark:bg-red-900/30"
                          }`}
                        >
                          {stepOk ? (
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
                  resetForm();
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
                    <SkeletonDots />
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
