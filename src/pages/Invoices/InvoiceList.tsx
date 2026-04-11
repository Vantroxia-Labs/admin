import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import {
  invoiceApi,
  type InvoiceSummary,
  type UploadInvoiceResult,
  type SubmitInvoiceResult,
} from "../../lib/api";
import { useCanCreateInvoice, useIsAdmin } from "../../context/AuthContext";
import { USE_MOCK, MOCK_INVOICES } from "../../lib/mockData";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  CREATED: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  PENDING_APPROVAL:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  VALIDATED:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  VALIDATIONFAILED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SUBMITTED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SIGNED:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  SIGNINGFAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TRANSMITTING:
    "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  TRANSMITTED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  TRANSMISSIONFAILED:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ACKNOWLEDGED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETELYTRANSMITTED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CREATED: "Created",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  VALIDATED: "Validated",
  VALIDATIONFAILED: "Validation Failed",
  SUBMITTED: "Submitted",
  SIGNED: "Signed",
  SIGNINGFAILED: "Signing Failed",
  TRANSMITTING: "Transmitting",
  TRANSMITTED: "Transmitted",
  TRANSMISSIONFAILED: "Transmission Failed",
  ACKNOWLEDGED: "Acknowledged",
  COMPLETELYTRANSMITTED: "Transmitted",
  REJECTED: "Rejected",
};

const PAY_STATUS_COLORS: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  PAID: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  FAILED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const PAY_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

const STATUS_OPTIONS = [
  "",
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SUBMITTED",
  "TRANSMITTED",
  "TRANSMISSIONFAILED",
  "REJECTED",
];

