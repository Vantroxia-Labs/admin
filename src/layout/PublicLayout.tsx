import { Link, Outlet, useLocation } from "react-router";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
];

const PublicHeader: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo/logo.svg" alt="Aegis Remit" className="h-8 dark:hidden" />
          <img src="/images/logo/logo-dark.svg" alt="Aegis Remit" className="h-8 hidden dark:block" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                pathname === link.to
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/signin"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
};

const PublicFooter: React.FC = () => (
  <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div>
          <img src="/images/logo/logo.svg" alt="Aegis Remit" className="h-8 mb-4 dark:hidden" />
          <img src="/images/logo/logo-dark.svg" alt="Aegis Remit" className="h-8 mb-4 hidden dark:block" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Streamlined e-invoicing and VAT compliance for Nigerian businesses.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Product</h4>
          <ul className="space-y-2">
            <li><Link to="/pricing" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Pricing</Link></li>
            <li><Link to="/about" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">About</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legal</h4>
          <ul className="space-y-2">
            <li><Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Privacy Policy</Link></li>
            <li><Link to="/terms" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Terms of Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Contact</h4>
          <ul className="space-y-2">
            <li className="text-sm text-gray-500 dark:text-gray-400">support@aegisremit.ng</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} Aegis Remit. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
