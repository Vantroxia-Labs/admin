import api, { unwrap } from "./apiClient";
import type { ApiResponse } from "./apiClient";

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  tenantId?: string;
  mustChangePassword: boolean;
  expiresAt: string;
  claims: TokenClaims;
  terminatedSessionCount: number;
  sessionWarning?: string;
}
export interface TokenClaims {
  NRStName?: string;
  lastName?: string;
  email?: string;
  roles: string[];
  permissions: string[];
  businessId?: string;
  branchId?: string;
  isAegisUser: boolean;
  aegisRole?: string;
  subscriptionTier?: string;
}
export interface RegisterPayload {
  adminNRStName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  businessName: string;
  tin?: string;
  platformSubscriptionId: string;
  billingCycle: number; // 0=Monthly, 1=Annual
}
export interface RegisterResponse {
  pendingRegistrationId: string;
  reference: string;
  paymentUrl: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<LoginResponse>>("/auth/login", payload).then(unwrap),

  register: (payload: RegisterPayload) =>
    api
      .post<ApiResponse<RegisterResponse>>("/auth/register", payload)
      .then(unwrap),

  logout: () => api.post("/auth/logout"),

  refresh: () =>
    api
      .post<
        ApiResponse<{ accessToken: string; expiresAt: string }>
      >("/auth/refresh")
      .then(unwrap),

  tokenClaims: () =>
    api.get<ApiResponse<TokenClaims>>("/auth/token-claims").then(unwrap),

  sendOtp: (phoneNo_Email: string) =>
    api.post("/auth/forgot-password-request-otp", { phoneNo_Email }),

  forgotPassword: (payload: {
    otp: string;
    password: string;
    phoneNo_Email: string;
  }) => api.post("/auth/forgot-password", payload),

  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => api.post("/auth/change-password", payload),
};

// ── Payment / Plans ───────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  planName: string;
  tier: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  description: string;
}
export interface PaymentVerification {
  reference: string;
  status: string;
  isSuccessful: boolean;
  businessId?: string;
  message: string;
}

export const paymentApi = {
  getPlans: () =>
    api.get<ApiResponse<SubscriptionPlan[]>>("/payment/plans").then(unwrap),

  verify: (reference: string) =>
    api
      .get<ApiResponse<PaymentVerification>>(`/payment/verify/${reference}`)
      .then(unwrap),
};

// ── Business ──────────────────────────────────────────────────────────────────
export interface BusinessProfile {
  id: string;
  name: string;
  description: string;
  businessRegistrationNumber: string;
  taxIdentificationNumber: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  serviceId: string;
  NRSBusinessId: string;
  isActive: boolean;
  registeredAddress: Address;
  onboardingCompleted?: boolean;
}
export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
export interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  pendingOnboardings: number;
  expiredSubscriptions: number;
  saaSBusinesses: number;
  onPremiseBusinesses: number;
  portalPlanBusinesses: number;
  sftpPlanBusinesses: number;
  apiPlanBusinesses: number;
  totalInvoices: number;
  totalInvoicesThisMonth: number;
  draftInvoices: number;
  pendingApprovalInvoices: number;
  submittedToNRS: number;
  confirmedByNRS: number;
  rejectedInvoices: number;
  portalCreatedInvoices: number;
  sftpCreatedInvoices: number;
  apiCreatedInvoices: number;
  totalInvoiceValue: number;
  totalVatCollected: number;
  totalInvoiceValueThisMonth: number;
  totalVatThisMonth: number;
  totalIRNsGenerated: number;
  pendingIRNs: number;
  paidInvoices: number;
  unpaidInvoices: number;
  partiallyPaidInvoices: number;
  totalReceivedInvoices: number;
  pendingRegistrations: number;
}