export default function InvoiceList() {
  const canCreate = useCanCreateInvoice();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadInvoiceResult | null>(
    null,
  );
  const [dragOver, setDragOver] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchInvoices = (p: number, status: string, ps: number) => {
    if (USE_MOCK) {
      const filtered = status
        ? MOCK_INVOICES.filter((i) => i.status === status)
        : MOCK_INVOICES;
      const total = Math.ceil(filtered.length / ps);
      setInvoices(filtered.slice((p - 1) * ps, p * ps) as InvoiceSummary[]);
      setTotalPages(total || 1);
      setLoading(false);
      return;
    }
    setLoading(true);
    invoiceApi
      .list({ page: p, pageSize: ps, ...(status ? { status } : {}) })
      .then((result) => {
        setInvoices(result.items);
        setTotalPages(result.totalPages);
      })
      .catch(() => toast.error("Failed to load invoices."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices(page, statusFilter, pageSize);
  }, [page, statusFilter, pageSize]);

  const handleStatusChange = (s: string) => {
    setStatusFilter(s);
    setPage(1);
  };

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await invoiceApi.exportTemplate();
      const blob = new Blob([response.data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Invoice_Upload_Template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      toast.error("Only Excel files (.xlsx / .xls) are accepted.");
      return;
    }
    setUploadFile(file);
    setUploadResult(null);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await invoiceApi.bulkUpload(uploadFile);
      setUploadResult(result);
      if (result.isSuccess) {
        toast.success(
          `Uploaded ${result.successfulUploads} of ${result.totalObjects} invoices.`,
        );
        fetchInvoices(1, statusFilter, pageSize);
        setPage(1);
      } else {
        toast.error(
          `Upload completed with ${result.failedUploads} failure(s).`,
        );
      }
    } catch {
      toast.error("Upload failed. Please check your file and try again.");
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    if (uploading) return;
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadResult(null);
    setDragOver(false);
  };

  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState<"all" | "approvals">("all");
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceSummary[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pushingNRS, setPushingNRS] = useState<Set<string>>(new Set());
  const [approveModal, setApproveModal] = useState<{
    id: string;
    code: string;
  } | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    code: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmitInvoiceResult | null>(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);

  const loadPendingApprovals = (p = pendingPage, ps = pendingPageSize) => {
    if (USE_MOCK) {
      const all = MOCK_INVOICES.filter(
        (i) => i.status === "PENDING_APPROVAL",
      ) as InvoiceSummary[];
      setPendingTotalPages(Math.ceil(all.length / ps) || 1);
      setPendingInvoices(all.slice((p - 1) * ps, p * ps));
      setLoadingPending(false);
      return;
    }
    setLoadingPending(true);
    invoiceApi
      .pendingApproval({ page: p, pageSize: ps })
      .then((r) => {
        setPendingInvoices(r.items);
        setPendingTotalPages(r.totalPages);
      })
      .catch(() => toast.error("Failed to load pending approvals."))
      .finally(() => setLoadingPending(false));
  };

  const handlePendingPageSizeChange = (ps: number) => {
    setPendingPageSize(ps);
    setPendingPage(1);
  };

  useEffect(() => {
    if (isAdmin && activeTab === "approvals")
      loadPendingApprovals(pendingPage, pendingPageSize);
  }, [activeTab, isAdmin, pendingPage, pendingPageSize]);

  const handlePushToNRS = async (id: string, code: string) => {
    setPushingNRS((prev) => new Set(prev).add(id));
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 1200));
        const mockResult: SubmitInvoiceResult = {
          invoiceId: id,
          irn: code,
          currentStatus: "TRANSMITTED",
          message: "Invoice submitted successfully",
          pipeline: {
            validate: {
              success: true,
              message: "Invoice validated successfully",
            },
            sign: { success: true, message: "Invoice signed successfully" },
            transmit: {
              success: true,
              message: "Invoice transmitted successfully",
            },
          },
        };
        setSubmissionResult(mockResult);
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === id ? { ...inv, status: "TRANSMITTED" } : inv,
          ),
        );
      } else {
        const result = await invoiceApi.submitToNRS(id);
        setSubmissionResult(result);
        fetchInvoices(page, statusFilter, pageSize);
      }
    } catch {
      toast.error(`Failed to push ${code} to NRS.`);
    } finally {
      setPushingNRS((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setProcessing(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 800));
        toast.success(`Invoice ${approveModal.code} approved.`);
        setPendingInvoices((prev) =>
          prev.filter((i) => i.id !== approveModal.id),
        );
      } else {
        await invoiceApi.approve(approveModal.id);
        toast.success(`Invoice ${approveModal.code} approved.`);
        loadPendingApprovals();
      }
      setApproveModal(null);
    } catch {
      toast.error("Failed to approve invoice.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setProcessing(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 800));
        toast.success(`Invoice ${rejectModal.code} rejected.`);
        setPendingInvoices((prev) =>
          prev.filter((i) => i.id !== rejectModal.id),
        );
      } else {
        await invoiceApi.reject(rejectModal.id, rejectReason.trim());
        toast.success(`Invoice ${rejectModal.code} rejected.`);
        loadPendingApprovals();
      }
      setRejectModal(null);
      setRejectReason("");
    } catch {
      toast.error("Failed to reject invoice.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Invoices | Aegis EInvoicing Portal"
        description="Manage your invoices"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Invoices
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            View and manage your submitted invoices
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              title="Download Excel upload template"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {downloadingTemplate ? "Downloading..." : "Template"}
            </button>
            <button
              onClick={() => {
                setUploadResult(null);
                setUploadFile(null);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
              Bulk Upload
            </button>
            <Link
              to="/invoices/create"
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              + New Invoice
            </Link>
          </div>
        )}
      </div>

      {/* -- Bulk Upload Modal -- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                Bulk Upload Invoices
              </h2>
              <button
                onClick={closeUploadModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
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
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload an Excel file using the Aegis invoice template. Up to 500
                invoices per file.{" "}
                <button
                  onClick={handleDownloadTemplate}
                  className="text-brand-500 hover:text-brand-600 underline"
                >
                  Download template
                </button>
              </p>
              {!uploadResult && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragOver ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-gray-300 dark:border-gray-600 hover:border-brand-400 dark:hover:border-brand-500"}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                      e.target.value = "";
                    }}
                  />
                  {uploadFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="w-8 h-8 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(uploadFile.size / 1024).toFixed(1)} KB — click to
                        change
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                        />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Drag & drop or{" "}
                        <span className="text-brand-500 font-medium">
                          browse
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        .xlsx or .xls only
                      </p>
                    </div>
                  )}
                </div>
              )}
              {uploadResult && (
                <div
                  className={`rounded-xl border p-4 ${uploadResult.failedUploads === 0 ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {uploadResult.failedUploads === 0 ? (
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">
                        {uploadResult.successfulUploads} of{" "}
                        {uploadResult.totalObjects} uploaded successfully
                      </p>
                      {uploadResult.failedUploads > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          {uploadResult.failedUploads} failed
                        </p>
                      )}
                    </div>
                  </div>
                  {uploadResult.failedUploads > 0 &&
                    Object.keys(uploadResult.failedUploadDetails).length >
                      0 && (
                      <div className="mt-2 max-h-36 overflow-y-auto">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Failed entries:
                        </p>
                        <ul className="space-y-1">
                          {Object.entries(uploadResult.failedUploadDetails).map(
                            ([ref, reason]) => (
                              <li
                                key={ref}
                                className="text-xs text-gray-600 dark:text-gray-300"
                              >
                                <span className="font-mono font-medium">
                                  {ref}
                                </span>{" "}
                                — {reason}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {uploadResult ? "Close" : "Cancel"}
              </button>
              {!uploadResult && (
                <button
                  onClick={handleUploadSubmit}
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors min-w-[110px]"
                >
                  {uploading ? (
                    <span className="inline-flex items-center gap-2">
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
                      Uploading...
                    </span>
                  ) : (
                    "Upload File"
                  )}
                </button>
              )}
              {uploadResult && uploadResult.failedUploads > 0 && (
                <button
                  onClick={() => {
                    setUploadResult(null);
                    setUploadFile(null);
                  }}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-colors"
                >
                  Upload Another
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- Tabs (admin only) -- */}
      {isAdmin && (
        <div className="flex gap-0 mb-5 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "all" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
          >
            All Invoices
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${activeTab === "approvals" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
          >
            Pending Approval
            {pendingInvoices.length > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {pendingInvoices.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* -- All Invoices tab -- */}
      {activeTab === "all" && (
        <>
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s ? (STATUS_LABELS[s] ?? s) : "All Statuses"}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Rows per page
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  No invoices found.
                </p>
                {canCreate && (
                  <Link
                    to="/invoices/create"
                    className="text-brand-500 hover:text-brand-600 text-sm font-medium"
                  >
                    Create your NRSt invoice â†’
                  </Link>
                )}
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
                        Party
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                        IRN
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="font-medium text-brand-500 hover:text-brand-600"
                          >
                            {inv.invoiceCode}
                          </Link>
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
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {STATUS_LABELS[inv.status] ?? inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PAY_STATUS_COLORS[inv.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {PAY_STATUS_LABELS[inv.paymentStatus] ??
                              inv.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs font-mono">
                          {inv.irn ? inv.irn.substring(0, 16) + "..." : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {inv.status === "APPROVED" && (
                            <button
                              onClick={() =>
                                handlePushToNRS(inv.id, inv.invoiceCode)
                              }
                              disabled={pushingNRS.has(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {pushingNRS.has(inv.id) ? (
                                <>
                                  <svg
                                    className="w-3 h-3 animate-spin"
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
                                "Push to NRS"
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages}
                </p>
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
            )}
          </div>
        </>
      )}

      {/* -- Pending Approval tab -- */}
      {activeTab === "approvals" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pendingInvoices.length > 0
                ? `${pendingInvoices.length} invoice${pendingInvoices.length !== 1 ? "s" : ""}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Rows
              </label>
              <select
                value={pendingPageSize}
                onChange={(e) =>
                  handlePendingPageSizeChange(Number(e.target.value))
                }
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          {loadingPending ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingInvoices.length === 0 ? (
            <div className="text-center py-16">
              <svg
                className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                No invoices pending approval.
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
                      Party
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pendingInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-medium text-brand-500 hover:text-brand-600"
                        >
                          {inv.invoiceCode}
                        </Link>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setApproveModal({
                                id: inv.id,
                                code: inv.invoiceCode,
                              })
                            }
                            className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectReason("");
                              setRejectModal({
                                id: inv.id,
                                code: inv.invoiceCode,
                              });
                            }}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {pendingPage} of {pendingTotalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                disabled={pendingPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPendingPage((p) => Math.min(pendingTotalPages, p + 1))
                }
                disabled={pendingPage === pendingTotalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Approve Modal -- */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                Approve Invoice
              </h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Approve{" "}
                <span className="font-semibold text-gray-800 dark:text-white">
                  {approveModal.code}
                </span>
                ? The invoice will be marked as Approved and ready to be pushed
                to NRS.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setApproveModal(null)}
                disabled={processing}
                className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors min-w-[90px]"
              >
                {processing ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Reject Modal -- */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                Reject Invoice
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Rejecting{" "}
                <span className="font-semibold text-gray-800 dark:text-white">
                  {rejectModal.code}
                </span>
                . Please provide a reason.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setRejectModal(null)}
                disabled={processing}
                className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors min-w-[80px]"
              >
                {processing ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NRS Submission Summary Modal */}
      {submissionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                NRS Submission Summary
              </h2>
              <button
                onClick={() => setSubmissionResult(null)}
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
              {/* Overall Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Invoice
                  </p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {submissionResult.irn}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      submissionResult.pipeline.transmit?.success
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    }`}
                  >
                    {STATUS_LABELS[submissionResult.currentStatus] ||
                      submissionResult.currentStatus}
                  </span>
                </div>
              </div>

              {/* Pipeline Steps */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pipeline Steps
                </h3>

                {/* Validate Step */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      submissionResult.pipeline.validate?.success
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {submissionResult.pipeline.validate?.success ? (
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
                      1. Validate
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {submissionResult.pipeline.validate?.message ||
                        "Validation step completed"}
                    </p>
                  </div>
                </div>

                {/* Sign Step */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      submissionResult.pipeline.sign?.success
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {submissionResult.pipeline.sign?.success ? (
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
                      2. Sign
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {submissionResult.pipeline.sign?.message ||
                        "Signing step completed"}
                    </p>
                  </div>
                </div>

                {/* Transmit Step */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      submissionResult.pipeline.transmit?.success
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {submissionResult.pipeline.transmit?.success ? (
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
                      3. Transmit
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {submissionResult.pipeline.transmit?.message ||
                        "Transmission step completed"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall Message */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {submissionResult.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSubmissionResult(null)}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
