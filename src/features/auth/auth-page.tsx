"use client";

import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  MailCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type AuthMode = "signin" | "signup";
type SignupStep = "identity" | "password" | "verify";

const strengthStyles = [
  { label: "Too short", bar: "bg-border", text: "text-muted" },
  { label: "Weak", bar: "bg-danger", text: "text-danger" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Good", bar: "bg-primary", text: "text-primary" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
] as const;

function getPasswordStrength(password: string) {
  if (!password) return 0;
  let score = password.length >= 12 ? 1 : 0;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  return (
    <Suspense
      fallback={<div className="auth-background min-h-dvh" aria-label="Loading account access" />}
    >
      <AuthContent mode={mode} />
    </Suspense>
  );
}

function AuthContent({ mode }: { mode: AuthMode }) {
  const searchParams = useSearchParams();
  const [signupStep, setSignupStep] = useState<SignupStep>("identity");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { login, register } = useAuth();
  const strength = getPasswordStrength(password);
  const requestedPath = searchParams.get("next");
  const nextPath =
    requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : undefined;

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setTimeout(() => setResendTimer((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendTimer]);

  async function submitSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password, remember, nextPath);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function continueToPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter your name to continue");
      return;
    }
    if (!email.trim()) {
      setError("Enter a valid email address");
      return;
    }
    setSignupStep("password");
  }

  function validateNewPassword() {
    if (password.length < 12) return "Use at least 12 characters for your password";
    if (strength < 3) return "Use uppercase, lowercase, a number, and a symbol";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  }

  async function sendVerificationCode() {
    const validationError = validateNewPassword();
    if (validationError) throw new Error(validationError);
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.error || "Unable to send verification code");
    setSignupStep("verify");
    setResendTimer(60);
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendVerificationCode();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAccount(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code");
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, otp);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError(null);
    setLoading(true);
    try {
      await sendVerificationCode();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to resend code");
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === "signin"
      ? "Sign in to your money"
      : signupStep === "identity"
        ? "Create your account"
        : signupStep === "password"
          ? "Secure your account"
          : "Verify your email";
  const description =
    mode === "signin"
      ? "Your latest salary cycle will be ready after a secure sync."
      : signupStep === "identity"
        ? "Start with the details you will use for your SalaryFlow account."
        : signupStep === "password"
          ? "Create a strong password to protect your financial records."
          : `Enter the six-digit code sent to ${email.trim().toLowerCase()}.`;

  return (
    <main className="auth-background min-h-dvh lg:grid lg:grid-cols-[minmax(22rem,0.85fr)_minmax(30rem,1.15fr)]">
      <section className="hidden bg-foreground/95 px-12 py-14 text-background lg:flex lg:flex-col lg:justify-between">
        <Brand />
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight">
            Your salary cycle, ready where you left it.
          </p>
          <div className="mt-10 space-y-6">
            <FlowStep
              number="1"
              title="Secure your account"
              detail="Sign in or create a verified account."
            />
            <FlowStep
              number="2"
              title="Set up your cycle"
              detail="New accounts complete a short money setup."
            />
            <FlowStep
              number="3"
              title="Continue with clarity"
              detail="See what is safe to spend today."
            />
          </div>
        </div>
        <p className="text-xs text-background/60">
          Private financial records stay tied to your verified account.
        </p>
      </section>

      <section className="flex min-h-dvh flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:items-center lg:justify-center lg:px-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none">
          <div className="lg:hidden">
            <Brand />
          </div>

          <nav
            className="mt-8 grid grid-cols-2 rounded-xl bg-surface-2/90 p-1 lg:mt-0"
            aria-label="Account access"
          >
            <Link
              href="/login"
              aria-current={mode === "signin" ? "page" : undefined}
              className={cn(
                "flex h-10 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--ring)",
                mode === "signin" ? "bg-surface text-foreground card-shadow" : "text-muted",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              aria-current={mode === "signup" ? "page" : undefined}
              className={cn(
                "flex h-10 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--ring)",
                mode === "signup" ? "bg-surface text-foreground card-shadow" : "text-muted",
              )}
            >
              Sign up
            </Link>
          </nav>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-primary">
                {mode === "signin" ? "Welcome back" : "New account"}
              </p>
              {mode === "signup" && <SignupProgress step={signupStep} />}
            </div>
            <h1 className="mt-2 text-3xl font-semibold">{heading}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
          </div>

          {mode === "signin" ? (
            <SignInForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              remember={remember}
              setRemember={setRemember}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              loading={loading}
              error={error}
              onSubmit={submitSignIn}
            />
          ) : signupStep === "identity" ? (
            <IdentityForm
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              error={error}
              onSubmit={continueToPassword}
            />
          ) : signupStep === "password" ? (
            <PasswordForm
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              strength={strength}
              loading={loading}
              error={error}
              onSubmit={submitPassword}
              onBack={() => {
                setError(null);
                setSignupStep("identity");
              }}
            />
          ) : (
            <VerificationForm
              email={email}
              otp={otp}
              setOtp={setOtp}
              loading={loading}
              error={error}
              resendTimer={resendTimer}
              onSubmit={verifyAccount}
              onResend={resendCode}
              onBack={() => {
                setError(null);
                setSignupStep("password");
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function SignInForm({
  email,
  setEmail,
  password,
  setPassword,
  remember,
  setRemember,
  showPassword,
  setShowPassword,
  loading,
  error,
  onSubmit,
}: {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  remember: boolean;
  setRemember: (value: boolean) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <EmailField email={email} setEmail={setEmail} />
      <PasswordField
        id="login-password"
        label="Password"
        value={password}
        setValue={setPassword}
        visible={showPassword}
        setVisible={setShowPassword}
        autoComplete="current-password"
      />
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          Remember me
        </label>
        <Link href="/forgot-password" className="text-sm font-medium text-primary">
          Forgot password?
        </Link>
      </div>
      {error && <AuthError message={error} />}
      <Button className="w-full" disabled={loading || !email.trim() || !password}>
        {loading ? "Signing in..." : "Sign in securely"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
      <p className="text-center text-sm text-muted">
        New to SalaryFlow?{" "}
        <Link href="/register" className="font-medium text-primary">
          Sign up
        </Link>
      </p>
    </form>
  );
}

function IdentityForm({
  name,
  setName,
  email,
  setEmail,
  error,
  onSubmit,
}: {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  error: string | null;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div>
        <Label htmlFor="register-name">Name</Label>
        <Input
          id="register-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          placeholder="What should we call you?"
          autoFocus
          required
        />
      </div>
      <EmailField email={email} setEmail={setEmail} />
      {error && <AuthError message={error} />}
      <Button className="w-full" disabled={!name.trim() || !email.trim()}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function PasswordForm({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  strength,
  loading,
  error,
  onSubmit,
  onBack,
}: {
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  strength: number;
  loading: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div>
        <PasswordField
          id="register-password"
          label="Create password"
          value={password}
          setValue={setPassword}
          autoComplete="new-password"
          autoFocus
        />
        <PasswordStrength strength={strength} />
      </div>
      <PasswordField
        id="register-confirm"
        label="Confirm password"
        value={confirmPassword}
        setValue={setConfirmPassword}
        visible={showPassword}
        setVisible={setShowPassword}
        autoComplete="new-password"
        revealable
      />
      {confirmPassword && password !== confirmPassword && (
        <p className="-mt-3 text-xs text-danger">Passwords do not match</p>
      )}
      {error && <AuthError message={error} />}
      <Button className="w-full" disabled={loading || !password || !confirmPassword}>
        {loading ? "Sending code..." : "Continue to verification"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
      <BackButton onClick={onBack}>Back to your details</BackButton>
    </form>
  );
}

function VerificationForm({
  email,
  otp,
  setOtp,
  loading,
  error,
  resendTimer,
  onSubmit,
  onResend,
  onBack,
}: {
  email: string;
  otp: string;
  setOtp: (value: string) => void;
  loading: boolean;
  error: string | null;
  resendTimer: number;
  onSubmit: (event: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div className="flex items-center gap-3 rounded-xl bg-surface-2/90 px-3.5 py-3">
        <MailCheck className="h-5 w-5 shrink-0 text-success" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{email}</span>
        <button type="button" onClick={onBack} className="text-xs font-medium text-primary">
          Change
        </button>
      </div>
      <div>
        <Label htmlFor="register-otp">Verification code</Label>
        <Input
          id="register-otp"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          className="text-center font-mono text-lg tracking-[0.3em]"
          autoFocus
          required
        />
      </div>
      {error && <AuthError message={error} />}
      <Button className="w-full" disabled={loading || otp.length !== 6}>
        {loading ? "Creating account..." : "Verify and continue"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onResend}
        disabled={loading || resendTimer > 0}
      >
        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend verification code"}
      </Button>
      <BackButton onClick={onBack}>Back to password</BackButton>
    </form>
  );
}

function SignupProgress({ step }: { step: SignupStep }) {
  const stepNumber = step === "identity" ? 1 : step === "password" ? 2 : 3;
  return (
    <div className="flex items-center gap-2" aria-label={`Sign up step ${stepNumber} of 3`}>
      <span className="text-xs text-muted">Step {stepNumber} of 3</span>
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((value) => (
          <span
            key={value}
            className={cn(
              "h-1.5 w-5 rounded-full",
              value <= stepNumber ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 text-sm font-semibold">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
        <WalletCards className="h-4 w-4" />
      </span>
      SalaryFlow
    </div>
  );
}

function EmailField({ email, setEmail }: { email: string; setEmail: (value: string) => void }) {
  return (
    <div>
      <Label htmlFor="auth-email">Email</Label>
      <Input
        id="auth-email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        required
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  setValue,
  visible,
  setVisible,
  autoComplete,
  autoFocus,
  revealable = true,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (value: string) => void;
  visible?: boolean;
  setVisible?: (value: boolean) => void;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
  revealable?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          type={revealable && visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={autoComplete === "new-password" ? 12 : 1}
          maxLength={128}
          className={cn("pl-10", revealable && "pr-10")}
          autoFocus={autoFocus}
          required
        />
        {revealable && setVisible && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function PasswordStrength({ strength }: { strength: number }) {
  const style = strengthStyles[strength];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn("h-1.5 rounded-full", level <= strength ? style.bar : "bg-border")}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className={cn("font-medium", style.text)}>{style.label}</span>
        <span className="text-right text-muted">12+ characters with mixed types</span>
      </div>
    </div>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {children}
    </button>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
      {message}
    </div>
  );
}

function FlowStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/10 text-xs font-semibold">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-background/60">{detail}</p>
      </div>
    </div>
  );
}
