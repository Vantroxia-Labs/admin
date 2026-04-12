import { useEffect, useState } from "react";
import { Link } from "react-router";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import {
  businessApi,
  businessesApi,
  invoiceApi,
  type DashboardStats,
  type InvoiceSummary,
  type BusinessSummary,
} from "../../lib/api";
import {
  useAuth,
  useIsAegis,
  useSubscriptionTier,
  useCanCreateInvoice,
} from "../../context/AuthContext";
import {
  USE_MOCK,
  MOCK_DASHBOARD_STATS,
  MOCK_INVOICES,
  MOCK_BUSINESSES,
} from "../../lib/mockData";

// ─── Reusable Stat Card ──────────────────────────────────────────────────────
// ─── Date Range Filter ───────────────────────────────────────────────────────
function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonthStart = today.slice(0, 8) + "01";

  const presets = [
    { label: "This Month", from: thisMonthStart, to: today },
    {
      label: "Last 3 Months",
      from: new Date(new Date().setMonth(new Date().getMonth() - 3))
        .toISOString()
        .slice(0, 10),
      to: today,
    },
    {
      label: "This Year",
      from: today.slice(0, 5) + "01-01",
      to: today,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          From
        </label>
        <input
          type="date"
          value={from}
          max={to || today}
          onChange={(e) => onChange(e.target.value, to)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          To
        </label>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => onChange(from, e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.from, p.to)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              from === p.from && to === p.to
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {p.label}
          </button>
        ))}
        {(from || to) && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  color = "brand",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "brand" | "green" | "amber" | "red" | "blue";
}) {
  const ring = {
    brand:
      "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    amber:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${ring[color]}`}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend.value >= 0 ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {label}
        </p>
        {sub && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const InvoiceIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const CheckIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const MoneyIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);
const BusinessIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);
const ReceiveIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);
const VatIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
    />
  </svg>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  PENDING_APPROVAL:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUBMITTED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  TRANSMITTED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  SUBMITTED: "Submitted",
  TRANSMITTED: "Transmitted",
  REJECTED: "Rejected",
};

// ─── Donut Chart helper ───────────────────────────────────────────────────────
function DonutChart({
  series,
  labels,
  colors,
  title,
  total,
}: {
  series: number[];
  labels: string[];
  colors: string[];
  title: string;
  total?: string;
}) {
  const options: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
      sparkline: { enabled: false },
    },
    colors,
    labels,
    legend: {
      show: true,
      position: "bottom",
      fontFamily: "Outfit, sans-serif",
      fontSize: "12px",
      labels: { colors: "#6b7280" },
    },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: !!total,
              label: "Total",
              formatter: () => total ?? "",
              color: "#374151",
              fontSize: "16px",
              fontWeight: "600",
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (val: number) => val.toLocaleString() } },
    stroke: { width: 0 },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        {title}
      </h3>
      {series.every((s) => s === 0) ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
          No data yet
        </div>
      ) : (
        <Chart options={options} series={series} type="donut" height={220} />
      )}
    </div>
  );
}

