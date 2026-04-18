import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import {
  broadcastApi,
  type BroadcastDetail,
  type BroadcastSubmission,
} from "../../lib/api";
import {
  USE_MOCK,
  MOCK_BROADCAST_DETAIL,
  MOCK_BROADCAST_SUBMISSIONS,
} from "../../lib/mockData";
import { useIsAdmin } from "../../context/AuthContext";

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Paid: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

export default function BroadcastDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const [broadcast, setBroadcast] = useState<BroadcastDetail | null>(null);
  const [submissions, setSubmissions] = useState<BroadcastSubmission[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [actioning, setActioning] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  const load = async () => {
    if (!id) return;
    if (USE_MOCK) {
      setBroadcast(MOCK_BROADCAST_DETAIL as BroadcastDetail);
      setEditTitle(MOCK_BROADCAST_DETAIL.title);
      setEditNote(MOCK_BROADCAST_DETAIL.note ?? "");
      setSubmissions(MOCK_BROADCAST_SUBMISSIONS as BroadcastSubmission[]);
      setSubTotalPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [detail, subs] = await Promise.all([
        broadcastApi.get(id),
        broadcastApi.getSubmissions(id, { page: subPage, pageSize: 20 }),
      ]);
      setBroadcast(detail);
      setEditTitle(detail.title);
      setEditNote(detail.note ?? "");
      setSubmissions(subs.items ?? []);
      setSubTotalPages(subs.totalPages ?? 1);
    } catch {
      toast.error("Failed to load broadcast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, subPage]);

  const handleDeactivate = async () => {
    if (
      !id ||
      !confirm(
        "Deactivate this broadcast? Vendors will no longer be able to submit.",
      )
    )
      return;
    setActioning(true);
    try {
      const r = await broadcastApi.deactivate(id);
      if (r.hasPendingInvoices)
        toast("Deactivated — some vendors had pending invoices", {
          icon: "⚠️",
        });
      else toast.success("Broadcast deactivated");
      load();
    } catch {
      toast.error("Failed to deactivate");
    } finally {
      setActioning(false);
    }
  };

  const handleRejectAll = async () => {
    if (
      !id ||
      !confirm("Reject all pending submissions? This cannot be undone.")
    )
      return;
    setActioning(true);
    try {
      await broadcastApi.rejectAll(id);
      toast.success("All submissions rejected");
      load();
    } catch {
      toast.error("Failed to reject all");
    } finally {
      setActioning(false);
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !extendDate) return;
    setActioning(true);
    try {
      await broadcastApi.extendDueDate(id, extendDate);
      toast.success("Due date extended");
      setExtendDate("");
      load();
    } catch {
      toast.error("Failed to extend due date");
    } finally {
      setActioning(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActioning(true);
    try {
      await broadcastApi.update(id, {
        title: editTitle,
        note: editNote || undefined,
      });
      toast.success("Broadcast updated");
      setShowEdit(false);
      load();
    } catch {
      toast.error("Failed to update");
    } finally {
      setActioning(false);
    }
  };

  const toggleSelect = (invoiceId: string) =>
    setSelected((s) =>
      s.includes(invoiceId)
        ? s.filter((x) => x !== invoiceId)
        : [...s, invoiceId],
    );

  const handleMarkPaid = async () => {
    if (!selected.length) return;
    setActioning(true);
    try {
      await broadcastApi.markPaid(selected);
      toast.success(`${selected.length} invoice(s) marked paid`);
      setSelected([]);
      load();
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setActioning(false);
    }
  };

  const handleMarkRejected = async () => {
    if (!selected.length) return;
    setActioning(true);
    try {
      await broadcastApi.markRejected(selected);
      toast.success(`${selected.length} invoice(s) marked rejected`);
      setSelected([]);
      load();
    } catch {
      toast.error("Failed to mark as rejected");
    } finally {
      setActioning(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!broadcast)
    return <div className="p-6 text-gray-500">Broadcast not found.</div>;

  const isActive = broadcast.status === "Active";

  return (
    <>
      <PageMeta title={broadcast.title} description="Broadcast detail" />
      <div className="p-6 space-y-6">
        <button
          onClick={() => navigate("/broadcasts")}
          className="text-sm text-brand-500 hover:underline"
        >
          ← Back to Broadcasts
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {broadcast.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Due {new Date(broadcast.dueDate).toLocaleDateString()} ·{" "}
              {broadcast.currency} · {broadcast.invoiceTypeCode}
            </p>
            {broadcast.note && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {broadcast.note}
              </p>
            )}
          </div>
          {isAdmin && isActive && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={handleDeactivate}
                disabled={actioning}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                Deactivate
              </button>
              <button
                onClick={handleRejectAll}
                disabled={actioning}
                className="px-3 py-1.5 text-sm border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50"
              >
                Reject All
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Vendors", value: broadcast.totalVendors },
            { label: "Submitted", value: broadcast.submittedCount },
            {
              label: "Requires Approval",
              value: broadcast.requiresApproval ? "Yes" : "No",
            },
            {
              label: "Approval Locked",
              value: broadcast.isApprovalLocked ? "Yes" : "No",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <p className="text-xs text-gray-500 uppercase">{s.label}</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Extend due date */}
        {isAdmin && isActive && (
          <form onSubmit={handleExtend} className="flex items-end gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Extend Due Date
              </label>
              <input
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              />
            </div>
            <button
              type="submit"
              disabled={actioning || !extendDate}
              className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg disabled:opacity-60"
            >
              Extend
            </button>
          </form>
        )}

        {/* Submissions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Submissions
            </h2>
            {isAdmin && selected.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleMarkPaid}
                  disabled={actioning}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg"
                >
                  Mark Paid ({selected.length})
                </button>
                <button
                  onClick={handleMarkRejected}
                  disabled={actioning}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg"
                >
                  Reject ({selected.length})
                </button>
              </div>
            )}
          </div>

          {submissions.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                  <tr>
                    {isAdmin && (
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? submissions.map((s) => s.invoiceId)
                                : [],
                            )
                          }
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left">Vendor</th>
                    <th className="px-4 py-3 text-left">Invoice</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {submissions.map((s) => (
                    <tr
                      key={s.broadcastVendorId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(s.invoiceId)}
                            onChange={() => toggleSelect(s.invoiceId)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {s.vendorBusinessName}
                        </p>
                        <p className="text-xs text-gray-400">{s.vendorEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                        {s.invoiceCode}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {s.totalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {s.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {s.invoiceStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {subTotalPages > 1 && (
            <div className="flex items-center gap-2 text-sm mt-3">
              <button
                onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                disabled={subPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-gray-500">
                Page {subPage} of {subTotalPages}
              </span>
              <button
                onClick={() =>
                  setSubPage((p) => Math.min(subTotalPages, p + 1))
                }
                disabled={subPage === subTotalPages}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleUpdate}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Broadcast
            </h2>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Title *
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Note
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={actioning}
                className="flex-1 py-2 bg-brand-500 text-white rounded-lg disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300"
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
