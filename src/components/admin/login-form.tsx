"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/admin";
  const [pending, setPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setPending(true);
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setPending(false);

    if (res?.error) {
      // Generic, non-leaking messages: none reveal whether the account exists.
      const code = (res as { code?: string }).code;
      const message =
        code === "rate_limited"
          ? "Too many attempts. Please wait a few minutes and try again."
          : code === "auth_unavailable"
            ? "Sign-in is temporarily unavailable. Please try again shortly."
            : "Invalid email or password.";
      toast.error(message);
      return;
    }
    toast.success("Welcome back!");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-brand-50/80">
          Email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-200/70" />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="owner@agdentallab.com"
            className="login-input h-12 border-brand-400/25 bg-brand-950/45 pl-10 text-cream shadow-inner-glow placeholder:text-brand-100/45 focus-visible:border-brand-300/70 focus-visible:ring-2 focus-visible:ring-brand-400/35"
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-300">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-brand-50/80">
          Password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-200/70" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            className="login-input h-12 border-brand-400/25 bg-brand-950/45 pl-10 text-cream shadow-inner-glow placeholder:text-brand-100/45 focus-visible:border-brand-300/70 focus-visible:ring-2 focus-visible:ring-brand-400/35"
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-red-300">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="gradient"
        className="h-12 w-full bg-[#F5F5F0] text-brand-900 shadow-glow hover:-translate-y-0.5 hover:bg-white focus-visible:ring-brand-300/50"
        disabled={pending}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
}
