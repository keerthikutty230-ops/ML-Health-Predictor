"use client";

import React, { useState, useEffect } from "react";
import { X, Lock, Mail, User as UserIcon, Eye, EyeOff, Stethoscope, ArrowRight } from "lucide-react";
import { Language, TRANSLATIONS } from "@/lib/translations";
import { Button } from "@/components/ui/button";

import { neonSignInWithGoogle, neonSignInWithEmail } from "@/lib/neonClient";
import { neonSignInWithGoogleOAuth } from "@/lib/neonAuthClient";
import { authClient } from "@/lib/auth/client";

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: "google" | "email";
  createdAt: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  lang?: Language;
  initialMode?: "signin" | "signup";
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  lang = "en",
  initialMode = "signin"
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setEmail("");
      setPassword("");
      setFullName("");
      setShowPassword(false);
      setError(null);
    }
  }, [isOpen, initialMode]);

  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;

  if (!isOpen) return null;

  // 1. Google Social Authentication via Neon Auth
  const handleGoogleSocialSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (typeof window !== "undefined" && authClient?.signIn?.social) {
        await authClient.signIn.social({
          provider: "google",
          callbackURL: window.location.origin,
        });
      }

      const user = await neonSignInWithGoogleOAuth();
      if (user) {
        onLoginSuccess(user);
        setIsSubmitting(false);
        onClose();
      }
    } catch (e: any) {
      console.warn("Google OAuth trigger notice:", e);
      try {
        const fallbackUser = await neonSignInWithGoogleOAuth();
        if (fallbackUser) {
          onLoginSuccess(fallbackUser);
          setIsSubmitting(false);
          onClose();
        }
      } catch (err: any) {
        setError("Google authentication notice: " + (err?.message || "Please try again"));
        setIsSubmitting(false);
      }
    }
  };

  // 2. Email & Password Authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (authMode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = await neonSignInWithEmail(email.trim(), password, fullName.trim(), authMode);
      onLoginSuccess(user);
      setIsSubmitting(false);
      onClose();
    } catch (e: any) {
      setError("Authentication failed: " + (e?.message || "Invalid credentials. Please try again."));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="authModal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#A4ACA2]/50 backdrop-blur-md transition-all duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="authModalBox"
        className="relative z-10 w-full max-w-md bg-white border border-[#E5E7E4] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-[#000000]"
      >
        {/* Close Button */}
        <button
          id="authCloseBtn"
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 p-2 rounded-full text-[#524646] hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#1E3F20] flex items-center justify-center text-white">
              <Stethoscope className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E3F20]">HealthPredict AI</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#000000]">
            {authMode === "signup" ? "Create account" : "Sign in"}
          </h2>
          <p className="text-xs text-[#524646]">
            {authMode === "signup"
              ? "Sign up to save clinical risk predictions, reports & appointments."
              : "Welcome back! Sign in to access your saved health records."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in">
            {error}
          </div>
        )}

        {/* Google Social Auth Button */}
        <div className="space-y-4">
          <button
            id="googleAuthModalBtn"
            type="button"
            onClick={handleGoogleSocialSignIn}
            disabled={isSubmitting}
            className="w-full h-11 bg-white hover:bg-[#F9FAFB] active:bg-[#F3F4F6] text-[#111827] font-semibold text-xs rounded-xl flex items-center justify-center gap-3 transition-all border border-[#D1D5DB] shadow-sm cursor-pointer disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-[#111827]">Continue with Google</span>
          </button>

          {/* Divider Line */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#E5E7EB] w-full" />
            <span className="bg-white px-3 text-[11px] text-[#6B7280] font-medium uppercase tracking-wider absolute">
              or continue with email
            </span>
          </div>

          {/* Email & Password Form */}
          <form id="authForm" onSubmit={handleEmailAuth} className="space-y-3.5 pt-1">
            {authMode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#374151]">Full name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type="text"
                    required
                    placeholder="Dr. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#FAFAFA] border border-[#D1D5DB] text-xs text-[#000000] placeholder-[#9CA3AF] focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#374151]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#FAFAFA] border border-[#D1D5DB] text-xs text-[#000000] placeholder-[#9CA3AF] focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#374151]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-10 rounded-xl bg-[#FAFAFA] border border-[#D1D5DB] text-xs text-[#000000] placeholder-[#9CA3AF] focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 text-[#9CA3AF] hover:text-[#000000] p-0.5 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <Button
              id="authSubmitBtn"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-[#000000] hover:bg-[#1f2937] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <span>{authMode === "signup" ? "Create account" : "Sign in"}</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* State Toggle Link */}
        <div className="pt-2 text-center text-xs text-[#524646] border-t border-[#F3F4F6]">
          {authMode === "signup" ? (
            <span>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setError(null);
                }}
                className="text-[#000000] font-bold hover:underline ml-1 cursor-pointer"
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setError(null);
                }}
                className="text-[#000000] font-bold hover:underline ml-1 cursor-pointer"
              >
                Create account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
