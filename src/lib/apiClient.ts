import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7184/api/v1";
const PAYLOAD_ENCRYPTION_KEY_B64 = import.meta.env.VITE_PAYLOAD_ENCRYPTION_KEY || "";

const PROTECTED_AUTH_PATHS = new Set([
  "/auth/login",
  "/auth/forgot-password",
  "/profile/change-password",
]);

// Auth endpoints that should NOT trigger the 401 refresh interceptor.
// If login returns 401, we want the caller to see the actual error — not
// a "Refresh token is required" error from a misguided refresh attempt.
const AUTH_NO_RETRY_PATHS = new Set([
  "/auth/login",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/register",
]);

// In-memory token storage (never in localStorage for security)
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const isProtectedPath = (url?: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.split("?")[0]?.toLowerCase() ?? "";
  return PROTECTED_AUTH_PATHS.has(cleanUrl);
};

const shouldEncryptRequest = (config: InternalAxiosRequestConfig): boolean => {
  if ((config.method ?? "").toUpperCase() !== "POST") return false;
  if (!isProtectedPath(config.url)) return false;
  if (config.headers?.["X-Encrypted"]) return false;
  return typeof config.data === "object" && config.data !== null && !(config.data instanceof FormData);
};

const encryptPayload = async (payload: unknown): Promise<{ data: string; iv: string }> => {
  if (!PAYLOAD_ENCRYPTION_KEY_B64) {
    throw new Error("VITE_PAYLOAD_ENCRYPTION_KEY is not configured.");
  }

  const keyBytes = base64ToBytes(PAYLOAD_ENCRYPTION_KEY_B64);
  if (keyBytes.length !== 32) {
    throw new Error("VITE_PAYLOAD_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }

  const iv = crypto.getRandomValues(new Uint8Array(16));
  const keyBuffer = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength,
  ) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-CBC" }, false, ["encrypt"]);

  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
  const payloadBuffer = encodedPayload.buffer.slice(
    encodedPayload.byteOffset,
    encodedPayload.byteOffset + encodedPayload.byteLength,
  ) as ArrayBuffer;
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, payloadBuffer);

  return {
    data: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send refresh token cookie
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach access token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (shouldEncryptRequest(config)) {
    config.data = await encryptPayload(config.data);
    config.headers["X-Encrypted"] = "true";
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Response interceptor — handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = (originalRequest?.url ?? "").split("?")[0]?.toLowerCase() ?? "";

    // Don't attempt token refresh for auth endpoints — let the caller
    // handle 401s from login/register/refresh directly.
    const isAuthPath = AUTH_NO_RETRY_PATHS.has(requestUrl);

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthPath
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        window.location.href = "/signin";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Typed API response helper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const unwrap = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  return response.data.data;
};
