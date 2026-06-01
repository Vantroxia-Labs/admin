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
  claims?: TokenClaims | null;
  terminatedSessionCount: number;
  sessionWarning?: string;
}
export interface TokenClaims {
  NRStName?: string;
  firstName?: string; // backend may return firstName instead of NRStName
  lastName?: string;
  email?: string;
  roles: string[];
  permissions: string[];
  businessId?: string;
  branchId?: string;
  isAegisUser: boolean;
  aegisRole?: string;
  subscriptionTier?: string;
  mustChangePassword: boolean;
}
export interface RegisterPayload {
  adminNRStName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  businessName: string;
  tin?: string;
  /** Array of selected plan IDs — supports multi-plan sign-up */
  platformSubscriptionIds: string[];
  billingCycle: number; // 0=Monthly, 1=Annual
}

export interface CreateBusinessByAdminPayload {
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  businessName: string;
  businessDescription: string;
  tin?: string;
  industry?: string;
  businessRegistrationNumber?: string;
  serviceId?: string;
  nrsBusinessId?: string;
  platformSubscriptionIds: string[];
  billingCycle: number;
  paymentReference: string;
  paymentAmountNaira: number;
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
        ApiResponse<{
          accessToken: string;
          refreshToken: string;
          expiresAt: string;
          claims?: TokenClaims | null;
        }>
      >("/auth/refresh")
      .then(unwrap),

  tokenClaims: () =>
    api
      .get<ApiResponse<TokenClaims>>("/auth/token-claims")
      .then(unwrap)
      .then((c) => ({ ...c, NRStName: c.firstName ?? c.NRStName })),

  sendOtp: (phoneNo_Email: string) =>
    api.post("/auth/forgot-password-request-otp", { phoneNo_Email }),

  sendActionOtp: () => api.post("/auth/send-action-otp", {}),

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
    api
      .get<ApiResponse<SubscriptionPlan[]>>("/payment/plans")
      .then(unwrap)
      .then((arr) => arr ?? []),

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
  hasNrsCredentials?: boolean;
  hasQrCodeConfig?: boolean;
}
export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lga?: string;
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
  /** Aegis platform revenue (subscription fees collected) */
  platformRevenueTotal: number;
  platformRevenueThisMonth: number;
}

export interface ApiRequiredHeader {
  name: string;
  value: string;
  description: string;
}

export interface ApiCredentials {
  apiKey: string;
  isApiKeyActive: boolean;
  baseUrl: string;
  requiredHeaders: ApiRequiredHeader[];
  apiKeyGeneratedAt?: string;
  apiKeyLastUsedAt?: string;
}

export interface SftpCredentials {
  username: string;
  host: string;
  port: number;
  status: string;
  workingDirectory?: string;
  lastSyncedAt?: string;
}

export const businessApi = {
  getProfile: () =>
    api.get<ApiResponse<BusinessProfile>>("/business/me").then(unwrap),

  getDashboardStats: (environmentMode?: AppEnvironmentMode) =>
    api
      .get<ApiResponse<DashboardStats>>("/business/dashboard/stats", {
        params: environmentMode != null ? { environmentMode } : {},
      })
      .then(unwrap),

  updateNRSCredentials: (payload: { firsApiKey: string; firsClientSecret: string }) =>
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

  getApiCredentials: () =>
    api
      .get<ApiResponse<ApiCredentials>>("/business/api-credentials")
      .then(unwrap),

  rotateApiKey: (otp: string) =>
    api
      .post<ApiResponse<{ newApiKey: string }>>("/business/rotate-api-key", {
        otp,
      })
      .then(unwrap),

  getSftpCredentials: () =>
    api
      .get<ApiResponse<SftpCredentials>>("/business/sftp-credentials")
      .then(unwrap),

  changeSftpPassword: (payload: { otp: string; newPassword: string }) =>
    api.post("/business/sftp-change-password", payload),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export interface InvoiceItem {
  id: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /** Detailed tax categories applied to this line item (from backend projection) */
  taxCategories?: BusinessItemTaxCategory[];
}

export interface InvoicePaymentRecord {
  id: string;
  amount: number;
  reference?: string;
  paidAt: string;
}

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
  invoiceItems?: InvoiceItem[];
  paymentHistory?: InvoicePaymentRecord[];
  amountPaid?: number;
  outstandingAmount?: number;
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
  /** Nested object required by the Portal API */
  invoiceType: { name: string; code: number };
  /** Nested object required by the Portal API */
  currency: { name: string; code: string };
  /** Nested object required by the Portal API */
  deliveryPeriod: { startDate: string; endDate: string };
  /** Nested object required by the Portal API */
  paymentMeans: { code: string; name: string };
  invoiceKind?: string;
  note?: string;
  paymentReference?: string;
  paymentTerms?: string;
  orderReference?: string;
  billingReference?: DocumentReferenceDto[];
  dispatchDocumentReference?: DocumentReferenceDto;
  receiptDocumentReference?: DocumentReferenceDto;
  originatorDocumentReference?: DocumentReferenceDto;
  contractDocumentReference?: DocumentReferenceDto;
  additionalDocumentReferences?: DocumentReferenceDto[];
  /** Maps to backend field 'InvoiceItems' */
  invoiceItems: InvoiceItemPayload[];
}
export interface InvoiceItemPayload {
  businessItemId: string;
  quantity: number;
  /** Maps to backend DiscountFee: { Amount, Code } where Code: 1=Percent, 2=NGN */
  discountFee?: { amount: number; code: number };
}

