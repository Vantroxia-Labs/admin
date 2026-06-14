import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { paymentApi, type SubscriptionPlan } from "../../lib/api";
import toast from "react-hot-toast";

const tierFeatures: Record<string, string[]> = {
  SaaS: [
    "Create invoices on the portal",
    "Manage parties and items",
    "Approval workflow",
    "View received invoices",
    "Portal dashboard",
  ],
  SFTP: [
    "Upload invoices via SFTP",
    "Update payment status",
    "View received invoices",
    "Portal dashboard (read)",
    "SFTP credentials provided",
  ],
  ApiOnly: [
    "Submit invoices via API",
    "Update payment status via portal",
    "View received invoices",
    "API key provided",
    "Portal dashboard (read)",
  ],
};

export default function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    paymentApi
      .getPlans()
      .then((result) => setPlans(result))
      .catch(() => {
        toast.error("Unable to load subscription plans right now.");
        setPlans([]);
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  const featuredPlanId = useMemo(() => {
    if (plans.length === 0) {
      return null;
    }

    const byPrice = [...plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    return byPrice[Math.floor(byPrice.length / 2)]?.id ?? byPrice[0].id;
  }, [plans]);

  return (
    <>
      <PageMeta
        title="Pricing — Aegis Remit"
        description="Simple, transparent pricing for Aegis Remit e-invoicing and VAT compliance platform."
      />

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-600 dark:text-gray-300">
              Choose the plan that fits your business. Upgrade or downgrade anytime.
            </p>
          </div>

          {loadingPlans ? (
            <div className="mt-16 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              Pricing is currently unavailable. Please try again shortly.
            </div>
          ) : (
            <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.id === featuredPlanId
                    ? "border-brand-500 dark:border-brand-400 shadow-lg ring-1 ring-brand-500/20"
                    : "border-gray-200 dark:border-gray-700"
                } bg-white dark:bg-gray-900`}
              >
                {plan.id === featuredPlanId && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.planName}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.monthlyPrice <= 0 ? "Free" : `₦${plan.monthlyPrice.toLocaleString()}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      /month
                    </span>
                  )}
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {(tierFeatures[plan.tier] ?? ["Plan capabilities available after sign in"]).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-5 w-5 shrink-0 text-brand-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.id === featuredPlanId
                      ? "bg-brand-500 text-white hover:bg-brand-600"
                      : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  Get Started
                </Link>
              </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
