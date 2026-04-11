import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { businessApi, miscApi, tinValidationApi } from "../lib/api";
import { USE_MOCK, MOCK_INDUSTRIES } from "../lib/mockData";
import { useAuth } from "../context/AuthContext";

type Step = "profile" | "nrs" | "qr" | "done";

interface ProfileForm {
  taxIdentificationNumber: string;
  businessRegistrationNumber: string;
  serviceId: string;
  NRSBusinessId: string;
  industry: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

type TinStatus = "idle" | "checking" | "valid" | "invalid" | "error";

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>("profile");
  const [industries, setIndustries] = useState<string[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loading, setLoading] = useState(false);

  // TIN validation
  const [tinStatus, setTinStatus] = useState<TinStatus>("idle");
  const [tinBusinessName, setTinBusinessName] = useState("");

  useEffect(() => {
    const tin = profile.taxIdentificationNumber.trim();
    if (!tin) {
      setTinStatus("idle");
      setTinBusinessName("");
      return;
    }
    setTinStatus("checking");
    const timer = setTimeout(async () => {
      if (USE_MOCK) {
        setTinStatus("valid");
        setTinBusinessName("Verified Business");
        return;
      }
      try {
        const result = await tinValidationApi.validate(tin);
        if (result.isValid && result.isEnrolled) {
          setTinStatus("valid");
          setTinBusinessName(result.businessName ?? "");
        } else {
          setTinStatus("invalid");
          setTinBusinessName("");
        }
      } catch {
        setTinStatus("error");
        setTinBusinessName("");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [profile.taxIdentificationNumber]);

  const [profile, setProfile] = useState<ProfileForm>({
    taxIdentificationNumber: "",
    businessRegistrationNumber: "",
    serviceId: "",
    NRSBusinessId: "",
    industry: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    street: "",
    city: "",
    state: "",
    country: "Nigeria",
    postalCode: "",
  });

  const [nrs, setNrs] = useState({ apiKey: "", clientSecret: "" });
  const [qr, setQr] = useState({ publicKey: "", certificate: "" });

  useEffect(() => {
    if (USE_MOCK) {
      setIndustries(MOCK_INDUSTRIES.map((i) => i.name));
      setLoadingIndustries(false);
      return;
    }
    miscApi
      .getIndustries()
      .then((list) => setIndustries(list.map((i) => i.name)))
      .catch(() => setIndustries([]))
      .finally(() => setLoadingIndustries(false));
  }, []);

  const pf =
    (field: keyof ProfileForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setProfile((prev) => ({ ...prev, [field]: e.target.value }));

  const handleProfileNext = async () => {
    const required: (keyof ProfileForm)[] = [
      "taxIdentificationNumber",
      "businessRegistrationNumber",
      "serviceId",
      "NRSBusinessId",
      "industry",
      "contactEmail",
      "contactPhone",
    ];
    if (required.some((k) => !profile[k])) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (tinStatus === "checking") {
      toast.error("TIN validation is in progress. Please wait.");
      return;
    }
    if (tinStatus !== "valid") {
      toast.error(
        "Please provide a valid and NRS-enrolled TIN before continuing.",
      );
      return;
    }
    setLoading(true);
    try {
      await businessApi.updateProfile({
        taxIdentificationNumber: profile.taxIdentificationNumber,
        businessRegistrationNumber: profile.businessRegistrationNumber,
        serviceId: profile.serviceId,
        NRSBusinessId: profile.NRSBusinessId,
        industry: profile.industry,
        description: profile.description,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        registeredAddress: {
          street: profile.street,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          postalCode: profile.postalCode,
        },
      });
      setStep("nrs");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save business profile.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNrsNext = async () => {
    if (!nrs.apiKey || !nrs.clientSecret) {
      toast.error("Please provide your NRS API Key and Client Secret.");
      return;
    }
    setLoading(true);
    try {
      await businessApi.updateNRSCredentials(nrs);
      setStep("qr");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save NRS credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQrNext = async () => {
    setLoading(true);
    try {
      if (qr.publicKey || qr.certificate) {
        await businessApi.updateQrCodeConfig(qr);
      }
      await refreshUser();
      setStep("done");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save QR configuration.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const steps: Step[] = ["profile", "nrs", "qr"];
  const stepLabels: Record<Step, string> = {
    profile: "Business Info",
    nrs: "NRS Credentials",
    qr: "QR Config",
    done: "Done",
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Setup Complete!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Your business is ready to start issuing e-invoices on the Aegis
            EInvoicing Portal.
          </p>
          <Button className="w-full" size="sm" onClick={() => navigate("/")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="mb-6">
          <img
            src="/images/logo/logo.svg"
            alt="Aegis NRS"
            className="h-8 dark:hidden"
          />
          <img
            src="/images/logo/logo-dark.svg"
            alt="Aegis NRS"
            className="h-8 hidden dark:block"
          />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
          Complete Your Business Setup
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure your account to start submitting invoices to NRS.
        </p>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                ${
                  step === s
                    ? "bg-brand-500 text-white"
                    : steps.indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs hidden sm:block ${step === s ? "text-brand-500 font-medium" : "text-gray-400"}`}
              >
                {stepLabels[s]}
              </span>
              {i < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Business Profile */}
        {step === "profile" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  TIN <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder="Tax ID Number"
                  value={profile.taxIdentificationNumber}
                  onChange={pf("taxIdentificationNumber")}
                />
                {tinStatus === "checking" && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Validating TIN...
                  </p>
                )}
                {tinStatus === "valid" && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ TIN verified
                    {tinBusinessName ? ` — ${tinBusinessName}` : ""}
                  </p>
                )}
                {tinStatus === "invalid" && (
                  <p className="text-xs text-red-500 mt-1">
                    ✕ TIN not found or not enrolled on NRS
                  </p>
                )}
                {tinStatus === "error" && (
                  <p className="text-xs text-orange-500 mt-1">
                    ⚠ Could not verify TIN right now. Please try again.
                  </p>
                )}
              </div>
              <div>
                <Label>
                  BRN <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder="Business Reg. Number"
                  value={profile.businessRegistrationNumber}
                  onChange={pf("businessRegistrationNumber")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Service ID <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder="NRS Service ID"
                  value={profile.serviceId}
                  onChange={pf("serviceId")}
                />
              </div>
              <div>
                <Label>
                  NRS Business ID <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder="NRS Business ID"
                  value={profile.NRSBusinessId}
                  onChange={pf("NRSBusinessId")}
                />
              </div>
            </div>
            <div>
              <Label>
                Industry <span className="text-error-500">*</span>
              </Label>
              <select
                value={profile.industry}
                onChange={pf("industry")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select industry...</option>
                {loadingIndustries ? (
                  <option disabled>Loading...</option>
                ) : (
                  industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <Label>Business Description</Label>
              <textarea
                value={profile.description}
                onChange={pf("description")}
                rows={2}
                placeholder="Brief description of your business"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Contact Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="contact@company.com"
                  value={profile.contactEmail}
                  onChange={pf("contactEmail")}
                />
              </div>
              <div>
                <Label>
                  Contact Phone <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="tel"
                  placeholder="+234 800..."
                  value={profile.contactPhone}
                  onChange={pf("contactPhone")}
                />
              </div>
            </div>
            <div>
              <Label>Street Address</Label>
              <Input
                placeholder="123 Main Street"
                value={profile.street}
                onChange={pf("street")}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  placeholder="Lagos"
                  value={profile.city}
                  onChange={pf("city")}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  placeholder="Lagos State"
                  value={profile.state}
                  onChange={pf("state")}
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  placeholder="100001"
                  value={profile.postalCode}
                  onChange={pf("postalCode")}
                />
              </div>
            </div>
            <Button
              className="w-full mt-2"
              size="sm"
              onClick={handleProfileNext}
              disabled={loading}
            >
              {loading ? "Saving..." : "Continue →"}
            </Button>
          </div>
        )}

        {/* Step 2: NRS Credentials */}
        {step === "nrs" && (
          <div className="space-y-5">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
              These credentials are provided by NRS/NRS and are required to
              submit invoices to the national e-invoicing platform.
            </div>
            <div>
              <Label>
                NRS API Key <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                placeholder="Your NRS API Key"
                value={nrs.apiKey}
                onChange={(e) =>
                  setNrs((prev) => ({ ...prev, apiKey: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>
                Client Secret <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                placeholder="Your NRS Client Secret"
                value={nrs.clientSecret}
                onChange={(e) =>
                  setNrs((prev) => ({ ...prev, clientSecret: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                size="sm"
                onClick={() => setStep("profile")}
              >
                ← Back
              </Button>
              <Button
                className="flex-1"
                size="sm"
                onClick={handleNrsNext}
                disabled={loading}
              >
                {loading ? "Saving..." : "Continue →"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: QR Code Config */}
        {step === "qr" && (
          <div className="space-y-5">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
              QR code configuration is optional but recommended for invoice QR
              validation. You can set this up later in Business Settings.
            </div>
            <div>
              <Label>Public Key</Label>
              <textarea
                value={qr.publicKey}
                onChange={(e) =>
                  setQr((prev) => ({ ...prev, publicKey: e.target.value }))
                }
                rows={4}
                placeholder="Paste your RSA public key here..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
              />
            </div>
            <div>
              <Label>Certificate</Label>
              <textarea
                value={qr.certificate}
                onChange={(e) =>
                  setQr((prev) => ({ ...prev, certificate: e.target.value }))
                }
                rows={4}
                placeholder="Paste your certificate here..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                size="sm"
                onClick={() => setStep("nrs")}
              >
                ← Back
              </Button>
              <Button
                className="flex-1"
                size="sm"
                onClick={handleQrNext}
                disabled={loading}
              >
                {loading ? "Finishing..." : "Complete Setup →"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