// ── NRS ──────────────────────────────────────────────────────────────────────
export interface TaxCategory {
  code: string;
  value: string;
  percent: string; // "7.5", "0.0", "Not Available", or ""
}
export interface ProductCode {
  code: string;
  description: string;
}
export interface FIRSServiceCode {
  code: string;
  description: string;
}
export interface FIRSCurrency {
  code: string;
  name: string;
  symbol: string;
  symbolNative: string;
}
export interface FIRSState {
  name: string;
  code: string;
}
export interface FIRSLga {
  name: string;
  code: string;
  state_code: string;
}
export interface FIRSCountry {
  name: string;
  alpha_2: string;
}
export interface FIRSInvoiceType {
  code: string;
  value: string;
}
export interface FIRSPaymentMeans {
  code: string;
  value: string;
}
export const NRSApi = {
  getTaxCategories: () =>
    api
      .get<ApiResponse<TaxCategory[]>>("/FIRS/gettaxcategories")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getProductCodes: () =>
    api
      .get<ApiResponse<ProductCode[]>>("/FIRS/getproductcodes")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getServiceCodes: () =>
    api
      .get<ApiResponse<FIRSServiceCode[]>>("/FIRS/getservicecodes")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getCurrencies: () =>
    api
      .get<ApiResponse<FIRSCurrency[]>>("/FIRS/getallcurrencies")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getInvoiceTypes: () =>
    api
      .get<ApiResponse<FIRSInvoiceType[]>>("/FIRS/getinvoicetypes")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getPaymentMeans: () =>
    api
      .get<ApiResponse<FIRSPaymentMeans[]>>("/FIRS/getpaymentmeans")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getStates: () =>
    api
      .get<ApiResponse<FIRSState[]>>("/FIRS/getallstates")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getLgas: () =>
    api
      .get<ApiResponse<FIRSLga[]>>("/FIRS/getalllgas")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getCountries: () =>
    api
      .get<ApiResponse<FIRSCountry[]>>("/FIRS/getallcountries")
      .then(unwrap)
      .then((arr) => arr ?? []),
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
  success?: boolean;
  status?: string; // backend sends "SUCCESS" | "FAILED"
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

// ── Invoice Drafts ────────────────────────────────────────────────────────────
export interface InvoiceDraftSummary {
  id: string;
  partyName?: string;
  issueDate: string;
  draftPayload: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaveDraftPayload {
  draftId?: string;
  draftPayload: string;
  partyName?: string;
  issueDate: string;
}

export interface SaveDraftResult {
  draftId: string;
  isSuccess: boolean;
  message: string;
}

export const invoiceApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    environmentMode?: AppEnvironmentMode;
  }) =>
    api
      .get<ApiResponse<PaginatedResult<InvoiceSummary>>>("/invoice", {
        params: {
          pageNumber: params?.page ?? 1,
          pageSize: params?.pageSize ?? 10,
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.environmentMode !== undefined
            ? { environmentMode: params.environmentMode }
            : {}),
        },
      })
      .then(unwrap),

  get: (id: string) =>
    api.get<ApiResponse<{ invoice: InvoiceSummary }>>(`/invoice/${id}`).then(unwrap).then(data => data.invoice),

  create: (payload: CreateInvoicePayload) =>
    api.post<ApiResponse<{ invoiceId: string }>>("/invoice", payload).then(unwrap),

  approve: (id: string, comments?: string) =>
    api.post(`/invoice/${id}/approve`, comments ? { comments } : {}),

  reject: (id: string, reason: string) =>
    api.post(`/invoice/${id}/reject`, { reason }),

  pendingApproval: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<ApiResponse<PaginatedResult<InvoiceSummary>>>(
        "/invoice/pending-approval",
        {
          params: {
            pageNumber: params?.page ?? 1,
            pageSize: params?.pageSize ?? 10,
          },
        },
      )
      .then(unwrap),

  submitToNRS: (id: string) =>
    api
      .post<ApiResponse<SubmitInvoiceResult>>(`/invoice/submit-invoice/${id}`)
      .then(unwrap),

  updatePaymentStatus: (
    id: string,
    payload: { paymentStatus: string; reference?: string; amount?: number },
  ) => api.patch(`/invoice/update-payment-status/${id}`, payload),

  receivedList: (params?: { page?: number; pageSize?: number; environmentMode?: AppEnvironmentMode }) =>
    api
      .get<ApiResponse<PaginatedResult<InvoiceSummary>>>(
        "/invoice/received-invoices",
        {
          params: {
            pageNumber: params?.page ?? 1,
            pageSize: params?.pageSize ?? 10,
            ...(params?.environmentMode !== undefined
              ? { environmentMode: params.environmentMode }
              : {}),
          },
        },
      )
      .then(unwrap),

  updateReceivedInvoicePaymentStatus: (
    id: string,
    payload: { paymentStatus: string; reference?: string; amount?: number },
  ) =>
    api.patch(
      `/invoice/received-invoices/update-payment-status/${id}`,
      payload,
    ),

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

  // ── Drafts ──────────────────────────────────────────────────────────────
  listDrafts: () =>
    api
      .get<ApiResponse<InvoiceDraftSummary[]>>("/invoice/drafts")
      .then(unwrap)
      .then((arr) => arr ?? []),

  saveDraft: (payload: SaveDraftPayload) =>
    api
      .post<ApiResponse<SaveDraftResult>>("/invoice/drafts", payload)
      .then(unwrap),

  updateDraft: (id: string, payload: SaveDraftPayload) =>
    api
      .put<ApiResponse<SaveDraftResult>>(`/invoice/drafts/${id}`, payload)
      .then(unwrap),

  deleteDraft: (id: string) => api.delete(`/invoice/drafts/${id}`),
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
    lga?: string;
  };
}

