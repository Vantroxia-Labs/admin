/**
 * MOCK DATA — for UI review only.
 * Set VITE_USE_MOCK = false in .env when the backend is ready.
 *
 * Switch active user role by changing VITE_MOCK_USER_ROLE in .env:
 *   CLIENT_ADMIN  — business admin (Chidi Okonkwo) - default
 *   CLIENT_USER   — read-only business user (Ngozi Eze)
 *   AEGIS_ADMIN   — platform super-admin (Emeka Adeyemi)
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// Dummy QR code SVG that visually resembles a FIRS-generated QR (finder patterns + data dots)
const _qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="white"/><rect x="0" y="0" width="7" height="7" fill="black"/><rect x="1" y="1" width="5" height="5" fill="white"/><rect x="2" y="2" width="3" height="3" fill="black"/><rect x="14" y="0" width="7" height="7" fill="black"/><rect x="15" y="1" width="5" height="5" fill="white"/><rect x="16" y="2" width="3" height="3" fill="black"/><rect x="0" y="14" width="7" height="7" fill="black"/><rect x="1" y="15" width="5" height="5" fill="white"/><rect x="2" y="16" width="3" height="3" fill="black"/><rect x="8" y="6" width="1" height="1" fill="black"/><rect x="10" y="6" width="1" height="1" fill="black"/><rect x="12" y="6" width="1" height="1" fill="black"/><rect x="6" y="8" width="1" height="1" fill="black"/><rect x="6" y="10" width="1" height="1" fill="black"/><rect x="6" y="12" width="1" height="1" fill="black"/><rect x="8" y="8" width="1" height="1" fill="black"/><rect x="10" y="9" width="1" height="1" fill="black"/><rect x="12" y="8" width="1" height="1" fill="black"/><rect x="9" y="11" width="1" height="1" fill="black"/><rect x="11" y="10" width="1" height="1" fill="black"/><rect x="13" y="11" width="1" height="1" fill="black"/><rect x="8" y="13" width="1" height="1" fill="black"/><rect x="10" y="12" width="1" height="1" fill="black"/><rect x="12" y="13" width="1" height="1" fill="black"/><rect x="14" y="8" width="1" height="1" fill="black"/><rect x="16" y="9" width="1" height="1" fill="black"/><rect x="18" y="8" width="1" height="1" fill="black"/><rect x="20" y="9" width="1" height="1" fill="black"/><rect x="15" y="11" width="1" height="1" fill="black"/><rect x="17" y="10" width="1" height="1" fill="black"/><rect x="19" y="11" width="1" height="1" fill="black"/><rect x="14" y="13" width="1" height="1" fill="black"/><rect x="16" y="12" width="1" height="1" fill="black"/><rect x="18" y="13" width="1" height="1" fill="black"/><rect x="20" y="12" width="1" height="1" fill="black"/><rect x="8" y="14" width="1" height="1" fill="black"/><rect x="10" y="15" width="1" height="1" fill="black"/><rect x="12" y="14" width="1" height="1" fill="black"/><rect x="9" y="17" width="1" height="1" fill="black"/><rect x="11" y="16" width="1" height="1" fill="black"/><rect x="13" y="17" width="1" height="1" fill="black"/><rect x="8" y="19" width="1" height="1" fill="black"/><rect x="10" y="18" width="1" height="1" fill="black"/><rect x="12" y="19" width="1" height="1" fill="black"/><rect x="14" y="14" width="1" height="1" fill="black"/><rect x="16" y="15" width="1" height="1" fill="black"/><rect x="18" y="14" width="1" height="1" fill="black"/><rect x="20" y="15" width="1" height="1" fill="black"/><rect x="15" y="17" width="1" height="1" fill="black"/><rect x="17" y="16" width="1" height="1" fill="black"/><rect x="19" y="17" width="1" height="1" fill="black"/><rect x="14" y="19" width="1" height="1" fill="black"/><rect x="16" y="18" width="1" height="1" fill="black"/><rect x="18" y="19" width="1" height="1" fill="black"/><rect x="20" y="18" width="1" height="1" fill="black"/></svg>`;
export const MOCK_QR_IMAGE: string = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(_qrSvg)}`;

/** Page size used for client-side mock pagination */
export const MOCK_PAGE_SIZE = 5;

// ─── User Presets ─────────────────────────────────────────────────────────────
export const MOCK_USER_CLIENT_ADMIN = {
  userId: "mock-user-001",
  businessId: "mock-biz-001",
  firstName: "Chidi",
  lastName: "Okonkwo",
  email: "chidi.okonkwo@acmeng.com",
  roles: ["Admin"],
  permissions: ["invoice:create", "invoice:approve", "party:manage", "user:manage"],
  isAegisUser: false,
  aegisRole: undefined as string | undefined,
  subscriptionTier: "SaaS",
  mustChangePassword: false,
};

export const MOCK_USER_CLIENT_USER = {
  userId: "mock-user-002",
  businessId: "mock-biz-001",
  firstName: "Ngozi",
  lastName: "Eze",
  email: "ngozi.eze@acmeng.com",
  roles: ["User"],
  permissions: ["invoice:view", "party:view"],
  isAegisUser: false,
  aegisRole: undefined as string | undefined,
  subscriptionTier: "SaaS",
  mustChangePassword: false,
};

export const MOCK_USER_AEGIS_ADMIN = {
  userId: "aegis-admin-001",
  businessId: undefined as string | undefined,
  firstName: "Emeka",
  lastName: "Adeyemi",
  email: "emeka.adeyemi@aegisnrs.com",
  roles: ["Aegis"],
  permissions: [],
  isAegisUser: true,
  aegisRole: "SuperAdmin",
  subscriptionTier: undefined as string | undefined,
  mustChangePassword: false,
};

// ── Active user based on .env configuration ──────────────────────────────────
const mockUserRole = import.meta.env.VITE_MOCK_USER_ROLE || 'CLIENT_ADMIN';

export const MOCK_USER = 
  mockUserRole === 'CLIENT_USER' ? MOCK_USER_CLIENT_USER :
  mockUserRole === 'AEGIS_ADMIN' ? MOCK_USER_AEGIS_ADMIN :
  MOCK_USER_CLIENT_ADMIN;
