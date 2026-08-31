import { useState } from "react";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { authApi } from "../../lib/api";
import AuthLayout from "./AuthPageLayout";

type Step = "request" | "reset";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [phoneNo_Email, setPhoneNo_Email] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNo_Email) {
      toast.error("Please enter your email or phone number.");
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(phoneNo_Email);
      toast.success("OTP sent! Check your email or phone.");
      setStep("reset");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to send OTP. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ otp, password, phoneNo_Email });
      toast.success("Password reset successful! You can now sign in.");
      navigate("/signin", { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to reset password. Please check your OTP and try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col flex-1">
        <div className="w-full max-w-md pt-10 mx-auto">
          <div className="mb-2">
            <img src="/images/logo/remit-logo.svg" alt="Aegis Remit" className="h-10 dark:hidden" />
            <img src="/images/logo/remit-logo-dark.svg" alt="Aegis Remit" className="h-10 hidden dark:block" />
          </div>
        </div>
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          {step === "request" ? (
            <>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                  Forgot Password
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your email or phone number and we'll send you an OTP to reset your password.
                </p>
              </div>
              <form onSubmit={handleRequestOtp}>
                <div className="space-y-5">
                  <div>
                    <Label>Email or Phone <span className="text-error-500">*</span></Label>
                    <Input
                      type="text"
                      placeholder="admin@company.com or +234..."
                      value={phoneNo_Email}
                      onChange={e => setPhoneNo_Email(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" size="sm" disabled={loading}>
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                  Reset Password
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter the OTP sent to <strong>{phoneNo_Email}</strong> and your new password.
                </p>
              </div>
              <form onSubmit={handleReset}>
                <div className="space-y-5">
                  <div>
                    <Label>OTP Code <span className="text-error-500">*</span></Label>
                    <Input
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>New Password <span className="text-error-500">*</span></Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword
                          ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                          : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Confirm Password <span className="text-error-500">*</span></Label>
                    <Input
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" size="sm" onClick={() => setStep("request")}>
                      ← Back
                    </Button>
                    <Button className="flex-1" size="sm" disabled={loading}>
                      {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}

          <div className="mt-5 text-center">
            <Link to="/signin" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