export const partyApi = {
  list: (params?: { page?: number; pageSize?: number; searchTerm?: string }) =>
    api
      .get<ApiResponse<PaginatedResult<Party>>>("/party", {
        params: {
          pageNumber: params?.page ?? 1,
          pageSize: Math.min(params?.pageSize ?? 10, 100),
          ...(params?.searchTerm ? { searchTerm: params.searchTerm } : {}),
        },
      })
      .then(unwrap),
  create: (payload: CreatePartyPayload) =>
    api.post<ApiResponse<Party>>("/party", payload).then(unwrap),
  update: (
    id: string,
    payload: Partial<Omit<CreatePartyPayload, "description">>,
  ) => api.put(`/party/${id}`, payload),
  deactivate: (id: string) => api.patch(`/party/${id}/deactivate`),
};

// ── Business Items ────────────────────────────────────────────────────────────
export interface BusinessItemTaxCategory {
  code: string;
  name: string;
  isPercentage: boolean;
  percent?: number;
  flatAmount?: number;
}

/** Shape returned by the list endpoint (summary projection). */
export interface BusinessItemSummary {
  id: string;
  itemId: string;
  name: string;
  itemType: "Goods" | "Service";
  serviceCode: string; // flat code string, e.g. "021"
  serviceCodeName: string; // code description
  itemCategoryName: string;
  unitPrice: number;
  businessName: string;
  createdAt: string;
}

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export const itemCategoryApi = {
  list: () =>
    api
      .get<ApiResponse<ItemCategory[]>>("/itemcategory", {
        params: { pageNumber: 1, pageSize: 200 },
      })
      .then(unwrap)
      .then((arr) => arr ?? []),
};

/** Full item detail returned by GET /businessitem/{id}. */
export interface BusinessItem {
  id: string;
  itemId: string;
  name: string;
  itemType: "Goods" | "Service";
  serviceCode: { code: string; name: string };
  itemCategoryId: string;
  itemCategoryName?: string;
  itemDescription: string;
  unitPrice: number;
  businessId: string;
  businessName?: string;
  createdAt: string;
  taxCategories: BusinessItemTaxCategory[];
}

export interface CreateBusinessItemPayload {
  name: string;
  itemType: "Goods" | "Service";
  serviceCode: { code: string; name: string };
  itemDescription: string;
  unitPrice: number;
  taxCategories: BusinessItemTaxCategory[];
}

export const businessItemApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<ApiResponse<PaginatedResult<BusinessItemSummary>>>("/businessitem", {
        params: {
          pageNumber: params?.page ?? 1,
          pageSize: params?.pageSize ?? 10,
        },
      })
      .then(unwrap),
  getById: (id: string) =>
    api.get<ApiResponse<BusinessItem>>(`/businessitem/${id}`).then(unwrap),
  create: (payload: CreateBusinessItemPayload) =>
    api.post<ApiResponse<BusinessItem>>("/businessitem", payload).then(unwrap),
  update: (id: string, payload: Partial<CreateBusinessItemPayload>) =>
    api.put(`/businessitem/${id}`, payload),
  deactivate: (id: string) => api.patch(`/businessitem/${id}/deactivate`),
};

// ── Aegis Platform Admin ──────────────────────────────────────────────────────
export interface BusinessSummary {
  id: string;
  name: string;
  tin: string;
  status: string;
  adminUserName?: string;
  subscriptionTier?: string;
  industry?: string;
  contactEmail?: string;
  createdAt?: string;
  registeredAt?: string;
}