export const businessApi = {
  getProfile: () =>
    api.get<ApiResponse<BusinessProfile>>("/business/me").then(unwrap),

  getDashboardStats: () =>
    api
      .get<ApiResponse<DashboardStats>>("/business/dashboard/stats")
      .then(unwrap),

  updateNRSCredentials: (payload: { apiKey: string; clientSecret: string }) =>
    api.patch("/business/update-NRS-credentials", payload),

  updateQrCodeConfig: (payload: { publicKey: string; certificate: string }) =>
    api.patch("/business/update-qrcode-configuration", payload),

  getSubscription: (businessId: string) =>
    api
      .get(`/business/get-subscription/${businessId}`)
      .then((r) => r.data.data),

  updateProfile: (
    payload: Partial<
      Omit<BusinessProfile, "id" | "isActive" | "onboardingCompleted">
    >,
  ) =>
    api
      .patch<ApiResponse<BusinessProfile>>("/business/me", payload)
      .then(unwrap),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export interface InvoiceSummary {
  id: string;
  invoiceCode: string;
  irn?: string;
  issueDate: string;
  dueDate?: string;
  totalAmount: number;
  totalTaxAmount: number;
  status: string;
  paymentStatus: string;
  source: string;
  partyName?: string;
  qrCodeImage?: string;
}
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
export interface DocumentReferenceDto {
  irn: string;
  issueDate: string;
}

export interface CreateInvoicePayload {
  partyId: string;
  issueDate: string;
  dueDate?: string;
  currencyCode: string;
  invoiceTypeCode: string;
  paymentMeansCode?: string;
  note?: string;
  orderReference?: string;
  billingReference?: DocumentReferenceDto[];
  dispatchDocumentReference?: DocumentReferenceDto;
  receiptDocumentReference?: DocumentReferenceDto;
  originatorDocumentReference?: DocumentReferenceDto;
  contractDocumentReference?: DocumentReferenceDto;
  additionalDocumentReferences?: DocumentReferenceDto[];
  items: InvoiceItemPayload[];
}
export interface InvoiceItemPayload {
  businessItemId: string;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
}

// ── NRS ──────────────────────────────────────────────────────────────────────
export interface TaxCategory {
  code: string;
  value: string;
  percent: string; // "7.5", "0.0", "Not Available", or ""
}
export const NRSApi = {
  getTaxCategories: () =>
    api.get<ApiResponse<TaxCategory[]>>("/NRS/gettaxcategories").then(unwrap),
};

export interface UploadInvoiceResult {
  isSuccess: boolean;
  totalObjects: number;
  successfulUploads: number;
  failedUploads: number;
  failedUploadDetails: Record<string, string>;
  message: string;
  statusCodes: number;
}
export interface PipelineStepResult {
  success: boolean;
  message?: string;
}
export interface SubmitInvoiceResult {
  invoiceId: string;
  irn: string;
  currentStatus: string;
  message: string;
  pipeline: {
    validate: PipelineStepResult;
    sign: PipelineStepResult;
    transmit: PipelineStepResult;
  };
}
export interface FlowRule {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  requiresClientAdminApproval: boolean;
  priority: number;
}
export interface FlowRulePayload {
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  requiresClientAdminApproval: boolean;
  priority: number;
}

export const invoiceApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api
      .get<ApiResponse<PaginatedResult<InvoiceSummary>>>("/invoice", { params })
      .then(unwrap),

  get: (id: string) =>
    api.get<ApiResponse<unknown>>(`/invoice/${id}`).then(unwrap),

  create: (payload: CreateInvoicePayload) =>
    api.post<ApiResponse<InvoiceSummary>>("/invoice", payload).then(unwrap),

  approve: (id: string, comments?: string) =>
    api.post(`/invoice/${id}/approve`, comments ? { comments } : {}),

  reject: (id: string, reason: string) =>
    api.post(`/invoice/${id}/reject`, { reason }),

  pendingApproval: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<
        ApiResponse<PaginatedResult<InvoiceSummary>>
      >("/invoice/pending-approval", { params })
      .then(unwrap),

  submitToNRS: (id: string) =>
    api
      .post<ApiResponse<SubmitInvoiceResult>>(`/invoice/submit-invoice/${id}`)
      .then(unwrap),

  updatePaymentStatus: (payload: {
    invoiceId: string;
    paymentStatus: string;
    paymentReference?: string;
  }) => api.put("/invoice/update-invoice-payment-status", payload),

  receivedList: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<
        ApiResponse<PaginatedResult<InvoiceSummary>>
      >("/invoice/received-invoices", { params })
      .then(unwrap),

  /** Upload an Excel file of invoices. Returns a summary of successes/failures. */
  bulkUpload: (file: File) => {
    const formData = new FormData();
    formData.append("invoicesUpload", file);
    return api
      .post<ApiResponse<UploadInvoiceResult>>("/invoice/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap);
  },

  /**
   * Export invoices to Excel. Passing no params produces a blank-data template
   * (headers only) that matches the upload format.
   */
  exportTemplate: (params?: {
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
    paymentReference?: string;
  }) =>
    api.get("/invoice/export", {
      params,
      responseType: "blob",
    }),
};

// ── TIN Validation ────────────────────────────────────────────────────────────
export interface TinValidationResult {
  isValid: boolean;
  isEnrolled: boolean;
  status: string; // "ValidAndEnrolled" | "InvalidOrNotEnrolled" | "Error"
  message: string;
  businessName?: string;
}

export const tinValidationApi = {
  validate: (tin: string) =>
    api
      .post<
        ApiResponse<TinValidationResult>
      >("/TinValidation/validate", { tin })
      .then(unwrap),
};

// ── Parties ───────────────────────────────────────────────────────────────────
/** Shape returned by GET /party (list summary) */
export interface Party {
  id: string;
  name: string;
  email: string;
  phone: string;
  taxIdentificationNumber: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  createdAt?: string;
}
export interface CreatePartyPayload {
  name: string;
  phone: string;
  email: string;
  taxIdentificationNumber: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
}

export const partyApi = {
  list: (params?: { page?: number; pageSize?: number; searchTerm?: string }) =>
    api
      .get<ApiResponse<PaginatedResult<Party>>>("/party", { params })
      .then(unwrap),
  create: (payload: CreatePartyPayload) =>
    api.post<ApiResponse<Party>>("/party", payload).then(unwrap),
  update: (
    id: string,
    payload: Partial<Omit<CreatePartyPayload, "description">>,
  ) => api.put(`/party/${id}`, payload),
  delete: (id: string) => api.delete(`/party/${id}`),
};

// ── Business Items ────────────────────────────────────────────────────────────
export interface BusinessItem {
  id: string;
  itemCode: string;
  description: string;
  unitPrice: number;
  taxCategories?: string[];
}
export interface CreateBusinessItemPayload {
  itemCode: string;
  description: string;
  unitPrice: number;
  taxCategories?: string[];
}

export const businessItemApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<
        ApiResponse<PaginatedResult<BusinessItem>>
      >("/businessitem", { params })
      .then(unwrap),
  create: (payload: CreateBusinessItemPayload) =>
    api.post<ApiResponse<BusinessItem>>("/businessitem", payload).then(unwrap),
  update: (id: string, payload: Partial<CreateBusinessItemPayload>) =>
    api.put(`/businessitem/${id}`, payload),
  delete: (id: string) => api.delete(`/businessitem/${id}`),
};

