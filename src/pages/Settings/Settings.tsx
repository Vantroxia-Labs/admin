import { useEffect, useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { normalizePhone } from "../../lib/phoneUtils";
import PageMeta from "../../components/common/PageMeta";
import {
  businessApi,
  miscApi,
  flowRuleApi,
  authApi,
  appProviderApi,
  type BusinessProfile,
  type FlowRule,
  type AccessPointProviderDto,
  type AppEnvironmentMode,
  type ApiCredentials,
  type SftpCredentials,
  type FIRSCountry,
  type FIRSState,
  type FIRSLga,
  NRSApi,
} from "../../lib/api";
import {
  USE_MOCK,
  MOCK_BUSINESS_PROFILE,
  MOCK_INDUSTRIES,
  MOCK_FLOW_RULE,
  MOCK_API_CREDENTIALS,
  MOCK_SFTP_CREDENTIALS,
} from "../../lib/mockData";
import {
  useIsAegis,
  useIsAdmin,
  useCanManageAppSettings,
  useAuth,
} from "../../context/AuthContext";
import { useEnvMode } from "../../context/EnvModeContext";
import {
  SkeletonSettingsPage,
  SkeletonInlineSection,
} from "../../components/ui/skeleton/Skeleton";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

function Section({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
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
  const canManageAppSettings = useCanManageAppSettings();
  const canEdit = isAdmin || isAegis;
  const { setEnvMode: setGlobalEnvMode } = useEnvMode();

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [industries, setIndustries] = useState<string[]>([]);
  const [nrsCountries, setNrsCountries] = useState<FIRSCountry[]>([]);
  const [nrsStates, setNrsStates] = useState<FIRSState[]>([]);
  const [nrsLgas, setNrsLgas] = useState<FIRSLga[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // NRS credentials state
  const [NRS, setNRS] = useState({ apiKey: "", clientSecret: "" });
  const [savingNRS, setSavingNRS] = useState(false);

  // QR config state
  const [qr, setQr] = useState({ publicKey: "", certificate: "" });
  const [savingQr, setSavingQr] = useState(false);

  // APP provider state
  const [appProviders, setAppProviders] = useState<AccessPointProviderDto[]>(
    [],
  );
  const [activeAdapterKey, setActiveAdapterKey] = useState<string | null>(null);
  const [envMode, setEnvMode] = useState<AppEnvironmentMode>(2); // default Production
  const [appSettingsLoading, setAppSettingsLoading] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);
  // NRS warning modal state
  const [pendingAdapterKey, setPendingAdapterKey] = useState<string | null>(
    null,
  );

  // Flow rule state
  const [flowRule, setFlowRule] = useState<FlowRule | null>(null);
  const [flowRuleLoading, setFlowRuleLoading] = useState(false);
  const [savingFlowRule, setSavingFlowRule] = useState(false);
  /** The single approval threshold — invoices at/above this amount require admin approval */
  const [thresholdAmount, setThresholdAmount] = useState("");

  // API credentials state
  const [apiCredentials, setApiCredentials] = useState<ApiCredentials | null>(
    null,
  );
  const [loadingApiCredentials, setLoadingApiCredentials] = useState(false);
  const [showRotateApiModal, setShowRotateApiModal] = useState(false);
  const [rotatingApiKey, setRotatingApiKey] = useState(false);
  const [apiOtp, setApiOtp] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // SFTP credentials state
  const [sftpCredentials, setSftpCredentials] =
    useState<SftpCredentials | null>(null);
  const [loadingSftpCredentials, setLoadingSftpCredentials] = useState(false);
  const [showSftpPasswordModal, setShowSftpPasswordModal] = useState(false);
  const [changingSftpPassword, setChangingSftpPassword] = useState(false);
  const [sftpOtp, setSftpOtp] = useState("");
  const [sftpNewPassword, setSftpNewPassword] = useState("");

  const [profileForm, setProfileForm] = useState({
    businessRegistrationNumber: "",
    NRSBusinessId: "",
    serviceId: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    street: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    lga: "",
  });

  useEffect(() => {
    if (isAegis) {
      setLoadingProfile(false);
      return;
    }
    if (USE_MOCK) {
      const prof = MOCK_BUSINESS_PROFILE as unknown as BusinessProfile;
      setProfile(prof);
      setProfileForm({
        businessRegistrationNumber: prof.businessRegistrationNumber ?? "",
        NRSBusinessId: prof.NRSBusinessId ?? "",
        serviceId: prof.serviceId ?? "",
        description: prof.description ?? "",
        contactEmail: prof.contactEmail ?? "",
        contactPhone: prof.contactPhone ?? "",
        industry: prof.industry ?? "",
        street: prof.registeredAddress?.street ?? "",
        city: prof.registeredAddress?.city ?? "",
        state: prof.registeredAddress?.state ?? "",
        country: prof.registeredAddress?.country ?? "",
        postalCode: prof.registeredAddress?.postalCode ?? "",
        lga: prof.registeredAddress?.lga ?? "",
      });
      setIndustries(MOCK_INDUSTRIES.map((i) => i.name));
      // Load mock flow rule
      if (isAdmin) {
        const mockRule = MOCK_FLOW_RULE as FlowRule;
        setFlowRule(mockRule);
        setThresholdAmount(String(mockRule.minAmount));
      }
      if (user?.subscriptionTier === "ApiOnly") {
        setApiCredentials(MOCK_API_CREDENTIALS as ApiCredentials);
      }
      if (user?.subscriptionTier === "SFTP") {
        setSftpCredentials(MOCK_SFTP_CREDENTIALS as SftpCredentials);
      }
      setLoadingProfile(false);
      return;
    }
    Promise.all([
      businessApi.getProfile(),
      miscApi.getIndustries().catch(() => [] as { name: string }[]),
      NRSApi.getCountries().catch(() => [] as FIRSCountry[]),
      NRSApi.getStates().catch(() => [] as FIRSState[]),
      NRSApi.getLgas().catch(() => [] as FIRSLga[]),
    ])
      .then(([prof, industryList, countries, states, lgas]) => {
        setProfile(prof);
        setNrsCountries(countries);
        setNrsStates(states);
        setNrsLgas(lgas);
        setProfileForm({
          businessRegistrationNumber: prof.businessRegistrationNumber ?? "",
          NRSBusinessId: prof.NRSBusinessId ?? "",
          serviceId: prof.serviceId ?? "",
          description: prof.description ?? "",
          contactEmail: prof.contactEmail ?? "",
          contactPhone: prof.contactPhone ?? "",
          industry: prof.industry ?? "",
          street: prof.registeredAddress?.street ?? "",
          city: prof.registeredAddress?.city ?? "",
          state: prof.registeredAddress?.state ?? "",
          country: prof.registeredAddress?.country ?? "",
          postalCode: prof.registeredAddress?.postalCode ?? "",
          lga: prof.registeredAddress?.lga ?? "",
        });
        setIndustries(industryList.map((i) => i.name));
      })
      .catch(() => toast.error("Failed to load business profile."))
      .finally(() => setLoadingProfile(false));

    // Load APP provider settings (requires business.manage_settings permission)
    const businessId = user?.businessId;
    if (canManageAppSettings && businessId && !USE_MOCK) {
      setAppSettingsLoading(true);
      Promise.all([
        appProviderApi.list(1, 50),
        appProviderApi.getBusinessSettings(businessId),
      ])
        .then(([providerList, settings]) => {
          setAppProviders(
            (providerList?.items ?? []).filter((p) => p.isActive),
          );
          setActiveAdapterKey(settings.activeAdapterKey);
          setEnvMode(settings.environmentMode);
        })
        .catch(() => {
          /* non-fatal — section stays hidden */
        })
        .finally(() => setAppSettingsLoading(false));
    }

    // Load flow rule for admins
    if (isAdmin) {
      setFlowRuleLoading(true);
      flowRuleApi
        .getAll()
        .then((rules) => {
          const active = Array.isArray(rules) ? (rules[0] ?? null) : null;
          setFlowRule(active);
          if (active) setThresholdAmount(String(active.minAmount));
        })
        .catch(() => {
          /* ignore — no rule yet */
        })
        .finally(() => setFlowRuleLoading(false));
    }

    if (user?.subscriptionTier === "ApiOnly") {
      setLoadingApiCredentials(true);
      businessApi
        .getApiCredentials()
        .then((data) => setApiCredentials(data))
        .catch(() => toast.error("Failed to load API credentials."))
        .finally(() => setLoadingApiCredentials(false));
    }

    if (user?.subscriptionTier === "SFTP") {
      setLoadingSftpCredentials(true);
      businessApi
        .getSftpCredentials()
        .then((data) => setSftpCredentials(data))
        .catch(() => toast.error("Failed to load SFTP credentials."))
        .finally(() => setLoadingSftpCredentials(false));
    }
  }, []);

  const handleOpenRotateApiModal = async () => {
    try {
      await authApi.sendActionOtp();
      setApiOtp("");
      setNewApiKey(null);
      setShowRotateApiModal(true);
      toast.success("OTP sent to your email.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to send OTP.");
    }
  };

  const maskApiKey = (apiKey: string) => {
    if (!apiKey) return "";
    if (apiKey.length <= 8) return `${apiKey}...`;
    return `${apiKey.slice(0, 8)}...`;
  };

  const copyText = async (value: string, label: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  const handleRotateApiKey = async () => {
    if (!apiOtp) {
      toast.error("Enter OTP.");
      return;
    }

    setRotatingApiKey(true);
    try {
      const result = await businessApi.rotateApiKey(apiOtp.trim());
      setNewApiKey(result.newApiKey);
      toast.success("API key rotated successfully.");
      const refreshed = await businessApi.getApiCredentials();
      setApiCredentials(refreshed);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to rotate API key.");
    } finally {
      setRotatingApiKey(false);
    }
  };

  const handleOpenSftpPasswordModal = async () => {
    try {
      await authApi.sendActionOtp();
      setSftpOtp("");
      setSftpNewPassword("");
      setShowSftpPasswordModal(true);
      toast.success("OTP sent to your email.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to send OTP.");
    }
  };

  const handleChangeSftpPassword = async () => {
    if (!sftpOtp || !sftpNewPassword) {
      toast.error("OTP and new password are required.");
      return;
    }

    setChangingSftpPassword(true);
    try {
      await businessApi.changeSftpPassword({
        otp: sftpOtp.trim(),
        newPassword: sftpNewPassword,
      });
      toast.success("SFTP password changed successfully.");
      setShowSftpPasswordModal(false);
      setSftpOtp("");
      setSftpNewPassword("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to change SFTP password.",
      );
    } finally {
      setChangingSftpPassword(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await businessApi.updateProfile({
        businessRegistrationNumber: profileForm.businessRegistrationNumber,
        NRSBusinessId: profileForm.NRSBusinessId,
        serviceId: profileForm.serviceId,
        description: profileForm.description,
        contactEmail: profileForm.contactEmail,
        contactPhone: normalizePhone(profileForm.contactPhone),
        industry: profileForm.industry,
        registeredAddress: {
          street: profileForm.street,
          city: profileForm.city,
          state: profileForm.state,
          country: profileForm.country,
          postalCode: profileForm.postalCode,
          lga: profileForm.lga,
        },
      });
      toast.success("Business profile updated.");
    } catch (err: unknown) {
      const e = err as {
        response?: {
          data?: { errors?: Record<string, string[]>; message?: string };
        };
      };
      const apiErrors = e?.response?.data?.errors;
      if (apiErrors) {
        Object.values(apiErrors)
          .flat()
          .forEach((msg) => toast.error(msg));
      } else {
        toast.error(e?.response?.data?.message || "Failed to update profile.");
      }
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
      await businessApi.updateNRSCredentials({
        firsApiKey: NRS.apiKey,
        firsClientSecret: NRS.clientSecret,
      });
      toast.success("NRS credentials updated.");
      setNRS({ apiKey: "", clientSecret: "" });
      setProfile((prev) =>
        prev ? { ...prev, hasNrsCredentials: true } : prev,
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to update NRS credentials.",
      );
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
      setProfile((prev) => (prev ? { ...prev, hasQrCodeConfig: true } : prev));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to update QR config.");
    } finally {
      setSavingQr(false);
    }
  };

  // ── APP provider handlers ─────────────────────────────────────────────────

  const handleVendorSelect = (adapterKey: string | null) => {
    // null means "reset to platform default"
    const isNonDefault = adapterKey !== null && adapterKey !== "interswitch";
    if (isNonDefault) {
      setPendingAdapterKey(adapterKey); // show NRS warning modal first
    } else {
      applyVendor(adapterKey);
    }
  };

  const applyVendor = async (adapterKey: string | null) => {
    const businessId = user?.businessId;
    if (!businessId) return;
    setSavingVendor(true);
    try {
      await appProviderApi.setBusinessProvider(businessId, adapterKey);
      setActiveAdapterKey(adapterKey);
      const label = adapterKey
        ? (appProviders.find((p) => p.adapterKey === adapterKey)?.displayName ??
          adapterKey)
        : "platform default";
      toast.success(`APP provider switched to ${label}.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to update APP provider.",
      );
    } finally {
      setSavingVendor(false);
      setPendingAdapterKey(null);
    }
  };

  const handleEnvModeChange = async (mode: AppEnvironmentMode) => {
    const businessId = user?.businessId;
    if (!businessId) return;
    setSavingEnv(true);
    try {
      await appProviderApi.setBusinessEnvironment(businessId, mode);
      setEnvMode(mode);
      setGlobalEnvMode(mode);
      toast.success(
        `Environment switched to ${mode === 1 ? "Sandbox" : "Production"}.`,
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to update environment mode.",
      );
    } finally {
      setSavingEnv(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveFlowRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = parseFloat(thresholdAmount);
    if (isNaN(threshold) || threshold <= 0) {
      toast.error("Please enter a valid approval threshold amount.");
      return;
    }
    setSavingFlowRule(true);
    // minAmount = threshold (where approval kicks in)
    // maxAmount = effectively unlimited — no gaps, no ambiguity
    const payload = {
      name: "Approval Threshold",
      description: "Invoices at or above this amount require admin approval",
      minAmount: threshold,
      maxAmount: 999_999_999_999,
      requiresClientAdminApproval: true,
      priority: flowRule?.priority ?? 1,
    };
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 700));
        setFlowRule((prev) =>
          prev ? { ...prev, ...payload } : { id: "rule-new", ...payload },
        );
        toast.success("Approval threshold saved.");
      } else {
        // If a rule already exists, delete it first to avoid overlap errors
        if (flowRule) {
          await flowRuleApi.delete(flowRule.id);
        }
        await flowRuleApi.upsert(payload);
        toast.success("Approval threshold saved.");
        const rules = await flowRuleApi.getAll();
        const active = Array.isArray(rules) ? (rules[0] ?? null) : null;
        setFlowRule(active);
        if (active) setThresholdAmount(String(active.minAmount));
      }
    } catch (err: unknown) {
      const e = err as {
        response?: {
          data?: { message?: string; data?: { value?: { message?: string } } };
        };
      };
      const msg =
        e?.response?.data?.data?.value?.message ||
        e?.response?.data?.message ||
        "Failed to save approval threshold.";
      toast.error(msg);
    } finally {
      setSavingFlowRule(false);
    }
  };

  const handleRemoveFlowRule = async () => {
    if (!flowRule) return;
    setSavingFlowRule(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 700));
        setFlowRule(null);
        setThresholdAmount("");
        toast.success(
          "Approval rule removed. All invoices will be auto-approved.",
        );
      } else {
        await flowRuleApi.delete(flowRule.id);
        setFlowRule(null);
        setThresholdAmount("");
        toast.success(
          "Approval rule removed. All invoices will be auto-approved.",
        );
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to remove approval rule.",
      );
    } finally {
      setSavingFlowRule(false);
    }
  };

  if (loadingProfile && !isAegis) {
    return <SkeletonSettingsPage />;
  }

  return (
    <>
      <PageMeta
        title="Settings | Aegis EInvoicing Portal"
        description={
          isAegis
            ? "Platform administrator settings"
            : "Business settings and configuration"
        }
      />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {isAegis
            ? "Platform administrator account and preferences"
            : "Manage your business configuration and integrations"}
        </p>
      </div>

      <div className="space-y-6">
        {/* ── AEGIS SUPERADMIN VIEW ──────────────────────────────────────── */}
        {isAegis && (
          <>
            {/* Admin Account Overview */}
            <Section
              title="Administrator Account"
              description="Your platform admin profile (read-only)"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                    Name
                  </p>
                  <p className="text-gray-800 dark:text-white font-medium">
                    {[user?.NRStName, user?.lastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                    Email
                  </p>
                  <p className="text-gray-800 dark:text-white">
                    {user?.email ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                    Role
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    Platform Administrator
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                    Access Level
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Superadmin
                  </span>
                </div>
              </div>
            </Section>

            {/* Quick Links */}
            <Section
              title="Platform Management"
              description="Quick links to key administration areas"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    label: "Businesses",
                    desc: "View and manage all registered businesses",
                    href: "/businesses",
                  },
                  {
                    label: "APP Providers",
                    desc: "Configure Access Point Provider adapters",
                    href: "/app-providers",
                  },
                  {
                    label: "Users",
                    desc: "Manage platform admin users",
                    href: "/users",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex flex-col gap-1 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors group"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </Section>

            {/* Security notice */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Security notice:</span> As a
              platform administrator you have full access to all tenant data.
              Use your privileges responsibly. Contact your system administrator
              to change your credentials.
            </div>
          </>
        )}

        {/* ── CLIENT ADMIN / USER VIEW ──────────────────────────────────── */}
        {!isAegis && (
          <>
            {/* Business Profile */}
            {profile && (
              <Section
                title="Business Profile"
                description={
                  canEdit
                    ? "Manage your core registration details, contact info, and address."
                    : "Core registration details (read-only)"
                }
              >
                {canEdit ? (
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* Core details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Business Name
                        </p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-transparent">
                          {profile.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          TIN
                        </p>
                        <p className="text-sm font-mono text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-transparent">
                          {profile.taxIdentificationNumber || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Subscription Plan
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-transparent flex items-center">
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                            {user?.subscriptionTier ?? "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Reg. Number
                        </label>
                        <input
                          value={profileForm.businessRegistrationNumber}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              businessRegistrationNumber: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="RC123456"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          NRS Business ID
                        </label>
                        <input
                          value={profileForm.NRSBusinessId}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              NRSBusinessId: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="e.g. uuid"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Service ID
                        </label>
                        <input
                          value={profileForm.serviceId}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              serviceId: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="e.g. Srv123"
                        />
                      </div>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Contact Email
                        </label>
                        <input
                          value={profileForm.contactEmail}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              contactEmail: e.target.value,
                            }))
                          }
                          className={`${inputCls} bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-80`}
                          type="email"
                          placeholder="contact@business.com"
                          disabled
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Contact Phone
                        </label>
                        <input
                          value={profileForm.contactPhone}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              contactPhone: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="+234..."
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Industry
                        </label>
                        <select
                          value={profileForm.industry}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              industry: e.target.value,
                            }))
                          }
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
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Description
                        </label>
                        <textarea
                          value={profileForm.description}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                          className={`${inputCls} resize-none`}
                          rows={2}
                          placeholder="Brief description of your business"
                        />
                      </div>
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Street Address
                        </label>
                        <input
                          value={profileForm.street}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              street: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="123 Business Street"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          City
                        </label>
                        <input
                          value={profileForm.city}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              city: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="City"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Country
                        </label>
                        <select
                          value={profileForm.country}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              country: e.target.value,
                            }))
                          }
                          className={inputCls}
                        >
                          <option value="">Select country</option>
                          {nrsCountries.map((c) => (
                            <option key={c.alpha_2} value={c.alpha_2}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          State
                        </label>
                        <select
                          value={profileForm.state}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              state: e.target.value,
                              lga: "", // Reset LGA when state changes
                            }))
                          }
                          className={inputCls}
                        >
                          <option value="">Select state</option>
                          {nrsStates.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          LGA
                        </label>
                        <select
                          value={profileForm.lga}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              lga: e.target.value,
                            }))
                          }
                          className={inputCls}
                          disabled={!profileForm.state}
                        >
                          <option value="">Select LGA</option>
                          {nrsLgas
                            .filter((l) => l.state_code === profileForm.state)
                            .map((l) => (
                              <option key={l.code} value={l.code}>
                                {l.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Postal Code
                        </label>
                        <input
                          value={profileForm.postalCode}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              postalCode: e.target.value,
                            }))
                          }
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
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                        Business Name
                      </p>
                      <p className="text-gray-800 dark:text-white font-medium">
                        {profile.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                        TIN
                      </p>
                      <p className="text-gray-800 dark:text-white font-mono">
                        {profile.taxIdentificationNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                        Reg. Number
                      </p>
                      <p className="text-gray-800 dark:text-white font-mono">
                        {profile.businessRegistrationNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                        NRS Business ID
                      </p>
                      <p className="text-gray-800 dark:text-white font-mono">
                        {profile.NRSBusinessId || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                        Service ID
                      </p>
                      <p className="text-gray-800 dark:text-white font-mono">
                        {profile.serviceId || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                        Subscription Plan
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                        {user?.subscriptionTier ?? "—"}
                      </span>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* NRS Credentials */}
            {canEdit && (
              <Section
                title={
                  <span className="flex items-center gap-2">
                    NRS Credentials
                    {profile?.hasNrsCredentials && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Configured
                      </span>
                    )}
                  </span>
                }
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
                        onChange={(e) =>
                          setNRS((f) => ({ ...f, apiKey: e.target.value }))
                        }
                        className={inputCls}
                        placeholder={
                          profile?.hasNrsCredentials
                            ? "••••••••  (already configured)"
                            : "Enter new API key"
                        }
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Client Secret
                      </label>
                      <input
                        value={NRS.clientSecret}
                        onChange={(e) =>
                          setNRS((f) => ({
                            ...f,
                            clientSecret: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder={
                          profile?.hasNrsCredentials
                            ? "••••••••  (already configured)"
                            : "Enter new client secret"
                        }
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
                      {savingNRS
                        ? "Updating…"
                        : profile?.hasNrsCredentials
                          ? "Update Credentials"
                          : "Save Credentials"}
                    </button>
                  </div>
                </form>
              </Section>
            )}

            {/* QR Code Configuration */}
            {canEdit && (
              <Section
                title={
                  <span className="flex items-center gap-2">
                    QR Code Configuration
                    {profile?.hasQrCodeConfig && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Configured
                      </span>
                    )}
                  </span>
                }
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
                        onChange={(e) =>
                          setQr((f) => ({ ...f, publicKey: e.target.value }))
                        }
                        className={`${inputCls} resize-none font-mono text-xs`}
                        rows={4}
                        placeholder={
                          profile?.hasQrCodeConfig
                            ? "••••••••  (already configured — paste to replace)"
                            : "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Certificate
                      </label>
                      <textarea
                        value={qr.certificate}
                        onChange={(e) =>
                          setQr((f) => ({ ...f, certificate: e.target.value }))
                        }
                        className={`${inputCls} resize-none font-mono text-xs`}
                        rows={4}
                        placeholder={
                          profile?.hasQrCodeConfig
                            ? "••••••••  (already configured — paste to replace)"
                            : "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={savingQr}
                      className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {savingQr
                        ? "Updating…"
                        : profile?.hasQrCodeConfig
                          ? "Update QR Config"
                          : "Save QR Config"}
                    </button>
                  </div>
                </form>
              </Section>
            )}

            {/* APP Provider — requires business.manage_settings permission */}
            {canManageAppSettings && !USE_MOCK && (
              <Section
                title="Access Point Provider"
                description="Select which provider transmits your invoices to NRS. Switching requires you to register with the new provider on the NRS portal first."
              >
                {appSettingsLoading ? (
                  <SkeletonInlineSection />
                ) : appProviders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No APP providers configured by your platform administrator
                    yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {appProviders.map((p) => (
                      <VendorCard
                        key={p.id}
                        adapterKey={p.adapterKey}
                        label={p.displayName}
                        sublabel={p.name}
                        isSelected={
                          activeAdapterKey === p.adapterKey ||
                          (activeAdapterKey === null &&
                            p.adapterKey === "interswitch")
                        }
                        disabled={savingVendor}
                        onSelect={() => handleVendorSelect(p.adapterKey)}
                      />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Environment Mode — requires business.manage_settings permission */}
            {canManageAppSettings && !USE_MOCK && (
              <Section
                title="Environment Mode"
                description="Controls which credential set is used when transmitting invoices."
              >
                {envMode === 1 && (
                  <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                    <svg
                      className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">
                        Sandbox mode is active.
                      </span>{" "}
                      Invoices are transmitted to the vendor's test environment
                      and not recorded by NRS.
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <EnvButton
                    label="Production"
                    description="Live NRS submission"
                    active={envMode === 2}
                    disabled={savingEnv}
                    onClick={() => handleEnvModeChange(2)}
                  />
                  <EnvButton
                    label="Sandbox"
                    description="Test environment only"
                    active={envMode === 1}
                    disabled={savingEnv}
                    onClick={() => handleEnvModeChange(1)}
                    warning
                  />
                </div>
              </Section>
            )}

            {isAdmin && !isAegis && (
              <Section
                title="Approval Rule"
                description="Set the minimum invoice amount that requires admin approval before submission to NRS. Invoices below this threshold are auto-approved."
              >
                {flowRuleLoading ? (
                  <SkeletonInlineSection />
                ) : (
                  <>
                    {/* Status banner */}
                    {!flowRule ? (
                      <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                        <svg
                          className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          No approval rule configured — all invoices are
                          auto-approved.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <svg
                          className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="text-sm text-green-700 dark:text-green-300 space-y-0.5">
                          <p>
                            <span className="font-semibold">
                              Below ₦{flowRule.minAmount.toLocaleString()}
                            </span>{" "}
                            — auto-approved.
                          </p>
                          <p>
                            <span className="font-semibold">
                              At or above ₦{flowRule.minAmount.toLocaleString()}
                            </span>{" "}
                            — requires admin approval.
                          </p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSaveFlowRule}>
                      <div className="flex flex-col gap-1 max-w-xs">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Approval Threshold (₦)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            thresholdAmount
                              ? parseInt(thresholdAmount, 10).toLocaleString()
                              : ""
                          }
                          onChange={(e) =>
                            setThresholdAmount(
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                          className={inputCls}
                          placeholder="e.g. 1,000,000"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Invoices at or above this amount will go to Pending
                          Approval. Everything below is auto-approved.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-5">
                        <button
                          type="submit"
                          disabled={savingFlowRule || !thresholdAmount}
                          className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                        >
                          {savingFlowRule
                            ? "Saving…"
                            : flowRule
                              ? "Update Threshold"
                              : "Set Threshold"}
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

            {/* API Credentials — ApiOnly subscription */}
            {user?.subscriptionTier === "ApiOnly" && canEdit && (
              <Section
                title="API Access Credentials"
                description="Use these credentials to authenticate against the ERP API."
              >
                {loadingApiCredentials ? (
                  <SkeletonInlineSection />
                ) : !apiCredentials ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No API credentials found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                          API Key
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-800 dark:text-white font-mono break-all">
                            {(showApiKey
                              ? apiCredentials.apiKey
                              : maskApiKey(apiCredentials.apiKey)) || "—"}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowApiKey((v) => !v)}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {showApiKey ? "Hide" : "View"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(apiCredentials.apiKey || "", "API key")
                            }
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                          Base URL
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-800 dark:text-white font-mono break-all">
                            {apiCredentials.baseUrl || "—"}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(apiCredentials.baseUrl || "", "Base URL")
                            }
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
                        Required Headers
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">
                                Header
                              </th>
                              <th className="text-left px-3 py-2 font-medium">
                                Value
                              </th>
                              <th className="text-left px-3 py-2 font-medium">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {apiCredentials.requiredHeaders.map((h) => (
                              <tr
                                key={h.name}
                                className="border-t border-gray-100 dark:border-gray-800"
                              >
                                <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">
                                  {h.name}
                                </td>
                                <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">
                                  {h.value}
                                </td>
                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                  {h.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleOpenRotateApiModal}
                        className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Rotate API Key
                      </button>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* SFTP Credentials — SFTP subscription */}
            {user?.subscriptionTier === "SFTP" && canEdit && (
              <Section
                title="SFTP Access Credentials"
                description="Use these details to connect your SFTP client and exchange invoice files."
              >
                {loadingSftpCredentials ? (
                  <SkeletonInlineSection />
                ) : !sftpCredentials ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No SFTP credentials found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                          Host
                        </p>
                        <p className="text-gray-800 dark:text-white font-mono break-all">
                          {sftpCredentials.host || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                          Port
                        </p>
                        <p className="text-gray-800 dark:text-white font-mono">
                          {sftpCredentials.port || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                          Username
                        </p>
                        <p className="text-gray-800 dark:text-white font-mono">
                          {sftpCredentials.username || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                          Status
                        </p>
                        <p className="text-gray-800 dark:text-white">
                          {sftpCredentials.status || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleOpenSftpPasswordModal}
                        className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Change SFTP Password
                      </button>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {!canEdit && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
                You need Admin access to modify settings. Contact your business
                admin.
              </div>
            )}
          </>
        )}
      </div>

      {/* NRS Warning Modal — shown when switching to a non-default provider */}
      {!isAegis && pendingAdapterKey !== null && (
        <div
          className="fixed inset-0 z-999999 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setPendingAdapterKey(null)
          }
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  Confirm provider switch
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Before switching to{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {appProviders.find(
                      (p) => p.adapterKey === pendingAdapterKey,
                    )?.displayName ?? pendingAdapterKey}
                  </span>
                  , you must first register your business with this provider on
                  the <span className="font-semibold">NRS portal</span> and
                  enable them as your Access Point Provider.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Have you completed registration with{" "}
                  {appProviders.find((p) => p.adapterKey === pendingAdapterKey)
                    ?.displayName ?? pendingAdapterKey}{" "}
                  on the NRS portal?
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingAdapterKey(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyVendor(pendingAdapterKey)}
                disabled={savingVendor}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              >
                {savingVendor
                  ? "Switching…"
                  : "Yes, I've registered — switch now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRotateApiModal && (
        <div
          className="fixed inset-0 z-999999 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowRotateApiModal(false)
          }
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">
              Rotate API key
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter the OTP sent to your email to confirm API key rotation.
            </p>
            <input
              value={apiOtp}
              onChange={(e) => setApiOtp(e.target.value)}
              className={inputCls}
              placeholder="Enter 6-digit OTP"
            />
            {newApiKey && (
              <div className="mt-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-3">
                <p className="text-xs text-green-700 dark:text-green-300 mb-1">
                  New API Key (copy now)
                </p>
                <p className="text-sm font-mono text-green-800 dark:text-green-200 break-all">
                  {newApiKey}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowRotateApiModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-xl text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateApiKey}
                disabled={rotatingApiKey}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50"
              >
                {rotatingApiKey ? "Rotating..." : "Confirm Rotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSftpPasswordModal && (
        <div
          className="fixed inset-0 z-999999 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowSftpPasswordModal(false)
          }
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">
              Change SFTP password
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter the OTP sent to your email and your new SFTP password.
            </p>
            <div className="space-y-3">
              <input
                value={sftpOtp}
                onChange={(e) => setSftpOtp(e.target.value)}
                className={inputCls}
                placeholder="Enter 6-digit OTP"
              />
              <input
                type="password"
                value={sftpNewPassword}
                onChange={(e) => setSftpNewPassword(e.target.value)}
                className={inputCls}
                placeholder="Enter new SFTP password"
              />
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowSftpPasswordModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-xl text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeSftpPassword}
                disabled={changingSftpPassword}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50"
              >
                {changingSftpPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function VendorCard({
  adapterKey: _adapterKey,
  label,
  sublabel,
  isSelected,
  disabled,
  onSelect,
}: {
  adapterKey: string;
  label: string;
  sublabel?: string;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || isSelected}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
        isSelected
          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
      } disabled:cursor-not-allowed`}
    >
      <span
        className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
          isSelected
            ? "border-brand-500"
            : "border-gray-300 dark:border-gray-500"
        }`}
      >
        {isSelected && <span className="w-2 h-2 rounded-full bg-brand-500" />}
      </span>
      <span className="flex flex-col">
        <span
          className={`text-sm font-medium ${isSelected ? "text-brand-700 dark:text-brand-400" : "text-gray-700 dark:text-gray-200"}`}
        >
          {label}
        </span>
        {sublabel && sublabel !== label && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {sublabel}
          </span>
        )}
      </span>
      {isSelected && (
        <span className="ml-auto text-xs text-brand-500 dark:text-brand-400 font-medium">
          Active
        </span>
      )}
    </button>
  );
}

function EnvButton({
  label,
  description,
  active,
  disabled,
  onClick,
  warning,
}: {
  label: string;
  description: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || active}
      onClick={onClick}
      className={`flex-1 px-4 py-3 rounded-xl border text-left transition-colors ${
        active
          ? warning
            ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
            : "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30"
      } disabled:cursor-not-allowed`}
    >
      <p
        className={`text-sm font-semibold ${
          active
            ? warning
              ? "text-amber-700 dark:text-amber-400"
              : "text-brand-700 dark:text-brand-400"
            : "text-gray-700 dark:text-gray-200"
        }`}
      >
        {label}
        {active && (
          <span className="ml-2 text-xs font-medium opacity-70">● Active</span>
        )}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {description}
      </p>
    </button>
  );
}