export const businessesApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<ApiResponse<PaginatedResult<BusinessSummary>>>("/business", {
        params: {
          pageNumber: params?.page ?? 1,
          pageSize: params?.pageSize ?? 20,
        },
      })
      .then(unwrap),
  suspend: (businessId: string, reason?: string) =>
    api.post(`/business/${businessId}/suspend`, { reason }),
  activate: (businessId: string, reason?: string) =>
    api.post(`/business/${businessId}/activate`, { reason }),
  createByAdmin: (payload: CreateBusinessByAdminPayload) =>
    api
      .post<
        ApiResponse<{ businessId: string; message: string }>
      >("/aegisadmin/create-business", payload)
      .then(unwrap),
  getById: (businessId: string) =>
    api
      .get<ApiResponse<BusinessDetail>>(
        `/business/fetch-business?businessId=${businessId}`,
      )
      .then(unwrap),
  update: (businessId: string, payload: UpdateBusinessByAdminPayload) =>
    api
      .put<
        ApiResponse<{ status: boolean; message: string }>
      >(`/business/update-business/${businessId}`, payload)
      .then(unwrap),
};

export interface BusinessDetail {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  tin?: string;
  invoicePrefix?: string;
  contactEmail?: string;
  contactPhone?: string;
  registeredAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    lga?: string;
  };
  status?: string;
}

export interface UpdateBusinessByAdminPayload {
  industry: string;
  description: string;
  invoicePrefix: string;
  contactEmail: string;
  contactPhone: string;
  registeredAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    lga?: string;
  };
}

export interface AegisUserSummary {
  id: string;
  NRStName: string;
  lastName: string;
  email: string;
  status: string;
  aegisRole?: string;
  lastLoginAt?: string;
  /** @deprecated alias — use lastLoginAt */
  lastLogin?: string;
}

export interface AegisUserDetail extends AegisUserSummary {
  phoneNumber?: string;
  aegisEmployeeId?: string;
  aegisDepartment?: string;
  permissions: string[];
}

export interface UpdateAegisUserProfilePayload {
  NRStName: string;
  lastName: string;
  phoneNumber?: string;
  aegisEmployeeId?: string;
  aegisDepartment?: string;
}

export interface CreateAegisUserPayload {
  NRStName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  permissions?: string[];
}

export const aegisUserApi = {
  list: () =>
    api
      .get<ApiResponse<{ items: AegisUserSummary[] }>>(
        "/Aegis-user-management/Aegis-users",
      )
      .then(unwrap)
      .then((r) =>
        (r.items ?? []).map(
          (
            u: AegisUserSummary & { firstName?: string; lastLoginAt?: string },
          ) => ({
            ...u,
            NRStName: u.firstName ?? u.NRStName,
          }),
        ),
      ),
  create: (payload: CreateAegisUserPayload) =>
    api
      .post<ApiResponse<AegisUserSummary>>(
        "/Aegis-user-management/Aegis-users",
        {
          firstName: payload.NRStName,
          lastName: payload.lastName,
          email: payload.email,
          aegisRole: 1, // AegisRole.AegisAdmin
          phoneNumber: payload.phoneNumber,
          permissions: payload.permissions ?? [],
        },
      )
      .then(unwrap),
  activate: (userId: string) =>
    api.post(`/Aegis-user-management/Aegis-users/${userId}/activate`),
  deactivate: (userId: string) =>
    api.post(`/Aegis-user-management/Aegis-users/${userId}/deactivate`),
  resetPassword: (userId: string) =>
    api.post(`/Aegis-user-management/Aegis-users/${userId}/reset-password`),
  getDetail: (userId: string) =>
    api
      .get<
        ApiResponse<
          AegisUserDetail & {
            firstName?: string;
            userPermissions?: string[];
            claims?: { permissions?: string[] };
          }
        >
      >(`/Aegis-user-management/Aegis-users/${userId}`)
      .then(unwrap)
      .then((u) => ({
        ...u,
        NRStName: u.firstName ?? u.NRStName,
        permissions: u.permissions?.length
          ? u.permissions
          : (u.userPermissions ?? u.claims?.permissions ?? []),
      })),
  updateProfile: (userId: string, payload: UpdateAegisUserProfilePayload) =>
    api
      .put(`/Aegis-user-management/users/${userId}/profile`, {
        firstName: payload.NRStName,
        lastName: payload.lastName,
        phoneNumber: payload.phoneNumber,
        aegisEmployeeId: payload.aegisEmployeeId,
        aegisDepartment: payload.aegisDepartment,
      })
      .then(unwrap),
  updatePermissions: (userId: string, permissions: string[]) =>
    api
      .put(`/Aegis-user-management/users/${userId}/permissions`, {
        permissions,
      })
      .then(unwrap),
};

