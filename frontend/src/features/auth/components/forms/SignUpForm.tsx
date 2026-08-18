import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DialogShell from "@/components/common/DialogShell";
import FormField from "@/components/common/FormField";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { signup } from "../../store/slice";
import { selectAuthError } from "../../store/selectors";
import {
  SignupRequestSchema,
  type SignupRequestInput as SignupFormValues,
} from "@/contracts/validation";
import loginBg from "@/assets/images/login-bg.svg";
import logoImg from "@/assets/images/logo.svg";

const inputClassName =
  "h-10 rounded-[8px] border-[#c8d0e2] bg-white pl-3 pr-9 text-sm font-medium text-[#111827] shadow-none placeholder:text-[12px] placeholder:font-normal placeholder:text-[#a0a7b8] hover:border-[#b9c3d9] focus-visible:border-primary focus-visible:ring-primary/15 sm:h-11 sm:pl-4 sm:pr-11 sm:placeholder:text-[13px] [@media(max-height:680px)]:h-9 [@media(max-height:680px)]:text-[13px]";

const fieldClassName =
  "gap-1.5 [&_label]:text-[12px] [&_label]:font-semibold [&_label]:text-[#050509] sm:gap-2 sm:[&_label]:text-[13px] [@media(max-height:680px)]:gap-1";

const SIGNUP_REQUEST_SUCCESS_MESSAGE =
  "Thank you for registering. Our team will contact you after reviewing your request.";

const SignUpForm = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [successOpen, setSuccessOpen] = useState(false);
  const signupError = useAppSelector(selectAuthError);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(SignupRequestSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyName: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await dispatch(signup(data)).unwrap();
      setSuccessOpen(true);
    } catch {
      // Error toast handling is centralized in slice thunks.
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
                Create Account
              </h2>
              <p className="text-[12px] font-medium leading-snug text-[#6f7788] sm:text-[13px] sm:leading-relaxed [@media(max-height:680px)]:text-[11px]">
                Enter your details and our team will review your request
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3 lg:space-y-4 [@media(max-height:680px)]:space-y-1.5">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 [@media(max-height:680px)]:gap-1.5">
                <FormField
                  id="firstName"
                  label="First Name"
                  error={errors.firstName?.message}
                  className={fieldClassName}
                >
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6] sm:right-4" />
                        <Input
                          {...field}
                          id="firstName"
                          type="text"
                          placeholder="First Name"
                          autoComplete="given-name"
                          aria-invalid={errors.firstName ? true : undefined}
                          className={inputClassName}
                        />
                      </div>
                    )}
                  />
                </FormField>

                <FormField
                  id="lastName"
                  label="Last Name"
                  error={errors.lastName?.message}
                  className={fieldClassName}
                >
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6] sm:right-4" />
                        <Input
                          {...field}
                          id="lastName"
                          type="text"
                          placeholder="Last Name"
                          autoComplete="family-name"
                          aria-invalid={errors.lastName ? true : undefined}
                          className={inputClassName}
                        />
                      </div>
                    )}
                  />
                </FormField>
              </div>

              <FormField
                id="email"
                label="Work Email"
                error={errors.email?.message}
                className={fieldClassName}
              >
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6] sm:right-4" />
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="Enter Work Email"
                        autoComplete="email"
                        aria-invalid={errors.email ? true : undefined}
                        className={inputClassName}
                      />
                    </div>
                  )}
                />
              </FormField>

              <FormField
                id="phone"
                label="Phone Number"
                error={errors.phone?.message}
                className={fieldClassName}
              >
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6] sm:right-4" />
                      <Input
                        {...field}
                        id="phone"
                        type="tel"
                        placeholder="Enter Phone Number"
                        autoComplete="tel"
                        inputMode="numeric"
                        aria-invalid={errors.phone ? true : undefined}
                        className={inputClassName}
                      />
                    </div>
                  )}
                />
              </FormField>

              <FormField
                id="companyName"
                label="Company Name"
                error={errors.companyName?.message}
                className={fieldClassName}
              >
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6] sm:right-4" />
                      <Input
                        {...field}
                        id="companyName"
                        type="text"
                        placeholder="Company Name"
                        autoComplete="organization"
                        aria-invalid={errors.companyName ? true : undefined}
                        className={inputClassName}
                      />
                    </div>
                  )}
                />
              </FormField>

              {signupError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive min-w-0 break-words"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{signupError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 h-10 w-full rounded-[8px] bg-primary text-sm font-bold text-primary-foreground shadow-none transition-colors hover:bg-primary-hover sm:mt-3 sm:h-12 [@media(max-height:680px)]:mt-1 [@media(max-height:680px)]:h-9"
              >
                {isSubmitting ? "Submitting request..." : "Submit Request"}
              </Button>

              <p className="pt-0.5 text-center text-[12px] font-medium text-[#8b94a7] sm:text-[13px] [@media(max-height:680px)]:pt-0">
                Already have an account?{" "}
                <Link to="/" className="text-primary-hover hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogShell
          title="Request Submitted"
          description={SIGNUP_REQUEST_SUCCESS_MESSAGE}
          size="confirm"
          leadingIcon={
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          }
          footer={
            <Button
              type="button"
              onClick={() => navigate("/")}
              className="h-10 rounded-[30px] px-8"
            >
              Back to Sign In
            </Button>
          }
        />
      </Dialog>
    </form>
  );
};

export default SignUpForm;
