import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import {
  appProviderApi,
  type AccessPointProviderDto,
  type AppAdapterOption,
  type CreateAppProviderPayload,
  type UpdateAppProviderPayload,
} from "../../lib/api";
import { useIsAegis } from "../../context/AuthContext";

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400";

// ── Primitives ────────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function ModalFooter({
  onCancel,
  saving,
  label,
}: {
  onCancel: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 border border-red-400 dark:border-red-500 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [adapterOptions, setAdapterOptions] = useState<AppAdapterOption[]>([]);
  const [form, setForm] = useState<CreateAppProviderPayload>({
    name: "",
    description: "",
    adapterKey: "",
    baseUrl: "",
    credentialsJson: "",
    sandboxBaseUrl: "",
    sandboxCredentialsJson: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    appProviderApi.getAdapterOptions().then((opts) => {
      setAdapterOptions(opts);
      if (opts.length > 0) setForm((f) => ({ ...f, adapterKey: opts[0].adapterKey }));
    }).catch(() => {});
  }, []);

  const set = <K extends keyof CreateAppProviderPayload>(key: K, val: CreateAppProviderPayload[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.baseUrl.trim()) {
      toast.error("Name and Base URL are required.");
      return;
    }
    setSaving(true);
    try {
      await appProviderApi.create(form);
      toast.success("APP provider created.");
      onSaved();
    } catch {
      toast.error("Failed to create provider.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Create APP Provider" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Section title="Identity">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Adapter <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={form.adapterKey}
                onChange={(e) => set("adapterKey", e.target.value)}
              >
                {adapterOptions.map((o) => (
                  <option key={o.adapterKey} value={o.adapterKey}>
                    {o.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Interswitch SwitchTax"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Description</label>
              <input
                className={inputCls}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Short description"
              />
            </div>
          </div>
        </Section>

        <Section title="Production">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Base URL <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={form.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder="https://api.vendor.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Credentials JSON</label>
              <textarea
                className={`${inputCls} font-mono resize-none`}
                rows={5}
                value={form.credentialsJson ?? ""}
                onChange={(e) => set("credentialsJson", e.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Encrypted server-side before storage. Leave blank to set later.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Sandbox (optional)">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Sandbox Base URL</label>
              <input
                className={inputCls}
                value={form.sandboxBaseUrl ?? ""}
                onChange={(e) => set("sandboxBaseUrl", e.target.value)}
                placeholder="https://sandbox.vendor.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Sandbox Credentials JSON</label>
              <textarea
                className={`${inputCls} font-mono resize-none`}
                rows={5}
                value={form.sandboxCredentialsJson ?? ""}
                onChange={(e) => set("sandboxCredentialsJson", e.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
              />
            </div>
          </div>
        </Section>

        <ModalFooter onCancel={onClose} saving={saving} label="Create Provider" />
      </form>
    </ModalShell>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  provider,
  onClose,
  onSaved,
}: {
  provider: AccessPointProviderDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UpdateAppProviderPayload>({
    name: provider.name,
    description: provider.description ?? "",
    baseUrl: provider.baseUrl,
    credentialsJson: "",
    sandboxBaseUrl: provider.sandboxBaseUrl ?? "",
    sandboxCredentialsJson: "",
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof UpdateAppProviderPayload>(key: K, val: UpdateAppProviderPayload[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await appProviderApi.update(provider.id, form);
      toast.success("APP provider updated.");
      onSaved();
    } catch {
      toast.error("Failed to update provider.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Edit — ${provider.displayName}`} onClose={onClose}>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 mb-4">
        Adapter cannot be changed. Leave credential fields blank to keep existing values.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Section title="Identity">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Description</label>
              <input
                className={inputCls}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section title="Production">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Base URL</label>
              <input
                className={inputCls}
                value={form.baseUrl ?? ""}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Credentials JSON{" "}
                {provider.hasProductionCredentials && (
                  <span className="text-green-600 dark:text-green-400 font-normal normal-case">
                    (configured)
                  </span>
                )}
              </label>
              <textarea
                className={`${inputCls} font-mono resize-none`}
                rows={5}
                value={form.credentialsJson ?? ""}
                onChange={(e) => set("credentialsJson", e.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Leave blank to keep existing credentials.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Sandbox (optional)">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Sandbox Base URL</label>
              <input
                className={inputCls}
                value={form.sandboxBaseUrl ?? ""}
                onChange={(e) => set("sandboxBaseUrl", e.target.value)}
                placeholder="Leave blank to clear"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Sandbox Credentials JSON{" "}
                {provider.hasSandboxCredentials && (
                  <span className="text-green-600 dark:text-green-400 font-normal normal-case">
                    (configured)
                  </span>
                )}
              </label>
              <textarea
                className={`${inputCls} font-mono resize-none`}
                rows={5}
                value={form.sandboxCredentialsJson ?? ""}
                onChange={(e) => set("sandboxCredentialsJson", e.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
              />
            </div>
          </div>
        </Section>

        <ModalFooter onCancel={onClose} saving={saving} label="Save Changes" />
      </form>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AppProviderList() {
  const isAegis = useIsAegis();

  const [providers, setProviders] = useState<AccessPointProviderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AccessPointProviderDto | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = (p = page) => {
    setLoading(true);
    appProviderApi
      .list(p, pageSize)
      .then((res) => {
        setProviders(res.items);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      })
      .catch(() => toast.error("Failed to load APP providers."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await appProviderApi.delete(id);
      toast.success(`"${name}" deleted.`);
      load(page);
    } catch {
      toast.error("Failed to delete provider.");
    } finally {
      setDeleting(null);
    }
  };

  if (!isAegis) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500 dark:text-gray-400">
          Access restricted to Aegis administrators.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="APP Providers | Aegis Admin"
        description="Manage Access Point Provider configurations"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">APP Providers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage Access Point Provider configurations and credentials
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          + New Provider
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount > 0 ? `${totalCount} provider${totalCount !== 1 ? "s" : ""}` : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-3">No providers configured yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-brand-500 hover:text-brand-600 text-sm font-medium"
            >
              Add your first provider →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Provider", "Name", "Base URL", "Credentials", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {providers.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                        {p.displayName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-xs">
                          {p.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-50">
                      {p.baseUrl}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs">
                        <CredentialBadge label="Production" configured={p.hasProductionCredentials} />
                        <CredentialBadge label="Sandbox" configured={p.hasSandboxCredentials} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditing(p)}
                          className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deleting === p.id}
                          className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-40 transition-colors"
                        >
                          Delete
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
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load(page);
          }}
        />
      )}
      {editing && (
        <EditModal
          provider={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load(page);
          }}
        />
      )}
    </>
  );
}

function CredentialBadge({ label, configured }: { label: string; configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        configured ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
      }`}
    >
      <span>{configured ? "✓" : "○"}</span>
      {label}
    </span>
  );
}