// Fallback to CLIENT_ADMIN if invalid role specified

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const MOCK_DASHBOARD_STATS = {
  // Business
  totalBusinesses: 47,
  activeBusinesses: 38,
  suspendedBusinesses: 3,
  pendingOnboardings: 6,
  expiredSubscriptions: 2,
  saaSBusinesses: 21,
  onPremiseBusinesses: 0,
  portalPlanBusinesses: 21,
  sftpPlanBusinesses: 14,
  apiPlanBusinesses: 12,
  pendingRegistrations: 5,
  // Invoices
  totalInvoices: 284,
  totalInvoicesThisMonth: 42,
  draftInvoices: 18,
  pendingApprovalInvoices: 9,
  submittedToNRS: 197,
  confirmedByNRS: 183,
  rejectedInvoices: 7,
  portalCreatedInvoices: 140,
  sftpCreatedInvoices: 92,
  apiCreatedInvoices: 52,
  // Financial
  totalInvoiceValue: 185_400_000,
  totalVatCollected: 13_905_000,
  totalInvoiceValueThisMonth: 24_300_000,
  totalVatThisMonth: 1_822_500,
  // IRN
  totalIRNsGenerated: 183,
  pendingIRNs: 14,
  // Payment
  paidInvoices: 142,
  unpaidInvoices: 89,
  partiallyPaidInvoices: 53,
  // Received
  totalReceivedInvoices: 76,
};

// ─── Invoices (15 rows → 3 pages of 5) ───────────────────────────────────────
export const MOCK_INVOICES = [
  { id: "inv-001", invoiceCode: "INV-2025-0042", irn: "FIR20250042ACME0000001", issueDate: "2025-03-20", dueDate: "2025-04-20", totalAmount: 4_720_000, totalTaxAmount: 354_000, status: "TRANSMITTED", paymentStatus: "PAID", source: "Portal", partyName: "Dangote Industries Ltd", qrCodeImage: MOCK_QR_IMAGE },
  { id: "inv-002", invoiceCode: "INV-2025-0041", irn: "FIR20250041ACME0000002", issueDate: "2025-03-18", dueDate: "2025-04-18", totalAmount: 1_850_000, totalTaxAmount: 138_750, status: "SUBMITTED", paymentStatus: "PENDING", source: "Portal", partyName: "MTN Nigeria Comm. Plc", qrCodeImage: MOCK_QR_IMAGE },
  { id: "inv-003", invoiceCode: "INV-2025-0040", irn: "FIR20250040ACME0000003", issueDate: "2025-03-15", dueDate: "2025-04-15", totalAmount: 920_000, totalTaxAmount: 69_000, status: "PENDING_APPROVAL", paymentStatus: "PENDING", source: "Portal", partyName: "Zenith Bank Plc", qrCodeImage: MOCK_QR_IMAGE },
  { id: "inv-004", invoiceCode: "INV-2025-0039", irn: "FIR20250039ACME0000004", issueDate: "2025-03-10", dueDate: "2025-04-10", totalAmount: 560_000, totalTaxAmount: 42_000, status: "DRAFT", paymentStatus: "PENDING", source: "Portal", partyName: "First Bank of Nigeria" },
  { id: "inv-005", invoiceCode: "INV-2025-0038", irn: "FIR20250038ACME0000005", issueDate: "2025-03-05", dueDate: "2025-04-05", totalAmount: 2_300_000, totalTaxAmount: 172_500, status: "TRANSMITTED", paymentStatus: "PENDING", source: "Portal", partyName: "Airtel Nigeria Ltd" },
  { id: "inv-006", invoiceCode: "INV-2025-0037", irn: "FIR20250037ACME0000006", issueDate: "2025-02-28", dueDate: "2025-03-28", totalAmount: 780_000, totalTaxAmount: 58_500, status: "REJECTED", paymentStatus: "PENDING", source: "Portal", partyName: "Nestle Nigeria Plc" },
  { id: "inv-007", invoiceCode: "INV-2025-0036", irn: "FIR20250036ACME0000007", issueDate: "2025-02-20", dueDate: "2025-03-20", totalAmount: 3_120_000, totalTaxAmount: 234_000, status: "TRANSMITTED", paymentStatus: "PAID", source: "Portal", partyName: "Dangote Industries Ltd" },
  { id: "inv-008", invoiceCode: "INV-2025-0035", irn: "FIR20250035ACME0000008", issueDate: "2025-02-15", dueDate: undefined, totalAmount: 490_000, totalTaxAmount: 36_750, status: "APPROVED", paymentStatus: "PENDING", source: "Portal", partyName: "Unilever Nigeria Plc" },
  { id: "inv-009", invoiceCode: "INV-2025-0034", irn: "FIR20250034ACME0000009", issueDate: "2025-02-10", dueDate: "2025-03-10", totalAmount: 6_400_000, totalTaxAmount: 480_000, status: "TRANSMITTED", paymentStatus: "PAID", source: "Portal", partyName: "Stanbic IBTC Bank Plc" },
  { id: "inv-010", invoiceCode: "INV-2025-0033", irn: "FIR20250033ACME0000010", issueDate: "2025-02-05", dueDate: "2025-03-05", totalAmount: 1_100_000, totalTaxAmount: 82_500, status: "DRAFT", paymentStatus: "PENDING", source: "Portal", partyName: "Access Bank Plc" },
  { id: "inv-011", invoiceCode: "INV-2025-0032", irn: "FIR20250032ACME0000011", issueDate: "2025-01-28", dueDate: "2025-02-28", totalAmount: 3_750_000, totalTaxAmount: 281_250, status: "TRANSMITTED", paymentStatus: "PAID", source: "Portal", partyName: "Guaranty Trust Bank Plc" },
  { id: "inv-012", invoiceCode: "INV-2025-0031", irn: "FIR20250031ACME0000012", issueDate: "2025-01-20", dueDate: "2025-02-20", totalAmount: 870_000, totalTaxAmount: 65_250, status: "SUBMITTED", paymentStatus: "PENDING", source: "Portal", partyName: "Nigerian Breweries Plc" },
  { id: "inv-013", invoiceCode: "INV-2025-0030", irn: "FIR20250030ACME0000013", issueDate: "2025-01-15", dueDate: "2025-02-15", totalAmount: 2_050_000, totalTaxAmount: 153_750, status: "PENDING_APPROVAL", paymentStatus: "PENDING", source: "Portal", partyName: "Lafarge Africa Plc" },
  { id: "inv-014", invoiceCode: "INV-2025-0029", irn: "FIR20250029ACME0000014", issueDate: "2025-01-10", dueDate: "2025-02-10", totalAmount: 5_200_000, totalTaxAmount: 390_000, status: "TRANSMITTED", paymentStatus: "PAID", source: "Portal", partyName: "Flour Mills of Nigeria" },
  { id: "inv-015", invoiceCode: "INV-2025-0028", irn: "FIR20250028ACME0000015", issueDate: "2025-01-05", dueDate: "2025-02-05", totalAmount: 330_000, totalTaxAmount: 24_750, status: "DRAFT", paymentStatus: "PENDING", source: "Portal", partyName: "Zenith Bank Plc" },
];

