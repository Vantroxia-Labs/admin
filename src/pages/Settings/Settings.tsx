import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { businessApi, miscApi, flowRuleApi, paymentApi, type BusinessProfile, type FlowRule, type SubscriptionPlan } from "../../lib/api";
import { USE_MOCK, MOCK_BUSINESS_PROFILE, MOCK_INDUSTRIES, MOCK_FLOW_RULE } from "../../lib/mockData";
import { useIsAegis, useIsAdmin, useAuth } from "../../context/AuthContext";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAegis = useIsAegis();
  const isAdmin = useIsAdmin();
  const canEdit = isAdmin || isAegis;

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [industries, setIndustries] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // NRS credentials state
  const [NRS, setNRS] = useState({ apiKey: "", clientSecret: "" });
  const [savingNRS, setSavingNRS] = useState(false);

  // QR config state
  const [qr, setQr] = useState({ publicKey: "", certificate: "" });
  const [savingQr, setSavingQr] = useState(false);

  // Flow rule state
  const [flowRule, setFlowRule] = useState<FlowRule | null>(null);
  const [flowRuleLoading, setFlowRuleLoading] = useState(false);
  const [thresholdAmount, setThresholdAmount] = useState("");
  const [savingFlowRule, setSavingFlowRule] = useState(false);

  const [pricingPlans, setPricingPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPricingPlans, setLoadingPricingPlans] = useState(false);

  // Profile edit form state
  const [profileForm, setProfileForm] = useState({
    description: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    street: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });

  useEffect(() => {
    if (USE_MOCK) {
      const prof = MOCK_BUSINESS_PROFILE as unknown as BusinessProfile;
      setProfile(prof);
      setProfileForm({
        description: prof.description ?? "",
        contactEmail: prof.contactEmail ?? "",
        contactPhone: prof.contactPhone ?? "",
        industry: prof.industry ?? "",
        street: prof.registeredAddress?.street ?? "",
        city: prof.registeredAddress?.city ?? "",
        state: prof.registeredAddress?.state ?? "",
        country: prof.registeredAddress?.country ?? "",
        postalCode: prof.registeredAddress?.postalCode ?? "",
      });
      setIndustries(MOCK_INDUSTRIES.map(i => i.name));
      // Load mock flow rule
      if (isAdmin) {
        const mockRule = MOCK_FLOW_RULE as FlowRule;
        setFlowRule(mockRule);
        setThresholdAmount(String(mockRule.minAmount));
      }
      setLoadingProfile(false);
      return;
    }
    Promise.all([
      businessApi.getProfile(),
      miscApi.getIndustries().catch(() => [] as { name: string }[]),
    ])
      .then(([prof, industryList]) => {
        setProfile(prof);
        setProfileForm({
          description: prof.description ?? "",
          contactEmail: prof.contactEmail ?? "",
          contactPhone: prof.contactPhone ?? "",
          industry: prof.industry ?? "",
          street: prof.registeredAddress?.street ?? "",
          city: prof.registeredAddress?.city ?? "",
          state: prof.registeredAddress?.state ?? "",
          country: prof.registeredAddress?.country ?? "",
          postalCode: prof.registeredAddress?.postalCode ?? "",
        });
        setIndustries(industryList.map((i) => i.name));
      })
      .catch(() => toast.error("Failed to load business profile."))
      .finally(() => setLoadingProfile(false));

    // Load flow rule for admins
    if (isAdmin) {
      setFlowRuleLoading(true);
      flowRuleApi.getAll()
        .then(rules => {
          const active = Array.isArray(rules) ? rules[0] ?? null : null;
          setFlowRule(active);
          if (active) setThresholdAmount(String(active.minAmount));
        })
        .catch(() => { /* ignore — no rule yet */ })
        .finally(() => setFlowRuleLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAegis) {
      return;
    }

    setLoadingPricingPlans(true);
    paymentApi
      .getPlans()
      .then((plans) => setPricingPlans(plans))
      .catch(() => toast.error("Failed to load pricing plans."))
      .finally(() => setLoadingPricingPlans(false));
  }, [isAegis]);

  const getParityBadge = (status?: SubscriptionPlan["parityStatus"]) => {
    switch (status) {
      case "in_sync":
        return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300";
      case "drift":
        return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300";
      case "stale":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await businessApi.updateProfile({
        description: profileForm.description,
        contactEmail: profileForm.contactEmail,
        contactPhone: profileForm.contactPhone,
        industry: profileForm.industry,
        registeredAddress: {
          street: profileForm.street,
          city: profileForm.city,
          state: profileForm.state,
          country: profileForm.country,
          postalCode: profileForm.postalCode,
        },
      });
      toast.success("Business profile updated.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNRS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!NRS.apiKey || !NRS.clientSecret) {
      toast.error("Both API key and client secret are required.");
      return;
    }
    setSavingNRS(true);
    try {
      await businessApi.updateNRSCredentials(NRS);
      toast.success("NRS credentials updated.");
      setNRS({ apiKey: "", clientSecret: "" });
    } catch {
      toast.error("Failed to update NRS credentials.");
    } finally {
      setSavingNRS(false);
    }
  };

  const handleSaveQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qr.publicKey || !qr.certificate) {
      toast.error("Both public key and certificate are required.");
      return;
    }
    setSavingQr(true);
    try {
      await businessApi.updateQrCodeConfig(qr);
      toast.success("QR code configuration updated.");
      setQr({ publicKey: "", certificate: "" });
    } catch {
      toast.error("Failed to update QR config.");
    } finally {
      setSavingQr(false);
    }
  };

  const handleSaveFlowRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(thresholdAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid threshold amount.");
      return;
    }
    setSavingFlowRule(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>(r => setTimeout(r, 700));
        setFlowRule(prev => prev
          ? { ...prev, minAmount: amount }
          : { id: "rule-new", name: "Approval Threshold", description: "Invoices above this amount require admin approval", minAmount: amount, maxAmount: 999_999_999_999, requiresClientAdminApproval: true, priority: 1 }
        );
        toast.success("Approval rule saved.");
      } else {
        await flowRuleApi.upsert({
          name: "Approval Threshold",
          description: "Invoices above this amount require admin approval",
          minAmount: amount,
          maxAmount: 999_999_999_999,
          requiresClientAdminApproval: true,
          priority: 1,
        });
        toast.success("Approval rule saved.");
      }
    } catch {
      toast.error("Failed to save approval rule.");
    } finally {
      setSavingFlowRule(false);
    }
  };

  const handleRemoveFlowRule = async () => {
    if (!flowRule) return;
    setSavingFlowRule(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>(r => setTimeout(r, 700));
        setFlowRule(null);
        setThresholdAmount("");
        toast.success("Approval rule removed. All invoices will be auto-approved.");
      } else {
        await flowRuleApi.delete(flowRule.id);
        setFlowRule(null);
        setThresholdAmount("");
        toast.success("Approval rule removed. All invoices will be auto-approved.");
      }
    } catch {
      toast.error("Failed to remove approval rule.");
    } finally {
      setSavingFlowRule(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Settings | Aegis NRS Portal" description="Business settings and configuration" />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your business configuration and integrations
        </p>
      </div>

      <div className="space-y-6">
        {/* Business Info (read-only) */}
        {profile && (
          <Section title="Business Information" description="Core registration details (read-only)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Business Name</p>
                <p className="text-gray-800 dark:text-white font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">TIN</p>
                <p className="text-gray-800 dark:text-white font-mono">{profile.taxIdentificationNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Reg. Number</p>
                <p className="text-gray-800 dark:text-white font-mono">{profile.businessRegistrationNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">NRS Business ID</p>
                <p className="text-gray-800 dark:text-white font-mono">{profile.NRSBusinessId || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Service ID</p>
                <p className="text-gray-800 dark:text-white font-mono">{profile.serviceId || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">Subscription Plan</p>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                  {user?.subscriptionTier ?? "—"}
                </span>
              </div>
            </div>
          </Section>
        )}

        {/* Editable Business Profile */}
        {canEdit && (
          <Section title="Contact & Address" description="Update your business contact details and address">
            <form onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Contact Email</label>
                  <input
                    value={profileForm.contactEmail}
                    onChange={(e) => setProfileForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    className={inputCls}
                    type="email"
                    placeholder="contact@business.com"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Contact Phone</label>
                  <input
                    value={profileForm.contactPhone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    className={inputCls}
                    placeholder="+234..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Industry</label>
                  <select
                    value={profileForm.industry}
                    onChange={(e) => setProfileForm((f) => ({ ...f, industry: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select industry</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                  <textarea
                    value={profileForm.description}
                    onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))}
                    className={`${inputCls} resize-none`}
                    rows={2}
                    placeholder="Brief description of your business"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Street Address</label>
                  <input
                    value={profileForm.street}
                    onChange={(e) => setProfileForm((f) => ({ ...f, street: e.target.value }))}
                    className={inputCls}
                    placeholder="123 Business Street"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">City</label>
                  <input
                    value={profileForm.city}
                    onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                    className={inputCls}
                    placeholder="City"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">State</label>
                  <input
                    value={profileForm.state}
                    onChange={(e) => setProfileForm((f) => ({ ...f, state: e.target.value }))}
                    className={inputCls}
                    placeholder="State"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Country</label>
                  <input
                    value={profileForm.country}
                    onChange={(e) => setProfileForm((f) => ({ ...f, country: e.target.value }))}
                    className={inputCls}
                    placeholder="Nigeria"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Postal Code</label>
                  <input
                    value={profileForm.postalCode}
                    onChange={(e) => setProfileForm((f) => ({ ...f, postalCode: e.target.value }))}
                    className={inputCls}
                    placeholder="100001"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-5">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  {savingProfile ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </Section>
        )}

        {/* NRS Credentials */}
        {canEdit && (
          <Section
            title="NRS NRS Credentials"
            description="Update your NRS API key and client secret. Values are stored securely and never displayed."
          >
            <form onSubmit={handleSaveNRS}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    API Key
                  </label>
                  <input
                    value={NRS.apiKey}
                    onChange={(e) => setNRS((f) => ({ ...f, apiKey: e.target.value }))}
                    className={inputCls}
                    placeholder="Enter new API key"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Client Secret
                  </label>
                  <input
                    value={NRS.clientSecret}
                    onChange={(e) => setNRS((f) => ({ ...f, clientSecret: e.target.value }))}
                    className={inputCls}
                    placeholder="Enter new client secret"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={savingNRS}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  {savingNRS ? "Updating…" : "Update Credentials"}
                </button>
              </div>
            </form>
          </Section>
        )}

        {/* QR Code Configuration */}
        {canEdit && (
          <Section
            title="QR Code Configuration"
            description="Update your public key and certificate for QR code generation on invoices."
          >
            <form onSubmit={handleSaveQr}>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Public Key
                  </label>
                  <textarea
                    value={qr.publicKey}
                    onChange={(e) => setQr((f) => ({ ...f, publicKey: e.target.value }))}
                    className={`${inputCls} resize-none font-mono text-xs`}
                    rows={4}
                    placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Certificate
                  </label>
                  <textarea
                    value={qr.certificate}
                    onChange={(e) => setQr((f) => ({ ...f, certificate: e.target.value }))}
                    className={`${inputCls} resize-none font-mono text-xs`}
                    rows={4}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={savingQr}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  {savingQr ? "Updating…" : "Update QR Config"}
                </button>
              </div>
            </form>
          </Section>
        )}

        {/* Approval Rule — admin only */}
        {isAdmin && !isAegis && (
          <Section
            title="Approval Rule"
            description="Set a threshold amount. Invoices above this amount will require admin approval before being pushed to NRS."
          >
            {flowRuleLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Loading rule…
              </div>
            ) : (
              <>
                {!flowRule && (
                  <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-amber-700 dark:text-amber-300">No approval rule configured — all invoices are auto-approved.</p>
                  </div>
                )}
                {flowRule && (
                  <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Active rule: invoices above <span className="font-semibold">₦{flowRule.minAmount.toLocaleString()}</span> require approval.
                    </p>
                  </div>
                )}
                <form onSubmit={handleSaveFlowRule}>
                  <div className="flex flex-col gap-1 max-w-xs">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Threshold Amount (₦)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={thresholdAmount}
                      onChange={e => setThresholdAmount(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. 1000000"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Invoices with a total at or above this amount will go to Pending Approval.</p>
                  </div>
                  <div className="flex items-center gap-3 mt-5">
                    <button
                      type="submit"
                      disabled={savingFlowRule || !thresholdAmount}
                      className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {savingFlowRule ? "Saving…" : flowRule ? "Update Rule" : "Set Rule"}
                    </button>
                    {flowRule && (
                      <button
                        type="button"
                        onClick={handleRemoveFlowRule}
                        disabled={savingFlowRule}
                        className="px-5 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                      >
                        Remove Rule
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </Section>
        )}

        {isAegis && (
          <Section
            title="Pricing Management"
            description="Operational pricing source from platform plans, including parity status metadata."
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setLoadingPricingPlans(true);
                  paymentApi
                    .getPlans()
                    .then((plans) => setPricingPlans(plans))
                    .catch(() => toast.error("Failed to refresh pricing plans."))
                    .finally(() => setLoadingPricingPlans(false));
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Refresh Plans
              </button>
            </div>

            {loadingPricingPlans ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Loading pricing plans...
              </div>
            ) : pricingPlans.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                No pricing plans were returned by the API. Publish platform plans before opening signup.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Tier</th>
                      <th className="py-2 pr-3">Monthly</th>
                      <th className="py-2 pr-3">Annual</th>
                      <th className="py-2 pr-3">Parity</th>
                      <th className="py-2">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingPlans.map((plan) => (
                      <tr key={plan.id} className="border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200">
                        <td className="py-2 pr-3 font-medium">{plan.planName}</td>
                        <td className="py-2 pr-3">{plan.tier}</td>
                        <td className="py-2 pr-3">{plan.currency} {plan.monthlyPrice.toLocaleString()}</td>
                        <td className="py-2 pr-3">{plan.currency} {plan.annualPrice.toLocaleString()}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getParityBadge(plan.parityStatus)}`}>
                            {plan.parityStatus ?? "unknown"}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                          {plan.parityCheckedAtUtc ? new Date(plan.parityCheckedAtUtc).toLocaleString() : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {!canEdit && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
            You need Admin access to modify settings. Contact your business admin.
          </div>
        )}
      </div>
    </>
  );
}
