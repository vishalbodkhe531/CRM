import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/common/FormField";
import TooltipLabel from "@/components/common/TooltipLabel";
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type ResetPasswordInput,
} from "@/contracts/validation";
import { authService } from "@/features/auth/api/services";
import { extractApiError } from "@/utils/apiError";
import loginBg from "@/assets/images/login-bg.svg";
import logoImg from "@/assets/images/logo.svg";

const inputClassName =
  "h-10 rounded-[8px] border-[#c8d0e2] bg-white pl-3 pr-9 text-sm font-medium text-[#111827] shadow-none placeholder:text-[12px] placeholder:font-normal placeholder:text-[#a0a7b8] hover:border-[#b9c3d9] focus-visible:border-primary focus-visible:ring-primary/15 sm:h-11 sm:pl-4 sm:pr-11 sm:placeholder:text-[13px] [@media(max-height:680px)]:h-9 [@media(max-height:680px)]:text-[13px]";

const passwordInputClassName =
  "h-10 rounded-[8px] border-[#c8d0e2] bg-white pl-3 pr-11 text-sm font-medium text-[#111827] shadow-none placeholder:text-[12px] placeholder:font-normal placeholder:text-[#a0a7b8] hover:border-[#b9c3d9] focus-visible:border-primary focus-visible:ring-primary/15 sm:h-11 sm:pl-4 sm:pr-12 sm:placeholder:text-[13px] [@media(max-height:680px)]:h-9 [@media(max-height:680px)]:text-[13px]";

const fieldClassName =
  "gap-1.5 [&_label]:text-[12px] [&_label]:font-semibold [&_label]:text-[#050509] sm:gap-2 sm:[&_label]:text-[13px] [@media(max-height:680px)]:gap-1";