// ── User Management ───────────────────────────────────────────────────────────
export interface UserSummary {
  id: string;
  NRStName: string;
  lastName: string;
  email: string;
  status: string;
  roles: string[];
  lastLogin?: string;
}
export interface CreateUserPayload {
  NRStName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  roleId: string;
}

export const userMgmtApi = {
  list: () =>
    api.get<ApiResponse<UserSummary[]>>("/usermanagement/users").then(unwrap),
  create: (payload: CreateUserPayload) =>
    api
      .post<ApiResponse<UserSummary>>("/usermanagement/users", payload)
      .then(unwrap),
  activate: (userId: string) =>
    api.post(`/usermanagement/users/${userId}/activate`),
  deactivate: (userId: string) =>
    api.post(`/usermanagement/users/${userId}/deactivate`),
  resetPassword: (userId: string) =>
    api.post(`/usermanagement/users/${userId}/reset-password`),
  assignRole: (userId: string, roleId: string) =>
    api.post(`/usermanagement/users/${userId}/roles`, { roleId }),
};

// ── Miscellaneous ─────────────────────────────────────────────────────────────
export const miscApi = {
  getIndustries: () =>
    api
      .get<ApiResponse<{ name: string }[]>>("/miscellenous/industry")
      .then(unwrap),
  getStates: () =>
    api
      .get<ApiResponse<{ name: string }[]>>("/miscellenous/states")
      .then(unwrap),
  getCities: (state: string) =>
    api
      .get<ApiResponse<{ name: string }[]>>(`/miscellenous/cities/${state}`)
      .then(unwrap),
};

// ── Flow Rules ───────────────────────────────────────────────────────────────
export const flowRuleApi = {
  getAll: () =>
    api.get<ApiResponse<FlowRule[]>>("/Business/flowrules").then(unwrap),
  upsert: (payload: FlowRulePayload) =>
    api
      .post<
        ApiResponse<{ flowRuleId: string; message: string }>
      >("/Business/upsert-flowrule", payload)
      .then(unwrap),
  delete: (id: string) => api.delete(`/Business/delete-flowrule/${id}`),
};

export interface VatRemittancePeriod {
  year: number;
  month: number;
  monthName: string;
  invoiceCount: number;
  taxableAmount: number;
  vatAmount: number;
}

export interface VatRemittanceReport {
  startDate: string;
  endDate: string;
  periods: VatRemittancePeriod[];
  totalTaxableAmount: number;
  totalVatAmount: number;
  totalInvoiceCount: number;
}

export const vatApi = {
  getReport: (startDate: string, endDate: string) =>
    api
      .get<
        ApiResponse<VatRemittanceReport>
      >("/invoice/vat-remittance", { params: { startDate, endDate } })
      .then(unwrap),
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get<ApiResponse<unknown>>("/userprofile").then(unwrap),
  update: (payload: unknown) => api.put("/userprofile", payload),
};

// ── VAT Schedule ──────────────────────────────────────────────────────────────
export interface VatScheduleItem {
  id: string;
  invoiceId: string;
  invoiceCode: string;
  irn?: string;
  partyName: string;
  partyTin?: string;
  issueDate: string;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentStatus: string;
}

