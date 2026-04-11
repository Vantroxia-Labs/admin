import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { analyticsV2Api, type AnalyticsV2Result } from "../../lib/api";
import { USE_MOCK, MOCK_ANALYTICS_V2 } from "../../lib/mockData";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000_000
    ? `₦${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000
      ? `₦${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `₦${(n / 1_000).toFixed(0)}K`
        : `₦${n.toLocaleString()}`;

const pct = (num: number, den: number) =>
  den === 0 ? "0%" : `${((num / den) * 100).toFixed(1)}%`;

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  change,
  color = "brand",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number;
  color?: "brand" | "green" | "amber" | "red" | "purple";
  icon: React.ReactNode;
}) {
  const ring: Record<string, string> = {
    brand:
      "bg-brand-50  dark:bg-brand-900/20  text-brand-600  dark:text-brand-400",
    green:
      "bg-green-50  dark:bg-green-900/20  text-green-600  dark:text-green-400",
    amber:
      "bg-amber-50  dark:bg-amber-900/20  text-amber-600  dark:text-amber-400",
    red: "bg-red-50    dark:bg-red-900/20    text-red-600    dark:text-red-400",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${ring[color]}`}
        >
          {icon}
        </div>
        {change !== undefined && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${change >= 0 ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}
          >
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
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

// ── Chart card wrapper ────────────────────────────────────────────────────────
function ChartCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {title}
      </h3>
      {sub && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-4">
          {sub}
        </p>
      )}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconRevenue = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const IconPurchase = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);
const IconVat = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
    />
  </svg>
);
const IconCredit = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);
const IconGap = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CHART_BASE: ApexOptions = {
  chart: {
    fontFamily: "Outfit, sans-serif",
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  dataLabels: { enabled: false },
  grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontSize: "11px", colors: "#9ca3af" } },
  },
  legend: {
    position: "top",
    fontFamily: "Outfit, sans-serif",
    fontSize: "12px",
    labels: { colors: "#6b7280" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [data, setData] = useState<Required<AnalyticsV2Result> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      setTimeout(() => {
        setData(MOCK_ANALYTICS_V2 as Required<AnalyticsV2Result>);
        setLoading(false);
      }, 300);
      return;
    }
    analyticsV2Api
      .getAll()
      .catch(() => null)
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const g = data?.generalDashboard;
  const vt = data?.vatTableDashboard;

  // ── Derived metrics ──────────────────────────────────────────────────────
  const totalOutputVat = g?.metrics.totalVATOnCustomerInvoices ?? 0;
  const totalInputVat = g?.metrics.totalVATOnVendorInvoices ?? 0;
  const netVatPayable = totalOutputVat - totalInputVat;
  const recoveryRate =
    totalOutputVat > 0 ? (totalInputVat / totalOutputVat) * 100 : 0;

  const totalSales =
    g?.salesAndPaymentPerMonth.reduce((s, d) => s + d.sales, 0) ?? 0;
  const totalPayments =
    g?.salesAndPaymentPerMonth.reduce((s, d) => s + d.payment, 0) ?? 0;
  const collectionGap = totalSales - totalPayments;

  const totalVatable =
    vt?.vatTableVsNonVATTableSalesAndPurchase.reduce(
      (s, d) => s + d.salesVatable,
      0,
    ) ?? 0;
  const totalNonVatable =
    vt?.vatTableVsNonVATTableSalesAndPurchase.reduce(
      (s, d) => s + d.salesNonVatable,
      0,
    ) ?? 0;

  const monthLabels = g?.salesVsPurchases.map((d) => d.name) ?? [];

  // ── Chart options ────────────────────────────────────────────────────────

  // 1. Sales vs Purchases — grouped bar
  const salesVsPurchasesOpts: ApexOptions = {
    ...CHART_BASE,
    chart: { ...CHART_BASE.chart, type: "bar" },
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 3 } },
    colors: ["#465FFF", "#22C55E"],
    xaxis: { ...CHART_BASE.xaxis, categories: monthLabels },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: "#9ca3af" },
        formatter: (v) => `₦${(v / 1_000_000).toFixed(0)}M`,
      },
    },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };
  const salesVsPurchasesSeries = [
    {
      name: "Revenue (Invoiced)",
      data: g?.salesVsPurchases.map((d) => d.salesAmount) ?? [],
    },
    {
      name: "Purchases (Received)",
      data: g?.salesVsPurchases.map((d) => d.purchasesAmount) ?? [],
    },
  ];

  // 2. Sales vs Payments — area (cash flow gap)
  const cashFlowOpts: ApexOptions = {
    ...CHART_BASE,
    chart: { ...CHART_BASE.chart, type: "area" },
    colors: ["#465FFF", "#22C55E"],
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.25, opacityTo: 0.03 },
    },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { ...CHART_BASE.xaxis, categories: monthLabels },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: "#9ca3af" },
        formatter: (v) => `₦${(v / 1_000_000).toFixed(0)}M`,
      },
    },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };
  const cashFlowSeries = [
    {
      name: "Revenue Invoiced",
      data: g?.salesAndPaymentPerMonth.map((d) => d.sales) ?? [],
    },
    {
      name: "Payment Collected",
      data: g?.salesAndPaymentPerMonth.map((d) => d.payment) ?? [],
    },
  ];

  // 3. Output vs Input VAT — line
  const vatTrendOpts: ApexOptions = {
    ...CHART_BASE,
    chart: { ...CHART_BASE.chart, type: "line" },
    colors: ["#F59E0B", "#8B5CF6"],
    stroke: { width: [2.5, 2.5], curve: "smooth" },
    markers: { size: 4 },
    xaxis: { ...CHART_BASE.xaxis, categories: monthLabels },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: "#9ca3af" },
        formatter: (v) => `₦${(v / 1_000).toFixed(0)}K`,
      },
    },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };
  const vatTrendSeries = [
    {
      name: "Output VAT (payable)",
      data: g?.vatTrendAnalysis.map((d) => d.outputVAT) ?? [],
    },
    {
      name: "Input VAT (credit)",
      data: g?.vatTrendAnalysis.map((d) => d.inputVAT) ?? [],
    },
  ];

  // 4+5 consolidated — VATable composition bars + Net VAT Payable line (combo)
  const netVatMonthly =
    g?.vatTrendAnalysis.map((d) => d.outputVAT - d.inputVAT) ?? [];
  const vatComboOpts: ApexOptions = {
    ...CHART_BASE,
    chart: { ...CHART_BASE.chart, type: "line" },
    stroke: { width: [0, 0, 0, 0, 2.5], curve: "smooth" },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 2 } },
    colors: ["#465FFF", "#93C5FD", "#22C55E", "#86EFAC", "#EF4444"],
    markers: { size: [0, 0, 0, 0, 4] },
    xaxis: { ...CHART_BASE.xaxis, categories: monthLabels },
    yaxis: [
      {
        seriesName: "Sales — VATable",
        labels: {
          style: { fontSize: "11px", colors: "#9ca3af" },
          formatter: (v) => `₦${(v / 1_000_000).toFixed(0)}M`,
        },
      },
      { seriesName: "Sales — Non-VATable", show: false },
      { seriesName: "Purchases — VATable", show: false },
      { seriesName: "Purchases — Non-VATable", show: false },
      {
        opposite: true,
        seriesName: "Net VAT Payable",
        labels: {
          style: { fontSize: "11px", colors: "#EF4444" },
          formatter: (v) => `₦${(v / 1_000).toFixed(0)}K`,
        },
      },
    ],
    tooltip: { shared: true, y: { formatter: (v) => fmt(v) } },
    legend: { position: "top", fontSize: "11px" },
  };
  const vatComboSeries = [
    {
      name: "Sales — VATable",
      type: "bar",
      data:
        vt?.vatTableVsNonVATTableSalesAndPurchase.map((d) => d.salesVatable) ??
        [],
    },
    {
      name: "Sales — Non-VATable",
      type: "bar",
      data:
        vt?.vatTableVsNonVATTableSalesAndPurchase.map(
          (d) => d.salesNonVatable,
        ) ?? [],
    },
    {
      name: "Purchases — VATable",
      type: "bar",
      data:
        vt?.vatTableVsNonVATTableSalesAndPurchase.map(
          (d) => d.purchaseVatable,
        ) ?? [],
    },
    {
      name: "Purchases — Non-VATable",
      type: "bar",
      data:
        vt?.vatTableVsNonVATTableSalesAndPurchase.map(
          (d) => d.purchaseNonVatable,
        ) ?? [],
    },
    {
      name: "Net VAT Payable",
      type: "line",
      data: netVatMonthly,
    },
  ];

  // 6. Revenue by region — horizontal bar
  const regionMap: Record<string, number> = {};
  g?.salesPerRegion?.forEach((d) => {
    regionMap[d.region] = (regionMap[d.region] ?? 0) + d.salesAmount;
  });
  const regionEntries = Object.entries(regionMap).sort((a, b) => b[1] - a[1]);
  const revenueByRegionOpts: ApexOptions = {
    ...CHART_BASE,
    chart: { ...CHART_BASE.chart, type: "bar" },
    plotOptions: {
      bar: { horizontal: true, barHeight: "60%", borderRadius: 3 },
    },
    colors: ["#465FFF"],
    xaxis: {
      categories: regionEntries.map((r) => r[0]),
      labels: {
        style: { fontSize: "11px", colors: "#9ca3af" },
        formatter: (v) => `₦${(Number(v) / 1_000_000).toFixed(0)}M`,
      },
    },
    yaxis: {
      labels: { style: { fontSize: "11px", colors: "#9ca3af" } },
    },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };
  const revenueByRegionSeries = [
    { name: "Revenue", data: regionEntries.map((r) => r[1]) },
  ];

  // 7. Top customers — horizontal bar (from backend topParties)
  const topParties = g?.topParties ?? [];
  const topCustomersOpts: ApexOptions = {
    ...CHART_BASE,
    chart: { ...CHART_BASE.chart, type: "bar" },
    plotOptions: {
      bar: { horizontal: true, barHeight: "60%", borderRadius: 3 },
    },
    colors: ["#22C55E"],
    xaxis: {
      categories: topParties.map((p) => p.partyName),
      labels: {
        style: { fontSize: "11px", colors: "#9ca3af" },
        formatter: (v) => `₦${(Number(v) / 1_000_000).toFixed(0)}M`,
      },
    },
    yaxis: {
      labels: { style: { fontSize: "11px", colors: "#9ca3af" } },
    },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };
  const topCustomersSeries = [
    { name: "Revenue", data: topParties.map((p) => p.totalSalesAmount) },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  const periodStart = monthLabels[0] ?? "";
  const periodEnd = monthLabels[monthLabels.length - 1] ?? "";

  return (
    <>
      <PageMeta
        title="Analytics | Aegis EInvoicing Portal"
        description="Financial analytics and VAT intelligence"
      />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Financial Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          12-month rolling view · {periodStart}
          {periodEnd ? ` – ${periodEnd}` : ""}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !g || !vt ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
          Analytics data unavailable. Please refresh the page.
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Section 1: Executive KPIs ──────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiCard
              label="Net Revenue"
              value={fmt(g.metrics.totalCustomerInvoicesAmount)}
              sub={`${g.metrics.totalCustomerInvoicesCount.toLocaleString()} sales invoices`}
              change={g.metrics.totalInvoiceValuePercentageChange}
              color="brand"
              icon={<IconRevenue />}
            />
            <KpiCard
              label="Total Purchases"
              value={fmt(g.metrics.totalVendorInvoicesAmount)}
              sub={`${g.metrics.totalVendorInvoicesCount.toLocaleString()} vendor invoices`}
              color="green"
              icon={<IconPurchase />}
            />
            <KpiCard
              label="Net VAT Payable to NRS"
              value={fmt(netVatPayable)}
              sub="Output VAT − Input Tax Credit"
              color="amber"
              icon={<IconVat />}
            />
            <KpiCard
              label="Input Tax Credit"
              value={fmt(totalInputVat)}
              sub={`${recoveryRate.toFixed(1)}% recovery rate`}
              change={g.metrics.vatOnVendorPercentageChange}
              color="purple"
              icon={<IconCredit />}
            />
            <KpiCard
              label="AR Collection Gap"
              value={fmt(collectionGap)}
              sub={`${pct(collectionGap, totalSales)} of revenue outstanding`}
              color="red"
              icon={<IconGap />}
            />
          </div>

          {/* ── Section 2: Revenue & Cash Flow ─────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartCard
              title="Revenue vs Purchases — 12 Months"
              sub="Monthly sales invoiced compared against vendor purchases received"
            >
              <Chart
                options={salesVsPurchasesOpts}
                series={salesVsPurchasesSeries}
                type="bar"
                height={260}
              />
            </ChartCard>
            <ChartCard
              title="Revenue Invoiced vs Cash Collected"
              sub="The gap between the two lines represents your accounts receivable exposure"
            >
              <Chart
                options={cashFlowOpts}
                series={cashFlowSeries}
                type="area"
                height={260}
              />
            </ChartCard>
          </div>

          {/* ── Section 3: VAT Intelligence ────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <ChartCard
                title="Output VAT vs Input Tax Credit — Monthly Trend"
                sub="Output VAT is your NRS liability; Input VAT is your claimable credit on purchases"
              >
                <Chart
                  options={vatTrendOpts}
                  series={vatTrendSeries}
                  type="line"
                  height={260}
                />
              </ChartCard>
            </div>

            {/* VAT Net Position Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  VAT Net Position
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
                  12-month cumulative
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Output VAT (Sales)
                    </span>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {fmt(totalOutputVat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Input Tax Credit (Purchases)
                    </span>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      ({fmt(totalInputVat)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Net VAT Payable to NRS
                    </span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {fmt(netVatPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      VAT Recovery Rate
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {recoveryRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      VATable Revenue
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {fmt(totalVatable)} (
                      {pct(totalVatable, totalVatable + totalNonVatable)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Exempt / Zero-Rated
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {fmt(totalNonVatable)} (
                      {pct(totalNonVatable, totalVatable + totalNonVatable)})
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  NRS Remittance Reminder
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  VAT returns are due by the 21st of the month following the
                  taxable period. Ensure output VAT net of input credits is
                  remitted promptly to avoid penalties.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 4+5: VAT Composition & Net Payable ─────────────── */}
          <ChartCard
            title="VATable vs Non-VATable Transactions & Net VAT Payable"
            sub="Bars show VATable/exempt split across sales and purchases; red line shows net VAT owed to NRS each month"
          >
            <Chart
              options={vatComboOpts}
              series={vatComboSeries}
              type="line"
              height={280}
            />
          </ChartCard>

          {/* ── Section 5: Geographic & Customer Exposure ───────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartCard
              title="Revenue by State"
              sub="Revenue concentration by customer state — highlights geographic dependency and expansion opportunities"
            >
              {regionEntries.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
                  No state data
                </div>
              ) : (
                <Chart
                  options={revenueByRegionOpts}
                  series={revenueByRegionSeries}
                  type="bar"
                  height={260}
                />
              )}
            </ChartCard>

            {/* ── Top Customers ───────────────────────────────────────── */}
            <ChartCard
              title="Top 10 Customers by Revenue"
              sub="Customer concentration risk — heavy reliance on a few buyers increases receivables and credit exposure"
            >
              {topParties.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
                  No customer data
                </div>
              ) : (
                <Chart
                  options={topCustomersOpts}
                  series={topCustomersSeries}
                  type="bar"
                  height={260}
                />
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </>
  );
}
