import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/common/FormField";
import TooltipLabel from "@/components/common/TooltipLabel";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { login } from "../../store/slice";
import { selectAuthError } from "../../store/selectors";
import {
  LoginSchema,
  type LoginInput as LoginFormValues,
} from "@/contracts/validation";
import { DEFAULT_AUTHENTICATED_PATH } from "@/utils/orgRoutes";
import loginBg from "@/assets/images/login-bg.svg";
import logoImg from "@/assets/images/logo.svg";

const LoginForm = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const loginError = useAppSelector(selectAuthError);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // unwrap() so a rejected login throws into the catch below rather than
      // navigating on a failed attempt. The resolved user is not needed: every
      // role lands on the same path.
      await dispatch(login(data)).unwrap();
      navigate(DEFAULT_AUTHENTICATED_PATH);
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
        <section className="flex max-h-[calc(100svh-24px)] w-full max-w-[370px] flex-col overflow-x-hidden overflow-y-auto rounded-[24px] border border-white/80 bg-white px-6 py-6 shadow-[0_22px_60px_rgba(25,38,95,0.15)] sm:max-w-[410px] sm:px-8 sm:py-7 lg:mr-[clamp(2rem,8vw,7.5rem)] lg:h-auto lg:max-h-[calc(100vh-40px)] lg:min-h-[clamp(500px,65vh,610px)] lg:w-[clamp(430px,35.25vw,510px)] lg:max-w-none lg:rounded-[28px] lg:px-12 lg:py-9 [@media(max-height:680px)]:py-4">
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <div className="mb-6 flex items-center justify-center gap-2 lg:mb-7">
              <img
                src={logoImg}
                alt="CRM Logo"
                className="h-5 w-5 shrink-0 object-contain lg:h-6 lg:w-6"
              />
              <span className="text-sm font-bold leading-none text-primary">
                EMVESSO CRM
              </span>
            </div>

            <div className="mb-6 space-y-2 text-center lg:mb-7">
              <h2 className="text-[30px] font-bold leading-none text-[#050509] sm:text-[34px]">
                Welcome!
              </h2>
              <p className="text-[13px] font-medium leading-relaxed text-[#6f7788]">
                Enter your credentials to access your account
              </p>
            </div>

            <div className="space-y-3 lg:space-y-4">
              <FormField
                id="email"
                label="Email Address"
                error={errors.email?.message}
                className="gap-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#050509]"
              >
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b6]" />
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="Enter Email Address"
                        aria-invalid={errors.email ? true : undefined}
                        className="h-11 rounded-[8px] border-[#c8d0e2] bg-white pl-4 pr-11 text-sm font-medium text-[#111827] shadow-none placeholder:text-[13px] placeholder:font-normal placeholder:text-[#a0a7b8] hover:border-[#b9c3d9] focus-visible:border-primary focus-visible:ring-primary/15"
                      />
                    </div>
                  )}
                />
              </FormField>

              <FormField
                id="password"
                label="Password"
                error={errors.password?.message}
                className="gap-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#050509]"
              >
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter Password"
                        aria-invalid={errors.password ? true : undefined}
                        className="h-11 rounded-[8px] border-[#c8d0e2] bg-white pl-4 pr-12 text-sm font-medium text-[#111827] shadow-none placeholder:text-[13px] placeholder:font-normal placeholder:text-[#a0a7b8] hover:border-[#b9c3d9] focus-visible:border-primary focus-visible:ring-primary/15"
                      />
                      <TooltipLabel
                        label={showPassword ? "Hide password" : "Show password"}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-[#9aa3b6] transition-colors hover:bg-transparent hover:text-[#111827]"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
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

              <p className="pt-0.5 text-right text-[13px] font-medium text-primary-hover">
                <Link to="/forgot-password" className="hover:underline">
                  Forgot Password?
                </Link>
              </p>

              {loginError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive min-w-0 break-words"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{loginError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 h-12 w-full rounded-[8px] bg-primary text-sm font-bold text-primary-foreground shadow-none transition-colors hover:bg-primary-hover"
              >
                {isSubmitting ? "Logging in..." : "Log In"}
              </Button>

              <p className="pt-0.5 text-center text-[13px] font-medium text-[#8b94a7]">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-primary-hover hover:underline"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </form>
  );
};

export default LoginForm;