// ── User Management ───────────────────────────────────────────────────────────
export interface UserSummary {
  id: string;
  NRStName: string;
  lastName: string;
  email: string;
  status: string;
  roles: string[];
  lastLoginAt?: string;
  /** @deprecated alias — use lastLoginAt */
  lastLogin?: string;
}
export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  roleIds: string[];
}

export const userMgmtApi = {
  list: () =>
    api
      .get<
        ApiResponse<{
          items: (UserSummary & {
            firstName?: string;
            roles?: ({ name: string } | string)[];
          })[];
        }>
      >("/usermanagement/users")
      .then(unwrap)
      .then((r) =>
        (r.items ?? []).map((u) => ({
          ...u,
          NRStName: u.firstName ?? u.NRStName,
          roles: (u.roles ?? []).map((role) =>
            typeof role === "string"
              ? role
              : ((role as { roleName?: string; name?: string }).roleName ??
                (role as { roleName?: string; name?: string }).name ??
                ""),
          ),
        })),
      ),
  create: (payload: CreateUserPayload) =>
    api
      .post<ApiResponse<UserSummary>>("/usermanagement/users", {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        roleIds: payload.roleIds,
      })
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

// ── Role Management ───────────────────────────────────────────────────────────
export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: string[];
  assignedUserCount: number;
  createdAt: string;
  updatedAt?: string;
}
export interface CreateRolePayload {
  name: string;
  description: string;
  permissions: string[];
}
export interface UpdateRolePermissionsPayload {
  permissions: string[];
}

export const roleApi = {
  list: () =>
    api
      .get<ApiResponse<RoleSummary[]>>("/role-management/roles")
      .then(unwrap)
      .then((arr) => arr ?? []),
  listForBusiness: () =>
    api
      .get<ApiResponse<RoleSummary[]>>("/role-management/roles")
      .then(unwrap)
      .then((arr) =>
        (arr ?? []).filter((r) => {
          const nameLower = r.name?.toLowerCase();
          return nameLower !== "clientadmin" && nameLower !== "clientuser";
        }),
      ),
  create: (payload: CreateRolePayload) =>
    api
      .post<
        ApiResponse<{ roleId: string; name: string }>
      >("/role-management/roles", payload)
      .then(unwrap),
  updatePermissions: (roleId: string, payload: UpdateRolePermissionsPayload) =>
    api.put(`/role-management/roles/${roleId}/permissions`, payload),
  delete: (roleId: string) => api.delete(`/role-management/roles/${roleId}`),
};

// ── Miscellaneous ─────────────────────────────────────────────────────────────
export const miscApi = {
  getIndustries: () =>
    api
      .get<ApiResponse<{ name: string }[]>>("/miscellenous/industry")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getStates: () =>
    api
      .get<ApiResponse<{ name: string }[]>>("/miscellenous/states")
      .then(unwrap)
      .then((arr) => arr ?? []),
  getCities: (state: string) =>
    api
      .get<ApiResponse<{ name: string }[]>>(`/miscellenous/cities/${state}`)
      .then(unwrap)
      .then((arr) => arr ?? []),
};

