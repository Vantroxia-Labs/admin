import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { invoiceApi } from "../../lib/api";
import type { InvoiceSummary } from "../../lib/api";
import { USE_MOCK, MOCK_INVOICES } from "../../lib/mockData";
import { useIsAdmin } from "../../context/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  CREATED: "bg-blue-50 text-blue-600",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  VALIDATED: "bg-indigo-100 text-indigo-700",
  SUBMITTED: "bg-purple-100 text-purple-700",
  SIGNED: "bg-indigo-100 text-indigo-700",
  TRANSMITTING: "bg-purple-50 text-purple-600",
  TRANSMITTED: "bg-green-100 text-green-700",
  TRANSMISSIONFAILED: "bg-orange-100 text-orange-700",
  ACKNOWLEDGED: "bg-green-100 text-green-700",
  COMPLETELYTRANSMITTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", CREATED: "Created", PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved", VALIDATED: "Validated", VALIDATIONFAILED: "Validation Failed",
  SUBMITTED: "Submitted", SIGNED: "Signed", SIGNINGFAILED: "Signing Failed",
  TRANSMITTING: "Transmitting", TRANSMITTED: "Transmitted",
  TRANSMISSIONFAILED: "Transmission Failed", ACKNOWLEDGED: "Acknowledged",
  COMPLETELYTRANSMITTED: "Transmitted", REJECTED: "Rejected",
};
const PAY_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};
const PAY_LABELS: Record<string, string> = { PENDING: "Pending", PAID: "Paid", REJECTED: "Rejected", CANCELLED: "Cancelled", FAILED: "Failed" };

