import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { invoiceApi, type InvoiceSummary } from "../../lib/api";
import { USE_MOCK, MOCK_RECEIVED_INVOICES } from "../../lib/mockData";

const PAY_STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function ReceivedInvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchInvoices = (p: number, ps: number) => {
    if (USE_MOCK) {
      setTotalCount(MOCK_RECEIVED_INVOICES.length);
      setTotalPages(Math.ceil(MOCK_RECEIVED_INVOICES.length / ps));
      setInvoices(
        MOCK_RECEIVED_INVOICES.slice((p - 1) * ps, p * ps) as InvoiceSummary[],
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    invoiceApi
      .receivedList({ page: p, pageSize: ps })
      .then((result) => {
        setInvoices(result.items);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      })
      .catch(() => toast.error("Failed to load received invoices."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices(page, pageSize);
  }, [page, pageSize]);
  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  return (
    <>
      <PageMeta
        title="Received Invoices | Aegis EInvoicing Portal"
        description="View invoices received from trading partners"
      />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Received Invoices
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Invoices received from your trading partners via NRS NRS
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount > 0
              ? `${totalCount} invoice${totalCount !== 1 ? "s" : ""}`
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
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">
              No received invoices found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Sender
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Payment Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    IRN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                      {inv.invoiceCode}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {inv.partyName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(inv.issueDate).toLocaleDateString("en-NG", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white">
                      ₦{inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          PAY_STATUS_COLORS[inv.paymentStatus] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs font-mono">
                      {inv.irn ? inv.irn.substring(0, 16) + "…" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
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
      </div>
    </>
  );
}
