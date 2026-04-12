import { useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import NotificationDropdown from "../components/header/NotificationDropdown";
import UserDropdown from "../components/header/UserDropdown";
import {
  useIsAegis,
  useIsAdmin,
  useCanCreateInvoice,
  useAuth,
} from "../context/AuthContext";
import {
  appProviderApi,
  type AppEnvironmentMode,
  type AppAdapterOption,
} from "../lib/api";
import {
  USE_MOCK,
  MOCK_ADAPTER_OPTIONS,
  MOCK_BUSINESS_APP_SETTINGS,
} from "../lib/mockData";

// ── Warning dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4">
          <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="#d97706"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {title}
            </p>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {body}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 pb-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs rounded-lg text-white font-medium transition-colors ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── APP provider + environment switcher (client users only) ──────────────────
function AppEnvSwitcher() {
  const isAegis = useIsAegis();
  const { user } = useAuth();
  const [adapters, setAdapters] = useState<AppAdapterOption[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [envMode, setEnvMode] = useState<AppEnvironmentMode>(1);
  const [dropOpen, setDropOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Pending action waiting for confirmation
  const [pendingAdapter, setPendingAdapter] = useState<string | null>(null);
  const [pendingEnvToggle, setPendingEnvToggle] = useState(false);

  useEffect(() => {
    if (isAegis || !user?.businessId) return;

    if (USE_MOCK) {
      setAdapters(MOCK_ADAPTER_OPTIONS);
      setActiveKey(MOCK_BUSINESS_APP_SETTINGS.activeAdapterKey);
      setEnvMode(MOCK_BUSINESS_APP_SETTINGS.environmentMode);
      return;
    }

    appProviderApi
      .getAdapterOptions()
      .then(setAdapters)
      .catch(() => {});
    appProviderApi
      .getBusinessSettings(user.businessId)
      .then((s) => {
        setActiveKey(s.activeAdapterKey);
        setEnvMode(s.environmentMode);
      })
      .catch(() => {});
  }, [isAegis, user?.businessId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (isAegis || !user?.businessId) return null;

  const activeAdapter = adapters.find((a) => a.adapterKey === activeKey);
  const isTest = envMode === 1;

  // Step 1: user clicks an adapter → show warning first
  const requestAdapterChange = (key: string) => {
    setDropOpen(false);
    if (key === activeKey) return;
    setPendingAdapter(key);
  };

  // Step 2: confirmed → apply
  const confirmAdapterChange = async () => {
    const key = pendingAdapter!;
    setPendingAdapter(null);
    const prev = activeKey;
    setActiveKey(key);
    if (!USE_MOCK) {
      setSaving(true);
      try {
        await appProviderApi.setBusinessProvider(user.businessId!, key);
      } catch {
        setActiveKey(prev);
      } finally {
        setSaving(false);
      }
    }
  };

  // Step 1: user clicks env toggle → show warning first
  const requestEnvToggle = () => {
    setPendingEnvToggle(true);
  };

  // Step 2: confirmed → apply
  const confirmEnvToggle = async () => {
    setPendingEnvToggle(false);
    const next: AppEnvironmentMode = isTest ? 2 : 1;
    const prev = envMode;
    setEnvMode(next);
    if (!USE_MOCK) {
      setSaving(true);
      try {
        await appProviderApi.setBusinessEnvironment(user.businessId!, next);
      } catch {
        setEnvMode(prev);
      } finally {
        setSaving(false);
      }
    }
  };

  const pendingAdapterName = adapters.find(
    (a) => a.adapterKey === pendingAdapter,
  )?.displayName;

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* APP provider selector */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setDropOpen((o) => !o)}
            disabled={saving}
            title="Select Access Point Provider"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-400 dark:text-gray-500"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{activeAdapter?.displayName ?? "Select APP"}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform ${dropOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {dropOpen && adapters.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-999999">
              {adapters.map((a) => (
                <button
                  key={a.adapterKey}
                  onClick={() => requestAdapterChange(a.adapterKey)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    a.adapterKey === activeKey
                      ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {a.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sandbox / Production toggle */}
        <button
          onClick={requestEnvToggle}
          disabled={saving}
          title={
            isTest ? "Switch to Production mode" : "Switch to Sandbox mode"
          }
          className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
            isTest
              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
          }`}
        >
          {isTest ? "Sandbox" : "Live"}
        </button>
      </div>

      {/* APP provider change warning */}
      {pendingAdapter !== null && (
        <ConfirmDialog
          title="Change Access Point Provider?"
          body={
            <>
              You are switching from{" "}
              <strong>
                {activeAdapter?.displayName ?? "your current APP"}
              </strong>{" "}
              to <strong>{pendingAdapterName}</strong>.
              <br />
              <br />
              You{" "}
              <strong>
                must also update your Access Point Provider on the NRS portal
              </strong>{" "}
              to match this selection, otherwise invoice transmissions will
              fail.
            </>
          }
          confirmLabel={`Switch to ${pendingAdapterName}`}
          confirmClassName="bg-brand-500 hover:bg-brand-600"
          onConfirm={confirmAdapterChange}
          onCancel={() => setPendingAdapter(null)}
        />
      )}

      {/* Environment mode change warning */}
      {pendingEnvToggle && (
        <ConfirmDialog
          title={
            isTest
              ? "Switch to Production (Live) mode?"
              : "Switch to Sandbox mode?"
          }
          body={
            isTest ? (
              <>
                You are switching to <strong>Production (Live)</strong> mode.
                Real invoices will be transmitted to NRS and will count as
                official submissions.
                <br />
                <br />
                If you have not already done so, ensure the following on the{" "}
                <strong>NRS portal</strong> are set to your{" "}
                <strong>Production</strong> values:
                <ul className="mt-2 space-y-1 list-none">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>
                      <strong>API Key</strong> — use your Production API key,
                      not the sandbox one
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>
                      <strong>Client Secret</strong> — production and sandbox
                      secrets are different
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>
                      <strong>QR Configuration</strong> — the QR endpoint and
                      signing keys differ between environments
                    </span>
                  </li>
                </ul>
                <br />
                Transmissions will fail if any of these remain set to sandbox
                values.
              </>
            ) : (
              <>
                You are switching to <strong>Sandbox</strong> mode. Invoices
                will only be sent to the FIRS test environment and will{" "}
                <strong>not</strong> count as valid submissions.
                <br />
                <br />
                If you have not already done so, ensure the following on the{" "}
                <strong>NRS portal</strong> are set to your{" "}
                <strong>Sandbox</strong> values:
                <ul className="mt-2 space-y-1 list-none">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>
                      <strong>API Key</strong> — use your Sandbox API key
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>
                      <strong>Client Secret</strong> — switch to the sandbox
                      client secret
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>
                      <strong>QR Configuration</strong> — update to the sandbox
                      QR endpoint and signing keys
                    </span>
                  </li>
                </ul>
                <br />
                Mismatched credentials will cause transmission errors.
              </>
            )
          }
          confirmLabel={isTest ? "Switch to Live" : "Switch to Sandbox"}
          confirmClassName={
            isTest
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-amber-500 hover:bg-amber-600"
          }
          onConfirm={confirmEnvToggle}
          onCancel={() => setPendingEnvToggle(false)}
        />
      )}
    </>
  );
}

// ── Command palette items ─────────────────────────────────────────────────────
type CmdItem = { label: string; path: string; category: string };

function useCommandItems(): CmdItem[] {
  const isAegis = useIsAegis();
  const isAdmin = useIsAdmin();
  const canCreate = useCanCreateInvoice();

  if (isAegis) {
    return [
      { label: "Dashboard", path: "/", category: "Navigation" },
      { label: "Businesses", path: "/businesses", category: "Navigation" },
      { label: "Users", path: "/users", category: "Navigation" },
      {
        label: "APP Providers",
        path: "/app-providers",
        category: "Navigation",
      },
      { label: "Settings", path: "/settings", category: "Navigation" },
      { label: "Profile", path: "/profile", category: "Account" },
    ];
  }
  return [
    { label: "Dashboard", path: "/", category: "Navigation" },
    ...(canCreate
      ? [
          {
            label: "Create Invoice",
            path: "/invoices/create",
            category: "Invoices",
          },
        ]
      : []),
    { label: "My Invoices", path: "/invoices", category: "Invoices" },
    {
      label: "Received Invoices",
      path: "/received-invoices",
      category: "Invoices",
    },
    {
      label: "Analytics Report",
      path: "/reports/analytics",
      category: "Reports",
    },
    { label: "VAT Schedule", path: "/reports/schedules", category: "Reports" },
    { label: "Parties", path: "/parties", category: "Navigation" },
    { label: "Items", path: "/items", category: "Navigation" },
    ...(isAdmin
      ? [{ label: "Users", path: "/users", category: "Navigation" }]
      : []),
    { label: "Settings", path: "/settings", category: "Navigation" },
    { label: "Profile", path: "/profile", category: "Account" },
  ];
}

// ── Command palette dropdown ──────────────────────────────────────────────────
function CommandPalette({
  query,
  items,
  activeIdx,
  onSelect,
}: {
  query: string;
  items: CmdItem[];
  activeIdx: number;
  onSelect: (item: CmdItem) => void;
}) {
  const filtered = query.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  if (!query.trim() && filtered.length === 0) return null;
  if (filtered.length === 0)
    return (
      <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-3 px-4 text-sm text-gray-400 dark:text-gray-500">
        No results for "{query}"
      </div>
    );

  return (
    <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden z-999999">
      {filtered.map((item, idx) => (
        <button
          key={item.path}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
            idx === activeIdx
              ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <span>{item.label}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {item.category}
          </span>
        </button>
      ))}
    </div>
  );
}

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdActiveIdx, setCmdActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const allItems = useCommandItems();

  const filteredItems = cmdQuery.trim()
    ? allItems.filter((i) =>
        i.label.toLowerCase().includes(cmdQuery.toLowerCase()),
      )
    : allItems;

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  // ⌘K / Ctrl+K opens the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setCmdOpen(true);
      }
      if (e.key === "Escape") {
        setCmdOpen(false);
        setCmdQuery("");
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCmdActiveIdx((i) => Math.min(i + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCmdActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filteredItems[cmdActiveIdx]) {
      selectItem(filteredItems[cmdActiveIdx]);
    }
  };

  const selectItem = (item: CmdItem) => {
    navigate(item.path);
    setCmdQuery("");
    setCmdOpen(false);
    inputRef.current?.blur();
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-99999 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {/* Cross Icon */}
          </button>

          <Link to="/" className="lg:hidden">
            <img
              className="dark:hidden"
              src="./images/logo/logo.svg"
              alt="Logo"
            />
            <img
              className="hidden dark:block"
              src="./images/logo/logo-dark.svg"
              alt="Logo"
            />
          </Link>

          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-99999 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div className="hidden lg:block relative">
            <div className="relative">
              <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
                <svg
                  className="fill-gray-500 dark:fill-gray-400"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                    fill=""
                  />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                value={cmdQuery}
                onChange={(e) => {
                  setCmdQuery(e.target.value);
                  setCmdActiveIdx(0);
                  setCmdOpen(true);
                }}
                onFocus={() => setCmdOpen(true)}
                onBlur={() => {
                  setCmdOpen(false);
                  setCmdQuery("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search or type command..."
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  inputRef.current?.focus();
                  setCmdOpen(true);
                }}
                className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
              >
                <span>⌘</span>
                <span>K</span>
              </button>
            </div>
            {cmdOpen && (
              <CommandPalette
                query={cmdQuery}
                items={allItems}
                activeIdx={cmdActiveIdx}
                onSelect={selectItem}
              />
            )}
          </div>
        </div>
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* APP provider + environment switcher (client users only) */}
            <AppEnvSwitcher />
            {/* <!-- Dark Mode Toggler --> */}
            <ThemeToggleButton />
            {/* <!-- Dark Mode Toggler --> */}
            <NotificationDropdown />
            {/* <!-- Notification Menu Area --> */}
          </div>
          {/* <!-- User Area --> */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
