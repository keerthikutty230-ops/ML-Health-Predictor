"use client";

import React, { useState, useEffect } from "react";
import { X, Lock, Mail, User as UserIcon, Stethoscope, ArrowRight, ArrowLeft } from "lucide-react";
import { Language, TRANSLATIONS } from "@/lib/translations";
import { Button } from "@/components/ui/button";

import { neonSignInWithGoogle, neonSignInWithEmail } from "@/lib/neonClient";
import { neonSignInWithGoogleOAuth } from "@/lib/neonAuthClient";

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
  const [googleEmail, setGoogleEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authStep, setAuthStep] = useState<"choice" | "email">("choice");

  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setAuthStep("choice");
      setEmail("");
      setPassword("");
      setFullName("");
      setGoogleEmail("");
      setError(null);
    }
  }, [isOpen, initialMode]);

  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const trimmedGoogleEmail = googleEmail.trim();
      let user: AuthUser;
      if (trimmedGoogleEmail) {
        user = await neonSignInWithGoogle(trimmedGoogleEmail);
      } else {
        user = await neonSignInWithGoogleOAuth();
      }
      onLoginSuccess(user);
      setIsSubmitting(false);
      onClose();
    } catch (e: any) {
      setError("Google sign-in failed: " + (e.message || "Unknown error"));
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email address and password.");
      return;
    }
    if (authMode === "signup" && !fullName) {
      setError("Please enter your full name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = await neonSignInWithEmail(email, password, fullName, authMode);
      onLoginSuccess(user);
      setIsSubmitting(false);
      onClose();
    } catch (e: any) {
      setError("Email authentication failed: " + (e.message || "Unknown error"));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="authModal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="authModalBox"
        className="relative z-10 w-full max-w-md bg-[#121C2D] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-6"
      >
          {/* Close Button */}
          <button
            id="authCloseBtn"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xl font-bold"
          >
            ×
          </button>

          {/* Modal Header */}
          <div className="text-center space-y-2 pt-2">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Stethoscope className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {authMode === "signin" ? "Sign In to HealthPredict AI" : "Create HealthPredict AI Account"}
            </h2>
            <p className="text-xs text-slate-400">
              Secure patient access & clinical assessment persistence
            </p>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex items-center gap-1 bg-[#0B1320] border border-white/10 rounded-xl p-1 text-xs">
            <button
              id="signInTabBtn"
              type="button"
              onClick={() => { setAuthMode("signin"); setAuthStep("choice"); setError(null); }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-center ${
                authMode === "signin"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("auth_signin")}
            </button>
            <button
              id="signUpTabBtn"
              type="button"
              onClick={() => { setAuthMode("signup"); setAuthStep("choice"); setError(null); }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-center ${
                authMode === "signup"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("auth_signup")}
            </button>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {authStep === "choice" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Google account email</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B1320] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500">Use the email tied to your connected Google account.</p>
              </div>

              <Button
                id="googleSignInBtn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full h-11 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-3 shadow-md transition-all border border-slate-200"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </Button>

              <Button
                type="button"
                onClick={() => { setAuthStep("email"); setError(null); }}
                disabled={isSubmitting}
                className="w-full h-11 bg-[#0B1320] hover:bg-[#111B31] text-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-3 shadow-md transition-all border border-white/10"
              >
                <Mail className="h-4 w-4" />
                <span>{authMode === "signin" ? "Continue with Email" : "Create account with Email"}</span>
              </Button>

              <p className="text-center text-[11px] text-slate-500">
                {authMode === "signin"
                  ? "Use Google or email to restore your saved reports, appointments, medications, and chat history."
                  : "Create an account to save your reports, appointments, medications, and health history securely."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B1320] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setAuthStep("choice")}
                  className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <span className="text-[11px] font-semibold text-slate-400">
                  {authMode === "signin" ? "Sign in with email" : "Create account with email"}
                </span>
              </div>

              <form id="authForm" onSubmit={handleEmailAuth} className="space-y-3">
                {authMode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">{t("auth_name")}</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Dr. Ramesh Kumar"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#0B1320] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">{t("auth_email")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="patient@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#0B1320] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">{t("auth_password")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#0B1320] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <Button
                  id="authSubmitBtn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Authenticating...</span>
                  ) : (
                    <>
                      <span>{authMode === "signin" ? t("auth_signin") : t("auth_signup")}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* FOOTER TOGGLE */}
          <div className="pt-2 text-center text-xs text-slate-400">
            {authMode === "signin" ? (
              <span>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className="text-blue-400 font-bold hover:underline"
                >
                  Create one now
                </button>
              </span>
            ) : (
              <span>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className="text-blue-400 font-bold hover:underline"
                >
                  Sign In to your account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
  );
}
