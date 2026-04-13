import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For small businesses getting started with e-invoicing.",
    features: [
      "Up to 50 invoices/month",
      "FIRS-compliant e-invoices",
      "Basic VAT reports",
      "Single user",
      "Email support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Business",
    price: "₦15,000",
    period: "/month",
    description: "For growing businesses that need more power and integrations.",
    features: [
      "Unlimited invoices",
      "FIRS-compliant e-invoices",
      "Advanced VAT analytics",
      "Up to 10 users",
      "Multi-channel payments",
      "Document storage",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with SFTP integrations and dedicated support.",
    features: [
      "Everything in Business",
      "Unlimited users",
      "SFTP/API integration",
      "Dedicated account manager",
      "Custom SLA",
      "On-premise option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
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

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-brand-500 dark:border-brand-400 shadow-lg ring-1 ring-brand-500/20"
                    : "border-gray-200 dark:border-gray-700"
                } bg-white dark:bg-gray-900`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
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
                  to={plan.name === "Enterprise" ? "/about" : "/signup"}
                  className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-brand-500 text-white hover:bg-brand-600"
                      : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
