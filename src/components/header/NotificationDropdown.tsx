import { useState } from "react";
import { useNavigate } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useIsAegis, useIsAdmin } from "../../context/AuthContext";

// ── Notification types ────────────────────────────────────────────────────────
type NotifType =
  | "invoice_raised"
  | "invoice_approved"
  | "invoice_transmitted"
  | "invoice_rejected"
  | "plan_expiry"
  | "new_business"
  | "rule_triggered";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  aegisOnly?: boolean;
  adminOnly?: boolean;
}

// ── Mock notifications ────────────────────────────────────────────────────────
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n-001",
    type: "rule_triggered",
    title: "Approval rule triggered",
    body: "Invoice INV-2026-0098 raised by Acme Engineering Ltd exceeds ₦2,000,000 — requires admin approval.",
    time: "2 min ago",
    read: false,
  },
  {
    id: "n-002",
    type: "invoice_approved",
    title: "Invoice approved",
    body: "Invoice INV-2026-0095 was approved by Chidi Okonkwo and submitted to NRS.",
    time: "18 min ago",
    read: false,
    adminOnly: true,
  },
  {
    id: "n-003",
    type: "plan_expiry",
    title: "Subscription expiring soon",
    body: "Your SaaS Portal plan expires in 7 days (19 Apr 2026). Renew to avoid service interruption.",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "n-004",
    type: "invoice_transmitted",
    title: "Invoice transmitted to NRS",
    body: "Invoice INV-2026-0091 was successfully transmitted to NRS. IRN FIR20260091ACME0000091 generated.",
    time: "3 hrs ago",
    read: true,
  },
  {
    id: "n-005",
    type: "invoice_rejected",
    title: "Invoice rejected by NRS",
    body: "Invoice INV-2026-0088 rejected by NRS. Reason: TIN mismatch on line item 3. Please review and resubmit.",
    time: "5 hrs ago",
    read: true,
  },
  {
    id: "n-006",
    type: "new_business",
    title: "New business registered",
    body: "Tech Innovations Ltd (TIN: 20481637-0001) completed onboarding and is pending NRS credential review.",
    time: "2 hrs ago",
    read: false,
    aegisOnly: true,
  },
  {
    id: "n-007",
    type: "plan_expiry",
    title: "Business subscription expiring",
    body: "Acme Engineering Ltd's SaaS plan expires in 3 days. Consider reaching out to renew.",
    time: "4 hrs ago",
    read: true,
    aegisOnly: true,
  },
  {
    id: "n-008",
    type: "invoice_raised",
    title: "New invoice raised",
    body: "Invoice INV-2026-0097 raised for Dangote Industries Ltd — ₦3,450,000.",
    time: "Yesterday",
    read: true,
    adminOnly: true,
  },
];

// ── Type-based icon (no user images) ─────────────────────────────────────────
function NotifIcon({ type }: { type: NotifType }) {
  const base =
    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0";
  const styles: Record<NotifType, string> = {
    invoice_raised:
      "bg-brand-50  dark:bg-brand-900/20  text-brand-600  dark:text-brand-400",
    invoice_approved:
      "bg-green-50  dark:bg-green-900/20  text-green-600  dark:text-green-400",
    invoice_transmitted:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    invoice_rejected:
      "bg-red-50    dark:bg-red-900/20    text-red-600    dark:text-red-400",
    plan_expiry:
      "bg-amber-50  dark:bg-amber-900/20  text-amber-600  dark:text-amber-400",
    new_business:
      "bg-blue-50   dark:bg-blue-900/20   text-blue-600   dark:text-blue-400",
    rule_triggered:
      "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  };
  const icons: Record<NotifType, React.ReactNode> = {
    invoice_raised: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    invoice_approved: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    invoice_transmitted: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    invoice_rejected: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    plan_expiry: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    new_business: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    rule_triggered: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  };
  return <div className={`${base} ${styles[type]}`}>{icons[type]}</div>;
}

// ── Main dropdown ─────────────────────────────────────────────────────────────
// -- Navigation destinations per notification type
const NOTIF_ROUTES: Record<NotifType, string> = {
  invoice_raised: "/invoices",
  invoice_approved: "/invoices",
  invoice_transmitted: "/invoices",
  invoice_rejected: "/invoices",
  rule_triggered: "/invoices",
  plan_expiry: "/settings",
  new_business: "/businesses",
};
export default function NotificationDropdown() {
  const isAegis = useIsAegis();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const visible = items.filter((n) => {
    if (n.aegisOnly && !isAegis) return false;
    if (n.adminOnly && !isAdmin && !isAegis) return false;
    return true;
  });

  const unreadCount = visible.filter((n) => !n.read).length;

  const markRead = (id: string) =>
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => setIsOpen((o) => !o)}
      >
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-400 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute -right-[240px] mt-[17px] flex w-[360px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[380px] lg:right-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h5 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Notifications
            </h5>
            {unreadCount > 0 && (
              <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <ul className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar gap-0.5">
          {visible.length === 0 ? (
            <li className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                You&apos;re all caught up!
              </p>
            </li>
          ) : (
            visible.map((n) => (
              <li key={n.id}>
                <DropdownItem
                  onItemClick={() => {
                    markRead(n.id);
                    setIsOpen(false);
                    navigate(NOTIF_ROUTES[n.type]);
                  }}
                  className={`flex gap-3 rounded-xl px-3 py-3 transition-colors cursor-pointer ${
                    !n.read
                      ? "bg-orange-50/60 dark:bg-orange-900/10 hover:bg-orange-100/60 dark:hover:bg-orange-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-orange-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {n.time}
                    </p>
                  </div>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        {/* Footer */}
        {visible.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => { setIsOpen(false); navigate("/invoices"); }}
              className="block w-full px-4 py-2 text-sm font-medium text-center text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              View all notifications
            </button>
          </div>
        )}
      </Dropdown>
    </div>
  );
}
