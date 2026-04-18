import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import {
  vendorPortalApi,
  type VendorPortalForm,
  type VendorLineItem,
} from "../../lib/api";

type Step =
  | "loading"
  | "closed"
  | "request-otp"
  | "verify-otp"
  | "form"
  | "submitted"
  | "error";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500";

const emptyItem = (): VendorLineItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  unitOfMeasure: "",
});

export default function VendorPortal() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<Step>("loading");
  const [form, setForm] = useState<VendorPortalForm | null>(null);
  const [vendorInfo, setVendorInfo] = useState<{
    businessName?: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [lineItems, setLineItems] = useState<VendorLineItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    if (!token) {
      setStep("error");
      return;
    }
    vendorPortalApi
      .getForm(token)
      .then((data) => {
        setForm(data);
        setStep(data.isClosed ? "closed" : "request-otp");
      })
      .catch(() => setStep("error"));
  }, [token]);

  const startCountdown = (secs = 60) => {
    setCountdown(secs);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async () => {
    if (!token) return;
    setOtpSending(true);
    try {
      await vendorPortalApi.requestOtp(token);
      setStep("verify-otp");
      startCountdown();
    } catch {
      setOtpError("Failed to send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setOtpVerifying(true);
    setOtpError("");
    try {
      const res = await vendorPortalApi.verifyOtp(token, otp);
      setVendorInfo({
        businessName: res.vendorBusinessName,
        email: res.vendorEmail,
        phone: res.vendorPhone,
      });
      setStep("form");
    } catch {
      setOtpError("Invalid or expired OTP. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const addItem = () => setLineItems((li) => [...li, emptyItem()]);
  const removeItem = (i: number) =>
    setLineItems((li) => li.filter((_, idx) => idx !== i));
  const updateItem = (
    i: number,
    field: keyof VendorLineItem,
    value: string | number,
  ) =>
    setLineItems((li) =>
      li.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)),
    );

  const totalAmount = lineItems.reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
    0,
  );

  const handleSaveDraft = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await vendorPortalApi.saveDraft(token, lineItems);
      alert("Draft saved successfully.");
    } catch {
      alert("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setShowSubmitModal(false);
    setSubmitting(true);
    try {
      const res = await vendorPortalApi.submit(token, lineItems);
      setSubmitMessage(res.message ?? "Invoice submitted successfully.");
      setStep("submitted");
    } catch {
      alert("Failed to submit invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Renders ────────────────────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading broadcast form...</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Invalid Link
          </h1>
          <p className="text-gray-500">
            This vendor portal link is invalid or has expired. Please contact
            the sender for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (step === "closed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-7a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Broadcast Closed
          </h1>
          <p className="text-gray-500">
            The invoice broadcast <strong>{form?.broadcastTitle}</strong> from{" "}
            <strong>{form?.tenantName}</strong> has been closed or the due date
            has passed. No further submissions are accepted.
          </p>
        </div>
      </div>
    );
  }

  if (step === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Invoice Submitted!
          </h1>
          <p className="text-gray-500">{submitMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <p className="text-xs text-gray-400 uppercase font-medium mb-1">
            {form?.tenantName}
          </p>
          <h1 className="text-xl font-bold text-gray-900">
            {form?.broadcastTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Due{" "}
            {form?.dueDate ? new Date(form.dueDate).toLocaleDateString() : "—"}
            {" · "}
            {form?.currency}
            {form?.requiresApproval && " · Requires Approval"}
          </p>
          {form?.note && (
            <p className="text-sm text-gray-600 mt-2 border-l-2 border-brand-300 pl-3">
              {form.note}
            </p>
          )}
        </div>

        {/* Step: Request OTP */}
        {step === "request-otp" && (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Verify Your Identity
            </h2>
            <p className="text-sm text-gray-500 mb-1">
              We'll send a one-time code to the email registered for:
            </p>
            <p className="font-medium text-gray-800 mb-6">
              {form?.vendorEmail}
            </p>
            {otpError && (
              <p className="text-sm text-red-500 mb-3">{otpError}</p>
            )}
            <button
              onClick={handleRequestOtp}
              disabled={otpSending}
              className="w-full py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-60"
            >
              {otpSending ? "Sending..." : "Send OTP"}
            </button>
          </div>
        )}

        {/* Step: Verify OTP */}
        {step === "verify-otp" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Enter OTP
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter the 6-digit code sent to{" "}
              <strong>{form?.vendorEmail}</strong>.
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                className={
                  inputCls + " text-center text-xl tracking-widest font-mono"
                }
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
              />
              {otpError && <p className="text-sm text-red-500">{otpError}</p>}
              <button
                type="submit"
                disabled={otpVerifying || otp.length < 6}
                className="w-full py-3 bg-brand-500 text-white rounded-xl font-medium disabled:opacity-60"
              >
                {otpVerifying ? "Verifying..." : "Verify"}
              </button>
              <div className="text-center text-sm text-gray-500">
                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpSending}
                    className="text-brand-500 hover:underline"
                  >
                    {otpSending ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Submit confirmation modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Confirm Submission
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {form?.requiresApproval
                  ? `Your invoice will be sent to ${form?.tenantName} for review. Once submitted you cannot make further changes unless the due date is extended.`
                  : "Your invoice will be submitted directly to the Nigeria Revenue Service (NRS). Once submitted it cannot be edited. Any corrections will require a credit or debit note."}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting..."
                    : form?.requiresApproval
                      ? "Submit for Approval"
                      : "Submit to NRS"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Invoice Form */}
        {step === "form" && (
          <form onSubmit={(e) => { e.preventDefault(); setShowSubmitModal(true); }} className="space-y-4">
            {vendorInfo && (
              <div className="bg-white rounded-2xl shadow p-4 text-sm text-gray-700">
                <p className="font-medium text-gray-900">
                  {vendorInfo.businessName}
                </p>
                <p className="text-gray-500">
                  {vendorInfo.email}
                  {vendorInfo.phone ? ` · ${vendorInfo.phone}` : ""}
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Line Items
                </h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-brand-500 hover:underline"
                >
                  + Add Item
                </button>
              </div>

              {lineItems.map((item, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Item {i + 1}
                    </span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Description *
                    </label>
                    <input
                      className={inputCls}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(i, "description", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className={inputCls}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            i,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputCls}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            i,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        UoM
                      </label>
                      <input
                        className={inputCls}
                        value={item.unitOfMeasure}
                        onChange={(e) =>
                          updateItem(i, "unitOfMeasure", e.target.value)
                        }
                        placeholder="e.g. pcs"
                      />
                    </div>
                  </div>
                  <p className="text-right text-sm text-gray-500">
                    Subtotal:{" "}
                    <span className="font-semibold text-gray-800">
                      {(
                        Number(item.quantity) * Number(item.unitPrice)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              ))}

              <div className="pt-2 border-t border-gray-100 text-right">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {form?.currency}{" "}
                  {totalAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 py-3 border border-brand-500 text-brand-500 rounded-xl font-medium hover:bg-brand-50 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-60"
              >
                {submitting
                  ? "Submitting..."
                  : form?.requiresApproval
                    ? "Submit for Approval"
                    : "Submit to NRS"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