const GENERIC_OTP_MESSAGE =
  "If an account exists for this email, a password reset OTP has been sent.";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [otpMessage, setOtpMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    handleSubmit,
    control,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const requestOtp = async () => {
    setSubmitError("");
    setOtpMessage("");

    const email = getValues("email");
    const parsed = ForgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      setError("email", {
        type: "manual",
        message: parsed.error.issues[0]?.message ?? "Valid email is required",
      });
      return;
    }

    setRequestingOtp(true);
    try {
      const result = await authService.generatePasswordResetOtp(parsed.data);
      setOtpMessage(result?.message || GENERIC_OTP_MESSAGE);
    } catch (error) {
      setSubmitError(extractApiError(error).message);
    } finally {
      setRequestingOtp(false);
    }
  };

  const onSubmit = async (data: ResetPasswordInput) => {
    setSubmitError("");
    setSuccessMessage("");

    try {
      const result = await authService.resetPasswordWithOtp(data);
      setSuccessMessage(
        result?.message || "Password reset successfully.",
      );
      setTimeout(() => navigate("/", { replace: true }), 1800);
    } catch (error) {
      setSubmitError(extractApiError(error).message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="h-[100svh] max-h-[100svh] overflow-hidden bg-cover bg-[30%_center] text-foreground sm:bg-left lg:h-[100vh] lg:max-h-[100vh] lg:bg-left"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <main className="flex h-full w-full items-center justify-center overflow-hidden px-4 py-3 sm:px-8 md:px-10 lg:justify-end lg:py-5 lg:pr-[4.7vw] xl:pr-[4.8vw] 2xl:pr-[5vw]">
        <section className="flex max-h-[calc(100svh-24px)] w-full max-w-[370px] flex-col overflow-x-hidden overflow-y-auto rounded-[24px] border border-white/80 bg-white px-4 py-4 shadow-[0_22px_60px_rgba(25,38,95,0.15)] sm:max-w-[410px] sm:px-8 sm:py-7 lg:mr-[clamp(2rem,8vw,7.5rem)] lg:h-auto lg:max-h-[calc(100vh-40px)] lg:min-h-[clamp(500px,65vh,610px)] lg:w-[clamp(430px,35.25vw,510px)] lg:max-w-none lg:rounded-[28px] lg:px-12 lg:py-9 [@media(max-height:680px)]:py-3">
          <div className="flex min-h-0 flex-1 flex-col justify-start">
            <div className="mb-3 flex items-center justify-center gap-2 sm:mb-6 lg:mb-7 [@media(max-height:680px)]:mb-2">
              <img
                src={logoImg}
                alt="CRM Logo"
                className="h-5 w-5 shrink-0 object-contain [@media(max-height:680px)]:h-4 [@media(max-height:680px)]:w-4 lg:h-6 lg:w-6"
              />
              <span className="text-[13px] font-bold leading-none text-primary sm:text-sm">
                EMVESSO CRM
              </span>
            </div>

            <div className="mb-3 space-y-1.5 text-center sm:mb-6 sm:space-y-2 lg:mb-7 [@media(max-height:680px)]:mb-2">
              <h2 className="text-[25px] font-bold leading-none text-[#050509] sm:text-[34px] [@media(max-height:680px)]:text-[22px]">
                Reset Password
              </h2>
              <p className="text-[12px] font-medium leading-snug text-[#6f7788] sm:text-[13px] sm:leading-relaxed [@media(max-height:680px)]:text-[11px]">
                Request an OTP and create a new password
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3 lg:space-y-4 [@media(max-height:680px)]:space-y-1.5">
              <FormField
                id="email"
                label="Email Address"
                error={errors.email?.message}
                className={fieldClassName}
              >
                <div className="flex gap-2 [@media(max-width:360px)]:gap-1.5">
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <div className="relative min-w-0 flex-1">
                        <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6] sm:right-4" />
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          placeholder="Enter Email Address"
                          autoComplete="email"
                          aria-invalid={errors.email ? true : undefined}
                          className={inputClassName}
                        />
                      </div>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={requestingOtp || isSubmitting}
                    onClick={requestOtp}
                    className="h-10 shrink-0 rounded-[8px] border-[#c8d0e2] bg-white px-2.5 text-[11px] font-bold text-primary hover:bg-primary/5 hover:text-primary-hover sm:h-11 sm:px-3 sm:text-xs [@media(max-height:680px)]:h-9"
                  >
                    {requestingOtp
                      ? "Sending..."
                      : otpMessage
                        ? "Resend OTP"
                        : "Generate OTP"}
                  </Button>
                </div>
              </FormField>

              <FormField
                id="otp"
                label="OTP"
                error={errors.otp?.message}
                className={fieldClassName}
              >
                <Controller
                  name="otp"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6] sm:right-4" />
                      <Input
                        {...field}
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        autoComplete="one-time-code"
                        aria-invalid={errors.otp ? true : undefined}
                        className={inputClassName}
                      />
                    </div>
                  )}
                />
              </FormField>

              <FormField
                id="password"
                label="New Password"
                error={errors.newPassword?.message}
                className={fieldClassName}
              >
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter New Password"
                        autoComplete="new-password"
                        aria-invalid={errors.newPassword ? true : undefined}
                        className={passwordInputClassName}
                      />
                      <TooltipLabel label={showPassword ? "Hide password" : "Show password"}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-[#9aa3b6] transition-colors hover:bg-transparent hover:text-[#111827] sm:right-2"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipLabel>
                    </div>
                  )}
                />
              </FormField>

              <FormField
                id="confirmPassword"
                label="Confirm Password"
                error={errors.confirmPassword?.message}
                className={fieldClassName}
              >
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm New Password"
                        autoComplete="new-password"
                        aria-invalid={errors.confirmPassword ? true : undefined}
                        className={passwordInputClassName}
                      />
                      <TooltipLabel
                        label={
                          showConfirmPassword ? "Hide password" : "Show password"
                        }
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-[#9aa3b6] transition-colors hover:bg-transparent hover:text-[#111827] sm:right-2"
                          aria-label={
                            showConfirmPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipLabel>
                    </div>
                  )}
                />
              </FormField>

              {otpMessage && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs leading-snug text-green-700 dark:text-green-300 min-w-0 break-words sm:py-2 sm:text-sm sm:leading-relaxed"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{otpMessage} OTP expires in 10 minutes.</span>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs leading-snug text-green-700 dark:text-green-300 min-w-0 break-words sm:py-2 sm:text-sm sm:leading-relaxed"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{successMessage}</span>
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs leading-snug text-destructive min-w-0 break-words sm:py-2 sm:text-sm sm:leading-relaxed"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{submitError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || requestingOtp || Boolean(successMessage)}
                className="mt-2 h-10 w-full rounded-[8px] bg-primary text-sm font-bold text-primary-foreground shadow-none transition-colors hover:bg-primary-hover sm:mt-3 sm:h-12 [@media(max-height:680px)]:mt-1 [@media(max-height:680px)]:h-9"
              >
                {isSubmitting ? "Resetting password..." : "Reset Password"}
              </Button>

              <p className="pt-0.5 text-center text-[12px] font-medium text-[#8b94a7] sm:text-[13px] [@media(max-height:680px)]:pt-0">
                Remember your password?{" "}
                <Link to="/" className="text-primary-hover hover:underline">
                  Back to Login
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </form>
  );
};

export default ForgotPasswordPage;