// ─── Flow Rule ───────────────────────────────────────────────────────────────
export const MOCK_FLOW_RULE = {
  id: "rule-001",
  name: "Standard Approval Threshold",
  description: "Invoices above this amount require admin approval",
  minAmount: 1_000_000,
  maxAmount: 999_999_999_999,
  requiresClientAdminApproval: true,
  priority: 1,
};

// ─── VAT Remittance Report ────────────────────────────────────────────────────
const _y = new Date().getFullYear();
export const MOCK_VAT_REPORT = {
  startDate: `${_y}-01-01`,
  endDate: `${_y}-12-31`,
  totalInvoiceCount: 32,
  totalTaxableAmount: 15_840_000,
  totalVatAmount: 1_188_000,
  periods: [
    { year: _y, month: 1, monthName: "January",  invoiceCount: 5, taxableAmount: 2_100_000, vatAmount: 157_500 },
    { year: _y, month: 2, monthName: "February", invoiceCount: 4, taxableAmount: 1_840_000, vatAmount: 138_000 },
    { year: _y, month: 3, monthName: "March",    invoiceCount: 8, taxableAmount: 4_720_000, vatAmount: 354_000 },
    { year: _y, month: 4, monthName: "April",    invoiceCount: 3, taxableAmount: 1_560_000, vatAmount: 117_000 },
    { year: _y, month: 5, monthName: "May",      invoiceCount: 6, taxableAmount: 2_300_000, vatAmount: 172_500 },
    { year: _y, month: 6, monthName: "June",     invoiceCount: 3, taxableAmount: 1_850_000, vatAmount: 138_750 },
    { year: _y, month: 7, monthName: "July",     invoiceCount: 3, taxableAmount: 1_470_000, vatAmount: 110_250 },
  ],
};

// ─── Received Invoices (8 rows → 2 pages of 5) ────────────────────────────────
export const MOCK_RECEIVED_INVOICES = [
  { id: "rec-001", invoiceCode: "SUPINV-2025-0018", irn: "FIR20250018SUPP0000001", issueDate: "2025-03-22", dueDate: "2025-04-22", totalAmount: 3_500_000, totalTaxAmount: 262_500, status: "ConfirmedByNRS", paymentStatus: "PAID", source: "SFTP", partyName: "Lafarge Africa Plc" },
  { id: "rec-002", invoiceCode: "SUPINV-2025-0017", irn: "FIR20250017SUPP0000002", issueDate: "2025-03-18", dueDate: "2025-04-18", totalAmount: 1_200_000, totalTaxAmount: 90_000, status: "ConfirmedByNRS", paymentStatus: "PAID", source: "API", partyName: "Nigerian Breweries Plc" },
  { id: "rec-003", invoiceCode: "SUPINV-2025-0016", irn: undefined, issueDate: "2025-03-10", dueDate: "2025-04-10", totalAmount: 670_000, totalTaxAmount: 50_250, status: "SubmittedToNRS", paymentStatus: "PENDING", source: "SFTP", partyName: "Flour Mills of Nigeria" },
  { id: "rec-004", invoiceCode: "SUPINV-2025-0015", irn: "FIR20250015SUPP0000004", issueDate: "2025-03-05", dueDate: "2025-04-05", totalAmount: 4_800_000, totalTaxAmount: 360_000, status: "ConfirmedByNRS", paymentStatus: "PAID", source: "API", partyName: "Dangote Cement Plc" },
  { id: "rec-005", invoiceCode: "SUPINV-2025-0014", irn: undefined, issueDate: "2025-02-25", dueDate: "2025-03-25", totalAmount: 990_000, totalTaxAmount: 74_250, status: "Rejected", paymentStatus: "PENDING", source: "SFTP", partyName: "Conoil Plc" },
  { id: "rec-006", invoiceCode: "SUPINV-2025-0013", irn: "FIR20250013SUPP0000006", issueDate: "2025-02-18", dueDate: "2025-03-18", totalAmount: 2_150_000, totalTaxAmount: 161_250, status: "ConfirmedByNRS", paymentStatus: "PENDING", source: "API", partyName: "Okomu Oil Palm Plc" },
  { id: "rec-007", invoiceCode: "SUPINV-2025-0012", irn: undefined, issueDate: "2025-02-10", dueDate: "2025-03-10", totalAmount: 580_000, totalTaxAmount: 43_500, status: "SubmittedToNRS", paymentStatus: "PAID", source: "SFTP", partyName: "Honeywell Flour Mills Plc" },
  { id: "rec-008", invoiceCode: "SUPINV-2025-0011", irn: "FIR20250011SUPP0000008", issueDate: "2025-02-01", dueDate: "2025-03-01", totalAmount: 7_200_000, totalTaxAmount: 540_000, status: "ConfirmedByNRS", paymentStatus: "PAID", source: "API", partyName: "Seplat Energy Plc" },
];

