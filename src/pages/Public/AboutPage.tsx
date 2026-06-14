import PageMeta from "../../components/common/PageMeta";

export default function AboutPage() {
  return (
    <>
      <PageMeta
        title="About — Aegis Remit"
        description="Learn about Aegis Remit's mission to simplify e-invoicing and VAT compliance for Nigerian businesses."
      />

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            About Aegis Remit
          </h1>

          <div className="mt-8 space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>
              Aegis Remit is a Nigerian fintech platform built to simplify electronic invoicing
              and VAT compliance. We provide a complete solution for businesses to generate
              FIRS-compliant invoices, collect payments, and manage tax obligations — all in
              one place.
            </p>
            <p>
              Our platform is designed for businesses of all sizes — from sole proprietors who
              need a simple way to create and send invoices, to enterprises that require
              automated SFTP-based integrations and multi-user management.
            </p>
            <p>
              Built as a modern multi-tenant SaaS platform, Aegis Remit ensures each business
              gets its own isolated data environment while benefiting from shared infrastructure,
              continuous updates, and enterprise-grade security.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { stat: "FIRS", label: "Compliant" },
              { stat: "24/7", label: "Platform Uptime" },
              { stat: "Multi-Tenant", label: "Architecture" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center"
              >
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                  {item.stat}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed">
              To make tax compliance effortless for every Nigerian business. We believe that
              managing invoices and VAT should not be a burden — it should be automated,
              transparent, and affordable.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