// ── Flow Rules ───────────────────────────────────────────────────────────────
export const flowRuleApi = {
  getAll: () =>
    api
      .get<ApiResponse<FlowRule[]>>("/Business/flowrules")
      .then(unwrap)
      .then((arr) => arr ?? []),
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

export interface InputVatScheduleItem {
  id: string;
  receivedInvoiceId: string;
  irn: string;
  supplierName: string;
  supplierTin?: string;
  issueDate: string;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
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
  totalInputInvoiceCount: number;
  totalInputTaxableAmount: number;
  totalInputVatAmount: number;
  netVatPayable: number;
  items?: VatScheduleItem[];
  inputItems?: InputVatScheduleItem[];
}

export const scheduleApi = {
  list: (year?: number, environmentMode?: AppEnvironmentMode) =>
    api
      .get<ApiResponse<VatSchedule[]>>("/vat-schedule", {
        params: {
          ...(year ? { year } : {}),
          ...(environmentMode !== undefined ? { environmentMode } : {}),
        },
      })
      .then(unwrap)
      .then((arr) => arr ?? []),

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

// ── WHT Schedule ─────────────────────────────────────────────────────────────
export interface WhtScheduleItem {
  id: string;
  receivedInvoiceId: string;
  vendorName: string;
  vendorAddress?: string;
  vendorTin?: string;
  irn: string;
  issueDate: string;
  natureOfTransaction: string;
  grossAmount: number;
  whtRate: number;
  whtAmount: number;
  netAmount: number;
  taxAuthority: "NRS" | "StateIRS";
}

export interface WhtSchedule {
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
  totalItemCount: number;
  totalGrossAmount: number;
  totalWhtAmount: number;
  totalNrsWhtAmount: number;
  totalStateWhtAmount: number;
  items?: WhtScheduleItem[];
}

export const whtScheduleApi = {
  list: (year?: number, environmentMode?: AppEnvironmentMode) =>
    api
      .get<ApiResponse<WhtSchedule[]>>("/wht-schedule", {
        params: {
          ...(year ? { year } : {}),
          ...(environmentMode !== undefined ? { environmentMode } : {}),
        },
      })
      .then(unwrap)
      .then((arr) => arr ?? []),

  generate: (year: number, month: number) =>
    api
      .post<ApiResponse<WhtSchedule>>("/wht-schedule/generate", { year, month })
      .then(unwrap),

  getWithItems: (id: string) =>
    api.get<ApiResponse<WhtSchedule>>(`/wht-schedule/${id}`).then(unwrap),

  markFiled: (id: string) =>
    api
      .patch<ApiResponse<WhtSchedule>>(`/wht-schedule/${id}/mark-filed`)
      .then(unwrap),
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

// ── APP Provider Management (AegisAdmin) ─────────────────────────────────────

/** An adapter option returned by GET /access-point-providers/adapter-options. */
export interface AppAdapterOption {
  adapterKey: string;
  displayName: string;
}

export interface AccessPointProviderDto {
  id: string;
  name: string;
  description?: string;
  /** Lowercase stable key matching the backend adapter, e.g. "interswitch". */
  adapterKey: string;
  /** Human-readable display name from the registered adapter, e.g. "Interswitch". */
  displayName: string;
  baseUrl: string;
  hasProductionCredentials: boolean;
  sandboxBaseUrl?: string;
  hasSandboxCredentials: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAppProviderPayload {
  name: string;
  description?: string;
  adapterKey: string;
  baseUrl: string;
  /** Plaintext JSON blob — shape is adapter-specific, encrypted server-side */
  credentialsJson?: string;
  sandboxBaseUrl?: string;
  sandboxCredentialsJson?: string;
}

export interface UpdateAppProviderPayload {
  name: string;
  description?: string;
  baseUrl?: string;
  /** Omit to keep existing encrypted credentials */
  credentialsJson?: string;
  sandboxBaseUrl?: string;
  sandboxCredentialsJson?: string;
}

/** Mirrors AppEnvironmentMode enum: Sandbox=1, Production=2 */
export type AppEnvironmentMode = 1 | 2;

export interface BusinessAppSettingsDto {
  /** The adapter key the business has selected, or null for the platform default. */
  activeAdapterKey: string | null;
  environmentMode: AppEnvironmentMode;
}

export interface AccessPointProviderEditDto {
  id: string;
  name: string;
  description?: string;
  adapterKey: string;
  displayName: string;
  baseUrl: string;
  credentialsJson?: string;
  sandboxBaseUrl?: string;
  sandboxCredentialsJson?: string;
  isActive: boolean;
  createdAt: string;
}

export const appProviderApi = {
  getById: (id: string) =>
    api
      .get<
        ApiResponse<AccessPointProviderEditDto>
      >(`/access-point-providers/${id}`)
      .then(unwrap),

  getAdapterOptions: () =>
    api
      .get<
        ApiResponse<AppAdapterOption[]>
      >("/access-point-providers/adapter-options")
      .then(unwrap),

  list: (page = 1, pageSize = 20) =>
    api
      .get<ApiResponse<PaginatedResult<AccessPointProviderDto>>>(
        "/access-point-providers",
        {
          params: { pageNumber: page, pageSize },
        },
      )
      .then(unwrap),

  create: (payload: CreateAppProviderPayload) =>
    api
      .post<
        ApiResponse<{ isSuccess: boolean; message: string; id?: string }>
      >("/access-point-providers", payload)
      .then(unwrap),

  update: (configurationId: string, payload: UpdateAppProviderPayload) =>
    api
      .patch<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/access-point-providers/${configurationId}`, payload)
      .then(unwrap),

  delete: (configurationId: string) =>
    api
      .delete<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/access-point-providers/${configurationId}`)
      .then(unwrap),

  getBusinessSettings: (businessId: string) =>
    api
      .get<
        ApiResponse<BusinessAppSettingsDto>
      >(`/access-point-providers/businesses/${businessId}/settings`)
      .then(unwrap),

  setBusinessProvider: (businessId: string, adapterKey: string | null) =>
    api
      .patch<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/access-point-providers/businesses/${businessId}/provider`, { adapterKey })
      .then(unwrap),

  setBusinessEnvironment: (businessId: string, environmentMode: 1 | 2) =>
    api
      .patch<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/access-point-providers/businesses/${businessId}/environment`, { environmentMode })
      .then(unwrap),
};

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
  getAll: (environmentMode?: AppEnvironmentMode): Promise<Required<AnalyticsV2Result>> => {
    const root = (
      (import.meta.env.VITE_API_BASE_URL as string) ||
      "http://localhost:5000/api/v1"
    ).replace(/\/v1$/, "");
    const call = (t: 0 | 1) =>
      api
        .get<
          ApiResponse<AnalyticsV2Result>
        >(`${root}/v2/business/dashboard-analytics`, {
          params: {
            dashboardType: t,
            ...(environmentMode !== undefined ? { environmentMode } : {}),
          },
        })
        .then(unwrap);
    return Promise.all([call(0), call(1)]).then(([g, v]) => ({
      generalDashboard: g.generalDashboard!,
      vatTableDashboard: v.vatTableDashboard!,
    }));
  },
};

// ── Vendor Management ─────────────────────────────────────────────────────────

export interface VendorGroup {
  id: string;
  name: string;
  description?: string;
  vendorCount: number;
  createdAt: string;
}

export interface Vendor {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  vendorGroupId?: string;
  vendorGroupName?: string;
  createdAt: string;
}

export const vendorGroupApi = {
  list: (params?: { page?: number; pageSize?: number; searchTerm?: string }) =>
    api
      .get<ApiResponse<PaginatedResult<VendorGroup>>>("/vendor/groups", {
        params: {
          pageNumber: params?.page ?? 1,
          pageSize: Math.min(params?.pageSize ?? 10, 100),
          ...(params?.searchTerm ? { searchTerm: params.searchTerm } : {}),
        },
      })
      .then(unwrap),
  get: (id: string) =>
    api.get<ApiResponse<VendorGroup>>(`/vendor/groups/${id}`).then(unwrap),
  create: (payload: { name: string; description?: string }) =>
    api
      .post<
        ApiResponse<{ isSuccess: boolean; message: string; id?: string }>
      >("/vendor/groups", payload)
      .then(unwrap),
  update: (id: string, payload: { name: string; description?: string }) =>
    api
      .put<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/vendor/groups/${id}`, payload)
      .then(unwrap),
  deactivate: (id: string) =>
    api
      .patch<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/vendor/groups/${id}/deactivate`, {})
      .then(unwrap),
};