// ─── Parties (12 rows → 3 pages of 5) ────────────────────────────────────────
export const MOCK_PARTIES = [
  { id: "party-001", name: "Dangote Industries Ltd", taxIdentificationNumber: "12345678-0001", email: "invoices@dangote.com", phone: "+234 803 000 0001", address: { street: "2 Cement Close", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101233" } },
  { id: "party-002", name: "MTN Nigeria Comm. Plc", taxIdentificationNumber: "12345678-0002", email: "ap@mtnnigeria.net", phone: "+234 803 000 0002", address: { street: "MTN Plaza, Falomo", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101230" } },
  { id: "party-003", name: "Zenith Bank Plc", taxIdentificationNumber: "12345678-0003", email: "accounts@zenithbank.com", phone: "+234 803 000 0003", address: { street: "84 Ajose Adeogun St", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101241" } },
  { id: "party-004", name: "First Bank of Nigeria", taxIdentificationNumber: "12345678-0004", email: "payables@firstbanknigeria.com", phone: "+234 803 000 0004", address: { street: "Samuel Asabia House, 35 Marina", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "102273" } },
  { id: "party-005", name: "Airtel Nigeria Ltd", taxIdentificationNumber: "12345678-0005", email: "finance@airtel.com.ng", phone: "+234 803 000 0005", address: { street: "Plot 1, Hakeem Balogun St", city: "Abuja", state: "FCT", country: "Nigeria", postalCode: "900108" } },
  { id: "party-006", name: "Nestle Nigeria Plc", taxIdentificationNumber: "12345678-0006", email: "accounts@nestle.com.ng", phone: "+234 803 000 0006", address: { street: "22-24 Industrial Avenue", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101233" } },
  { id: "party-007", name: "Unilever Nigeria Plc", taxIdentificationNumber: "12345678-0007", email: "finance@unilever.com.ng", phone: "+234 803 000 0007", address: { street: "1 Billings Way, Oregun", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "100001" } },
  { id: "party-008", name: "Guaranty Trust Bank Plc", taxIdentificationNumber: "12345678-0008", email: "ap@gtbank.com", phone: "+234 803 000 0008", address: { street: "635 Akin Adesola St, V/I", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101241" } },
  { id: "party-009", name: "Nigerian Breweries Plc", taxIdentificationNumber: "12345678-0009", email: "accounts@nigerianbreweries.com", phone: "+234 803 000 0009", address: { street: "1 Abebe Village Rd", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "102243" } },
  { id: "party-010", name: "Lafarge Africa Plc", taxIdentificationNumber: "12345678-0010", email: "finance@lafarge.com.ng", phone: "+234 803 000 0010", address: { street: "27B Gerrard Rd, Ikoyi", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101233" } },
  { id: "party-011", name: "Access Bank Plc", taxIdentificationNumber: "12345678-0011", email: "ap@accessbankplc.com", phone: "+234 803 000 0011", address: { street: "999c Danmole St, V/I", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101241" } },
  { id: "party-012", name: "Stanbic IBTC Bank Plc", taxIdentificationNumber: "12345678-0012", email: "accounts@stanbicibtc.com", phone: "+234 803 000 0012", address: { street: "Walter Carrington Crescent, V/I", city: "Lagos", state: "Lagos", country: "Nigeria", postalCode: "101241" } },
];

// ─── Business Items (10 rows → 2 pages of 5) ─────────────────────────────────
export const MOCK_ITEMS = [
  { id: "item-001", itemCode: "CNSLT-001", description: "IT Consulting Services (per hour)", unitPrice: 75_000, taxCategories: ["STANDARD_VAT"] },
  { id: "item-002", itemCode: "SW-LIC-001", description: "Enterprise Software License (annual)", unitPrice: 2_400_000, taxCategories: ["STANDARD_VAT"] },
  { id: "item-003", itemCode: "MAINT-001", description: "System Maintenance & Support (monthly)", unitPrice: 450_000, taxCategories: ["STANDARD_VAT"] },
  { id: "item-004", itemCode: "TRAIN-001", description: "Staff Training Program (per session)", unitPrice: 320_000, taxCategories: ["ZERO_VAT"] },
  { id: "item-005", itemCode: "CLOUD-001", description: "Cloud Hosting Services (per month)", unitPrice: 180_000, taxCategories: ["STANDARD_VAT"] },
  { id: "item-006", itemCode: "DATA-001", description: "Data Analytics & Reporting", unitPrice: 650_000, taxCategories: ["STANDARD_VAT"] },
  { id: "item-007", itemCode: "DEV-001", description: "Custom Software Development (per sprint)", unitPrice: 1_200_000, taxCategories: ["STANDARD_VAT"] },
  { id: "item-008", itemCode: "AUDIT-001", description: "IT Security Audit & Assessment", unitPrice: 800_000, taxCategories: ["EXEMPTED"] },
  { id: "item-009", itemCode: "INTG-001", description: "API Integration Services", unitPrice: 550_000, taxCategories: ["STANDARD_VAT"] },
  { id: "item-010", itemCode: "PMO-001", description: "Project Management Office (per month)", unitPrice: 380_000, taxCategories: ["STANDARD_VAT"] },
];

// ─── FIRS Tax Categories ───────────────────────────────────────────────────────
export const MOCK_TAX_CATEGORIES = [
  { code: "STANDARD_VAT", value: "Standard Value-Added Tax", percent: "7.5" },
  { code: "REDUCED_VAT", value: "Reduced Value-Added Tax", percent: "7.5" },
  { code: "ZERO_VAT", value: "Zero Value-Added Tax", percent: "0.0" },
  { code: "STANDARD_GST", value: "Standard Goods and Services Tax", percent: "Not Available" },
  { code: "REDUCED_GST", value: "Reduced Goods and Services Tax", percent: "Not Available" },
  { code: "ZERO_GST", value: "Zero Goods and Services Tax", percent: "Not Available" },
  { code: "STATE_SALES_TAX", value: "State Sales Tax", percent: "Not Available" },
  { code: "LOCAL_SALES_TAX", value: "Local Sales Tax", percent: "Not Available" },
  { code: "ALCOHOL_EXCISE_TAX", value: "Alcohol Excise Tax", percent: "Not Available" },
  { code: "TOBACCO_EXCISE_TAX", value: "Tobacco Excise Tax", percent: "Not Available" },
  { code: "FUEL_EXCISE_TAX", value: "Fuel Excise Tax", percent: "Not Available" },
  { code: "CORPORATE_INCOME_TAX", value: "Corporate Income Tax", percent: "Not Available" },
  { code: "PERSONAL_INCOME_TAX", value: "Personal Income Tax", percent: "Not Available" },
  { code: "SOCIAL_SECURITY_TAX", value: "Social Security Tax", percent: "Not Available" },
  { code: "MEDICARE_TAX", value: "Medicare Tax", percent: "Not Available" },
  { code: "REAL_ESTATE_TAX", value: "Real Estate Tax", percent: "Not Available" },
  { code: "PERSONAL_PROPERTY_TAX", value: "Personal Property Tax", percent: "Not Available" },
  { code: "CARBON_TAX", value: "Carbon Tax", percent: "Not Available" },
  { code: "PLASTIC_TAX", value: "Plastic Tax", percent: "Not Available" },
  { code: "IMPORT_DUTY", value: "Import Duty", percent: "Not Available" },
  { code: "EXPORT_DUTY", value: "Export Duty", percent: "Not Available" },
  { code: "LUXURY_TAX", value: "Luxury Tax", percent: "Not Available" },
  { code: "SERVICE_TAX", value: "Service Tax", percent: "Not Available" },
  { code: "TOURISM_TAX", value: "Tourism Tax", percent: "Not Available" },
  { code: "WITHHOLDING_TAX", value: "Withholding Tax", percent: "Not Available" },
  { code: "STAMP_DUTY", value: "Stamp Duty", percent: "Not Available" },
  { code: "EXEMPTED", value: "Tax Exemption", percent: "0.0" },
];

// ─── Users (8 rows → 2 pages of 5) ───────────────────────────────────────────
export const MOCK_USERS = [
  { id: "user-001", NRStName: "Chidi", lastName: "Okonkwo", email: "chidi.okonkwo@acmeng.com", status: "Active", roles: ["Admin"], lastLogin: "2025-03-29T08:30:00Z" },
  { id: "user-002", NRStName: "Ngozi", lastName: "Eze", email: "ngozi.eze@acmeng.com", status: "Active", roles: ["User"], lastLogin: "2025-03-28T14:15:00Z" },
  { id: "user-003", NRStName: "Babatunde", lastName: "Adewale", email: "bade.adewale@acmeng.com", status: "Active", roles: ["User"], lastLogin: "2025-03-27T10:00:00Z" },
  { id: "user-004", NRStName: "Amaka", lastName: "Obi", email: "amaka.obi@acmeng.com", status: "Inactive", roles: ["User"], lastLogin: "2025-02-10T09:00:00Z" },
  { id: "user-005", NRStName: "Tunde", lastName: "Bakare", email: "tunde.bakare@acmeng.com", status: "Active", roles: ["User"], lastLogin: "2025-03-26T16:45:00Z" },
  { id: "user-006", NRStName: "Chisom", lastName: "Nwosu", email: "chisom.nwosu@acmeng.com", status: "Active", roles: ["User"], lastLogin: "2025-03-25T11:20:00Z" },
  { id: "user-007", NRStName: "Yetunde", lastName: "Afolabi", email: "yetunde.afolabi@acmeng.com", status: "Suspended", roles: ["User"], lastLogin: "2025-01-15T08:00:00Z" },
  { id: "user-008", NRStName: "Emeka", lastName: "Onyekwere", email: "emeka.onyekwere@acmeng.com", status: "Active", roles: ["Admin"], lastLogin: "2025-03-28T09:10:00Z" },
];

// ─── Businesses (for Aegis admin, 12 rows → 3 pages of 5) ────────────────────
export const MOCK_BUSINESSES = [
  { id: "biz-001", name: "Acme Nigeria Ltd", tin: "01234567-0001", status: "Active", subscriptionTier: "SaaS", industry: "Information Technology", contactEmail: "info@acmeng.com", registeredAt: "2024-09-15" },
  { id: "biz-002", name: "TechBridge Solutions Ltd", tin: "01234567-0002", status: "Active", subscriptionTier: "SFTP", industry: "Information Technology", contactEmail: "admin@techbridge.ng", registeredAt: "2024-10-02" },
  { id: "biz-003", name: "Meridian Logistics Ltd", tin: "01234567-0003", status: "Active", subscriptionTier: "ApiOnly", industry: "Transportation & Logistics", contactEmail: "finance@meridian.ng", registeredAt: "2024-10-20" },
  { id: "biz-004", name: "SunPower Energy Ltd", tin: "01234567-0004", status: "Active", subscriptionTier: "SaaS", industry: "Energy & Utilities", contactEmail: "ops@sunpower.ng", registeredAt: "2024-11-05" },
  { id: "biz-005", name: "Brightfield Agro Ltd", tin: "01234567-0005", status: "Suspended", subscriptionTier: "SaaS", industry: "Agriculture", contactEmail: "info@brightfield.ng", registeredAt: "2024-11-18" },
  { id: "biz-006", name: "Chukwuma & Associates", tin: "01234567-0006", status: "Active", subscriptionTier: "SaaS", industry: "Banking & Finance", contactEmail: "accounts@chukwuma.ng", registeredAt: "2024-12-01" },
  { id: "biz-007", name: "Pelican Healthcare Ltd", tin: "01234567-0007", status: "Active", subscriptionTier: "SFTP", industry: "Healthcare", contactEmail: "admin@pelican.ng", registeredAt: "2024-12-10" },
  { id: "biz-008", name: "NovaBuild Construction Ltd", tin: "01234567-0008", status: "Active", subscriptionTier: "ApiOnly", industry: "Construction", contactEmail: "finance@novabuild.ng", registeredAt: "2025-01-08" },
  { id: "biz-009", name: "Apex Media & Comms Ltd", tin: "01234567-0009", status: "Active", subscriptionTier: "SaaS", industry: "Media & Entertainment", contactEmail: "billing@apexmedia.ng", registeredAt: "2025-01-22" },
  { id: "biz-010", name: "Greenline Retail Ltd", tin: "01234567-0010", status: "Pending", subscriptionTier: "SaaS", industry: "Retail & FMCG", contactEmail: "info@greenline.ng", registeredAt: "2025-02-14" },
  { id: "biz-011", name: "Skyview Real Estate Ltd", tin: "01234567-0011", status: "Active", subscriptionTier: "SFTP", industry: "Real Estate", contactEmail: "accounts@skyview.ng", registeredAt: "2025-02-28" },
  { id: "biz-012", name: "Goldmine Mining Resources", tin: "01234567-0012", status: "Active", subscriptionTier: "ApiOnly", industry: "Mining", contactEmail: "finance@goldmine.ng", registeredAt: "2025-03-10" },
];

// ─── Business Profile ─────────────────────────────────────────────────────────
export const MOCK_BUSINESS_PROFILE = {
  id: "mock-biz-001",
  name: "Acme Nigeria Ltd",
  description: "Leading provider of enterprise IT solutions and software services in Nigeria",
  businessRegistrationNumber: "RC-0123456",
  taxIdentificationNumber: "01234567-0001",
  contactEmail: "info@acmeng.com",
  contactPhone: "+234 803 000 0100",
  industry: "Information Technology",
  serviceId: "SVC-NRS-00123",
  firsBusinessId: "NRS-BID-00456",
  isActive: true,
  onboardingCompleted: true,
  registeredAddress: {
    street: "14 Kofo Abayomi Street, Victoria Island",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    postalCode: "101241",
  },
};

// ─── Subscription Plans ───────────────────────────────────────────────────────
export const MOCK_PLANS = [
  { id: "plan-001", planName: "Portal Plan", tier: "SaaS", monthlyPrice: 100_000, annualPrice: 1_000_000, currency: "NGN", description: "Create and manage invoices directly on the Aegis portal" },
  { id: "plan-002", planName: "SFTP Plan", tier: "SFTP", monthlyPrice: 120_000, annualPrice: 1_200_000, currency: "NGN", description: "Upload invoices in bulk via secure SFTP integration" },
  { id: "plan-003", planName: "API Plan", tier: "ApiOnly", monthlyPrice: 150_000, annualPrice: 1_500_000, currency: "NGN", description: "Integrate directly with the NRS API from your own systems" },
];

// ─── Industries ───────────────────────────────────────────────────────────────
export const MOCK_INDUSTRIES = [
  { name: "Agriculture" }, { name: "Banking & Finance" }, { name: "Construction" },
  { name: "Education" }, { name: "Energy & Utilities" }, { name: "Healthcare" },
  { name: "Hospitality & Tourism" }, { name: "Information Technology" },
  { name: "Insurance" }, { name: "Manufacturing" }, { name: "Media & Entertainment" },
  { name: "Mining" }, { name: "Oil & Gas" }, { name: "Real Estate" },
  { name: "Retail & FMCG" }, { name: "Telecommunications" }, { name: "Transportation & Logistics" },
];

// ─── VAT Schedule Types & Mock Data ──────────────────────────────────────────
export interface MockScheduleItem {
  id: string;
  invoiceCode: string;
  irn: string;
  partyName: string;
  partyTin: string;
  issueDate: string;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentStatus: string;
}

export interface MockSchedule {
  id: string;
  year: number;
  month: number;
  monthName: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string; // always 14th of month+1
  status: "Generated" | "Filed";
  filedAt?: string;
  generatedAt: string;
  totalInvoiceCount: number;
  totalTaxableAmount: number;
  totalVatAmount: number;
  items: MockScheduleItem[];
}

const _marchItems: MockScheduleItem[] = [
  { id: "si-m01", invoiceCode: "INV-2026-0042", irn: "FIR20260042ACME0000001", partyName: "Dangote Industries Ltd",    partyTin: "12345678-0001", issueDate: "2026-03-20", taxableAmount: 4_365_116, vatAmount: 327_384, totalAmount: 4_692_500, paymentStatus: "PAID" },
  { id: "si-m02", invoiceCode: "INV-2026-0038", irn: "FIR20260038ACME0000002", partyName: "Airtel Nigeria Ltd",       partyTin: "12345678-0005", issueDate: "2026-03-05", taxableAmount: 2_093_023, vatAmount: 156_977, totalAmount: 2_250_000, paymentStatus: "PENDING" },
  { id: "si-m03", invoiceCode: "INV-2026-0035", irn: "FIR20260035ACME0000003", partyName: "MTN Nigeria Comm. Plc",   partyTin: "12345678-0002", issueDate: "2026-03-10", taxableAmount: 1_720_930, vatAmount: 129_070, totalAmount: 1_850_000, paymentStatus: "PENDING" },
  { id: "si-m04", invoiceCode: "INV-2026-0033", irn: "FIR20260033ACME0000004", partyName: "Guaranty Trust Bank Plc", partyTin: "12345678-0008", issueDate: "2026-03-18", taxableAmount: 3_488_372, vatAmount: 261_628, totalAmount: 3_750_000, paymentStatus: "PAID" },
  { id: "si-m05", invoiceCode: "INV-2026-0030", irn: "FIR20260030ACME0000005", partyName: "Zenith Bank Plc",         partyTin: "12345678-0003", issueDate: "2026-03-22", taxableAmount:   855_814, vatAmount:  64_186, totalAmount:   920_000, paymentStatus: "PENDING" },
  { id: "si-m06", invoiceCode: "INV-2026-0028", irn: "FIR20260028ACME0000006", partyName: "Flour Mills of Nigeria",  partyTin: "12345678-0014", issueDate: "2026-03-25", taxableAmount: 4_837_209, vatAmount: 362_791, totalAmount: 5_200_000, paymentStatus: "PAID" },
  { id: "si-m07", invoiceCode: "INV-2026-0025", irn: "FIR20260025ACME0000007", partyName: "Lafarge Africa Plc",      partyTin: "12345678-0010", issueDate: "2026-03-08", taxableAmount: 1_906_977, vatAmount: 143_023, totalAmount: 2_050_000, paymentStatus: "PENDING" },
  { id: "si-m08", invoiceCode: "INV-2026-0020", irn: "FIR20260020ACME0000008", partyName: "Stanbic IBTC Bank Plc",   partyTin: "12345678-0012", issueDate: "2026-03-14", taxableAmount: 5_953_488, vatAmount: 446_512, totalAmount: 6_400_000, paymentStatus: "PAID" },
];

const _febItems: MockScheduleItem[] = [
  { id: "si-f01", invoiceCode: "INV-2026-0019", irn: "FIR20260019ACME0000001", partyName: "Nigerian Breweries Plc",  partyTin: "12345678-0009", issueDate: "2026-02-28", taxableAmount:   809_302, vatAmount:  60_698, totalAmount:   870_000, paymentStatus: "PAID" },
  { id: "si-f02", invoiceCode: "INV-2026-0017", irn: "FIR20260017ACME0000002", partyName: "Access Bank Plc",         partyTin: "12345678-0011", issueDate: "2026-02-20", taxableAmount: 1_023_256, vatAmount:  76_744, totalAmount: 1_100_000, paymentStatus: "PENDING" },
  { id: "si-f03", invoiceCode: "INV-2026-0015", irn: "FIR20260015ACME0000003", partyName: "Dangote Industries Ltd",  partyTin: "12345678-0001", issueDate: "2026-02-14", taxableAmount: 2_906_977, vatAmount: 218_023, totalAmount: 3_125_000, paymentStatus: "PAID" },
  { id: "si-f04", invoiceCode: "INV-2026-0012", irn: "FIR20260012ACME0000004", partyName: "Nestle Nigeria Plc",      partyTin: "12345678-0006", issueDate: "2026-02-08", taxableAmount:   725_581, vatAmount:  54_419, totalAmount:   780_000, paymentStatus: "PAID" },
  { id: "si-f05", invoiceCode: "INV-2026-0010", irn: "FIR20260010ACME0000005", partyName: "Unilever Nigeria Plc",    partyTin: "12345678-0007", issueDate: "2026-02-03", taxableAmount:   455_814, vatAmount:  34_186, totalAmount:   490_000, paymentStatus: "PENDING" },
  { id: "si-f06", invoiceCode: "INV-2026-0008", irn: "FIR20260008ACME0000006", partyName: "Stanbic IBTC Bank Plc",  partyTin: "12345678-0012", issueDate: "2026-02-18", taxableAmount: 5_953_488, vatAmount: 446_512, totalAmount: 6_400_000, paymentStatus: "PAID" },
];

const _janItems: MockScheduleItem[] = [
  { id: "si-j01", invoiceCode: "INV-2026-0007", irn: "FIR20260007ACME0000001", partyName: "Guaranty Trust Bank Plc", partyTin: "12345678-0008", issueDate: "2026-01-28", taxableAmount: 3_488_372, vatAmount: 261_628, totalAmount: 3_750_000, paymentStatus: "PAID" },
  { id: "si-j02", invoiceCode: "INV-2026-0005", irn: "FIR20260005ACME0000002", partyName: "Flour Mills of Nigeria",  partyTin: "12345678-0014", issueDate: "2026-01-10", taxableAmount: 4_837_209, vatAmount: 362_791, totalAmount: 5_200_000, paymentStatus: "PAID" },
  { id: "si-j03", invoiceCode: "INV-2026-0003", irn: "FIR20260003ACME0000003", partyName: "Lafarge Africa Plc",      partyTin: "12345678-0010", issueDate: "2026-01-15", taxableAmount: 1_906_977, vatAmount: 143_023, totalAmount: 2_050_000, paymentStatus: "PENDING" },
  { id: "si-j04", invoiceCode: "INV-2026-0001", irn: "FIR20260001ACME0000004", partyName: "MTN Nigeria Comm. Plc",   partyTin: "12345678-0002", issueDate: "2026-01-22", taxableAmount: 1_720_930, vatAmount: 129_070, totalAmount: 1_850_000, paymentStatus: "PAID" },
  { id: "si-j05", invoiceCode: "INV-2025-0098", irn: "FIR20250098ACME0000005", partyName: "First Bank of Nigeria",   partyTin: "12345678-0004", issueDate: "2026-01-05", taxableAmount:   520_930, vatAmount:  39_070, totalAmount:   560_000, paymentStatus: "PAID" },
];

export const MOCK_VAT_SCHEDULES: MockSchedule[] = [
  {
    id: "sch-mar-2026", year: 2026, month: 3, monthName: "March",
    periodStart: "2026-03-01", periodEnd: "2026-03-31",
    dueDate: "2026-04-14", status: "Generated",
    generatedAt: "2026-03-30T09:15:00Z",
    totalInvoiceCount: 8,
    totalTaxableAmount: _marchItems.reduce((s, i) => s + i.taxableAmount, 0),
    totalVatAmount: _marchItems.reduce((s, i) => s + i.vatAmount, 0),
    items: _marchItems,
  },
  {
    id: "sch-feb-2026", year: 2026, month: 2, monthName: "February",
    periodStart: "2026-02-01", periodEnd: "2026-02-28",
    dueDate: "2026-03-14", status: "Filed", filedAt: "2026-03-13T14:30:00Z",
    generatedAt: "2026-02-28T10:00:00Z",
    totalInvoiceCount: 6,
    totalTaxableAmount: _febItems.reduce((s, i) => s + i.taxableAmount, 0),
    totalVatAmount: _febItems.reduce((s, i) => s + i.vatAmount, 0),
    items: _febItems,
  },
  {
    id: "sch-jan-2026", year: 2026, month: 1, monthName: "January",
    periodStart: "2026-01-01", periodEnd: "2026-01-31",
    dueDate: "2026-02-14", status: "Filed", filedAt: "2026-02-12T11:00:00Z",
    generatedAt: "2026-01-31T10:00:00Z",
    totalInvoiceCount: 5,
    totalTaxableAmount: _janItems.reduce((s, i) => s + i.taxableAmount, 0),
    totalVatAmount: _janItems.reduce((s, i) => s + i.vatAmount, 0),
    items: _janItems,
  },
  {
    id: "sch-dec-2025", year: 2025, month: 12, monthName: "December",
    periodStart: "2025-12-01", periodEnd: "2025-12-31",
    dueDate: "2026-01-14", status: "Filed", filedAt: "2026-01-13T09:00:00Z",
    generatedAt: "2025-12-31T10:00:00Z",
    totalInvoiceCount: 7, totalTaxableAmount: 33_153_488, totalVatAmount: 2_486_512,
    items: [],
  },
  {
    id: "sch-nov-2025", year: 2025, month: 11, monthName: "November",
    periodStart: "2025-11-01", periodEnd: "2025-11-30",
    dueDate: "2025-12-14", status: "Filed", filedAt: "2025-12-12T10:00:00Z",
    generatedAt: "2025-11-30T10:00:00Z",
    totalInvoiceCount: 6, totalTaxableAmount: 28_400_000, totalVatAmount: 2_130_000,
    items: [],
  },
];

// ─── Analytics V2 Mock Data ───────────────────────────────────────────────────
const _m12 = [
  { y: 2025, m: 4,  name: "Apr" }, { y: 2025, m: 5,  name: "May" },
  { y: 2025, m: 6,  name: "Jun" }, { y: 2025, m: 7,  name: "Jul" },
  { y: 2025, m: 8,  name: "Aug" }, { y: 2025, m: 9,  name: "Sep" },
  { y: 2025, m: 10, name: "Oct" }, { y: 2025, m: 11, name: "Nov" },
  { y: 2025, m: 12, name: "Dec" }, { y: 2026, m: 1,  name: "Jan" },
  { y: 2026, m: 2,  name: "Feb" }, { y: 2026, m: 3,  name: "Mar" },
];
const _sales   = [8_200_000, 9_400_000, 7_800_000, 11_200_000, 13_500_000, 10_800_000, 12_400_000,  9_600_000, 15_200_000, 14_800_000, 11_765_000, 24_315_000];
const _purch   = [3_100_000, 2_800_000, 3_400_000,  4_200_000,  5_100_000,  3_900_000,  4_600_000,  3_700_000,  5_800_000,  5_400_000,  4_765_000,  6_400_000];
const _payment = [6_800_000, 7_200_000, 6_500_000,  9_100_000, 11_200_000,  8_900_000, 10_300_000,  7_800_000, 12_400_000, 11_500_000,  9_200_000, 18_400_000];
const _outVat  = [  615_000,   705_000,   585_000,    840_000,  1_012_500,    810_000,    930_000,    720_000,  1_140_000,  1_110_000,    882_375,  1_823_625];
const _inVat   = [  232_500,   210_000,   255_000,    315_000,    382_500,    292_500,    345_000,    277_500,    435_000,    405_000,    357_375,    480_000];

export const MOCK_ANALYTICS_V2 = {
  generalDashboard: {
    metrics: {
      totalCustomerInvoicesCount: 284, totalCustomerInvoicesAmount: 185_400_000,
      totalVendorInvoicesCount: 76,    totalVendorInvoicesAmount: 47_200_000,
      totalVATOnCustomerInvoices: 13_905_000,  totalVATOnVendorInvoices: 3_540_000,
      totalInvoiceValue: 232_600_000,
      vatOnCustomerPercentageChange: 12.5, vatOnVendorPercentageChange: -3.2,
      totalInvoiceValuePercentageChange: 8.7,
    },
    salesVsPurchases: _m12.map((m, i) => ({ year: m.y, month: m.m, monthName: m.name, name: m.name, salesAmount: _sales[i], purchasesAmount: _purch[i] })),
    vatTrendAnalysis: _m12.map((m, i) => ({ year: m.y, month: m.m, monthName: m.name, name: m.name, outputVAT: _outVat[i], inputVAT: _inVat[i] })),
    salesAndPaymentPerMonth: _m12.map((m, i) => ({ year: m.y, month: m.m, monthName: m.name, name: m.name, sales: _sales[i], payment: _payment[i] })),
    salesByParty: [
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Lafarge Africa Plc",      salesAmount: 45_200_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Nigerian Breweries Plc",  salesAmount: 32_100_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Dangote Industries Ltd",  salesAmount: 28_400_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "MTN Nigeria Comms Plc",   salesAmount: 22_600_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Flour Mills of Nigeria",  salesAmount: 18_900_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Zenith Bank Plc",         salesAmount: 15_400_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Access Bank Plc",         salesAmount: 11_200_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "BUA Group",               salesAmount:  8_700_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Airtel Nigeria Ltd",      salesAmount:  6_400_000 },
      { year: 2026, month: 3, monthName: "Mar", name: "Mar", partyName: "Others",                  salesAmount: 14_500_000 },
    ],
    salesPerRegion: [
      { region: "Lagos", salesAmount: 98_400_000 }, { region: "FCT", salesAmount: 32_100_000 },
      { region: "Rivers", salesAmount: 18_600_000 }, { region: "Kano", salesAmount: 12_300_000 },
      { region: "Ogun", salesAmount: 8_200_000 },    { region: "Others", salesAmount: 15_800_000 },
    ].map(r => ({ year: 2026, month: 3, monthName: "Mar", name: "Mar", region: r.region, salesAmount: r.salesAmount })),
  },
  vatTableDashboard: {
    vatTableByCurrency: _m12.map((m, i) => ({
      year: m.y, month: m.m, monthName: m.name, name: m.name,
      currencyAmounts: [
        { currency: "NGN", currencyName: "Nigerian Naira", amount: Math.round(_outVat[i] * 0.97) },
        { currency: "USD", currencyName: "US Dollar",      amount: Math.round(_outVat[i] * 0.03) },
      ],
    })),
    exemptVATTableByCurrency: _m12.map((m, i) => ({
      year: m.y, month: m.m, monthName: m.name, name: m.name,
      currencyAmounts: [
        { currency: "NGN", currencyName: "Nigerian Naira", amount: Math.round(_sales[i] * 0.008) },
      ],
    })),
    vatTableVsNonVATTable: _m12.map((m, i) => ({
      year: m.y, month: m.m, monthName: m.name, name: m.name,
      salesVatable: Math.round(_sales[i] * 0.925),    salesNonVatable: Math.round(_sales[i] * 0.075),
      purchaseVatable: Math.round(_purch[i] * 0.9),   purchaseNonVatable: Math.round(_purch[i] * 0.1),
    })),
  },
};
