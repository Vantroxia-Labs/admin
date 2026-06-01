import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { whtScheduleApi } from "../../lib/api";
import type { WhtSchedule } from "../../lib/api";
import { USE_MOCK, MOCK_WHT_SCHEDULES } from "../../lib/mockData";
import { useIsAdmin } from "../../context/AuthContext";
import { useEnvMode } from "../../context/EnvModeContext";
import { SkeletonScheduleList } from "../../components/ui/skeleton/Skeleton";

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

function daysFromNow(dateStr: string) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function buildYearMonthOptions() {
  const today = new Date();
  const options: { year: number; month: number; label: string }[] = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) {
    const maxMonth = y === today.getFullYear() ? today.getMonth() + 1 : 12;
    for (let m = maxMonth; m >= 1; m--) {
      options.push({ year: y, month: m, label: `${MONTHS[m - 1]} ${y}` });
    }
  }
  return options;
}

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

// ── Component ─────────────────────────────────────────────────────────────────
export default function WhtSchedules() {
  const isAdmin = useIsAdmin();
  const { envMode } = useEnvMode();
  const [schedules, setSchedules] = useState<WhtSchedule[]>([]);
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

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setSchedules([]);
    if (USE_MOCK) {
      setTimeout(() => {
        setSchedules(MOCK_WHT_SCHEDULES as WhtSchedule[]);
        setLoading(false);
      }, 300);
      return;
    }
    setLoading(true);
    whtScheduleApi
      .list(undefined, envMode)
      .then((res) => setSchedules(res))
      .catch(() => toast.error("Failed to load WHT schedules."))
      .finally(() => setLoading(false));
  }, [envMode]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered =
    (filterYear === "all"
      ? schedules
      : schedules?.filter((s) => s.year === filterYear)) ?? [];
  const years = Array.from(new Set(schedules?.map((s) => s.year))).sort(
    (a, b) => b - a,
  );

  // ── Toggle expand ─────────────────────────────────────────────────────────
  const toggleExpand = async (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!USE_MOCK) {
        const sch = schedules?.find((s) => s.id === id);
        if (sch && !sch.items?.length) {
          try {
            const full = await whtScheduleApi.getWithItems(id);
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
  const alreadyExists = schedules?.some(
    (s) => s.year === genYear && s.month === genMonth,
  );

  const handleGenerate = async () => {
    if (alreadyExists) return;
    setGenerating(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 800));
        const newSch: WhtSchedule = {
          id: `wht-sch-${genMonth.toString().padStart(2, "0")}-${genYear}`,
          year: genYear,
          month: genMonth,
          monthName: MONTHS[genMonth - 1],
          periodStart: `${genYear}-${String(genMonth).padStart(2, "0")}-01`,
          periodEnd: `${genYear}-${String(genMonth).padStart(2, "0")}-${new Date(genYear, genMonth, 0).getDate()}`,
          dueDate: `${genMonth === 12 ? genYear + 1 : genYear}-${String(genMonth === 12 ? 1 : genMonth + 1).padStart(2, "0")}-14`,
          status: "Generated",
          generatedAt: new Date().toISOString(),
          totalItemCount: 0,
          totalGrossAmount: 0,
          totalWhtAmount: 0,
          totalNrsWhtAmount: 0,
          totalStateWhtAmount: 0,
          items: [],
        };
        setSchedules((prev) =>
          [newSch, ...prev].sort((a, b) =>
            b.year === a.year ? b.month - a.month : b.year - a.year,
          ),
        );
        toast.success(
          `WHT Schedule for ${MONTHS[genMonth - 1]} ${genYear} generated.`,
        );
      } else {
        const result = await whtScheduleApi.generate(genYear, genMonth);
        setSchedules((prev) =>
          [result, ...prev].sort((a, b) =>
            b.year === a.year ? b.month - a.month : b.year - a.year,
          ),
        );
        toast.success(
          `WHT Schedule for ${MONTHS[genMonth - 1]} ${genYear} generated (${result.totalItemCount} items).`,
        );
      }
      setShowGenerate(false);
    } catch {
      toast.error("Failed to generate WHT schedule.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async (
    sch: WhtSchedule,
    authority: "NRS" | "StateIRS",
  ) => {
    // Load items if not yet fetched
    let items = sch.items ?? [];
    if (!USE_MOCK && items.length === 0) {
      const toastId = toast.loading("Loading items...");
      try {
        const full = await whtScheduleApi.getWithItems(sch.id);
        items = full.items ?? [];
        setSchedules((prev) =>
          prev.map((s) => (s.id === sch.id ? { ...s, items } : s)),
        );
        toast.dismiss(toastId);
      } catch {
        toast.error("Failed to load schedule items.", { id: toastId });
        return;
      }
    }

    const filtered = items.filter((i) => i.taxAuthority === authority);
    if (filtered.length === 0) {
      toast.error(
        `No ${authority === "NRS" ? "Federal (NRS)" : "State IRS"} items in this schedule.`,
      );
      return;
    }

    const toastId = toast.loading("Generating XLSX...");
    try {
      const rows = filtered.map((item, idx) => ({
        "S/N": idx + 1,
        "Vendor Name": item.vendorName,
        "Vendor TIN": item.vendorTin ?? "",
        "Vendor Address": item.vendorAddress ?? "",
        IRN: item.irn,
        "Issue Date": fmtDate(item.issueDate),
        "Nature of Transaction": item.natureOfTransaction,
        "Gross Amount (₦)": item.grossAmount,
        "WHT Rate (%)": item.whtRate,
        "WHT Amount (₦)": item.whtAmount,
        "Net Amount (₦)": item.netAmount,
        "Tax Authority": item.taxAuthority,
      }));

      // Totals row
      rows.push({
        "S/N": "" as unknown as number,
        "Vendor Name": "TOTAL",
        "Vendor TIN": "",
        "Vendor Address": "",
        IRN: "",
        "Issue Date": "",
        "Nature of Transaction": "",
        "Gross Amount (₦)": filtered.reduce((s, i) => s + i.grossAmount, 0),
        "WHT Rate (%)": "" as unknown as number,
        "WHT Amount (₦)": filtered.reduce((s, i) => s + i.whtAmount, 0),
        "Net Amount (₦)": filtered.reduce((s, i) => s + i.netAmount, 0),
        "Tax Authority": "",
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 16 },
        { wch: 30 },
        { wch: 22 },
        { wch: 12 },
        { wch: 30 },
        { wch: 18 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      const label = authority === "NRS" ? "Federal_NRS" : "State_IRS";
      XLSX.utils.book_append_sheet(wb, ws, label);
      const filename = `WHT_Schedule_${label}_${sch.monthName}_${sch.year}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`${filename} downloaded.`, { id: toastId });
    } catch {
      toast.error("Failed to generate XLSX.", { id: toastId });
    }
  };

  // ── Mark as Filed ─────────────────────────────────────────────────────────
  const handleMarkFiled = async () => {
    if (!markFiledId) return;
    setMarkingFiled(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 600));
      } else {
        await whtScheduleApi.markFiled(markFiledId);
      }
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
      toast.success("WHT Schedule marked as filed.");
      setMarkFiledId(null);
    } catch {
      toast.error("Failed to mark schedule as filed.");
    } finally {
      setMarkingFiled(false);
    }
  };

  return (
    <>
      <PageMeta
        title="WHT Schedule | Aegis EInvoicing Portal"
        description="Monthly Withholding Tax filing schedule"
      />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            WHT Schedule
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Monthly Withholding Tax schedules — remitted on the 14th of every
            month for the prior month
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
          Each WHT schedule captures <strong>received invoices</strong> subject
          to Withholding Tax for that calendar month. NRS-remittable and State
          IRS-remittable amounts are shown separately. Remit by the{" "}
          <strong>14th</strong> of the following month.
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
        <SkeletonScheduleList rows={4} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No WHT schedules found.
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowGenerate(true)}
              className="text-brand-500 hover:text-brand-600 text-sm font-medium"
            >
              Generate your first WHT schedule →
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
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors select-none"
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
                        Items
                      </p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {sch.totalItemCount}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Gross Amount
                      </p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {fmtAmount(sch.totalGrossAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Total WHT
                      </p>
                      <p className="font-semibold text-amber-600 dark:text-amber-400">
                        {fmtAmount(sch.totalWhtAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        NRS WHT
                      </p>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        {fmtAmount(sch.totalNrsWhtAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        State WHT
                      </p>
                      <p className="font-semibold text-purple-600 dark:text-purple-400">
                        {fmtAmount(sch.totalStateWhtAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleExport(sch, "NRS")}
                      title="Download Federal (NRS) WHT XLSX"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors whitespace-nowrap"
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
                      NRS
                    </button>
                    <button
                      onClick={() => handleExport(sch, "StateIRS")}
                      title="Download State IRS WHT XLSX"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors whitespace-nowrap"
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
                      State
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
                        No items to display.
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
                                Vendor
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Vendor TIN
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                IRN
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Issue Date
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Nature
                              </th>
                              <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                                Gross (₦)
                              </th>
                              <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                                Rate %
                              </th>
                              <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                                WHT (₦)
                              </th>
                              <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                                Net (₦)
                              </th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                                Authority
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {sch.items?.map(
                              (item: WhtScheduleItem, idx: number) => (
                                <tr
                                  key={item.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                >
                                  <td className="px-4 py-2.5 text-gray-400">
                                    {idx + 1}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                    {item.vendorName}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">
                                    {item.vendorTin ?? "—"}
                                  </td>
                                  <td
                                    className="px-4 py-2.5 font-mono text-gray-400 dark:text-gray-500 max-w-35 truncate"
                                    title={item.irn}
                                  >
                                    {item.irn}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {fmtDate(item.issueDate)}
                                  </td>
                                  <td
                                    className="px-4 py-2.5 text-gray-600 dark:text-gray-300 max-w-30 truncate"
                                    title={item.natureOfTransaction}
                                  >
                                    {item.natureOfTransaction}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-200">
                                    {item.grossAmount.toLocaleString("en-NG", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">
                                    {(item.whtRate * 100).toFixed(1)}%
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">
                                    {item.whtAmount.toLocaleString("en-NG", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-white">
                                    {item.netAmount.toLocaleString("en-NG", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                        item.taxAuthority === "NRS"
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                      }`}
                                    >
                                      {item.taxAuthority}
                                    </span>
                                  </td>
                                </tr>
                              ),
                            )}
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
                                {sch.totalGrossAmount.toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td />
                              <td className="px-4 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                                {sch.totalWhtAmount.toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td />
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
                Generate WHT Schedule
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
                Generate a WHT schedule for a billing period. Only received
                invoices with WHT applicable and not yet included in a previous
                schedule will be captured.
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
                    A WHT schedule already exists for{" "}
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
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || alreadyExists}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors min-w-20"
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
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
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
              <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
                Mark as Filed?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This will mark the WHT schedule as filed. This action cannot be
                undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setMarkFiledId(null)}
                disabled={markingFiled}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkFiled}
                disabled={markingFiled}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors min-w-20"
              >
                {markingFiled ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
