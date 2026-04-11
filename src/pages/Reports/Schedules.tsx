import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { scheduleApi } from "../../lib/api";
import type { VatSchedule } from "../../lib/api";
import { USE_MOCK, MOCK_VAT_SCHEDULES } from "../../lib/mockData";
import type { MockSchedule } from "../../lib/mockData";
import { useIsAdmin } from "../../context/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function fmtDate(d: string | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

/** Days from now to/from a target date. Negative = overdue. */
function daysFromNow(dateStr: string) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// ── Year options (current year and 2 back) ────────────────────────────────────
function buildYearMonthOptions() {
  const today = new Date();
  const options: { year: number; month: number; label: string }[] = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) {
    const maxMonth = y === today.getFullYear() ? today.getMonth() + 1 : 12; // can generate for current month
    for (let m = maxMonth; m >= 1; m--) {
      options.push({ year: y, month: m, label: `${MONTHS[m - 1]} ${y}` });
    }
  }
  return options;
}

export default function Schedules() {
  const isAdmin = useIsAdmin();
  const [schedules, setSchedules] = useState<MockSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterYear, setFilterYear] = useState<number | "all">("all");

  // Generate modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [generating, setGenerating] = useState(false);

  // Mark as Filed modal
  const [markFiledId, setMarkFiledId] = useState<string | null>(null);
  const [markingFiled, setMarkingFiled] = useState(false);

  const ymOptions = buildYearMonthOptions();

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (USE_MOCK) {
      setTimeout(() => {
        setSchedules(MOCK_VAT_SCHEDULES as MockSchedule[]);
        setLoading(false);
      }, 300);
      return;
    }
    scheduleApi
      .list()
      .then((res) => setSchedules(res as unknown as MockSchedule[]))
      .catch(() => toast.error("Failed to load schedules."))
      .finally(() => setLoading(false));
  }, []);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered =
    filterYear === "all"
      ? schedules
      : schedules.filter((s) => s.year === filterYear);
  const years = Array.from(new Set(schedules.map((s) => s.year))).sort(
    (a, b) => b - a,
  );

  // ── Toggle expand ─────────────────────────────────────────────────────────
  const toggleExpand = async (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // In real mode, fetch items if not loaded
      if (!USE_MOCK) {
        const sch = schedules.find((s) => s.id === id);
        if (sch && !(sch as MockSchedule).items?.length) {
          try {
            const full = (await scheduleApi.getWithItems(
              id,
            )) as unknown as MockSchedule;
            setSchedules((prev) =>
              prev.map((s) =>
                s.id === id ? { ...s, items: full.items ?? [] } : s,
              ),
            );
          } catch {
            toast.error("Failed to load schedule items.");
          }
        }
      }
    }
    setExpanded(next);
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const alreadyExists = schedules.some(
    (s) => s.year === genYear && s.month === genMonth,
  );

  const handleGenerate = async () => {
    if (alreadyExists) return;
    setGenerating(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 800));
        const dueYear = genMonth === 12 ? genYear + 1 : genYear;
        const dueMon = genMonth === 12 ? 1 : genMonth + 1;
        const dueDate = `${dueYear}-${String(dueMon).padStart(2, "0")}-14`;
        const newSch: MockSchedule = {
          id: `sch-${genMonth.toString().padStart(2, "0")}-${genYear}`,
          year: genYear,
          month: genMonth,
          monthName: MONTHS[genMonth - 1],
          periodStart: `${genYear}-${String(genMonth).padStart(2, "0")}-01`,
          periodEnd: `${genYear}-${String(genMonth).padStart(2, "0")}-${new Date(genYear, genMonth, 0).getDate()}`,
          dueDate,
          status: "Generated",
          generatedAt: new Date().toISOString(),
          totalInvoiceCount: 0,
          totalTaxableAmount: 0,
          totalVatAmount: 0,
          items: [],
        };
        setSchedules((prev) =>
          [newSch, ...prev].sort((a, b) =>
            b.year === a.year ? b.month - a.month : b.year - a.year,
          ),
        );
        toast.success(
          `Schedule for ${MONTHS[genMonth - 1]} ${genYear} generated.`,
        );
      } else {
        const result = (await scheduleApi.generate(
          genYear,
          genMonth,
        )) as unknown as MockSchedule;
        setSchedules((prev) =>
          [result, ...prev].sort((a, b) =>
            b.year === a.year ? b.month - a.month : b.year - a.year,
          ),
        );
        toast.success(
          `Schedule for ${MONTHS[genMonth - 1]} ${genYear} generated (${result.totalInvoiceCount} invoices).`,
        );
      }
      setShowGenerate(false);
    } catch {
      toast.error("Failed to generate schedule.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Mark as Filed ─────────────────────────────────────────────────────────
  const handleMarkFiled = async () => {
    if (!markFiledId) return;
    setMarkingFiled(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 600));
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === markFiledId
              ? {
                  ...s,
                  status: "Filed" as const,
                  filedAt: new Date().toISOString(),
                }
              : s,
          ),
        );
        toast.success("Schedule marked as filed.");
      } else {
        await scheduleApi.markFiled(markFiledId);
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === markFiledId
              ? {
                  ...s,
                  status: "Filed" as const,
                  filedAt: new Date().toISOString(),
                }
              : s,
          ),
        );
        toast.success("Schedule marked as filed.");
      }
      setMarkFiledId(null);
    } catch {
      toast.error("Failed to mark schedule as filed.");
    } finally {
      setMarkingFiled(false);
    }
  };

  // ── Export (now uses backend) ────────────────────
  const handleExport = async (schedule: VatSchedule) => {
    const toastId = toast.loading("Generating XLSX file...");
    try {
      const response = await scheduleApi.export(schedule.id);
      const blob = new Blob([response.data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const title = `VAT_Schedule_${schedule.monthName}_${schedule.year}.xlsx`;
      link.download = title;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${title} downloaded.`, { id: toastId });
    } catch {
      toast.error("Failed to export schedule.", { id: toastId });
    }
  };

  // ── Due-date badge ────────────────────────────────────────────────────────
  function DueBadge({ dueDate, status }: { dueDate: string; status: string }) {
    if (status === "Filed") return null;
    const days = daysFromNow(dueDate);
    if (days < 0)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Overdue {Math.abs(days)}d
        </span>
      );
    if (days <= 7)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Due in {days}d
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        Due {fmtDate(dueDate)}
      </span>
    );
  }

  return (
    <>
      <PageMeta
        title="VAT Schedule | Aegis NRS Portal"
        description="Monthly VAT filing schedule"
      />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            VAT Schedule
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Monthly output VAT schedules — filed on the 14th of every month for
            the prior month
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowGenerate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Generate Schedule
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="mb-5 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
        <svg
          className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Each schedule captures <strong>transmitted</strong> invoices for that
          calendar month that have not yet been included in a previous schedule,
          ensuring no invoice is duplicated or missed. Download as XLSX, then
          file on the NRS portal by the <strong>14th</strong> of the following
          month.
        </p>
      </div>

      {/* Year filter */}
      {years.length > 1 && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Year:
          </span>
          <button
            onClick={() => setFilterYear("all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterYear === "all" ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
          >
            All
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setFilterYear(y)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterYear === y ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Schedules list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No schedules found.
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowGenerate(true)}
              className="text-brand-500 hover:text-brand-600 text-sm font-medium"
            >
              Generate your NRSt schedule →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sch) => {
            const isExpd = expanded.has(sch.id);
            return (
              <div
                key={sch.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Schedule header row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors select-none"
                  onClick={() => toggleExpand(sch.id)}
                >
                  {/* Period */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 dark:text-white text-sm">
                        {sch.monthName} {sch.year}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sch.status === "Filed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
                      >
                        {sch.status}
                      </span>
                      <DueBadge dueDate={sch.dueDate} status={sch.status} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {fmtDate(sch.periodStart)} – {fmtDate(sch.periodEnd)}
                      {sch.status === "Filed" && sch.filedAt
                        ? ` · Filed ${fmtDate(sch.filedAt)}`
                        : ` · Due ${fmtDate(sch.dueDate)}`}
                    </p>
                  </div>

                  {/* Totals */}
                  <div className="flex flex-wrap gap-5 text-sm shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Invoices
                      </p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {sch.totalInvoiceCount}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Taxable Amount
                      </p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {fmtAmount(sch.totalTaxableAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        VAT (7.5%)
                      </p>
                      <p className="font-semibold text-amber-600 dark:text-amber-400">
                        {fmtAmount(sch.totalVatAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleExport(sch as VatSchedule)}
                      title="Download XLSX"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
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
                      XLSX
                    </button>
                    {sch.status === "Generated" && isAdmin && (
                      <button
                        onClick={() => setMarkFiledId(sch.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                        Mark Filed
                      </button>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpd ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Expanded items table */}
                {isExpd && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {!sch.items || sch.items.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-center text-gray-400 dark:text-gray-500">
                        No invoice items to display.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 w-8">
                                S/N
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Invoice Number
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                IRN
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Customer Name
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Customer TIN
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Issue Date
                              </th>
                              <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                                Taxable (₦)
                              </th>
                              <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                                VAT 7.5% (₦)
                              </th>
                              <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                                Total (₦)
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Payment
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {sch.items.map((item, idx) => (
                              <tr
                                key={item.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                              >
                                <td className="px-4 py-2.5 text-gray-400">
                                  {idx + 1}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-medium text-gray-700 dark:text-gray-200">
                                  {item.invoiceCode}
                                </td>
                                <td
                                  className="px-4 py-2.5 font-mono text-gray-400 dark:text-gray-500 max-w-[160px] truncate"
                                  title={item.irn}
                                >
                                  {item.irn}
                                </td>
                                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                  {item.partyName}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">
                                  {item.partyTin}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {fmtDate(item.issueDate)}
                                </td>
                                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-200">
                                  {item.taxableAmount.toLocaleString("en-NG", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">
                                  {item.vatAmount.toLocaleString("en-NG", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-white">
                                  {item.totalAmount.toLocaleString("en-NG", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${item.paymentStatus === "PAID" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
                                  >
                                    {item.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300 text-right"
                              >
                                Schedule Totals
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-white">
                                {sch.totalTaxableAmount.toLocaleString(
                                  "en-NG",
                                  { minimumFractionDigits: 2 },
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                                {sch.totalVatAmount.toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-white">
                                {(
                                  sch.totalTaxableAmount + sch.totalVatAmount
                                ).toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Schedule Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                Generate VAT Schedule
              </h2>
              <button
                onClick={() => setShowGenerate(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
                Generate a VAT schedule for a billing period. Only transmitted
                invoices not already included in another schedule will be
                captured.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Select Period
                </label>
                <select
                  value={`${genYear}-${genMonth}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split("-").map(Number);
                    setGenYear(y);
                    setGenMonth(m);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {ymOptions.map((o) => (
                    <option
                      key={`${o.year}-${o.month}`}
                      value={`${o.year}-${o.month}`}
                    >
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {alreadyExists && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
                  <svg
                    className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    A schedule already exists for{" "}
                    <strong>
                      {MONTHS[genMonth - 1]} {genYear}
                    </strong>
                    . Only one schedule is allowed per month.
                  </p>
                </div>
              )}
              {!alreadyExists && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Due date:{" "}
                    <strong>
                      14 {MONTHS[genMonth === 12 ? 0 : genMonth]}{" "}
                      {genMonth === 12 ? genYear + 1 : genYear}
                    </strong>
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowGenerate(false)}
                className="px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || alreadyExists}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors min-w-[120px]"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Filed Confirmation Modal */}
      {markFiledId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
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
              <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-2">
                Mark as Filed?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Confirm that this VAT schedule has been filed with NRS. This
                action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMarkFiledId(null)}
                  className="flex-1 px-4 py-2 border border-red-500 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkFiled}
                  disabled={markingFiled}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
                >
                  {markingFiled ? "Saving..." : "Confirm Filed"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
