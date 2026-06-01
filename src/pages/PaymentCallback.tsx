import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { paymentApi } from "../lib/api";
import { SkeletonPaymentCallback } from "../components/ui/skeleton/Skeleton";

type Status = "loading" | "success" | "failed";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const reference =
      searchParams.get("reference") ?? searchParams.get("trxref");
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found. Please contact support.");
      return;
    }

    paymentApi
      .verify(reference)
      .then((result) => {
        if (result.isSuccessful) {
          setStatus("success");
          setMessage(
            result.message ||
              "Payment successful! Your account is being activated.",
          );
        } else {
          setStatus("failed");
          setMessage(result.message || "Payment verification failed.");
        }
      })
      .catch(() => {
        setStatus("failed");
        setMessage("Unable to verify payment. Please contact support.");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-4">
          <img
            src="/images/logo/logo.svg"
            alt="Aegis NRS"
            className="h-10 mx-auto dark:hidden"
          />
          <img
            src="/images/logo/logo-dark.svg"
            alt="Aegis NRS"
            className="h-10 mx-auto hidden dark:block"
          />
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-2 py-6">
            <SkeletonPaymentCallback />
            <p className="text-gray-600 dark:text-gray-400">
              Verifying your payment...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="py-4">
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
              Payment Successful!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Your login credentials have been sent to your registered email
              address. Please check your inbox and sign in to complete your
              business onboarding.
            </p>
            <button
              onClick={() => navigate("/signin")}
              className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="py-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Payment Failed
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {message}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/signup")}
                className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
              >
                Try Again
              </button>
              <a
                href="mailto:support@aegisnrs.com"
                className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Contact Support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
