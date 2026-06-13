import { useState, useEffect } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { authApi, paymentApi, tinValidationApi, type SubscriptionPlan } from "../../lib/api";
import { USE_MOCK, MOCK_PLANS } from "../../lib/mockData";

type Step = "plan" | "details" | "confirm";
type TinStatus = "idle" | "checking" | "valid" | "invalid" | "error";

const BILLING_LABELS: Record<number, string> = { 0: "Monthly", 1: "Annual" };

export default function SignUpForm() {
  const [step, setStep] = useState<Step>("plan");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Plan selection state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<0 | 1>(0); // 0=Monthly, 1=Annual

  // Registration details
  const [form, setForm] = useState({
    adminNRStName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
    businessName: "",
    tin: "",
  });
  const [loading, setLoading] = useState(false);

  // TIN validation
  const [tinStatus, setTinStatus] = useState<TinStatus>("idle");
  const [tinBusinessName, setTinBusinessName] = useState("");

  useEffect(() => {
    const tin = form.tin.trim();
    if (!tin) { setTinStatus("idle"); setTinBusinessName(""); return; }
    setTinStatus("checking");
    const timer = setTimeout(async () => {
      if (USE_MOCK) {
        setTinStatus("valid");
        setTinBusinessName(form.businessName || "Verified Business");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tin]);

  useEffect(() => {
    if (USE_MOCK) {
      setPlans(MOCK_PLANS as SubscriptionPlan[]);
      setLoadingPlans(false);
      return;
    }
    paymentApi.getPlans()
      .then(setPlans)
      .catch(() => toast.error("Failed to load plans. Please refresh."))
      .finally(() => setLoadingPlans(false));
  }, []);

  const handleFieldChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handlePlanNext = () => {
    if (!selectedPlan) { toast.error("Please select a plan."); return; }
    setStep("details");
  };

  const handleDetailsNext = () => {
    const { adminNRStName, adminLastName, adminEmail, adminPhone, businessName, tin } = form;
    if (!adminNRStName || !adminLastName || !adminEmail || !adminPhone || !businessName || !tin) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (tinStatus === "checking") {
      toast.error("TIN validation is in progress. Please wait.");
      return;
    }
    if (tinStatus !== "valid") {
      toast.error("Please provide a valid and NRS-enrolled TIN before continuing.");
      return;
    }
    setStep("confirm");
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const result = await authApi.register({
        ...form,
        platformSubscriptionId: selectedPlan.id,
        billingCycle,
      });
      // Redirect to Paystack
      window.location.href = result.paymentUrl;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const tierFeatures: Record<string, string[]> = {
    SaaS: ["Create invoices on the portal", "Manage parties & items", "Approval workflow", "View received invoices", "Portal dashboard"],
    SFTP: ["Upload invoices via SFTP", "Update payment status", "View received invoices", "Portal dashboard (read)", "SFTP credentials provided"],
    ApiOnly: ["Submit invoices via API", "Update payment status via portal", "View received invoices", "API key provided", "Portal dashboard (read)"],
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto no-scrollbar">
      <div className="w-full max-w-2xl mx-auto py-8 px-4">

        {/* Logo */}
        <div className="mb-6 flex items-center gap-2">
          <img src="/images/logo/logo-icon.svg" alt="Aegis" className="h-8" />
          <span className="text-lg font-bold text-gray-800 dark:text-white">Aegis EInvoicing</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(["plan", "details", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                ${step === s ? "bg-brand-500 text-white" :
                  (["plan", "details", "confirm"].indexOf(step) > i) ? "bg-green-500 text-white" :
                  "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                {i + 1}
              </div>
              <span className={`text-sm capitalize hidden sm:block
                ${step === s ? "text-brand-500 font-medium" : "text-gray-400"}`}>
                {s === "plan" ? "Choose Plan" : s === "details" ? "Your Details" : "Confirm & Pay"}
              </span>
              {i < 2 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Plan Selection */}
        {step === "plan" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Choose Your Plan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select how you want to submit invoices to NRS.</p>

            {/* Billing toggle */}
            <div className="flex items-center gap-3 mb-6">
              <span className={`text-sm font-medium ${billingCycle === 0 ? "text-brand-500 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}`}>Monthly</span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === 0 ? 1 : 0)}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer focus:outline-none ${billingCycle === 1 ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${billingCycle === 1 ? "translate-x-6" : "translate-x-0"}`} />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 1 ? "text-brand-500 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}`}>
                Annual <span className="text-green-500 dark:text-green-400 text-xs ml-1">(Save ~17%)</span>
              </span>
            </div>

            {loadingPlans ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {plans.map(plan => {
                  const price = billingCycle === 1 ? plan.annualPrice : plan.monthlyPrice;
                  const isSelected = selectedPlan?.id === plan.id;
                  const features = tierFeatures[plan.tier] ?? [];
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`text-left p-5 rounded-2xl border-2 transition-all
                        ${isSelected
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-brand-300"}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-800 dark:text-white">{plan.planName}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                          ${isSelected ? "border-brand-500 bg-brand-500" : "border-gray-300"}`}>
                          {isSelected && <span className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </div>
                      <div className="mb-4">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          ₦{price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400 ml-1">/{billingCycle === 1 ? "year" : "month"}</span>
                        {billingCycle === 0 && (
                          <p className="text-xs text-gray-400 mt-1">₦{plan.annualPrice.toLocaleString()}/year</p>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            <Button className="w-full mt-6" size="sm" onClick={handlePlanNext} disabled={!selectedPlan}>
              Continue →
            </Button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Your Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Fill in your admin account information.</p>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>NRSt Name <span className="text-error-500">*</span></Label>
                  <Input placeholder="John" value={form.adminNRStName} onChange={handleFieldChange("adminNRStName")} />
                </div>
                <div>
                  <Label>Last Name <span className="text-error-500">*</span></Label>
                  <Input placeholder="Doe" value={form.adminLastName} onChange={handleFieldChange("adminLastName")} />
                </div>
              </div>
              <div>
                <Label>Business Name <span className="text-error-500">*</span></Label>
                <Input placeholder="Acme Nigeria Ltd" value={form.businessName} onChange={handleFieldChange("businessName")} />
              </div>
              <div>
                <Label>Tax Identification Number (TIN) <span className="text-error-500">*</span></Label>
                <Input placeholder="e.g. 12345678-0001" value={form.tin} onChange={handleFieldChange("tin")} />
                {tinStatus === "checking" && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Validating TIN...
                  </p>
                )}
                {tinStatus === "valid" && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ TIN verified{tinBusinessName ? ` — ${tinBusinessName}` : ""}
                  </p>
                )}
                {tinStatus === "invalid" && (
                  <p className="text-xs text-red-500 mt-1">✕ TIN not found or not enrolled on NRS</p>
                )}
                {tinStatus === "error" && (
                  <p className="text-xs text-orange-500 mt-1">⚠ Could not verify TIN right now. Please try again.</p>
                )}
              </div>
              <div>
                <Label>Email <span className="text-error-500">*</span></Label>
                <Input type="email" placeholder="admin@company.com" value={form.adminEmail} onChange={handleFieldChange("adminEmail")} />
              </div>
              <div>
                <Label>Phone <span className="text-error-500">*</span></Label>
                <Input type="tel" placeholder="+234 800 000 0000" value={form.adminPhone} onChange={handleFieldChange("adminPhone")} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" size="sm" onClick={() => setStep("plan")}>← Back</Button>
              <Button
                className="flex-1"
                size="sm"
                onClick={handleDetailsNext}
                disabled={
                  !form.adminNRStName ||
                  !form.adminLastName ||
                  !form.adminEmail ||
                  !form.adminPhone ||
                  !form.businessName ||
                  !form.tin ||
                  tinStatus !== "valid"
                }
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm & Pay */}
        {step === "confirm" && selectedPlan && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Confirm & Pay</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Review your order before proceeding to payment.</p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Business</span>
                <span className="font-medium text-gray-800 dark:text-white">{form.businessName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">TIN</span>
                <span className="font-medium text-gray-800 dark:text-white font-mono">{form.tin}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Admin</span>
                <span className="font-medium text-gray-800 dark:text-white">{form.adminNRStName} {form.adminLastName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-800 dark:text-white">{form.adminEmail}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium text-gray-800 dark:text-white">{selectedPlan.planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Billing</span>
                <span className="font-medium text-gray-800 dark:text-white">{BILLING_LABELS[billingCycle]}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-semibold">
                <span className="text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-brand-500 text-lg">
                  ₦{(billingCycle === 1 ? selectedPlan.annualPrice : selectedPlan.monthlyPrice).toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4 text-center">
              You will be redirected to Paystack to complete payment. After successful payment, your account will be activated and login credentials sent to your email.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" size="sm" onClick={() => setStep("details")}>← Back</Button>
              <Button className="flex-1" size="sm" onClick={handleSubmit} disabled={loading}>
                {loading ? "Processing..." : "Proceed to Payment →"}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/signin" className="text-brand-500 hover:text-brand-600">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
