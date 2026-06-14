import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ChangePassword from "./pages/AuthPages/ChangePassword";
import NotFound from "./pages/OtherPage/NotFound";
import Profile from "./pages/Profile/Profile";
import Home from "./pages/Dashboard/Home";
import InvoiceList from "./pages/Invoices/InvoiceList";
import CreateInvoice from "./pages/Invoices/CreateInvoice";
import ReceivedInvoiceList from "./pages/Invoices/ReceivedInvoiceList";
import PartyList from "./pages/Parties/PartyList";
import ItemList from "./pages/Items/ItemList";
import UserList from "./pages/Users/UserList";
import Settings from "./pages/Settings/Settings";
import Analytics from "./pages/Reports/Analytics";
import Schedules from "./pages/Reports/Schedules";
import InvoiceDetail from "./pages/Invoices/InvoiceDetail";
import Onboarding from "./pages/Onboarding";
import PaymentCallback from "./pages/PaymentCallback";
import AppLayout from "./layout/AppLayout";
import PublicLayout from "./layout/PublicLayout";
import LandingPage from "./pages/Public/LandingPage";
import AboutPage from "./pages/Public/AboutPage";
import PricingPage from "./pages/Public/PricingPage";
import { PrivateRoute } from "./components/common/PrivateRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public marketing pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/pricing" element={<PricingPage />} />
          </Route>

          {/* Protected routes — require authentication */}
          <Route element={<PrivateRoute />}>
            {/* Main app layout (sidebar + header) */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/create" element={<CreateInvoice />} />
              <Route path="/received-invoices" element={<ReceivedInvoiceList />} />
              <Route path="/parties" element={<PartyList />} />
              <Route path="/items" element={<ItemList />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reports/vat-analytics" element={<Analytics />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/reports/analytics" element={<Analytics />} />
              <Route path="/reports/schedules" element={<Schedules />} />
            </Route>

            {/* Routes that use their own full-screen layout */}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>

          {/* Public auth routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