// ─── Horizontal progress bar (subscription plans for Aegis) ──────────────────
function PlanBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span>
          {value.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Recent invoices mini-table ───────────────────────────────────────────────
function RecentInvoicesTable({ invoices }: { invoices: InvoiceSummary[] }) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
        No invoices yet.{" "}
        <Link
          to="/invoices/create"
          className="text-brand-500 hover:text-brand-600"
        >
          Create one →
        </Link>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="pb-2 text-left font-medium text-gray-400 dark:text-gray-500 text-xs">
              Invoice
            </th>
            <th className="pb-2 text-left font-medium text-gray-400 dark:text-gray-500 text-xs">
              Party
            </th>
            <th className="pb-2 text-right font-medium text-gray-400 dark:text-gray-500 text-xs">
              Amount
            </th>
            <th className="pb-2 text-left font-medium text-gray-400 dark:text-gray-500 text-xs pl-3">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td className="py-2.5">
                <Link
                  to={`/invoices/${inv.id}`}
                  className="font-medium text-brand-500 hover:text-brand-600 text-xs"
                >
                  {inv.invoiceCode}
                </Link>
                <p className="text-xs text-gray-400">
                  {new Date(inv.issueDate).toLocaleDateString("en-NG", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </td>
              <td className="py-2.5 text-gray-600 dark:text-gray-300 text-xs">
                {inv.partyName ?? "—"}
              </td>
              <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-white text-xs">
                ₦{inv.totalAmount.toLocaleString()}
              </td>
              <td className="py-2.5 pl-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}
                >
                  {STATUS_LABELS[inv.status] ?? inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const isAegis = useIsAegis();
  const tier = useSubscriptionTier();
  const canCreate = useCanCreateInvoice();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceSummary[]>([]);
  const [recentBusinesses, setRecentBusinesses] = useState<BusinessSummary[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = () => {
    setExporting(true);
    import("../../lib/exportPdf").then(({ exportElementToPdf }) => {
      exportElementToPdf(
        "dashboard-print-area",
        `Aegis Dashboard ${new Date().toLocaleDateString("en-NG")}`,
      );
      setTimeout(() => setExporting(false), 1000);
    });
  };

  const _today = new Date().toISOString().slice(0, 10);
  const _twelveMonthsAgo = new Date(
    new Date().setFullYear(new Date().getFullYear() - 1),
  )
    .toISOString()
    .slice(0, 10);
  const [dateFrom, setDateFrom] = useState(_twelveMonthsAgo);
  const [dateTo, setDateTo] = useState(_today);

  useEffect(() => {
    if (USE_MOCK) {
      const all = MOCK_INVOICES as InvoiceSummary[];
      const invs =
        dateFrom || dateTo
          ? all.filter((inv) => {
              if (dateFrom && inv.issueDate < dateFrom) return false;
              if (dateTo && inv.issueDate > dateTo) return false;
              return true;
            })
          : all;
      const curMonth = new Date().toISOString().slice(0, 7);
      const inMonth = invs.filter((i) => i.issueDate?.startsWith(curMonth));
      setStats({
        ...MOCK_DASHBOARD_STATS,
        totalInvoices: invs.length,
        totalInvoicesThisMonth: inMonth.length,
        totalInvoiceValue: invs.reduce((s, i) => s + i.totalAmount, 0),
        totalInvoiceValueThisMonth: inMonth.reduce(
          (s, i) => s + i.totalAmount,
          0,
        ),
        totalVatCollected: invs.reduce(
          (s, i) => s + (i.totalTaxAmount ?? 0),
          0,
        ),
        totalVatThisMonth: inMonth.reduce(
          (s, i) => s + (i.totalTaxAmount ?? 0),
          0,
        ),
        draftInvoices: invs.filter((i) => i.status === "DRAFT").length,
        pendingApprovalInvoices: invs.filter(
          (i) => i.status === "PENDING_APPROVAL",
        ).length,
        submittedToNRS: invs.filter((i) =>
          ["SUBMITTED", "TRANSMITTED"].includes(i.status),
        ).length,
        confirmedByNRS: invs.filter((i) => i.status === "TRANSMITTED").length,
        rejectedInvoices: invs.filter((i) => i.status === "REJECTED").length,
        totalIRNsGenerated: invs.filter((i) => !!i.irn).length,
        pendingIRNs: invs.filter((i) => i.status === "SUBMITTED").length,
        paidInvoices: invs.filter((i) => i.paymentStatus === "PAID").length,
        unpaidInvoices: invs.filter((i) => i.paymentStatus === "PENDING")
          .length,
        partiallyPaidInvoices: 0,
      });
      setRecentInvoices(invs.slice(0, 5));
      setRecentBusinesses(MOCK_BUSINESSES.slice(0, 5) as BusinessSummary[]);
      setLoading(false);
      return;
    }
    const statsPromise = businessApi.getDashboardStats().catch(() => null);
    const invoicesPromise = !isAegis
      ? invoiceApi
          .list({ page: 1, pageSize: 5 })
          .then((r) => r.items)
          .catch(() => [])
      : Promise.resolve([]);
    const businessesPromise = isAegis
      ? businessesApi
          .list({ page: 1, pageSize: 5 })
          .then((r) => r.items)
          .catch(() => [])
      : Promise.resolve([]);

    Promise.all([statsPromise, invoicesPromise, businessesPromise]).then(
      ([s, inv, biz]) => {
        setStats(s);
        setRecentInvoices(inv);
        setRecentBusinesses(biz);
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAegis, dateFrom, dateTo]);

  const displayName = user?.NRStName?.trim() || "there";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Dashboard | Aegis EInvoicing Portal"
        description="Aegis NRS e-invoicing dashboard"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAegis
              ? "Platform overview — all registered businesses"
              : `${tier === "SaaS" ? "Portal" : tier === "SFTP" ? "SFTP" : tier === "ApiOnly" ? "API" : ""} plan · NRS e-invoicing portal`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPdf}
            disabled={exporting || !stats}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
              </svg>
            )}
            Export PDF
          </button>
          {canCreate && !isAegis && (
            <Link
              to="/invoices/create"
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              + New Invoice
            </Link>
          )}
        </div>
      </div>

      {!stats && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 mb-6">
          Dashboard statistics unavailable. Please refresh the page.
        </div>
      )}

      <div id="dashboard-print-area">
      {/* ── AEGIS ADMIN VIEW ──────────────────────────────────────────────── */}
      {stats && isAegis && (
        <div className="space-y-6">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />

          {/* Platform Revenue Banner */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-100">
                Platform Revenue
              </p>
              <p className="text-3xl font-bold mt-1">
                ₦{stats.platformRevenueTotal.toLocaleString()}
              </p>
              <p className="text-sm text-brand-200 mt-0.5">
                ₦{stats.platformRevenueThisMonth.toLocaleString()} this month
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-xs font-medium bg-white/20 rounded-full px-3 py-1">
                Subscription fees &amp; platform charges
              </span>
              <span className="text-xs text-brand-200">
                {stats.saaSBusinesses +
                  stats.sftpPlanBusinesses +
                  stats.apiPlanBusinesses}{" "}
                active paying businesses
              </span>
            </div>
          </div>

          {/* Top KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total Businesses"
              value={stats.totalBusinesses}
              sub={`${stats.activeBusinesses} active`}
              icon={<BusinessIcon />}
              color="brand"
            />
            <StatCard
              label="Total Invoices"
              value={stats.totalInvoices}
              sub={`${stats.totalInvoicesThisMonth} this month`}
              icon={<InvoiceIcon />}
              color="blue"
            />
            <StatCard
              label="Invoice Value"
              value={`₦${(stats.totalInvoiceValue / 1_000_000).toFixed(1)}M`}
              sub={`₦${(stats.totalInvoiceValueThisMonth / 1_000_000).toFixed(1)}M this month`}
              icon={<MoneyIcon />}
              color="green"
            />
            <StatCard
              label="VAT Collected"
              value={`₦${(stats.totalVatCollected / 1_000_000).toFixed(1)}M`}
              sub={`₦${(stats.totalVatThisMonth / 1_000_000).toFixed(1)}M this month`}
              icon={<VatIcon />}
              color="amber"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Invoice Status Donut */}
            <DonutChart
              title="Invoice Status Breakdown"
              series={[
                stats.draftInvoices,
                stats.pendingApprovalInvoices,
                stats.submittedToNRS,
                stats.confirmedByNRS,
                stats.rejectedInvoices,
              ]}
              labels={[
                "Draft",
                "Pending Approval",
                "Submitted to NRS",
                "Confirmed by NRS",
                "Rejected",
              ]}
              colors={["#9ca3af", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"]}
              total={stats.totalInvoices.toLocaleString()}
            />

            {/* Subscription plan distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Plan Distribution
              </h3>
              <div className="space-y-4 mt-6">
                <PlanBar
                  label="Portal (SaaS)"
                  value={stats.saaSBusinesses}
                  total={stats.totalBusinesses}
                  color="#465fff"
                />
                <PlanBar
                  label="SFTP Plan"
                  value={stats.sftpPlanBusinesses}
                  total={stats.totalBusinesses}
                  color="#10b981"
                />
                <PlanBar
                  label="API Plan"
                  value={stats.apiPlanBusinesses}
                  total={stats.totalBusinesses}
                  color="#f59e0b"
                />
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingOnboardings}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Pending Onboarding
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {stats.suspendedBusinesses}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Suspended
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Confirmed by NRS"
              value={stats.confirmedByNRS}
              icon={<CheckIcon />}
              color="green"
            />
            <StatCard
              label="IRNs Generated"
              value={stats.totalIRNsGenerated}
              sub={`${stats.pendingIRNs} pending`}
              icon={<InvoiceIcon />}
              color="blue"
            />
            <StatCard
              label="Received Invoices"
              value={stats.totalReceivedInvoices}
              icon={<ReceiveIcon />}
              color="brand"
            />
            <StatCard
              label="Pending Registrations"
              value={stats.pendingRegistrations}
              icon={<BusinessIcon />}
              color="amber"
            />
          </div>

          {/* Recent Businesses */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Recent Businesses
              </h3>
              <Link
                to="/businesses"
                className="text-xs font-medium text-brand-500 hover:text-brand-600"
              >
                View all →
              </Link>
            </div>
            {recentBusinesses.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                No businesses yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Business
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        TIN
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Plan
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentBusinesses.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {b.name}
                          </p>
                          {b.contactEmail && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {b.contactEmail}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {b.tin ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          {b.subscriptionTier && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                b.subscriptionTier === "SaaS"
                                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                                  : b.subscriptionTier === "SFTP"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                              }`}
                            >
                              {b.subscriptionTier}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              b.status === "Active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : b.status === "Suspended"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENT ADMIN / USER VIEW ──────────────────────────────────────── */}
      {stats && !isAegis && (
        <div className="space-y-6">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />

          {/* Top KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total Invoices"
              value={stats.totalInvoices}
              sub={`${stats.totalInvoicesThisMonth} this month`}
              icon={<InvoiceIcon />}
              color="brand"
            />
            <StatCard
              label="Confirmed by NRS"
              value={stats.confirmedByNRS}
              icon={<CheckIcon />}
              color="green"
            />
            <StatCard
              label="Invoice Value"
              value={`₦${(stats.totalInvoiceValue / 1_000_000).toFixed(1)}M`}
              sub={`₦${(stats.totalInvoiceValueThisMonth / 1_000_000).toFixed(1)}M this month`}
              icon={<MoneyIcon />}
              color="blue"
            />
            <StatCard
              label="VAT Collected"
              value={`₦${(stats.totalVatCollected / 1_000_000).toFixed(1)}M`}
              icon={<VatIcon />}
              color="amber"
            />
          </div>

          {/* Charts + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Invoice Status */}
            <DonutChart
              title="Invoice Status"
              series={[
                stats.draftInvoices,
                stats.pendingApprovalInvoices,
                stats.submittedToNRS,
                stats.confirmedByNRS,
                stats.rejectedInvoices,
              ]}
              labels={[
                "Draft",
                "Pending Approval",
                "Submitted",
                "Confirmed",
                "Rejected",
              ]}
              colors={["#9ca3af", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"]}
              total={stats.totalInvoices.toLocaleString()}
            />

            {/* Payment Status */}
            <DonutChart
              title="Payment Status"
              series={[
                stats.paidInvoices,
                stats.unpaidInvoices,
                stats.partiallyPaidInvoices,
              ]}
              labels={["Paid", "Pending", "Rejected"]}
              colors={["#10b981", "#f59e0b", "#ef4444"]}
              total={stats.totalInvoices.toLocaleString()}
            />

            {/* Key numbers */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Summary
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Submitted to NRS",
                    value: stats.submittedToNRS,
                    color: "#8b5cf6",
                  },
                  {
                    label: "IRNs Generated",
                    value: stats.totalIRNsGenerated,
                    color: "#465fff",
                  },
                  {
                    label: "Pending Approval",
                    value: stats.pendingApprovalInvoices,
                    color: "#f59e0b",
                  },
                  {
                    label: "Received Invoices",
                    value: stats.totalReceivedInvoices,
                    color: "#10b981",
                  },
                  {
                    label: "Rejected",
                    value: stats.rejectedInvoices,
                    color: "#ef4444",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                <Link
                  to="/invoices"
                  className="flex-1 text-center text-xs font-medium text-brand-500 hover:text-brand-600 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  All Invoices
                </Link>
                <Link
                  to="/received-invoices"
                  className="flex-1 text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Received
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Recent Invoices
              </h3>
              <Link
                to="/invoices"
                className="text-xs text-brand-500 hover:text-brand-600 font-medium"
              >
                View all →
              </Link>
            </div>
            <RecentInvoicesTable invoices={recentInvoices} />
          </div>
        </div>
      )}
      </div>{/* end #dashboard-print-area */}
    </>
  );
}