export const vendorApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    vendorGroupId?: string;
  }) =>
    api
      .get<ApiResponse<PaginatedResult<Vendor>>>("/vendor", {
        params: {
          pageNumber: params?.page ?? 1,
          pageSize: Math.min(params?.pageSize ?? 10, 100),
          ...(params?.searchTerm ? { searchTerm: params.searchTerm } : {}),
          ...(params?.vendorGroupId
            ? { vendorGroupId: params.vendorGroupId }
            : {}),
        },
      })
      .then(unwrap),
  get: (id: string) =>
    api.get<ApiResponse<Vendor>>(`/vendor/${id}`).then(unwrap),
  create: (payload: {
    businessName: string;
    email: string;
    phone?: string;
    vendorGroupId?: string;
  }) =>
    api
      .post<
        ApiResponse<{ isSuccess: boolean; message: string; id?: string }>
      >("/vendor", payload)
      .then(unwrap),
  update: (
    id: string,
    payload: { businessName: string; phone?: string; vendorGroupId?: string },
  ) =>
    api
      .put<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/vendor/${id}`, payload)
      .then(unwrap),
  deactivate: (id: string) =>
    api
      .patch<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/vendor/${id}/deactivate`, {})
      .then(unwrap),
  toggleStatus: (id: string) =>
    api
      .patch<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/vendor/${id}/toggle-status`, {})
      .then(unwrap),
};

// ── Invoice Broadcasts ────────────────────────────────────────────────────────

export interface BroadcastSummary {
  id: string;
  title: string;
  invoiceTypeCode: string;
  dueDate: string;
  status: string;
  requiresApproval: boolean;
  currency: string;
  totalVendors: number;
  submittedCount: number;
  createdAt: string;
}

export interface BroadcastDetail extends BroadcastSummary {
  note?: string;
  isApprovalLocked: boolean;
  vendors: BroadcastVendorDto[];
}

export interface BroadcastVendorDto {
  id: string;
  vendorId: string;
  vendorBusinessName: string;
  vendorEmail: string;
  invoiceId?: string;
  isEmailVerified: boolean;
  token: string;
}

export interface BroadcastSubmission {
  broadcastVendorId: string;
  vendorBusinessName: string;
  vendorEmail: string;
  invoiceId: string;
  invoiceCode: string;
  totalAmount: number;
  paymentStatus: string;
  invoiceStatus: string;
  submittedAt?: string;
}

export interface CreateBroadcastPayload {
  title: string;
  invoiceTypeCode: string;
  dueDate: string;
  requiresApproval: boolean;
  currency: string;
  note?: string;
  vendorIds?: string[];
  vendorGroupId?: string;
}

export const broadcastApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api
      .get<ApiResponse<PaginatedResult<BroadcastSummary>>>(
        "/invoice-broadcast",
        {
          params: {
            pageNumber: params?.page ?? 1,
            pageSize: params?.pageSize ?? 10,
            ...(params?.status ? { status: params.status } : {}),
          },
        },
      )
      .then(unwrap),
  get: (id: string) =>
    api
      .get<ApiResponse<BroadcastDetail>>(`/invoice-broadcast/${id}`)
      .then(unwrap),
  create: (payload: CreateBroadcastPayload) =>
    api
      .post<
        ApiResponse<{ isSuccess: boolean; message: string; id?: string }>
      >("/invoice-broadcast", payload)
      .then(unwrap),
  update: (id: string, payload: { title: string; note?: string }) =>
    api
      .put<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/invoice-broadcast/${id}`, payload)
      .then(unwrap),
  extendDueDate: (id: string, newDueDate: string) =>
    api
      .patch<
        ApiResponse<{ isSuccess: boolean; message: string }>
      >(`/invoice-broadcast/${id}/extend-due-date`, { newDueDate })
      .then(unwrap),
  deactivate: (id: string) =>
    api
      .patch<
        ApiResponse<{ message: string; hasPendingInvoices: boolean }>
      >(`/invoice-broadcast/${id}/deactivate`, {})
      .then(unwrap),
  rejectAll: (id: string) =>
    api
      .post<
        ApiResponse<{ message: string }>
      >(`/invoice-broadcast/${id}/reject-all`, {})
      .then(unwrap),
  getSubmissions: (id: string, params?: { page?: number; pageSize?: number }) =>
    api
      .get<ApiResponse<PaginatedResult<BroadcastSubmission>>>(
        `/invoice-broadcast/${id}/submissions`,
        {
          params: {
            pageNumber: params?.page ?? 1,
            pageSize: params?.pageSize ?? 10,
          },
        },
      )
      .then(unwrap),
  markPaid: (invoiceIds: string[]) =>
    api
      .patch<
        ApiResponse<{ message: string }>
      >("/invoice-broadcast/submissions/mark-paid", { invoiceIds })
      .then(unwrap),
  markRejected: (invoiceIds: string[]) =>
    api
      .patch<
        ApiResponse<{ message: string }>
      >("/invoice-broadcast/submissions/mark-rejected", { invoiceIds })
      .then(unwrap),
  approveSubmissions: (invoiceIds: string[]) =>
    api
      .patch<
        ApiResponse<{ message: string }>
      >("/invoice-broadcast/submissions/approve", { invoiceIds })
      .then(unwrap),
  dismissSubmissions: (invoiceIds: string[]) =>
    api
      .patch<
        ApiResponse<{ message: string }>
      >("/invoice-broadcast/submissions/dismiss", { invoiceIds })
      .then(unwrap),
};

