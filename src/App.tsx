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
import AppProviderList from "./pages/AppProviders/AppProviderList";
import BusinessList from "./pages/Businesses/BusinessList";
import VendorGroupList from "./pages/Vendors/VendorGroupList";
import VendorList from "./pages/Vendors/VendorList";
import BroadcastList from "./pages/Broadcasts/BroadcastList";
import BroadcastDetail from "./pages/Broadcasts/BroadcastDetail";
import VendorPortal from "./pages/VendorPortal/VendorPortal";
import { PrivateRoute } from "./components/common/PrivateRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { EnvModeProvider } from "./context/EnvModeContext";

export default function App() {
  return (
    <EnvModeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected routes — require authentication */}
          <Route element={<PrivateRoute />}>
            {/* Main app layout (sidebar + header) */}
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/create" element={<CreateInvoice />} />
              <Route
                path="/received-invoices"
                element={<ReceivedInvoiceList />}
              />
              <Route path="/parties" element={<PartyList />} />
              <Route path="/items" element={<ItemList />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reports/vat-analytics" element={<Analytics />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/reports/analytics" element={<Analytics />} />
              <Route path="/reports/schedules" element={<Schedules />} />
              <Route path="/app-providers" element={<AppProviderList />} />
              <Route path="/businesses" element={<BusinessList />} />
              <Route path="/vendor-groups" element={<VendorGroupList />} />
              <Route path="/vendors" element={<VendorList />} />
              <Route path="/broadcasts" element={<BroadcastList />} />
              <Route path="/broadcasts/:id" element={<BroadcastDetail />} />
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
          <Route path="/vendor-portal/:token" element={<VendorPortal />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </EnvModeProvider>
  );
}