// Mock line items for invoice detail
const MOCK_LINE_ITEMS = [
  { description: "IT Consulting Services (per hour)", quantity: 40, unitPrice: 75_000, vatRate: 7.5 },
  { description: "Cloud Hosting Services (per month)", quantity: 3, unitPrice: 180_000, vatRate: 7.5 },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 dark:text-white">{value}</span>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    if (!id) return;
    if (USE_MOCK) {
      const found = MOCK_INVOICES.find(i => i.id === id) as InvoiceSummary | undefined;
      setInvoice(found ?? null);
      setLoading(false);
      return;
    }
    invoiceApi
      .get(id)
      .then((data) => setInvoice(data as InvoiceSummary))
      .catch(() => { toast.error("Failed to load invoice."); setInvoice(null); })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePushToNRS = async () => {
    if (!invoice) return;
    setPushing(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>(r => setTimeout(r, 1200));
        setInvoice(prev => prev ? { ...prev, status: "TRANSMITTED" } : prev);
        toast.success(`${invoice.invoiceCode} transmitted to NRS.`);
      } else {
        const result = await invoiceApi.submitToNRS(invoice.id);
        if (result.pipeline?.transmit?.success) {
          toast.success(`${invoice.invoiceCode} transmitted to NRS.`);
          setInvoice(prev => prev ? { ...prev, status: "TRANSMITTED" } : prev);
        } else {
          toast.error(`NRS submission failed: ${result.message ?? "Unknown error"}`);
        }
      }
    } catch {
      toast.error("Failed to push to NRS.");
    } finally {
      setPushing(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!invoice) return;
    setUpdatingPayment(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>(r => setTimeout(r, 600));
        setInvoice(prev => prev ? { ...prev, paymentStatus } : prev);
        toast.success("Payment status updated.");
      } else {
        await invoiceApi.updatePaymentStatus({ invoiceId: invoice.id, paymentStatus, paymentReference: paymentRef || undefined });
        setInvoice(prev => prev ? { ...prev, paymentStatus } : prev);
        toast.success("Payment status updated.");
      }
      setPaymentModal(false);
    } catch {
      toast.error("Failed to update payment status.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Invoice not found.</p>
        <Link to="/invoices" className="text-brand-500 hover:text-brand-600 text-sm font-medium">← Back to Invoices</Link>
      </div>
    );
  }

  // Compute mock line item totals
  const lineItems = USE_MOCK ? MOCK_LINE_ITEMS.map(li => {
    const lineTotal = li.quantity * li.unitPrice;
    const vatAmt = lineTotal * (li.vatRate / 100);
    return { ...li, lineTotal, vatAmt, grossTotal: lineTotal + vatAmt };
  }) : [];

  const fmtDate = (d?: string) => d
    ? new Date(d).toLocaleDateString("en-NG", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  return (
    <>
      <PageMeta
        title={`Invoice ${invoice.invoiceCode} | Aegis NRS Portal`}
        description="Invoice detail view"
      />

      {/* Back nav */}
      <div className="mb-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Invoices
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white font-mono">{invoice.invoiceCode}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">via {invoice.source}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[invoice.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${PAY_COLORS[invoice.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
            {PAY_LABELS[invoice.paymentStatus] ?? invoice.paymentStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invoice Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Invoice Details</h2>
            <div className="space-y-3">
              <InfoRow label="Invoice Number" value={<span className="font-mono">{invoice.invoiceCode}</span>} />
              <InfoRow label="IRN" value={invoice.irn ? <span className="font-mono text-xs break-all">{invoice.irn}</span> : <span className="text-gray-400">—</span>} />
              <InfoRow label="Customer" value={invoice.partyName ?? "—"} />
              <InfoRow label="Issue Date" value={fmtDate(invoice.issueDate)} />
              <InfoRow label="Due Date" value={fmtDate(invoice.dueDate)} />
              <InfoRow label="Source" value={invoice.source} />
            </div>
          </div>

          {/* Line Items */}
          {USE_MOCK && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">VAT</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {lineItems.map((li, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{li.description}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{li.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">₦{li.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-500 text-xs">₦{li.vatAmt.toLocaleString()} ({li.vatRate}%)</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white">₦{li.grossTotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Taxable Amount</td>
                      <td colSpan={2} className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white">
                        ₦{lineItems.reduce((s, li) => s + li.lineTotal, 0).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Total VAT (7.5%)</td>
                      <td colSpan={2} className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                        ₦{lineItems.reduce((s, li) => s + li.vatAmt, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Financials + Actions */}
        <div className="space-y-5">
          {/* QR Code */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 self-start">FIRS QR Code</h2>
            {invoice.qrCodeImage ? (
              <img
                src={invoice.qrCodeImage.startsWith('data:') ? invoice.qrCodeImage : `data:image/png;base64,${invoice.qrCodeImage}`}
                alt="Invoice QR Code"
                className="w-40 h-40 rounded-lg border border-gray-100 dark:border-gray-700"
              />
            ) : (
              <div className="w-40 h-40 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700/30">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path strokeLinecap="round" d="M14 14h2m2 0h1M14 17v1m0 2v1M17 14v3h3M17 20h3" />
                </svg>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center px-2">Generated after FIRS signing</p>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Scan to verify on FIRS NRS</p>
          </div>

          {/* Financials */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Financial Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Taxable Amount</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  ₦{(invoice.totalAmount - invoice.totalTaxAmount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">VAT (7.5%)</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  ₦{invoice.totalTaxAmount.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Amount</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ₦{invoice.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</h2>

            {invoice.status === "APPROVED" && (
              <button
                onClick={handlePushToNRS}
                disabled={pushing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              >
                {pushing ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Pushing...</>
                ) : "Push to NRS"}
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => { setPaymentStatus(invoice.paymentStatus || "PAID"); setPaymentRef(""); setPaymentModal(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Update Payment Status
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>

            <Link
              to="/invoices"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← All Invoices
            </Link>
          </div>
        </div>
      </div>

      {/* Payment Status Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Update Payment Status</h2>
              <button onClick={() => setPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              {paymentStatus === "PAID" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Payment Reference (optional)</label>
                  <input
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    placeholder="e.g. TRX-20260330-001"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setPaymentModal(false)} className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleUpdatePayment} disabled={updatingPayment} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors min-w-[80px]">
                {updatingPayment ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
