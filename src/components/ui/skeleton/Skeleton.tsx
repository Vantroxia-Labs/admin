// Reusable skeleton loading components — pulse animation on gray blocks

/** Base skeleton block */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

/**
 * Table skeleton — renders tbody rows with pulsing cells.
 * Pass `colWidths` as Tailwind width classes per column,
 * or `cols` for a uniform count (all cells will be full-width).
 */
export function SkeletonTableRows({
  rows = 8,
  colWidths,
  cols,
}: {
  rows?: number;
  colWidths?: string[];
  cols?: number;
}) {
  const widths = colWidths ?? Array(cols ?? 4).fill("w-full");

  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-gray-100 dark:border-gray-700">
          {widths.map((w, ci) => (
            <td key={ci} className="px-4 py-3">
              <div
                className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${w}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stat card skeleton — matches the StatCard layout in Dashboard/Home.tsx */
export function SkeletonStatCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-12 h-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** Chart card skeleton — rectangular placeholder the same size as a donut chart */
export function SkeletonChart({ height = 220 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <Skeleton className="h-4 w-36 mb-4" />
      <div
        className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl"
        style={{ height }}
      />
    </div>
  );
}

/** Mini recent-invoices table skeleton (compact row height) */
export function SkeletonMiniTableRows({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr
          key={ri}
          className="border-b border-gray-50 dark:border-gray-700/50"
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="py-2.5 pr-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Three pulsing dots — inline replacement for SVG spinners inside action buttons.
 * Renders as an inline-flex element so it sits naturally beside button text.
 */
export function SkeletonDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
    </span>
  );
}

/**
 * Tiny inline pulse dot — replaces small inline spinners like TIN validation indicators.
 */
export function SkeletonDot({ label = "Loading..." }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <span className="inline-block w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
      {label}
    </span>
  );
}

/**
 * Full-screen app loading skeleton — used by PrivateRoute while the auth
 * state is being resolved on first load.
 */
export function SkeletonAppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-5 w-64">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <div className="w-full space-y-3">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
          <Skeleton className="h-3 w-3/5 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Payment-callback verifying skeleton — shown while verifying a Paystack
 * callback before the success / failure state is known.
 */
export function SkeletonPaymentCallback() {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Skeleton className="w-16 h-16 rounded-full" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

/**
 * Invoice detail full-page skeleton — mirrors the three-column layout of
 * InvoiceDetail.tsx while invoice data is being fetched.
 */
export function SkeletonInvoiceDetail() {
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: details + line items */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invoice info card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ))}
            </div>
          </div>

          {/* Line items card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <Skeleton className="h-4 w-24" />
            </div>
            <table className="w-full">
              <tbody>
                <SkeletonTableRows
                  rows={3}
                  colWidths={["w-2/5", "w-[8%]", "w-1/6", "w-1/6", "w-1/6"]}
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: QR + financials + actions */}
        <div className="space-y-5">
          {/* QR code card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="w-full h-48 rounded-lg" />
            <Skeleton className="h-3 w-40 mx-auto" />
          </div>

          {/* Financial summary card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <Skeleton className="h-4 w-36 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>

          {/* Actions card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <Skeleton className="h-4 w-16 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Create-invoice form skeleton — mirrors the multi-card form layout while
 * lookup data (parties, items, tax categories, etc.) is being fetched.
 */
export function SkeletonCreateInvoice() {
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="mb-6">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-6 w-44 mb-1" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Invoice details card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Line items card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Skeleton className="col-span-4 h-10 rounded-lg" />
              <Skeleton className="col-span-2 h-10 rounded-lg" />
              <Skeleton className="col-span-1 h-10 rounded-lg" />
              <Skeleton className="col-span-3 h-10 rounded-lg" />
              <Skeleton className="col-span-1 h-10 rounded-lg" />
              <Skeleton className="col-span-1 h-10 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Totals card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="max-w-xs ml-auto space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Settings page skeleton — mirrors the tabbed section layout of Settings.tsx
 * while the user's business profile is being loaded.
 */
export function SkeletonSettingsPage() {
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="mb-6">
        <Skeleton className="h-6 w-24 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-1 mb-6">
        {[20, 28, 24].map((w, i) => (
          <Skeleton key={i} className={`h-9 w-${w} rounded-lg`} />
        ))}
      </div>

      {/* Three skeleton section cards */}
      {Array.from({ length: 3 }).map((_, si) => (
        <div
          key={si}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5"
        >
          <div className="mb-5 space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, fi) => (
              <div key={fi} className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-5">
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Inline section skeleton — replaces small inline spinners inside Settings
 * sections (APP provider, approval rule, API/SFTP credentials, etc.)
 */
export function SkeletonInlineSection() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
    </div>
  );
}

/**
 * Schedule list skeleton — used in Schedules.tsx and WhtSchedules.tsx while
 * the list of VAT / WHT schedules is loading.
 */
export function SkeletonScheduleList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-52" />
            </div>
            <div className="flex gap-5 shrink-0">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="text-center space-y-1.5">
                  <Skeleton className="h-3 w-16 mx-auto" />
                  <Skeleton className="h-4 w-12 mx-auto" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Subscription plan cards skeleton — used in SignUpForm and BusinessList
 * while the list of plans is being fetched.
 */
export function SkeletonPlanCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 space-y-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * User edit side-panel skeleton — used in UserList.tsx while user details
 * are loading in the slide-in edit panel.
 */
export function SkeletonSidePanel() {
  return (
    <div className="space-y-5 px-5 py-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
    </div>
  );
}
