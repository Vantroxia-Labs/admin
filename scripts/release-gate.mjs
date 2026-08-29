import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function checkNoMockImport(filePath) {
  const content = read(filePath);
  const hasMockImport = /from\s+["'][^"']*mockData[^"']*["']/.test(content);
  assert(!hasMockImport, `${filePath}: must not import mockData in production-critical pricing paths.`);
}

function checkNoLocalhostFallback() {
  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "";
  const isLocal = /localhost|127\.0\.0\.1/i.test(apiBaseUrl);
  assert(Boolean(apiBaseUrl), "VITE_API_BASE_URL must be set for release builds.");
  assert(!isLocal, "VITE_API_BASE_URL must not point to localhost or 127.0.0.1 in release builds.");
}

function checkMockDisabled() {
  const useMock = (process.env.VITE_USE_MOCK ?? "").toLowerCase();
  assert(useMock === "false", "VITE_USE_MOCK must be explicitly set to false for release builds.");
}

function checkPayloadEncryptionKey() {
  const key = process.env.VITE_PAYLOAD_ENCRYPTION_KEY ?? "";
  assert(Boolean(key), "VITE_PAYLOAD_ENCRYPTION_KEY must be set for release builds.");
}

function checkPlanLoadingIsApiDriven(filePath) {
  const content = read(filePath);
  assert(/paymentApi\s*\.\s*getPlans\(/.test(content), `${filePath}: must load plans from paymentApi.getPlans().`);
}

checkMockDisabled();
checkNoLocalhostFallback();
checkPayloadEncryptionKey();
checkNoMockImport("src/components/auth/SignUpForm.tsx");
checkNoMockImport("src/pages/Public/PricingPage.tsx");
checkPlanLoadingIsApiDriven("src/components/auth/SignUpForm.tsx");
checkPlanLoadingIsApiDriven("src/pages/Public/PricingPage.tsx");

if (errors.length > 0) {
  console.error("Release gate failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Release gate passed.");