// ── Vendor Portal (public – no auth token) ────────────────────────────────────

import axios from "axios";

const vendorPortalClient = axios.create({
  baseURL:
    (import.meta.env.VITE_API_BASE_URL as string) ||
    "http://localhost:5000/api/v1",
  headers: { "Content-Type": "application/json" },
});

function vpUnwrap<T>(res: { data: ApiResponse<T> }) {
  return res.data.data as T;
}

export interface VendorPortalForm {
  broadcastTitle: string;
  dueDate: string;
  invoiceTypeCode: string;
  currency: string;
  requiresApproval: boolean;
  note?: string;
  tenantName: string;
  vendorBusinessName: string;
  vendorEmail: string;
  isClosed: boolean;
}

export interface VendorPortalVerifyResponse {
  vendorBusinessName?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  message: string;
}

export interface VendorLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  unitOfMeasure?: string;
}

export const vendorPortalApi = {
  getForm: (token: string) =>
    vendorPortalClient
      .get<ApiResponse<VendorPortalForm>>(`/vendor-portal/form/${token}`)
      .then(vpUnwrap),
  requestOtp: (token: string) =>
    vendorPortalClient
      .post<
        ApiResponse<{ message: string }>
      >(`/vendor-portal/request-otp/${token}`)
      .then(vpUnwrap),
  verifyOtp: (token: string, otp: string) =>
    vendorPortalClient
      .post<
        ApiResponse<VendorPortalVerifyResponse>
      >(`/vendor-portal/verify-otp/${token}`, { otp })
      .then(vpUnwrap),
  saveDraft: (token: string, lineItems: VendorLineItem[]) =>
    vendorPortalClient
      .post<
        ApiResponse<{ message: string }>
      >(`/vendor-portal/save-draft/${token}`, { lineItems })
      .then(vpUnwrap),
  submit: (token: string, lineItems: VendorLineItem[]) =>
    vendorPortalClient
      .post<
        ApiResponse<{ message: string }>
      >(`/vendor-portal/submit/${token}`, { lineItems })
      .then(vpUnwrap),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  /** ISO 8601 timestamp string */
  timestamp: string;
  read: boolean;
  aegisOnly: boolean;
  adminOnly: boolean;
}

export const notificationsApi = {
  getAll: () =>
    api.get<ApiResponse<NotificationDto[]>>("/notifications").then(unwrap),
};