export interface VatSchedule {
  id: string;
  year: number;
  month: number;
  monthName: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: "Generated" | "Filed";
  filedAt?: string;
  generatedAt: string;
  totalInvoiceCount: number;
  totalTaxableAmount: number;
  totalVatAmount: number;
  items?: VatScheduleItem[];
}

export const scheduleApi = {
  list: (year?: number) =>
    api
      .get<
        ApiResponse<VatSchedule[]>
      >("/vat-schedule", { params: year ? { year } : undefined })
      .then(unwrap),

  generate: (year: number, month: number) =>
    api
      .post<ApiResponse<VatSchedule>>("/vat-schedule/generate", { year, month })
      .then(unwrap),

  getWithItems: (id: string) =>
    api.get<ApiResponse<VatSchedule>>(`/vat-schedule/${id}`).then(unwrap),

  markFiled: (id: string) =>
    api
      .patch<ApiResponse<VatSchedule>>(`/vat-schedule/${id}/mark-filed`)
      .then(unwrap),

  /** Returns an XLSX blob */
  export: (id: string) =>
    api.get(`/vat-schedule/${id}/export`, { responseType: "blob" }),
};

// ── Analytics V2 ─────────────────────────────────────────────────────────────
export interface InvoiceSummaryMetrics {
  totalCustomerInvoicesCount: number;
  totalCustomerInvoicesAmount: number;
  totalVendorInvoicesCount: number;
  totalVendorInvoicesAmount: number;
  totalVATOnCustomerInvoices: number;
  totalVATOnVendorInvoices: number;
  totalInvoiceValue: number;
  vatOnCustomerPercentageChange: number;
  vatOnVendorPercentageChange: number;
  totalInvoiceValuePercentageChange: number;
}
export interface MonthlyBase {
  year: number;
  month: number;
  monthName: string;
  name: string;
}
export interface SalesVsPurchasesMonthly extends MonthlyBase {
  salesAmount: number;
  purchasesAmount: number;
}
export interface VATTrendMonthly extends MonthlyBase {
  inputVAT: number;
  outputVAT: number;
}
export interface SalesAndPaymentMonthly extends MonthlyBase {
  sales: number;
  payment: number;
}
export interface SalesPerRegionMonthly extends MonthlyBase {
  region: string;
  salesAmount: number;
}
export interface SalesPerParty {
  partyName: string;
  totalSalesAmount: number;
  invoiceCount: number;
}
export interface CurrencyAmount {
  currency: string;
  currencyName: string;
  amount: number;
}
export interface VATByCurrencyMonthly extends MonthlyBase {
  currencyAmounts: CurrencyAmount[];
}
export interface VATVsNonVATMonthly extends MonthlyBase {
  salesVatable: number;
  salesNonVatable: number;
  purchaseVatable: number;
  purchaseNonVatable: number;
}

export interface AnalyticsV2Result {
  generalDashboard?: {
    metrics: InvoiceSummaryMetrics;
    salesVsPurchases: SalesVsPurchasesMonthly[];
    vatTrendAnalysis: VATTrendMonthly[];
    salesAndPaymentPerMonth: SalesAndPaymentMonthly[];
    salesPerRegion: SalesPerRegionMonthly[];
    topParties: SalesPerParty[];
  };
  vatTableDashboard?: {
    vatTableByCurrency: VATByCurrencyMonthly[];
    exemptVATTableByCurrency: VATByCurrencyMonthly[];
    /** Backend field: VATTableVsNonVATTableSalesAndPurchase */
    vatTableVsNonVATTableSalesAndPurchase: VATVsNonVATMonthly[];
  };
}

export const analyticsV2Api = {
  get: (dashboardType: 0 | 1) => {
    const root = (
      (import.meta.env.VITE_API_BASE_URL as string) ||
      "http://localhost:5000/api/v1"
    ).replace(/\/v1$/, "");
    return api
      .get<
        ApiResponse<AnalyticsV2Result>
      >(`${root}/v2/business/dashboard-analytics`, { params: { dashboardType } })
      .then(unwrap);
  },
  /** Fetch both dashboards in parallel and merge into a single result. */
  getAll: (): Promise<Required<AnalyticsV2Result>> => {
    const root = (
      (import.meta.env.VITE_API_BASE_URL as string) ||
      "http://localhost:5000/api/v1"
    ).replace(/\/v1$/, "");
    const call = (t: 0 | 1) =>
      api
        .get<
          ApiResponse<AnalyticsV2Result>
        >(`${root}/v2/business/dashboard-analytics`, { params: { dashboardType: t } })
        .then(unwrap);
    return Promise.all([call(0), call(1)]).then(([g, v]) => ({
      generalDashboard: g.generalDashboard!,
      vatTableDashboard: v.vatTableDashboard!,
    }));
  },
};
