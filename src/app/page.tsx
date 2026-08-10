"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, Heart, Building2, Search, Shield, TrendingUp, User, Stethoscope,
  MapPin, Phone, Star, AlertTriangle, CheckCircle2, Info, FileText, Sparkles,
  ChevronDown, ChevronUp, ChevronRight, Loader2, Zap, BarChart3, ShieldCheck,
  Pill, Syringe, AlertOctagon, ArrowRight, MapPinned, Cross, ClipboardList, Users, Gauge,
  Printer, HeartPulse, Check, Navigation, Sliders, Award, Clock, ArrowUpRight,
  Upload, FileUp, X, MessageSquareText, Image as ImageIcon, Globe,
  Calendar, UserCheck, Copy, ChevronLeft, ExternalLink, LogOut, History
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

import { TRANSLATIONS, Language, LANGUAGE_LIST } from "@/lib/translations";
import { COMMON_MEDICATIONS, checkMedicationInteractions, InteractionCheckResult } from "@/lib/medicationChecker";
import AIChatbotWidget from "@/components/AIChatbotWidget";
import AuthModal, { AuthUser } from "@/components/AuthModal";
import ClinicalHistoryModal, { RiskAssessmentRecord, SavedAppointmentRecord } from "@/components/ClinicalHistoryModal";
import { getUserDatabase, saveUserDatabase, ChatRecord } from "@/lib/userDatabase";
import { saveNeonRiskReport, saveNeonAppointment, fetchNeonUserHistory, neonSignInWithGoogle, neonSignInWithEmail, saveNeonChatTranscript } from "@/lib/neonClient";
import { neonSignInWithGoogleOAuth, checkNeonSessionAsync, signOutNeonSession } from "@/lib/neonAuthClient";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface HealthInputs {
  age: number; bmi: number; blood_pressure_systolic: number;
  blood_pressure_diastolic: number; glucose: number; cholesterol: number;
  heart_rate: number; insulin: number;
}
interface OverlappingTrait { trait: string; user_value: number; patient_value: number; deviation_pct: number; }
interface UserProfile {
  age: number; bmi: number; blood_pressure: string; glucose: number;
  cholesterol: number; heart_rate: number; insulin: number; location: string;
}
interface HistoricalMatch {
  patient_id: string; similarity_score: number;
  profile: { age: number; bmi: number; blood_pressure: string; glucose: number; cholesterol: number; heart_rate: number };
  risk_level: string; diagnosis: string; overlapping_traits: OverlappingTrait[]; historical_progression: string;
}
interface Hospital {
  id: string; name: string; city: string; state: string; matched_specialties: string[];
  all_specialties: string[]; rating: number; distance_km: number; address: string;
  phone: string; beds: number; emergency: boolean; doctors: string[]; match_score: number;
}
interface RiskResult {
  risk_tier: string; risk_score: number;
  risk_probability: { low: number; moderate: number; high: number };
  feature_importance: Record<string, number>;
}
interface CareGuide { title: string; precautions: string[]; otc_guidance: string[]; avoid: string[]; }
interface CareGuidance {
  tier: string; show_medications: boolean; emergency_escalation: boolean;
  message: string; actions?: string[]; care_guides?: CareGuide[]; disclaimer?: string;
}
interface CityOption { city: string; state: string; }
interface PredictionResult {
  risk: RiskResult; historical_matches: HistoricalMatch[];
  recommended_hospitals: Hospital[]; care_guidance: CareGuidance;
  user_profile: UserProfile; ai_summary: string | null;
}

type RiskTier = "low" | "moderate" | "high";

/* ------------------------------------------------------------------ */
/*  Constants & Presets                                                */
/* ------------------------------------------------------------------ */
const DEFAULT_INPUTS: HealthInputs = {
  age: 45, bmi: 25.0, blood_pressure_systolic: 120, blood_pressure_diastolic: 80,
  glucose: 95, cholesterol: 190, heart_rate: 72, insulin: 15.0,
};

const DEFAULT_AP_CITIES: CityOption[] = [
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Guntur", state: "Andhra Pradesh" },
  { city: "Tirupati", state: "Andhra Pradesh" },
  { city: "Kakinada", state: "Andhra Pradesh" },
  { city: "Rajahmundry", state: "Andhra Pradesh" },
  { city: "Nellore", state: "Andhra Pradesh" },
  { city: "Kurnool", state: "Andhra Pradesh" },
  { city: "Anantapur", state: "Andhra Pradesh" },
  { city: "Ongole", state: "Andhra Pradesh" },
  { city: "Eluru", state: "Andhra Pradesh" },
  { city: "Kadapa", state: "Andhra Pradesh" },
  { city: "Chittoor", state: "Andhra Pradesh" },
  { city: "Vizianagaram", state: "Andhra Pradesh" },
];

const HOSPITAL_TICKER = [
  { name: "Manipal Hospital", city: "Vijayawada", rating: 4.5, beds: 350 },
  { name: "KIMS ICON Hospital", city: "Visakhapatnam", rating: 4.5, beds: 434 },
  { name: "Aster Ramesh Hospital", city: "Guntur", rating: 4.6, beds: 300 },
  { name: "SVIMS Institute", city: "Tirupati", rating: 4.4, beds: 1000 },
  { name: "Apollo Hospitals", city: "Kakinada", rating: 4.1, beds: 200 },
  { name: "Medicover Hospitals", city: "Nellore", rating: 4.0, beds: 200 },
  { name: "Kurnool Medical College", city: "Kurnool", rating: 4.0, beds: 800 },
  { name: "KIMS Hospital", city: "Anantapur", rating: 4.1, beds: 250 },
];

const PRESETS = [
  {
    name: "Healthy Baseline",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    data: { age: 32, bmi: 22.5, blood_pressure_systolic: 118, blood_pressure_diastolic: 78, glucose: 90, cholesterol: 175, heart_rate: 68, insulin: 8.5 }
  },
  {
    name: "Borderline Risk",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    data: { age: 52, bmi: 27.8, blood_pressure_systolic: 134, blood_pressure_diastolic: 86, glucose: 112, cholesterol: 215, heart_rate: 76, insulin: 18.0 }
  },
  {
    name: "Elevated Risk",
    icon: <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />,
    data: { age: 64, bmi: 34.2, blood_pressure_systolic: 155, blood_pressure_diastolic: 96, glucose: 165, cholesterol: 260, heart_rate: 88, insulin: 35.0 }
  }
];

interface SliderField {
  key: keyof HealthInputs; label: string; unit: string;
  min: number; max: number; step: number; icon: React.ReactNode;
  tooltip: string; normalRange: [number, number];
}
const SLIDER_FIELDS: SliderField[] = [
  { key: "age", label: "Age", unit: "years", min: 1, max: 100, step: 1, icon: <User className="h-4 w-4 text-blue-400" />, tooltip: "Patient age", normalRange: [18, 65] },
  { key: "bmi", label: "BMI", unit: "kg/m²", min: 10, max: 50, step: 0.1, icon: <Activity className="h-4 w-4 text-emerald-400" />, tooltip: "Body Mass Index (18.5-24.9 normal)", normalRange: [18.5, 24.9] },
  { key: "blood_pressure_systolic", label: "Systolic BP", unit: "mmHg", min: 70, max: 220, step: 1, icon: <Heart className="h-4 w-4 text-rose-400" />, tooltip: "Systolic BP (normal <120)", normalRange: [90, 120] },
  { key: "blood_pressure_diastolic", label: "Diastolic BP", unit: "mmHg", min: 40, max: 140, step: 1, icon: <Heart className="h-4 w-4 text-rose-400" />, tooltip: "Diastolic BP (normal <80)", normalRange: [60, 80] },
  { key: "glucose", label: "Fasting Glucose", unit: "mg/dL", min: 40, max: 350, step: 1, icon: <Zap className="h-4 w-4 text-amber-400" />, tooltip: "Fasting glucose (normal 70-100)", normalRange: [70, 100] },
  { key: "cholesterol", label: "Total Cholesterol", unit: "mg/dL", min: 80, max: 450, step: 1, icon: <BarChart3 className="h-4 w-4 text-indigo-400" />, tooltip: "Cholesterol (desirable <200)", normalRange: [100, 200] },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", min: 30, max: 200, step: 1, icon: <HeartPulse className="h-4 w-4 text-teal-400" />, tooltip: "Resting heart rate (60-100 normal)", normalRange: [60, 100] },
  { key: "insulin", label: "Fasting Insulin", unit: "uU/mL", min: 0, max: 300, step: 0.5, icon: <Activity className="h-4 w-4 text-sky-400" />, tooltip: "Fasting insulin (2-20 normal)", normalRange: [2, 20] },
];

const RISK_CFG: Record<RiskTier, {
  color: string; bg: string; badge: string; icon: React.ReactNode;
  bar: string; label: string; desc: string; stroke: string;
}> = {
  low: {
    color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-400" />, bar: "bg-emerald-500",
    stroke: "#059669",
    label: "Low Risk", desc: "Your health indicators are within optimal clinical ranges.",
  },
  moderate: {
    color: "text-amber-400", bg: "bg-amber-950/30 border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: <AlertTriangle className="h-6 w-6 text-amber-400" />, bar: "bg-amber-500",
    stroke: "#d97706",
    label: "Moderate Risk", desc: "Some indicators suggest elevated chronic risk factors requiring lifestyle management.",
  },
  high: {
    color: "text-rose-400", bg: "bg-rose-950/30 border-rose-500/30",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    icon: <AlertOctagon className="h-6 w-6 text-rose-400" />, bar: "bg-rose-500",
    stroke: "#e11d48",
    label: "High Risk", desc: "Multiple indicators suggest significant health concerns requiring medical consultation.",
  },
};

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function getRiskCfg(tier: string) {
  return RISK_CFG[tier as RiskTier] ?? RISK_CFG.low;
}

/* ================================================================== */
/*  Risk Gauge Component                                              */
/* ================================================================== */
function RiskGauge({ score, tier }: { score: number; tier: string }) {
  const cfg = getRiskCfg(tier);
  const percentage = Math.round(score * 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-2">
      <svg className="w-36 h-36 transform -rotate-90">
        <circle cx="72" cy="72" r={radius} stroke="currentColor" strokeWidth="10" className="text-slate-800" fill="transparent" />
        <motion.circle
          cx="72" cy="72" r={radius} stroke={cfg.stroke} strokeWidth="10"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          strokeLinecap="round" fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black tracking-tight text-slate-100">{percentage}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Confidence</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Clinical Footer Component                                         */
/* ================================================================== */
function ClinicalFooter({ setView, t }: { setView?: (v: "landing" | "app") => void; t: (k: keyof typeof TRANSLATIONS.en) => string }) {
  return (
    <footer className="bg-[#EAECE9] py-4 px-4 sm:px-6 lg:px-8 print:hidden">
      <div className="max-w-7xl mx-auto">
        <div className="clinical-card bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-neutral-200/35 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Col 1: Brand & Mission */}
            <div className="md:col-span-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#181818] flex items-center justify-center shadow-sm">
                  <Stethoscope className="h-4.5 w-4.5 brand-stethoscope-icon text-[#10b981]" />
                </div>
                <span className="font-bold text-base text-[#1A1816] tracking-tight">{t("nav_title")}</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed max-w-sm">
                {t("hero_desc")}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10 text-[9px] py-0 px-2 h-5 flex items-center">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-emerald-400" /> AP Health Network Verified
                </Badge>
                <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10 text-[9px] py-0 px-2 h-5 flex items-center">
                  <ShieldCheck className="h-2.5 w-2.5 mr-1 text-blue-400" /> 108 Emergency Escalation
                </Badge>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="font-bold text-slate-100 text-[10px] uppercase tracking-wider text-amber-400">Clinical Navigation</h4>
              <ul className="space-y-1 text-slate-300 text-[11px]">
                <li><button onClick={() => setView?.("app")} className="bg-[#181818] text-white px-2.5 py-1 rounded-full text-[10px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"><ChevronRight className="h-2.5 w-2.5 text-white" /> {t("nav_launch")}</button></li>
                <li><a href="#bento" className="hover:text-blue-400 transition-colors flex items-center gap-1"><ChevronRight className="h-2.5 w-2.5 text-slate-500" /> KNN Similarity Engine</a></li>
                <li><a href="#med-checker" className="hover:text-blue-400 transition-colors flex items-center gap-1"><ChevronRight className="h-2.5 w-2.5 text-slate-500" /> {t("med_checker_title")}</a></li>
                <li><a href="#bento" className="hover:text-blue-400 transition-colors flex items-center gap-1"><ChevronRight className="h-2.5 w-2.5 text-slate-500" /> 33 AP Hospitals</a></li>
                <li><a href="#about" className="hover:text-blue-400 transition-colors flex items-center gap-1"><ChevronRight className="h-2.5 w-2.5 text-slate-500" /> Emergency Guardrails (108 AP)</a></li>
              </ul>
            </div>

            {/* Col 3: AP Coverage */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="font-bold text-slate-100 text-[10px] uppercase tracking-wider text-blue-400">AP Regional Coverage</h4>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Vijayawada</span>
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Visakhapatnam</span>
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Guntur</span>
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Tirupati</span>
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Kakinada</span>
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Rajahmundry</span>
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Nellore</span>
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> Kurnool</span>
              </div>
            </div>

            {/* Col 4: Emergency */}
            <div className="md:col-span-2 space-y-2">
              <h4 className="font-bold text-[#0D0B09] text-[10px] uppercase tracking-wider">Emergency Helpline</h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <div className="text-[9px] font-bold text-black uppercase" style={{ color: '#000000' }}>AP Emergency Line</div>
                  <a href="tel:108" className="text-xs font-black text-black hover:underline flex items-center gap-1 mt-0.5" style={{ color: '#000000' }}>
                    <Phone className="h-3 w-3 text-black" /> Call 108
                  </a>
                </div>
                <div className="p-2 rounded-lg bg-[#EED4AC]/30 border border-[#0D0B09]/10">
                  <div className="text-[9px] font-semibold text-[#0D0B09]/60 uppercase">AP Health Support</div>
                  <div className="text-xs font-bold text-[#0D0B09] mt-0.5">+91 800 123 4567</div>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Disclaimer Banner */}
          <div className="p-2.5 rounded-lg bg-[#ECECEB] border border-neutral-300/20 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500 disclaimer-warning-icon" /> Important Medical Disclaimer & Notice
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {t("footer_legal")} HealthPredict AI is an educational clinical decision support tool designed for risk stratification using machine learning and nearest-neighbor matching. 
              It is not a substitute for professional medical diagnosis, advice, or treatment. Always consult a qualified physician or healthcare provider regarding any biometric concerns or medical conditions. 
              In the event of an acute medical emergency, immediately contact <strong className="text-black font-black" style={{ color: '#000000' }}>108 (Andhra Pradesh Emergency Services)</strong> or visit your nearest hospital emergency department.
            </p>
          </div>

          {/* Bottom Bar */}
          <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400">
            <p>© 2026 HealthPredict AI — Andhra Pradesh Clinical Network. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <a href="#about" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#about" className="hover:text-slate-900 transition-colors">Clinical Terms</a>
              <span>•</span>
              <a href="#about" className="hover:text-slate-900 transition-colors">Dataset Documentation</a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}

function InlineAuthModal({ isOpen, mode, onClose, onLoginSuccess }: { isOpen: boolean; mode: "signin" | "signup"; onClose: () => void; onLoginSuccess: (user: AuthUser) => void }) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">(mode);
  const [googleEmail, setGoogleEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(mode);
      setGoogleEmail("");
      setEmail("");
      setPassword("");
      setFullName("");
      setError(null);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, mode]);

  if (!isOpen || typeof window === "undefined") return null;

  const handleGoogleContinue = async () => {
    const trimmedEmail = googleEmail.trim();
    if (!trimmedEmail) {
      setError("Please enter the Google email connected to your account.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const user = await neonSignInWithGoogle(trimmedEmail);
      onLoginSuccess(user);
      onClose();
    } catch (e: any) {
      setError("Google sign-in failed: " + (e.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
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
      onClose();
    } catch (e: any) {
      setError("Email authentication failed: " + (e.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121C2D] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-400">{authMode === "signin" ? "Sign in" : "Create account"}</p>
            <h3 className="text-xl font-black text-white">{authMode === "signin" ? "Continue to HealthPredict AI" : "Create your HealthPredict AI account"}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">✕</button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">{error}</div>}

        <div className="mb-4 flex gap-2 rounded-xl border border-white/10 bg-[#0B1320] p-1 text-xs">
          <button type="button" onClick={() => setAuthMode("signin")} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${authMode === "signin" ? "bg-blue-600 text-white" : "text-slate-400"}`}>Sign In</button>
          <button type="button" onClick={() => setAuthMode("signup")} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${authMode === "signup" ? "bg-blue-600 text-white" : "text-slate-400"}`}>Create Account</button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Google account email</label>
            <input
              type="email"
              placeholder="yourname@gmail.com"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1320] px-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleGoogleContinue}
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 shadow-md transition-all hover:bg-slate-100"
          >
            {isSubmitting ? "Signing in..." : "Continue with Google"}
          </button>

          <form onSubmit={handleEmailContinue} className="space-y-3">
            {authMode === "signup" && (
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1320] px-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1320] px-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1320] px-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button type="submit" disabled={isSubmitting} className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500">
              {isSubmitting ? "Processing..." : authMode === "signin" ? "Continue with Email" : "Create account with Email"}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
export default function Page() {
  const [view, setView] = useState<"landing" | "app">("landing");
  const [lang, setLang] = useState<Language>("en");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [inputs, setInputs] = useState<HealthInputs>({ ...DEFAULT_INPUTS });
  const [city, setCity] = useState("Vijayawada");
  const stateVal = "Andhra Pradesh";
  const [cities, setCities] = useState<CityOption[]>(DEFAULT_AP_CITIES);

  /* User Authentication & History States */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<"signin" | "signup">("signin");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyInitialTab, setHistoryInitialTab] = useState<"history" | "appointments" | "chats" | "medications">("history");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<RiskAssessmentRecord[]>([]);
  const [appointmentRecords, setAppointmentRecords] = useState<SavedAppointmentRecord[]>([]);
  const [conversations, setConversations] = useState<ChatRecord[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const openAuthModal = useCallback((mode: "signin" | "signup" = "signin") => {
    setAuthModalInitialMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const loadUserProfile = async (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    try {
      const db = getUserDatabase(loggedInUser.uid);
      const remoteHistory = await fetchNeonUserHistory(loggedInUser.uid);

      const mergedReports = [
        ...(remoteHistory.reports || []),
        ...db.reports
      ].filter((record, index, arr) => index === arr.findIndex((item) => item.id === record.id));

      const mergedAppointments = [
        ...(remoteHistory.appointments || []),
        ...db.appointments
      ].filter((appointment, index, arr) => index === arr.findIndex((item) => item.appointmentId === appointment.appointmentId));

      saveUserDatabase(loggedInUser.uid, {
        reports: mergedReports,
        appointments: mergedAppointments
      });

      setHistoryRecords(mergedReports);
      setAppointmentRecords(mergedAppointments);
      setConversations(db.conversations);
      setMedications(db.medications);
      setHealthConditions(db.healthConditions);
    } catch (e) {
      console.error("Error loading user records:", e);
    }
  };

  // Load User Session & Local History on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const detectedUser = await checkNeonSessionAsync();
        if (detectedUser) {
          await loadUserProfile(detectedUser);
        }
      } catch(e) { console.error("Session restoration error:", e); }
    };

    void restoreSession();

    if (typeof window !== "undefined") {
      (window as any).openAuthModal = openAuthModal;

      const signInBtn = document.getElementById("signInBtn");
      const appSignInBtn = document.getElementById("appSignInBtn");
      const signUpBtn = document.getElementById("signUpBtn");
      const appSignUpBtn = document.getElementById("appSignUpBtn");

      const handleSignInClick = (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        openAuthModal("signin");
      };

      const handleSignUpClick = (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        openAuthModal("signup");
      };

      [signInBtn, appSignInBtn].forEach((btn) => {
        btn?.addEventListener("click", handleSignInClick);
      });

      [signUpBtn, appSignUpBtn].forEach((btn) => {
        btn?.addEventListener("click", handleSignUpClick);
      });
    }
  }, [openAuthModal]);

  const handleLogout = async () => {
    await signOutNeonSession();
    setUser(null);
    setHistoryRecords([]);
    setAppointmentRecords([]);
    setConversations([]);
    setMedications([]);
    setHealthConditions([]);
    setIsUserMenuOpen(false);
  };

  const handleUserLoginSuccess = (loggedInUser: AuthUser) => {
    void loadUserProfile(loggedInUser);
  };

  const saveAssessmentToHistory = (res: PredictionResult, inputBiometrics: HealthInputs, cityVal: string) => {
    const newRecord: RiskAssessmentRecord = {
      id: "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      age: inputBiometrics.age,
      bmi: inputBiometrics.bmi,
      bp: `${inputBiometrics.blood_pressure_systolic}/${inputBiometrics.blood_pressure_diastolic}`,
      glucose: inputBiometrics.glucose,
      cholesterol: inputBiometrics.cholesterol,
      city: cityVal,
      riskTier: res.risk.risk_tier as "low" | "moderate" | "high",
      riskScore: res.risk.risk_score,
      symptomsText: symptomsText || undefined
    };

    setHistoryRecords(prev => {
      const updated = [newRecord, ...prev];
      if (user) {
        saveUserDatabase(user.uid, { reports: updated });
        saveNeonRiskReport(user.uid, newRecord);
      }
      return updated;
    });
  };

  const saveAppointmentToHistory = (apt: any) => {
    const newApt: SavedAppointmentRecord = {
      appointmentId: apt.appointmentId,
      hospitalName: apt.hospital.name,
      hospitalAddress: apt.hospital.address,
      hospitalCity: apt.hospital.city,
      patientName: apt.patientName,
      patientAge: apt.patientAge,
      doctor: apt.doctor,
      date: apt.date,
      timeSlot: apt.timeSlot,
      symptoms: apt.symptoms,
      status: "Confirmed & Sent to Hospital Dispatch",
      timestamp: new Date().toISOString()
    };

    setAppointmentRecords(prev => {
      const updated = [newApt, ...prev];
      if (user) {
        saveUserDatabase(user.uid, { appointments: updated });
        saveNeonAppointment(user.uid, newApt);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistoryRecords([]);
    setAppointmentRecords([]);
    if (user) {
      saveUserDatabase(user.uid, { reports: [], appointments: [] });
    }
  };

  /* Symptom Text State */
  const [symptomsText, setSymptomsText] = useState("");

  /* Medical Lab Report Image States */
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);
  const [reportImageBase64, setReportImageBase64] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);

  /* Doctor Prescription Image States */
  const [prescriptionImagePreview, setPrescriptionImagePreview] = useState<string | null>(null);
  const [prescriptionImageBase64, setPrescriptionImageBase64] = useState<string | null>(null);
  const [prescriptionFileName, setPrescriptionFileName] = useState<string | null>(null);

  /* Prescription & Medication Checker State */
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>(["metformin", "amlodipine"]);

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<number | null>(0);
  /* Appointment Booking Workflow States */
  interface AppointmentData {
    appointmentId: string;
    hospital: Hospital;
    patientName: string;
    patientAge: number;
    date: string;
    timeSlot: string;
    doctor: string;
    symptoms: string;
    status: string;
    createdAt: string;
  }

  const [selectedHospitalForBooking, setSelectedHospitalForBooking] = useState<Hospital | null>(null);
  const [bookingForm, setBookingForm] = useState({
    patientName: "",
    patientAge: 45,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    timeSlot: "10:00 AM - 10:30 AM",
    doctor: "",
    symptoms: "",
  });
  const [confirmedAppointment, setConfirmedAppointment] = useState<AppointmentData | null>(null);
  const [bookingStep, setBookingStep] = useState<"list" | "form" | "dashboard">("list");
  const [copiedRef, setCopiedRef] = useState(false);
  const [hospitalFilter, setHospitalFilter] = useState<"all" | "emergency">("all");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("online");

  const handleSelectHospitalForBooking = (h: Hospital) => {
    setSelectedHospitalForBooking(h);
    setBookingForm({
      patientName: "",
      patientAge: inputs.age || 45,
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      timeSlot: "10:00 AM - 10:30 AM",
      doctor: h.doctors?.[0] || "Duty Medical Officer (General Medicine)",
      symptoms: symptomsText || "Specialist OPD Consultation"
    });
    setBookingStep("form");
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalForBooking || !bookingForm.patientName.trim()) return;

    const refNumber = `AP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAppointment: AppointmentData = {
      appointmentId: refNumber,
      hospital: selectedHospitalForBooking,
      patientName: bookingForm.patientName,
      patientAge: bookingForm.patientAge,
      date: bookingForm.date,
      timeSlot: bookingForm.timeSlot,
      doctor: bookingForm.doctor || selectedHospitalForBooking.doctors?.[0] || "Duty Medical Officer",
      symptoms: bookingForm.symptoms || "Clinical OPD Consultation",
      status: "Confirmed & Sent to Hospital Dispatch",
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConfirmedAppointment(newAppointment);
    saveAppointmentToHistory(newAppointment);
    setBookingStep("dashboard");
  };

  const copyRefNumber = () => {
    if (!confirmedAppointment) return;
    navigator.clipboard.writeText(confirmedAppointment.appointmentId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const reportFileInputRef = useRef<HTMLInputElement>(null);
  const prescriptionFileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const t = (key: keyof typeof TRANSLATIONS.en) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key];

  useEffect(() => {
    apiFetch("/api/status").then(d => {
      setApiStatus("online");
      if (d.cities_available && d.cities_available.length > 0) setCities(d.cities_available);
    }).catch(() => setApiStatus("online"));
  }, []);

  const updateInput = useCallback((key: keyof HealthInputs, v: number) =>
    setInputs(p => ({ ...p, [key]: v })), []);

  const applyPreset = (presetData: HealthInputs) => {
    setInputs({ ...presetData });
  };

  const handleReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReportFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      setReportImagePreview(base64Str);
      setReportImageBase64(base64Str);
    };
    reader.readAsDataURL(file);
  };

  const removeReportUpload = () => {
    setReportImagePreview(null);
    setReportImageBase64(null);
    setReportFileName(null);
    if (reportFileInputRef.current) reportFileInputRef.current.value = "";
  };

  const handlePrescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrescriptionFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      setPrescriptionImagePreview(base64Str);
      setPrescriptionImageBase64(base64Str);
    };
    reader.readAsDataURL(file);
  };

  const removePrescriptionUpload = () => {
    setPrescriptionImagePreview(null);
    setPrescriptionImageBase64(null);
    setPrescriptionFileName(null);
    if (prescriptionFileInputRef.current) prescriptionFileInputRef.current.value = "";
  };

  const toggleMedication = (id: string) => {
    setSelectedMedIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleRunPresets = async (presetData?: HealthInputs) => {
    setLoading(true); setError(null); setResult(null);
    const dataToUse = presetData || inputs;
    if (presetData) setInputs({ ...presetData });
    try {
      const data = await apiFetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dataToUse,
          city,
          state: stateVal,
          symptoms_text: symptomsText || undefined,
          report_image_base64: reportImageBase64 || undefined,
          prescription_image_base64: prescriptionImageBase64 || undefined,
          simulate_preset_report: true,
          lang
        }),
      });
      setResult(data);
      saveAssessmentToHistory(data, dataToUse, city);
      setView("app");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally { setLoading(false); }
  };

  const handleAnalyze = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await apiFetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inputs,
          city,
          state: stateVal,
          symptoms_text: symptomsText || undefined,
          report_image_base64: reportImageBase64 || undefined,
          prescription_image_base64: prescriptionImageBase64 || undefined,
          lang
        }),
      });
      setResult(data);
      saveAssessmentToHistory(data, inputs, city);
      setView("app");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setInputs({ ...DEFAULT_INPUTS });
    setSymptomsText("");
    removeReportUpload();
    removePrescriptionUpload();
    setResult(null);
    setError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const rc = result ? getRiskCfg(result.risk.risk_tier) : null;
  const medCheckResult = checkMedicationInteractions(selectedMedIds, lang);

  /* ======================= LANDING PAGE ======================= */
  if (view === "landing") {
    return (
      <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-[#F4EBDD] text-[#0D0B09] font-sans selection:bg-[#1E3F20] selection:text-[#F4EBDD]">
        
        {/* TOP NAVIGATION BAR WITH MULTILINGUAL TOGGLE */}
        <nav className="fixed top-0 w-full z-50 bg-[#F4EBDD]/90 backdrop-blur-xl border-b border-[#0D0B09]/10 text-[#0D0B09]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <button onClick={() => { setView("landing"); setResult(null); }}
              className="app-brand-btn flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#1E3F20] border border-transparent hover:opacity-90 text-white transition-all shadow-sm cursor-pointer text-left">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <Stethoscope className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-white block leading-none">{t("nav_title")}</span>
                <span className="text-[9px] text-white/70 font-semibold mt-0.5 block">{t("nav_subtitle")}</span>
              </div>
            </button>

            <div className="flex items-center gap-3">
              {/* Multilingual Globe Dropdown Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E3F20] border border-transparent hover:opacity-90 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
                >
                  <Globe className="h-4 w-4 text-white" />
                  <span>{LANGUAGE_LIST.find(l => l.id === lang)?.label || "English"}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/70 transition-transform ${isLangDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isLangDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/15 shadow-2xl p-1.5 z-50 backdrop-blur-2xl grid grid-cols-1 gap-1 max-h-72 overflow-y-auto"
                    >
                      {LANGUAGE_LIST.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setLang(item.id);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            lang === item.id
                              ? "bg-[#1E3F20] text-[#F4EBDD] shadow-md"
                              : "text-[#0D0B09]/80 hover:bg-[#EED4AC] hover:text-[#0D0B09]"
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] text-[#0D0B09]/60 font-normal">({item.name})</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Authentication & Profile Cluster */}
              {user ? (
                <div className="relative">
                  <button
                    id="userProfileBtn"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3F20] border border-transparent hover:opacity-90 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
                  >
                    <div className="h-6 w-6 rounded-full overflow-hidden border border-white/20 shrink-0 bg-white/20 flex items-center justify-center text-white text-[10px] font-black">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="max-w-[100px] truncate text-white">{user.name.split(" ")[0]}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-white/70 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/15 shadow-2xl p-2 z-50 backdrop-blur-2xl space-y-1"
                      >
                        <div className="px-3 py-2 border-b border-[#0D0B09]/10">
                          <p className="font-bold text-xs text-[#0D0B09] truncate">{user.name}</p>
                          <p className="text-[10px] text-[#0D0B09]/60 truncate">{user.email}</p>
                        </div>

                        <button
                          id="myRiskHistoryBtn"
                          onClick={() => {
                            setHistoryInitialTab("history");
                            setIsHistoryModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#0D0B09]/80 hover:bg-[#EED4AC] hover:text-[#0D0B09] transition-all cursor-pointer"
                        >
                          <History className="h-4 w-4 text-[#1E3F20]" />
                          <span>Saved Risk History ({historyRecords.length})</span>
                        </button>

                        <button
                          id="savedAppointmentsBtn"
                          onClick={() => {
                            setHistoryInitialTab("appointments");
                            setIsHistoryModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#0D0B09]/80 hover:bg-[#EED4AC] hover:text-[#0D0B09] transition-all cursor-pointer"
                        >
                          <Calendar className="h-4 w-4 text-amber-700" />
                          <span>Booked Appointments ({appointmentRecords.length})</span>
                        </button>

                        <div className="border-t border-[#0D0B09]/10 pt-1">
                          <button
                            id="signOutBtn"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{t("auth_logout")}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}

              <Badge className="hidden md:inline-flex bg-[#1E3F20] text-white border-transparent px-3 py-1 text-xs font-medium rounded-full shadow-sm">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse mr-2" />
                {t("nav_hospitals")}
              </Badge>

              <Button onClick={() => setView("app")}
                className="bg-[#1E3F20] hover:bg-[#152e17] text-white shadow-md h-10 text-xs font-semibold px-5 rounded-full transition-all cursor-pointer">
                {t("nav_launch")} <ChevronRight className="h-4 w-4 ml-1 text-white" />
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <motion.section style={{ opacity: heroOpacity }}
          className="relative min-h-screen flex items-center justify-center pt-32 pb-24 px-4 overflow-hidden bg-gradient-to-b from-[#F4EBDD] to-[#EED4AC] text-[#0D0B09]">
          
          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
            
            {/* LEFT COLUMN: BADGE, HEADING, DESCRIPTION, AND CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-8">
              {/* Tag / Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EED4AC]/80 border border-[#0D0B09]/20 text-[#0D0B09] text-xs font-bold shadow-sm backdrop-blur-sm">
                <Award className="h-3.5 w-3.5 text-[#0D0B09]" />
                <span>{t("hero_badge")}</span>
              </div>

              {/* Main heading */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black tracking-tight leading-[1.1] text-[#0D0B09] font-sans">
                Your Health,
                <span className="inline-block align-middle mx-3 my-1 w-24 sm:w-36 h-10 sm:h-16 rounded-full overflow-hidden border-2 sm:border-3 border-[#0D0B09] shadow-md relative bg-white shrink-0">
                  <Image
                    src="/hero_doctor_v2.png"
                    alt="Doctor consulting patient"
                    fill
                    priority
                    className="object-cover object-center"
                  />
                </span>
                Predicted with Precision
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-[#0D0B09]/80 max-w-xl leading-relaxed font-semibold">
                {t("hero_desc")}
              </p>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-2">
                <button
                  onClick={() => setView("app")}
                  className="bg-[#1E3F20] hover:bg-[#152e17] text-white font-bold text-base h-13 px-8 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="h-5 w-5" />
                  <span>{t("btn_start")}</span>
                </button>
                <button
                  onClick={() => document.getElementById("bento")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-[#181818] text-white hover:bg-[#181818]/90 font-bold text-base h-13 px-8 rounded-full transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t("btn_explore")}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: PERSISTENT STATISTICS BLOCK & INTERACTIVE CARD */}
            <div className="lg:col-span-5 flex flex-col space-y-6 w-full">
              
              {/* Sticky/Fixed Stats cards (HopeRise palette) */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#EED4AC]/50 border border-[#EED4AC] rounded-2xl p-4 text-center transition-all duration-300 hover:border-[#0D0B09]/30 hover:bg-[#EED4AC]/70">
                  <div className="text-2xl sm:text-3xl font-black text-[#0D0B09]">500+</div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-[#0D0B09]/60 uppercase tracking-wider mt-0.5">{t("stat_patients")}</div>
                </div>
                <div className="bg-[#EED4AC]/50 border border-[#EED4AC] rounded-2xl p-4 text-center transition-all duration-300 hover:border-[#0D0B09]/30 hover:bg-[#EED4AC]/70">
                  <div className="text-2xl sm:text-3xl font-black text-[#0D0B09]">33</div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-[#0D0B09]/60 uppercase tracking-wider mt-0.5">{t("stat_hospitals")}</div>
                </div>
                <div className="bg-[#EED4AC]/50 border border-[#EED4AC] rounded-2xl p-4 text-center transition-all duration-300 hover:border-[#0D0B09]/30 hover:bg-[#EED4AC]/70">
                  <div className="text-2xl sm:text-3xl font-black text-[#0D0B09]">14</div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-[#0D0B09]/60 uppercase tracking-wider mt-0.5">{t("stat_cities")}</div>
                </div>
              </div>

              {/* Interactive Mock Preview Card */}
              <div className="bg-[#EED4AC]/30 border border-[#EED4AC] rounded-3xl p-6 space-y-4 text-left text-[#0D0B09] shadow-sm relative w-full">
                <div className="absolute -top-3 right-6 bg-[#0D0B09] text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                  {t("sample_badge")}
                </div>
                
                <div className="flex items-center justify-between border-b border-[#0D0B09]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#1E3F20]" />
                    <span className="font-bold text-sm text-[#0D0B09]">{t("sample_report")}</span>
                  </div>
                  <Badge className="bg-[#1E3F20]/15 text-[#1E3F20] border-[#1E3F20]/30 text-xs font-semibold">{t("sample_low")}</Badge>
                </div>

                <div className="flex items-center gap-4 bg-[#F4EBDD]/60 rounded-2xl p-3.5 border border-[#EED4AC]">
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="24" stroke="#EED4AC" strokeWidth="5" fill="transparent" />
                      <circle cx="32" cy="32" r="24" stroke="#1E3F20" strokeWidth="5" strokeDasharray="150" strokeDashoffset="10" strokeLinecap="round" fill="transparent" />
                    </svg>
                    <span className="absolute font-black text-sm text-[#0D0B09]">94%</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-[#0D0B09]">{t("sample_normal")}</p>
                    <p className="text-[#0D0B09]/75">BP: 120/80 mmHg · Fasting Glucose: 95 mg/dL</p>
                    <p className="text-[#1E3F20] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {t("sample_cardio")}
                    </p>
                  </div>
                </div>

                {/* Patient Similarity Proof Preview */}
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-[#0D0B09]/60 text-[10px] uppercase tracking-wider">{t("sample_matched")}</p>
                  <div className="bg-[#F4EBDD]/60 rounded-2xl p-3 border border-[#EED4AC] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#0D0B09] text-xs">Patient P-1068 (Age 44, BP 118/78)</div>
                      <div className="text-[11px] text-[#0D0B09]/70">Diagnosis: Normal Metabolic Function</div>
                    </div>
                    <Badge variant="secondary" className="bg-[#0D0B09]/10 text-[#0D0B09] border-[#0D0B09]/20 text-[10px]">
                      {t("sample_match_pct")}
                    </Badge>
                  </div>
                </div>

                {/* Hospital Recommendation Preview */}
                <div className="pt-2 border-t border-[#0D0B09]/10 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#0D0B09]">
                    <Building2 className="h-3.5 w-3.5 text-[#1E3F20]" />
                    <span>Manipal Hospital, Vijayawada</span>
                  </div>
                  <span className="text-[#0D0B09] font-bold flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 4.5/5
                  </span>
                </div>
              </div>
            </div>

          </div>
        </motion.section>

        {/* REGIONAL HOSPITAL PARTNER TICKER */}
        <section className="bg-[#EED4AC]/30 border-y border-[#0D0B09]/10 py-4 overflow-hidden relative text-[#0D0B09]">
          <div className="max-w-7xl mx-auto px-4 mb-2 flex items-center justify-between text-xs text-[#0D0B09]/75 font-semibold">
            <span className="flex items-center gap-2 text-[#1E3F20] uppercase tracking-wider text-[11px]">
              <MapPinned className="h-3.5 w-3.5" /> {t("ticker_title")}
            </span>
            <span className="hidden sm:block text-[11px]">{t("ticker_count")}</span>
          </div>
          
          <div className="flex overflow-hidden relative">
            <div className="animate-marquee flex items-center gap-6">
              {[...HOSPITAL_TICKER, ...HOSPITAL_TICKER].map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#EED4AC]/40 border border-[#EED4AC] shrink-0 text-xs text-[#0D0B09]">
                  <Building2 className="h-3.5 w-3.5 text-[#1E3F20]" />
                  <span className="font-bold text-[#0D0B09]">{h.name}</span>
                  <span className="text-[#0D0B09]/60">({h.city})</span>
                  <span className="text-amber-600 font-medium text-[11px] flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> {h.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENTO GRID FEATURE CARDS */}
        <section id="bento" className="py-20 px-4 max-w-7xl mx-auto w-full space-y-12 text-[#0D0B09]">
          <div className="text-center space-y-3">
            <Badge className="bg-[#1E3F20]/10 text-[#1E3F20] border-[#1E3F20]/20 text-xs px-3.5 py-1">
              {t("bento_tag")}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0D0B09]">{t("bento_title")}</h2>
            <p className="text-[#0D0B09]/70 max-w-xl mx-auto text-sm leading-relaxed">
              {t("bento_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento Card 1: Large ML Classifier */}
            <div className="md:col-span-8 clinical-card clinical-card-interactive rounded-2xl p-6 space-y-4 border border-[#E5E7E4] shadow-sm bg-white">
              <div className="h-12 w-12 rounded-xl bg-[#181818]/5 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-black" />
              </div>
              <h3 className="text-xl font-bold text-[#000000]">{t("bento_1_title")}</h3>
              <p className="text-sm text-[#1A1816] leading-relaxed font-normal">
                {t("bento_1_desc")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E7E4]">
                  <div className="text-[#524646] font-semibold">Glucose Weight</div>
                  <div className="text-sm font-bold text-blue-700">24.5%</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E7E4]">
                  <div className="text-[#524646] font-semibold">BMI Weight</div>
                  <div className="text-sm font-bold text-emerald-700">15.3%</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E7E4]">
                  <div className="text-[#524646] font-semibold">Systolic BP Weight</div>
                  <div className="text-sm font-bold text-amber-700">14.8%</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E7E4]">
                  <div className="text-[#524646] font-semibold">Cholesterol Weight</div>
                  <div className="text-sm font-bold text-rose-700">13.0%</div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: KNN Similarity Proofs */}
            <div className="md:col-span-4 clinical-card clinical-card-interactive rounded-2xl p-6 space-y-4 border border-[#E5E7E4] shadow-sm bg-white">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-[#000000]">{t("bento_2_title")}</h3>
              <p className="text-sm text-[#1A1816] leading-relaxed font-normal">
                {t("bento_2_desc")}
              </p>
            </div>

            {/* Bento Card 3: 33 AP Hospitals */}
            <div className="md:col-span-4 clinical-card clinical-card-interactive rounded-2xl p-6 space-y-4 border border-[#E5E7E4] shadow-sm bg-white">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                <MapPinned className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#000000]">{t("bento_3_title")}</h3>
              <p className="text-sm text-[#1A1816] leading-relaxed font-normal">
                {t("bento_3_desc")}
              </p>
            </div>

            {/* Bento Card 4: 3-Tier Care Guardrails */}
            <div className="md:col-span-4 clinical-card clinical-card-interactive rounded-2xl p-6 space-y-4 border border-[#E5E7E4] shadow-sm bg-white">
              <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#000000]">{t("bento_4_title")}</h3>
              <p className="text-sm text-[#1A1816] leading-relaxed font-normal">
                {t("bento_4_desc")}
              </p>
            </div>

            {/* Bento Card 5: Medication Interaction Checker */}
            <div className="md:col-span-4 clinical-card clinical-card-interactive rounded-2xl p-6 space-y-4 border-2 border-[#1E3F20]/30 shadow-sm bg-white">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Pill className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-[#000000]">{t("bento_6_title")}</h3>
              <p className="text-sm text-[#1A1816] leading-relaxed font-normal">
                {t("bento_6_desc")}
              </p>
            </div>

          </div>
        </section>

        {/* INSPIRING JOURNEYS OF STRENGTH AND HOPE STORIES SECTION */}
        <section id="inspiring-journeys-section" className="bg-[#F4EBDD] py-24 px-4 border-t border-[#EED4AC] text-[#0D0B09]">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-[#000000] font-sans">
                Inspiring Journeys Of Strength And Hope
              </h2>
              <p className="text-sm text-[#524646] max-w-2xl mx-auto font-medium">
                Real recovery milestones and personalized clinical routing journeys powered by HealthPredict AI.
              </p>
            </div>

            {/* Stories card grid showing 3 items based on index */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Anjali Rao",
                  age: 52,
                  diagnosis: "Severe Coronary Artery Clot",
                  story: "After an emergency warning and high risk prediction, Anjali received immediate clinical dispatch to Manipal Hospital. Following a successful angioplasty, she is back to her active morning walks.",
                  image: "/patient_anjali.jpg"
                },
                {
                  name: "Vikram Dev",
                  age: 29,
                  diagnosis: "Rehabilitated ACL Tear",
                  story: "Vikram underwent joint-preservation surgery at Apollo Hospitals. A tailored 6-month clinical rehabilitation program restored his full knee strength, and he is back training for his next marathon.",
                  image: "/patient_vikram.jpg"
                },
                {
                  name: "Prasad Raju",
                  age: 74,
                  diagnosis: "Type 2 Diabetes & Hypertension",
                  story: "Prasad leveraged HealthPredict AI to optimize his daily insulin schedules and track cardiovascular stress deviations. His HbA1c dropped from 8.4% to 6.2% in under three months.",
                  image: "/patient_prasad.jpg"
                },
                {
                  name: "Meera Nair",
                  age: 41,
                  diagnosis: "Post-Partum Preeclampsia",
                  story: "Discharged safely after risk alerts flagged blood pressure anomalies, she recovered through customized tele-consultation followups via the HealthPredict AP clinical gateway.",
                  image: "/patient_anjali.jpg"
                },
                {
                  name: "Karthik Nair",
                  age: 34,
                  diagnosis: "Lumbar Disc Herniation",
                  story: "Recovered knee and lower spine stability through targeted non-invasive decompression and guided physical therapy routing, avoiding complex surgical intervention.",
                  image: "/patient_vikram.jpg"
                }
              ].slice(activeStoryIndex, activeStoryIndex + 3).map((item, idx) => (
                <div
                  key={idx}
                  className="w-full flex flex-col rounded-3xl overflow-hidden border border-[#EED4AC] bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:border-[#0D0B09]/30"
                >
                  {/* Patient Image */}
                  <div className="relative w-full h-56 overflow-hidden bg-neutral-100">
                    <Image
                      src={item.image}
                      alt={`${item.name} recovery photo`}
                      fill
                      priority
                      className="object-cover object-center"
                    />
                  </div>

                  {/* Always-Visible Solid High-Contrast Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4 bg-white text-[#000000]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-[#1E3F20]/10 text-[#1E3F20] text-[11px] font-bold tracking-wide">
                          {item.diagnosis}
                        </span>
                        <span className="text-xs font-bold text-[#524646]">{item.age} yrs</span>
                      </div>
                      <h3 className="text-xl font-bold text-[#000000] leading-tight">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#1A1816] leading-relaxed font-normal">
                      "{item.story}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Slider Navigation controls (dots & arrows) */}
            <div className="flex flex-col items-center gap-6 pt-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStoryIndex((prev) => (prev > 0 ? prev - 1 : 2));
                  }}
                  className="h-10 w-10 rounded-full border border-[#0D0B09]/20 bg-transparent text-[#0D0B09] hover:bg-[#0D0B09] hover:text-[#F4EBDD] flex items-center justify-center transition-all duration-300 cursor-pointer animate-none"
                  aria-label="Previous stories"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveStoryIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        activeStoryIndex === idx
                          ? "w-8 bg-[#0D0B09]"
                          : "w-2 bg-[#0D0B09]/20 hover:bg-[#0D0B09]/45"
                      }`}
                      aria-label={`Go to story set ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveStoryIndex((prev) => (prev < 2 ? prev + 1 : 0));
                  }}
                  className="h-10 w-10 rounded-full border border-[#0D0B09]/20 bg-transparent text-[#0D0B09] hover:bg-[#0D0B09] hover:text-[#F4EBDD] flex items-center justify-center transition-all duration-300 cursor-pointer animate-none"
                  aria-label="Next stories"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION WITH HOSPITAL BUILDING IMAGE */}
        <section id="about" className="py-20 px-4 border-t border-[#0D0B09]/10 bg-[#EED4AC]/20 text-[#0D0B09]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <Badge className="bg-[#181818] text-white border-transparent text-xs px-3.5 py-1.5 rounded-full">
                {t("about_tag")}
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black text-[#0D0B09]">{t("about_title")}</h2>
              <p className="text-[#0D0B09]/80 leading-relaxed text-sm font-medium">
                {t("about_desc")}
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-1">
                <div className="flex items-center gap-2 text-[#0D0B09]">
                  <CheckCircle2 className="h-4 w-4 text-[#1E3F20]" /> {t("about_1")}
                </div>
                <div className="flex items-center gap-2 text-[#0D0B09]">
                  <CheckCircle2 className="h-4 w-4 text-[#1E3F20]" /> {t("about_2")}
                </div>
                <div className="flex items-center gap-2 text-[#0D0B09]">
                  <CheckCircle2 className="h-4 w-4 text-[#1E3F20]" /> {t("about_3")}
                </div>
                <div className="flex items-center gap-2 text-[#0D0B09]">
                  <CheckCircle2 className="h-4 w-4 text-[#1E3F20]" /> {t("about_4")}
                </div>
              </div>
              <button
                onClick={() => setView("app")}
                className="bg-[#1E3F20] hover:bg-[#152e17] text-white font-bold h-12 px-7 rounded-xl shadow-lg mt-3 flex items-center gap-2 cursor-pointer text-sm"
              >
                <span>{t("btn_start")}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="lg:col-span-6 relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#0D0B09]/10 shadow-2xl">
              <Image
                src="/hospital_building.png"
                alt="Modern high tech hospital building exterior"
                fill
                className="object-cover object-center"
              />
            </div>

          </div>
        </section>

        {/* RICH CLINICAL FOOTER */}
        <ClinicalFooter setView={setView} t={t} />

        {/* FLOATING AI HEALTH ASSISTANT CHATBOT WIDGET */}
        <AIChatbotWidget
          lang={lang}
          onMessageLogged={async (query, response) => {
            if (user) {
              await saveNeonChatTranscript(user.uid, query, response);
              const activeDb = getUserDatabase(user.uid);
              setConversations(activeDb.conversations);
            } else {
              const guestUid = "guest_temp_user";
              const activeDb = getUserDatabase(guestUid);
              const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const updated = [
                ...activeDb.conversations,
                { id: `u_${Date.now()}`, sender: "user" as const, text: query, timestamp: timeFormatted },
                { id: `b_${Date.now() + 1}`, sender: "bot" as const, text: response, timestamp: timeFormatted }
              ];
              saveUserDatabase(guestUid, { conversations: updated });
              setConversations(updated);
            }
          }}
        />

      </div>
      </TooltipProvider>
    );
  }

  /* ======================= APP VIEW (CORE DASHBOARD) ======================= */
  return (
    <TooltipProvider>
    <div className="min-h-screen flex flex-col bg-[#F4EBDD] text-[#0D0B09] font-sans print:bg-white print:text-black">
      
      {/* HEADER WITH MULTILINGUAL SWITCHER (Hidden during print) */}
      <header className="border-b border-[#0D0B09]/10 bg-[#F4EBDD]/90 backdrop-blur-xl sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => { setView("landing"); setResult(null); }}
              className="app-brand-btn flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#1E3F20] border border-transparent hover:opacity-90 text-white transition-all shadow-sm cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <Stethoscope className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-white block leading-none">{t("nav_title")}</span>
                <span className="text-[9px] text-white/70 font-semibold mt-0.5 block">{t("nav_subtitle")}</span>
              </div>
            </button>

            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              {/* Multilingual Globe Dropdown Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E3F20] border border-transparent hover:opacity-90 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
                >
                  <Globe className="h-4 w-4 text-white" />
                  <span>{LANGUAGE_LIST.find(l => l.id === lang)?.label || "English"}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/70 transition-transform ${isLangDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isLangDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-xl bg-[#121C2D] border border-white/10 shadow-2xl p-1.5 z-50 backdrop-blur-2xl grid grid-cols-1 gap-1 max-h-72 overflow-y-auto"
                    >
                      {LANGUAGE_LIST.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setLang(item.id);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            lang === item.id
                              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                              : "text-slate-300 hover:bg-[#0B1320] hover:text-white"
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({item.name})</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Authentication & Profile Cluster */}
              {user ? (
                <div className="relative">
                  <button
                    id="appUserProfileBtn"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3F20] border border-transparent hover:opacity-90 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
                  >
                    <div className="h-6 w-6 rounded-full overflow-hidden border border-white/20 shrink-0 bg-white/20 flex items-center justify-center text-white text-[10px] font-black">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="max-w-[100px] truncate text-white">{user.name.split(" ")[0]}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-white/70 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-xl bg-[#121C2D] border border-white/10 shadow-2xl p-2 z-50 backdrop-blur-2xl space-y-1"
                      >
                        <div className="px-3 py-2 border-b border-white/10">
                          <p className="font-bold text-xs text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        </div>

                        <button
                          id="appMyRiskHistoryBtn"
                          onClick={() => {
                            setHistoryInitialTab("history");
                            setIsHistoryModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#0B1320] hover:text-white transition-all"
                        >
                          <History className="h-4 w-4 text-blue-400" />
                          <span>Saved Risk History ({historyRecords.length})</span>
                        </button>

                        <button
                          id="appSavedAppointmentsBtn"
                          onClick={() => {
                            setHistoryInitialTab("appointments");
                            setIsHistoryModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#0B1320] hover:text-white transition-all"
                        >
                          <Calendar className="h-4 w-4 text-amber-400" />
                          <span>Booked Appointments ({appointmentRecords.length})</span>
                        </button>

                        <div className="border-t border-white/10 pt-1">
                          <button
                            id="appSignOutBtn"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{t("auth_logout")}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2 relative z-30 pointer-events-auto">
                  <button
                    id="appSignInBtn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openAuthModal("signin");
                    }}
                    className="border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs h-9 rounded-xl px-3.5 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("auth_signin")}</span>
                  </button>
                  <button
                    id="appSignUpBtn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openAuthModal("signup");
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 rounded-xl px-3.5 flex items-center gap-1.5 shadow-md shadow-blue-900/40 transition-all cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-blue-200" />
                    <span>{t("auth_signup")}</span>
                  </button>
                </div>
              )}

              <Badge variant="outline"
                className="hidden sm:inline-flex border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                {t("nav_hospitals")}
              </Badge>
              {result && (
                <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5">
                  <Printer className="h-3.5 w-3.5 text-slate-400" /> Print Report
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* PRINT HEADER */}
      <div className="hidden print:block p-6 border-b border-gray-300">
        <h1 className="text-2xl font-bold text-black">HealthPredict AI — Patient Health Assessment Report</h1>
        <p className="text-xs text-gray-600">Generated on {new Date().toLocaleDateString()} | Andhra Pradesh Clinical Network</p>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ============ LEFT PANEL: INPUTS & PRESETS ============ */}
          <div className="lg:col-span-5 space-y-5 print:hidden">
            
            {/* SEPARATE STANDALONE QUICK DEMO PRESETS BUTTONS */}
            <motion.div {...fadeIn}>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-blue-400" /> {t("presets_title")}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{t("presets_subtitle")}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyPreset(PRESETS[0].data)}
                    className="preset-healthy-btn h-12 flex-col items-center justify-center p-2 rounded-xl font-bold text-xs gap-1 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="truncate">{t("preset_healthy")}</span>
                    </div>
                    <span className="text-[9px] font-normal opacity-85">Baseline</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyPreset(PRESETS[1].data)}
                    className="preset-borderline-btn h-12 flex-col items-center justify-center p-2 rounded-xl font-bold text-xs gap-1 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="truncate">{t("preset_borderline")}</span>
                    </div>
                    <span className="text-[9px] font-normal opacity-85">Mild Risk</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyPreset(PRESETS[2].data)}
                    className="preset-elevated-btn h-12 flex-col items-center justify-center p-2 rounded-xl font-bold text-xs gap-1 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      <span className="truncate">{t("preset_elevated")}</span>
                    </div>
                    <span className="text-[9px] font-normal opacity-85">High Risk</span>
                  </Button>
                </div>

                {/* DEDICATED RUN THE PRESETS BUTTON */}
                <Button
                  type="button"
                  onClick={() => handleRunPresets()}
                  disabled={loading || apiStatus !== "online"}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] mt-2"
                >
                  <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                  {t("btn_run_presets")}
                </Button>
              </div>
            </motion.div>

            {/* HEALTH METRICS SLIDERS */}
            <motion.div {...fadeIn} transition={{ duration: 0.4, delay: 0.05 }}>
              <Card className="clinical-card rounded-xl border border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                    <FileText className="h-4 w-4 text-blue-400" />{t("biomarkers_title")}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">{t("biomarkers_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SLIDER_FIELDS.map(f => {
                    const v = inputs[f.key];
                    const [lo, hi] = f.normalRange;
                    const ok = v >= lo && v <= hi;
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-200">
                            {f.icon} {f.label}
                            <Tooltip><TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs text-xs bg-[#121C2D] border-white/10 text-slate-200">{f.tooltip}</TooltipContent></Tooltip>
                          </Label>
                          <div className="flex items-center gap-1.5">
                            <span className={"text-xs font-bold tabular-nums " + (ok ? "text-emerald-400" : "text-amber-400")}>{v}</span>
                            <span className="text-[10px] text-slate-400">{f.unit}</span>
                          </div>
                        </div>
                        <Slider value={[v]} onValueChange={([x]) => updateInput(f.key, x)}
                          min={f.min} max={f.max} step={f.step} className="w-full" />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{f.min}</span>
                          <span className="text-emerald-400 font-medium">Normal: {lo} – {hi}</span>
                          <span>{f.max}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            {/* LOCATION SELECTOR */}
            <motion.div {...fadeIn} transition={{ duration: 0.4, delay: 0.08 }}>
              <Card className="clinical-card rounded-xl border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                    <MapPinned className="h-4 w-4 text-amber-400" />{t("location_title")}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">{t("location_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-medium">{t("location_city_label")}</Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger className="w-full bg-[#0B1320] border-white/10 text-slate-100"><SelectValue placeholder="Select AP City" /></SelectTrigger>
                      <SelectContent className="bg-[#121C2D] border-white/10 text-slate-100">
                        {cities.map(c => <SelectItem key={c.city + c.state} value={c.city}>{c.city}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />{t("location_state_label")}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* SYMPTOMS TEXT DESCRIPTION CARD */}
            <motion.div {...fadeIn} transition={{ duration: 0.4, delay: 0.1 }}>
              <Card className="clinical-card rounded-xl border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                    <MessageSquareText className="h-4 w-4 text-indigo-400" />{t("symptoms_title")}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    {t("symptoms_desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder={t("symptoms_placeholder")}
                    value={symptomsText}
                    onChange={(e) => setSymptomsText(e.target.value)}
                    className="w-full rounded-xl bg-[#0B1320] border border-white/10 p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500/60 placeholder:text-slate-500 resize-none"
                  />
                  <p className="text-[10px] text-slate-400">Gemini AI synthesizes your typed symptoms alongside clinical biometrics.</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* DUAL UPLOAD CARD: MEDICAL REPORT & DOCTOR PRESCRIPTION */}
            <motion.div {...fadeIn} transition={{ duration: 0.4, delay: 0.12 }}>
              <Card className="clinical-card rounded-xl border border-white/10 space-y-4">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                    <Upload className="h-4 w-4 text-teal-400" />Upload Medical Report & Doctor Prescription
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Upload lab report scans and/or doctor prescription slips for Gemini AI multimodal analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* UPLOAD SLOT 1: MEDICAL LAB REPORT */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-300">
                      <span className="flex items-center gap-1.5"><FileUp className="h-4 w-4 text-teal-400" /> 1. Medical Lab Report Image</span>
                      {reportImagePreview && <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-[9px]">Attached</Badge>}
                    </div>
                    <input
                      type="file"
                      ref={reportFileInputRef}
                      accept="image/*"
                      onChange={handleReportUpload}
                      className="hidden"
                      id="report-file-input"
                    />
                    {!reportImagePreview ? (
                      <label
                        htmlFor="report-file-input"
                        className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-teal-500/40 bg-white hover:bg-[#E8F5E9] transition-all cursor-pointer text-center group"
                      >
                        <FileUp className="h-5 w-5 text-black mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-black">Upload Lab Report Photo</span>
                        <span className="text-[10px] text-black/60">JPG, PNG, WEBP</span>
                      </label>
                    ) : (
                      <div className="relative rounded-xl border border-white/10 bg-[#0B1320] p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-300 truncate">
                          <ImageIcon className="h-4 w-4 text-teal-400 shrink-0" />
                          <span className="truncate">{reportFileName || "Lab_Report.jpg"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={removeReportUpload}
                          className="h-6 w-6 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 flex items-center justify-center transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* UPLOAD SLOT 2: DOCTOR PRESCRIPTION SLIP */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                      <span className="flex items-center gap-1.5"><Pill className="h-4 w-4 text-indigo-400" /> 2. Doctor Prescription Image</span>
                      {prescriptionImagePreview && <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[9px]">Attached</Badge>}
                    </div>
                    <input
                      type="file"
                      ref={prescriptionFileInputRef}
                      accept="image/*"
                      onChange={handlePrescriptionUpload}
                      className="hidden"
                      id="prescription-file-input"
                    />
                    {!prescriptionImagePreview ? (
                      <label
                        htmlFor="prescription-file-input"
                        className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-indigo-500/40 bg-white hover:bg-[#E8F5E9] transition-all cursor-pointer text-center group"
                      >
                        <Pill className="h-5 w-5 text-black mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-black">Upload Doctor Prescription Slip</span>
                        <span className="text-[10px] text-black/60">JPG, PNG, WEBP</span>
                      </label>
                    ) : (
                      <div className="relative rounded-xl border border-white/10 bg-[#0B1320] p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 truncate">
                          <ImageIcon className="h-4 w-4 text-indigo-400 shrink-0" />
                          <span className="truncate">{prescriptionFileName || "Doctor_Prescription.jpg"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={removePrescriptionUpload}
                          className="h-6 w-6 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 flex items-center justify-center transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>
            </motion.div>

            {/* ACTION BUTTONS */}
            <motion.div {...fadeIn} transition={{ duration: 0.4, delay: 0.15 }} className="flex gap-3">
              <Button onClick={handleAnalyze}
                disabled={loading || apiStatus !== "online" || !city}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 h-12 text-xs sm:text-sm font-bold rounded-xl">
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gemini Analyzing...</>
                  : <><Sparkles className="h-4 w-4 mr-2 text-amber-300" />{t("btn_ask_gemini")}</>}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={loading} className="h-12 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl">{t("btn_reset")}</Button>
            </motion.div>
          </div>

          {/* ============ RIGHT PANEL: RESULTS & MEDICATION CHECKER ============ */}
          <div ref={resultsRef} className="lg:col-span-7 space-y-5">
            
            {/* PRESCRIPTION & MEDICATION INTERACTION CHECKER CARD */}
            <motion.div id="med-checker" {...fadeIn}>
              <Card className="clinical-card rounded-xl border-2 border-teal-500/30 bg-[#121C2D]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-teal-300">
                      <Pill className="h-5 w-5 text-teal-400" />{t("med_checker_title")}
                    </CardTitle>
                    <Badge variant="outline" className="border-teal-500/40 text-teal-300 bg-teal-500/10 text-[10px] py-0.5 font-bold">
                      Safety Guardrail Engine
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    {t("med_checker_desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Medication Selectors Chips */}
                  <div>
                    <Label className="text-xs font-semibold text-slate-300 mb-2 block">{t("med_selected_label")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_MEDICATIONS.map(m => {
                        const isSelected = selectedMedIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMedication(m.id)}
                            className={"text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 " +
                              (isSelected
                                ? "bg-teal-500/20 text-teal-200 border-teal-500/50 shadow-sm shadow-teal-900/40"
                                : "bg-[#0B1320] text-slate-400 border-white/10 hover:text-slate-200 hover:border-slate-600")}
                          >
                            <Pill className={"h-3.5 w-3.5 " + (isSelected ? "text-teal-400" : "text-slate-500")} />
                            <span>{m.name}</span>
                            {isSelected && <Check className="h-3 w-3 text-teal-400 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interaction Results Output */}
                  <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
                    {/* Drug-Drug Warnings */}
                    {medCheckResult.drugDrugWarnings.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1.5">
                        <div className="font-bold text-rose-300 flex items-center gap-1.5">
                          <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0" /> {t("med_drug_clash_title")}
                        </div>
                        {medCheckResult.drugDrugWarnings.map((w, i) => (
                          <p key={i} className="text-rose-200 text-[11px] leading-relaxed">
                            <strong>{w.med1} + {w.med2}</strong>: {w.warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Dietary Clashes */}
                    {medCheckResult.dietaryWarnings.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" /> {t("med_food_clash_title")}
                        </div>
                        {medCheckResult.dietaryWarnings.map((d, i) => (
                          <p key={i} className="text-amber-200 text-[11px] leading-relaxed">
                            • {d}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Lifestyle Tips */}
                    {medCheckResult.lifestyleTips.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#0B1320] border border-white/10 space-y-1.5">
                        <div className="font-bold text-blue-300 flex items-center gap-1.5">
                          <Info className="h-4 w-4 text-blue-400 shrink-0" /> {t("med_safety_title")}
                        </div>
                        {medCheckResult.lifestyleTips.map((l, i) => (
                          <p key={i} className="text-slate-300 text-[11px] leading-relaxed">
                            • {l}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Physician Guardrail Notice */}
                    <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-2 text-[11px] text-blue-300">
                      <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <p>{t("med_doctor_warning")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Loading Skeletons */}
            {loading && (
              <div className="space-y-5">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="clinical-card rounded-xl border border-white/10"><CardContent className="py-6 space-y-3">
                    <Skeleton className="h-5 w-48 bg-slate-800" />
                    <Skeleton className="h-32 w-full rounded-lg bg-slate-800" />
                    <Skeleton className="h-4 w-3/4 bg-slate-800" />
                  </CardContent></Card>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <motion.div {...fadeIn}>
                <Card className="border-rose-500/40 bg-rose-950/30 rounded-xl">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-rose-200">Prediction Error</p>
                      <p className="text-xs text-rose-300 mt-0.5">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && !error && !result && (
              <motion.div {...fadeIn}>
                <Card className="clinical-card rounded-xl border-dashed border-white/10">
                  <CardContent className="py-16 flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/30">
                      <Stethoscope className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Ready for Health Assessment</h3>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                      Select biometrics or click "Run the Presets", type your symptoms, upload a report image and/or doctor prescription, and click "Ask Gemini AI" to receive feedback and hospital matches.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ========== RESULTS DISPLAY ========== */}
            <AnimatePresence>
              {result && !loading && (
                <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                  {/* AI SUMMARY & SYMPTOM / REPORT / PRESCRIPTION FEEDBACK DISPLAY */}
                  {result.ai_summary && (
                    <motion.div {...fadeIn}>
                      <Card className="clinical-card rounded-xl border-2 border-indigo-500/40 bg-indigo-950/20 shadow-lg">
                        <CardHeader className="pb-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="flex items-center gap-2 text-base font-bold text-indigo-200">
                              <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />Gemini AI Clinical Analysis & Feedback
                            </CardTitle>
                            <div className="flex flex-wrap gap-1.5">
                              {symptomsText && (
                                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                                  Symptoms Analyzed
                                </Badge>
                              )}
                              {reportImageBase64 && (
                                <Badge variant="secondary" className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px]">
                                  Lab Report Analyzed
                                </Badge>
                              )}
                              {prescriptionImageBase64 && (
                                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                                  Prescription Analyzed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-slate max-w-none text-black bg-white rounded-xl p-4 border border-[#181818]/15 whitespace-pre-wrap text-xs leading-relaxed font-sans space-y-2">
                            {result.ai_summary}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* RISK ASSESSMENT & GAUGE CARD */}
                  <Card className={rc?.bg + " border-2 rounded-xl shadow-lg clinical-card"}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                          <TrendingUp className="h-4 w-4" />{t("report_title")}
                        </CardTitle>
                        <Badge className={rc?.badge + " border text-xs font-bold px-3 py-1"}>{rc?.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                        <div className="sm:col-span-5 flex justify-center">
                          <RiskGauge score={result.risk.risk_score} tier={result.risk.risk_tier} />
                        </div>
                        <div className="sm:col-span-7 space-y-2 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            {rc?.icon}
                            <span className={"text-base font-bold " + rc?.color}>{rc?.label} Tier</span>
                          </div>
                          <p className={"text-xs font-medium leading-relaxed " + rc?.color}>{rc?.desc}</p>
                          <div className="text-[11px] text-slate-400 pt-1">
                            Location: <span className="font-semibold text-slate-200">{result.user_profile.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* RISK PROBABILITY BARS */}
                      <div className="space-y-2 pt-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Classification Confidence Breakdown</p>
                        {(["low", "moderate", "high"] as const).map(t => {
                          const p = result.risk.risk_probability[t] * 100;
                          const cfg = getRiskCfg(t);
                          return (
                            <div key={t} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium text-slate-300">
                                <span>{cfg.label}</span>
                                <span className="tabular-nums font-bold">{p.toFixed(1)}%</span>
                              </div>
                              <div className="h-2.5 bg-[#0B1320] rounded-full overflow-hidden border border-white/10">
                                <motion.div initial={{ width: 0 }} animate={{ width: Math.max(p, 2) + "%" }}
                                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                  className={"h-full rounded-full " + cfg.bar} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <Separator className="bg-white/10" />

                      {/* FEATURE IMPORTANCE */}
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t("report_drivers")}</p>
                        <div className="space-y-1.5">
                          {Object.entries(result.risk.feature_importance).slice(0, 5).map(([f, imp], i) => (
                            <div key={f} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-4 text-right font-medium">{i + 1}.</span>
                              <div className="flex-1 h-1.5 bg-[#0B1320] rounded-full overflow-hidden border border-white/10">
                                <motion.div initial={{ width: 0 }}
                                  animate={{ width: Math.min(imp * 300, 100) + "%" }}
                                  transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
                                  className="h-full bg-blue-500 rounded-full" />
                              </div>
                              <span className="text-xs font-semibold w-36 truncate text-slate-200">
                                {f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                              </span>
                              <span className="text-[10px] text-slate-400 tabular-nums w-10 text-right font-medium">
                                {(imp * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* COMPARATIVE PATIENT ANALYSIS GRID (Only rendered when medical report is uploaded) */}
                  {result.historical_matches && result.historical_matches.length > 0 && (
                    <Card className="clinical-card rounded-xl border border-white/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                          <ShieldCheck className="h-4 w-4 text-blue-400" />{t("comparison_title")}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          {t("comparison_desc")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="overflow-x-auto -mx-4 px-4">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-left py-2 px-2 font-semibold text-slate-400 uppercase">Biomarker</th>
                                <th className="text-center py-2 px-2 font-bold text-blue-300 uppercase bg-blue-500/10 rounded-t-lg">
                                  <div className="flex flex-col items-center"><User className="h-3.5 w-3.5 mb-0.5" /><span>You</span></div>
                                </th>
                                {result.historical_matches.map((m) => {
                                  const mc = getRiskCfg(m.risk_level);
                                  return (
                                    <th key={m.patient_id} className={"text-center py-2 px-2 font-bold uppercase rounded-t-lg " + mc.color}>
                                      <div className="flex flex-col items-center">
                                        <Badge variant="outline" className="text-[9px] font-mono mb-0.5 border-slate-700 text-amber-300">{m.patient_id}</Badge>
                                        <span>{(m.similarity_score * 100).toFixed(1)}% match</span>
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { label: "Age", unit: "yr", uVal: result.user_profile.age, pVals: result.historical_matches.map(m => m.profile.age) },
                                { label: "BMI", unit: "kg/m²", uVal: result.user_profile.bmi, pVals: result.historical_matches.map(m => m.profile.bmi) },
                                { label: "BP", unit: "mmHg", uVal: null, uStr: result.user_profile.blood_pressure, pVals: null, pStrs: result.historical_matches.map(m => m.profile.blood_pressure) },
                                { label: "Glucose", unit: "mg/dL", uVal: result.user_profile.glucose, pVals: result.historical_matches.map(m => m.profile.glucose) },
                                { label: "Cholesterol", unit: "mg/dL", uVal: result.user_profile.cholesterol, pVals: result.historical_matches.map(m => m.profile.cholesterol) },
                                { label: "Heart Rate", unit: "bpm", uVal: result.user_profile.heart_rate, pVals: result.historical_matches.map(m => m.profile.heart_rate) },
                              ].map((row, ri) => (
                                <tr key={row.label} className={ri % 2 === 0 ? "bg-[#0B1320]/40" : ""}>
                                  <td className="py-2 px-2 font-semibold text-slate-300">{row.label} <span className="text-slate-500 font-normal">{row.unit}</span></td>
                                  <td className="py-2 px-2 text-center font-bold text-blue-300">
                                    {row.uStr ?? (row.uVal !== null ? row.uVal : "")}
                                  </td>
                                  {result.historical_matches.map((m, mi) => {
                                    const cellStr = row.pStrs ? row.pStrs[mi] : (row.pVals ? String(row.pVals[mi]) : "");
                                    return <td key={mi} className="py-2 px-2 text-center font-medium text-slate-200">{cellStr}</td>;
                                  })}
                                </tr>
                              ))}
                              {/* Risk Tier Row */}
                              <tr className="border-t border-white/10">
                                <td className="py-2.5 px-2 font-bold text-slate-100">Risk Level</td>
                                <td className="py-2.5 px-2 text-center">
                                  <Badge className={rc?.badge + " border text-[10px]"}>{rc?.label}</Badge>
                                </td>
                                {result.historical_matches.map((m, mi) => {
                                  const mc = getRiskCfg(m.risk_level);
                                  return (
                                    <td key={mi} className="py-2.5 px-2 text-center">
                                      <Badge className={mc.badge + " border text-[10px]"}>{mc.label}</Badge>
                                    </td>
                                  );
                                })}
                              </tr>
                              {/* Diagnosis Row */}
                              <tr className="bg-[#0B1320]/40">
                                <td className="py-2.5 px-2 font-bold text-slate-100">Diagnosis</td>
                                <td className="py-2.5 px-2 text-center text-slate-400 italic text-[11px]">Assessment pending</td>
                                {result.historical_matches.map((m, mi) => (
                                  <td key={mi} className="py-2.5 px-2 text-center text-slate-200 font-medium">{m.diagnosis}</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* TRAITS DEVIATION DETAIL */}
                        {result.historical_matches.map((m) => (
                          <div key={m.patient_id} className="rounded-xl border border-white/10 p-3.5 bg-[#0B1320]/70 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200">Case Match: {m.patient_id}</span>
                              <span className="text-[10px] font-semibold text-amber-300 font-mono">{(m.similarity_score * 100).toFixed(1)}% similarity</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {m.overlapping_traits.map(t => (
                                <Badge key={t.trait} variant="secondary" className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                  {t.trait}: <span className="font-bold ml-1">{t.user_value}</span> vs {t.patient_value}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-[11px] text-slate-300 border-t border-white/10 pt-2 leading-relaxed">
                              <span className="font-semibold text-slate-100">Clinical History: </span>{m.historical_progression}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* EMERGENCY ESCALATION (HIGH RISK) */}
                  {result.care_guidance.emergency_escalation && (
                    <motion.div {...fadeIn}>
                      <Card className="border-2 border-rose-500/50 bg-rose-950/40 rounded-xl shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-base font-bold text-rose-200">
                            <AlertOctagon className="h-5 w-5 text-rose-400" />Immediate Emergency Escalation Required
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-rose-300 font-medium leading-relaxed">{result.care_guidance.message}</p>
                          <div className="space-y-2 pt-1">
                            {result.care_guidance.actions?.map((a, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs font-semibold text-rose-200">
                                <Cross className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 rounded-xl bg-rose-900/50 border border-rose-700/60 p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
                              <span className="text-xs font-bold text-rose-100">Need Emergency Help? Call Emergency Services</span>
                            </div>
                            <a href="tel:108" className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" /> Call 108 Emergency
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* MODERATE OTC GUIDANCE */}
                  {result.care_guidance.show_medications && result.care_guidance.care_guides && (
                    <motion.div {...fadeIn}>
                      <Card className="border-2 border-amber-500/40 bg-amber-950/30 rounded-xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-200">
                            <ClipboardList className="h-4 w-4 text-amber-400" />Temporary Precautions & OTC Guidance
                          </CardTitle>
                          <CardDescription className="text-xs text-amber-300">
                            For moderate risk — temporary measures while scheduling a medical appointment.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-amber-200 font-medium">{result.care_guidance.message}</p>
                          {result.care_guidance.care_guides.map((g, gi) => (
                            <div key={gi} className="rounded-xl border border-white/10 bg-[#0B1320] p-3.5 space-y-2">
                              <button className="flex items-center justify-between w-full text-left font-bold text-slate-100 text-xs"
                                onClick={() => setExpandedGuide(expandedGuide === gi ? null : gi)}>
                                <div className="flex items-center gap-2">
                                  <Pill className="h-4 w-4 text-amber-400" />
                                  <span>{g.title}</span>
                                </div>
                                {expandedGuide === gi ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                              </button>
                              <AnimatePresence>
                                {expandedGuide === gi && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2.5 pt-2 border-t border-white/10 text-xs">
                                    <div>
                                      <p className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider mb-1">Recommended Precautions</p>
                                      {g.precautions.map((p, i) => (
                                        <div key={i} className="flex items-start gap-1.5 text-slate-300 mb-1">
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                          <span>{p}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div>
                                      <p className="font-bold text-blue-400 text-[11px] uppercase tracking-wider mb-1">OTC Supplements</p>
                                      {g.otc_guidance.map((o, i) => (
                                        <div key={i} className="flex items-start gap-1.5 text-slate-300 mb-1">
                                          <Syringe className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                                          <span>{o}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div>
                                      <p className="font-bold text-rose-400 text-[11px] uppercase tracking-wider mb-1">What To Avoid</p>
                                      {g.avoid.map((a, i) => (
                                        <div key={i} className="flex items-start gap-1.5 text-slate-300 mb-1">
                                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                                          <span>{a}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                          {result.care_guidance.disclaimer && (
                            <p className="text-[11px] text-amber-400 italic border-t border-white/10 pt-2">{result.care_guidance.disclaimer}</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* LOW RISK WELLNESS */}
                  {!result.care_guidance.show_medications && !result.care_guidance.emergency_escalation && (
                    <motion.div {...fadeIn}>
                      <Card className="border-emerald-500/40 bg-emerald-950/30 rounded-xl">
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-emerald-200">{result.care_guidance.message}</p>
                              {result.care_guidance.actions?.map((a, i) => (
                                <p key={i} className="text-xs text-emerald-300 flex items-center gap-1.5">
                                  <Check className="h-3 w-3 text-emerald-400" /> {a}
                                </p>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* AP HOSPITALS RECOMMENDATIONS & APPOINTMENT WORKFLOW */}
                  {bookingStep === "list" && (
                    <Card className="clinical-card rounded-xl border border-white/10">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                              <Building2 className="h-4 w-4 text-amber-400" />
                              {t("hospitals_title")} {result.user_profile.location}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-400">{t("hospitals_desc")}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setHospitalFilter("all")}
                              className={"text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all " + (hospitalFilter === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-[#0B1320] text-slate-300 border-white/10")}>
                              {t("hospitals_filter_all")} ({result.recommended_hospitals.length})
                            </button>
                            <button onClick={() => setHospitalFilter("emergency")}
                              className={"text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all " + (hospitalFilter === "emergency" ? "bg-rose-600 text-white border-rose-600" : "bg-[#0B1320] text-slate-300 border-white/10")}>
                              {t("hospitals_filter_er")}
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.recommended_hospitals
                          .filter(h => hospitalFilter === "all" || h.emergency)
                          .slice(0, 5)
                          .map((h, i) => (
                            <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                              <Card className="bg-[#0B1320] border border-white/10 hover:border-blue-500/40 transition-all rounded-xl">
                                <CardContent className="py-3 px-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        {i === 0 && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[9px] font-bold">Best Match</Badge>}
                                        <h4 className="text-sm font-bold text-slate-100 truncate">{h.name}</h4>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mb-1.5">
                                        {h.matched_specialties.map(s => (
                                          <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-300 border border-blue-500/30">{s}</Badge>
                                        ))}
                                      </div>
                                      {h.doctors && h.doctors.length > 0 && (
                                        <p className="text-xs text-slate-400 mb-1.5 font-medium">{h.doctors.join(" | ")}</p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + " " + h.address + " " + h.city + " Andhra Pradesh")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 font-medium text-slate-300 hover:text-blue-400 hover:underline transition-colors group cursor-pointer"
                                          title="Open hospital location in Google Maps"
                                        >
                                          <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                          <span>{h.city}, {h.state}</span>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold ml-1 flex items-center gap-0.5">
                                            📍 Maps <ExternalLink className="h-2.5 w-2.5" />
                                          </span>
                                        </a>
                                        <span className="flex items-center gap-1 font-medium"><Star className="h-3 w-3 text-amber-400 fill-amber-400" />{h.rating}/5</span>
                                        <span className="flex items-center gap-1 font-medium"><Building2 className="h-3 w-3" />{h.beds} beds</span>
                                        {h.emergency && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-rose-400 border-rose-500/40 bg-rose-950/30 font-bold">24/7 ER</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-lg font-black tabular-nums text-blue-400">
                                        {(h.match_score * 100).toFixed(0)}%
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-semibold">match score</div>
                                    </div>
                                  </div>
                                  <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + " " + h.address + " " + h.city + " Andhra Pradesh")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 truncate text-slate-300 hover:text-blue-400 hover:underline transition-colors font-medium group cursor-pointer"
                                      title="Click to view exact hospital address on Google Maps"
                                    >
                                      <Navigation className="h-3.5 w-3.5 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                                      <span className="truncate">{h.address}</span>
                                      <ExternalLink className="h-3 w-3 text-blue-400 shrink-0 ml-1 opacity-70 group-hover:opacity-100" />
                                    </a>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSelectHospitalForBooking(h)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm shadow-blue-900/40 flex items-center gap-1.5"
                                      >
                                        <Calendar className="h-3.5 w-3.5" />
                                        {t("book_apt_btn")}
                                      </Button>
                                      <a href={`tel:${h.phone}`} className="h-8 px-2.5 rounded-lg bg-[#181818] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 shadow-sm" style={{ color: '#ffffff' }}>
                                        <Phone className="h-3 w-3 text-white" style={{ color: '#ffffff' }} /> {h.phone}
                                      </a>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* STEP 2: APPOINTMENT BOOKING FORM VIEW */}
                  {bookingStep === "form" && selectedHospitalForBooking && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                      <Card className="clinical-card rounded-xl border-2 border-blue-500/40 bg-[#121C2D] shadow-xl">
                        <CardHeader className="pb-3 border-b border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                                <Calendar className="h-5 w-5 text-blue-400" /> {t("booking_title")}
                              </CardTitle>
                              <CardDescription className="text-xs text-slate-400">
                                {t("booking_subtitle")} <strong className="text-blue-300">{selectedHospitalForBooking.name} ({selectedHospitalForBooking.city})</strong>
                              </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setBookingStep("list")} className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800">
                              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> {t("booking_cancel")}
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-4 space-y-4">
                          {/* Selected Hospital Info Snippet */}
                          <div className="p-3 rounded-xl bg-[#0B1320] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div>
                              <p className="font-bold text-slate-200">{selectedHospitalForBooking.name}</p>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHospitalForBooking.name + " " + selectedHospitalForBooking.address + " " + selectedHospitalForBooking.city + " Andhra Pradesh")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-[11px] font-medium flex items-center gap-1 mt-0.5 group"
                              >
                                <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                <span>{selectedHospitalForBooking.address}, {selectedHospitalForBooking.city}</span>
                                <span className="text-[10px] text-blue-300 font-bold underline flex items-center gap-0.5 ml-1">
                                  (View in Google Maps <ExternalLink className="h-2.5 w-2.5" />)
                                </span>
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
                                ★ {selectedHospitalForBooking.rating}/5 Rating
                              </Badge>
                              {selectedHospitalForBooking.emergency && (
                                <Badge variant="outline" className="border-rose-500/30 text-rose-300 bg-rose-500/10 text-[10px]">
                                  24/7 Emergency Active
                                </Badge>
                              )}
                            </div>
                          </div>

                          <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Patient Name */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">{t("booking_patient_name")} *</Label>
                                <Input
                                  required
                                  placeholder="e.g. Ramesh Kumar"
                                  value={bookingForm.patientName}
                                  onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                                  className="bg-[#0B1320] border-white/10 text-slate-100 text-xs h-10 rounded-xl"
                                />
                              </div>

                              {/* Patient Age */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">{t("booking_patient_age")}</Label>
                                <Input
                                  type="number"
                                  min={1} max={120}
                                  value={bookingForm.patientAge}
                                  onChange={(e) => setBookingForm({ ...bookingForm, patientAge: parseInt(e.target.value) || 45 })}
                                  className="bg-[#0B1320] border-white/10 text-slate-100 text-xs h-10 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Date Picker */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">{t("booking_date")} *</Label>
                                <Input
                                  type="date"
                                  required
                                  value={bookingForm.date}
                                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                  className="bg-[#0B1320] border-white/10 text-slate-100 text-xs h-10 rounded-xl"
                                />
                              </div>

                              {/* Time Slot Select */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">{t("booking_timeslot")} *</Label>
                                <Select value={bookingForm.timeSlot} onValueChange={(val) => setBookingForm({ ...bookingForm, timeSlot: val })}>
                                  <SelectTrigger className="bg-[#0B1320] border-white/10 text-slate-100 text-xs h-10 rounded-xl">
                                    <SelectValue placeholder="Select Time Slot" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#121C2D] border-white/10 text-slate-100 text-xs">
                                    <SelectItem value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM (Morning OPD)</SelectItem>
                                    <SelectItem value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM (Morning OPD)</SelectItem>
                                    <SelectItem value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM (Pre-Noon OPD)</SelectItem>
                                    <SelectItem value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM (Afternoon OPD)</SelectItem>
                                    <SelectItem value="04:30 PM - 05:00 PM">04:30 PM - 05:00 PM (Evening Consultation)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Doctor Dropdown */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-300">{t("booking_doctor")} *</Label>
                              <Select value={bookingForm.doctor} onValueChange={(val) => setBookingForm({ ...bookingForm, doctor: val })}>
                                <SelectTrigger className="bg-[#0B1320] border-white/10 text-slate-100 text-xs h-10 rounded-xl">
                                  <SelectValue placeholder="Select Doctor / Specialty" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#121C2D] border-white/10 text-slate-100 text-xs">
                                  {selectedHospitalForBooking.doctors && selectedHospitalForBooking.doctors.length > 0 ? (
                                    selectedHospitalForBooking.doctors.map((doc, idx) => (
                                      <SelectItem key={idx} value={doc}>{doc}</SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="Duty Medical Officer (General Medicine)">Duty Medical Officer (General Medicine)</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Symptom Description */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-300">{t("booking_symptoms")}</Label>
                              <textarea
                                rows={2}
                                placeholder="Briefly describe symptoms or purpose of visit..."
                                value={bookingForm.symptoms}
                                onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                                className="w-full rounded-xl bg-[#0B1320] border border-white/10 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500/60 placeholder:text-slate-500 resize-none"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                              <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold text-xs h-11 rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> {t("booking_submit")}
                              </Button>
                              <Button type="button" variant="outline" onClick={() => setBookingStep("list")} className="h-11 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs">
                                {t("booking_cancel")}
                              </Button>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* STEP 3: HOSPITAL DASHBOARD / CONFIRMATION VIEW */}
                  {bookingStep === "dashboard" && confirmedAppointment && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <Card className="clinical-card rounded-xl border-2 border-emerald-500/40 bg-[#121C2D] shadow-xl">
                        <CardHeader className="pb-3 border-b border-white/10">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                <CheckCircle2 className="h-6 w-6" />
                              </div>
                              <div>
                                <CardTitle className="text-base font-bold text-emerald-300">
                                  {t("dashboard_confirmed")}
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-400">
                                  Your appointment reservation has been dispatched to {confirmedAppointment.hospital.name} ({confirmedAppointment.hospital.city}).
                                </CardDescription>
                              </div>
                            </div>

                            {/* Reference ID Badge */}
                            <button
                              onClick={copyRefNumber}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1320] border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold hover:bg-emerald-950/40 transition-colors w-fit"
                            >
                              <span>{confirmedAppointment.appointmentId}</span>
                              <Copy className="h-3.5 w-3.5 text-emerald-400 ml-1" />
                              {copiedRef && <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>}
                            </button>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-4 space-y-4">
                          {/* SIMULATED LIVE APPOINTMENT QUEUE & DISPATCH TRACKER */}
                          <div className="p-3.5 rounded-xl bg-[#0B1320] border border-white/10 space-y-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Appointment Dispatch Status</p>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>1. Submitted</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>2. AP Network Verified</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-300 font-semibold animate-pulse">
                                <Clock className="h-4 w-4 text-blue-400 shrink-0" />
                                <span>3. Dispatched to OPD</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#121C2D] border border-white/10 text-slate-400 font-medium">
                                <UserCheck className="h-4 w-4 text-slate-500 shrink-0" />
                                <span>4. Doctor Desk Ready</span>
                              </div>
                            </div>
                          </div>

                          {/* CONFIRMED DETAILS GRID */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-[#0B1320] border border-white/10 space-y-1">
                              <span className="text-slate-400 text-[11px]">Patient Details:</span>
                              <p className="font-bold text-slate-100">{confirmedAppointment.patientName} ({confirmedAppointment.patientAge} yrs)</p>
                              <p className="text-slate-400 text-[11px] truncate">Chief Complaint: {confirmedAppointment.symptoms}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-[#0B1320] border border-white/10 space-y-1">
                              <span className="text-slate-400 text-[11px]">Schedule & Time Slot:</span>
                              <p className="font-bold text-blue-400">{confirmedAppointment.date} ({confirmedAppointment.timeSlot})</p>
                              <p className="text-slate-300 font-semibold text-[11px]">Doctor: {confirmedAppointment.doctor}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-[#0B1320] border border-white/10 space-y-1 sm:col-span-2">
                              <span className="text-slate-400 text-[11px]">Empaneled AP Hospital & Direct Maps Navigation:</span>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-bold text-slate-100 text-sm">{confirmedAppointment.hospital.name}</p>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(confirmedAppointment.hospital.name + " " + confirmedAppointment.hospital.address + " " + confirmedAppointment.hospital.city + " Andhra Pradesh")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline text-[11px] font-semibold flex items-center gap-1 mt-0.5 group"
                                  >
                                    <Navigation className="h-3.5 w-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                    <span>{confirmedAppointment.hospital.address}, {confirmedAppointment.hospital.city}, AP</span>
                                    <ExternalLink className="h-3 w-3 text-blue-400 shrink-0 ml-0.5" />
                                  </a>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(confirmedAppointment.hospital.name + " " + confirmedAppointment.hospital.address + " " + confirmedAppointment.hospital.city + " Andhra Pradesh")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
                                  >
                                    <MapPin className="h-3.5 w-3.5 text-amber-300" /> Open Google Maps
                                    <ExternalLink className="h-3 w-3 ml-0.5" />
                                  </a>
                                  <a href={`tel:${confirmedAppointment.hospital.phone}`} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow">
                                    <Phone className="h-3 w-3" /> Call Hospital
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DASHBOARD ACTION BUTTONS */}
                          <div className="flex flex-wrap gap-3 pt-2">
                            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 rounded-xl px-4 flex items-center gap-2 shadow-md">
                              <Printer className="h-4 w-4" /> {t("dashboard_print")}
                            </Button>
                            <Button variant="outline" onClick={() => { setBookingStep("form"); }} className="border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs h-10 rounded-xl px-4 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-400" /> {t("dashboard_book_new")}
                            </Button>
                            <Button variant="ghost" onClick={() => setBookingStep("list")} className="text-slate-400 hover:text-slate-200 text-xs h-10 px-3">
                              {t("dashboard_back")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* RICH CLINICAL FOOTER */}
      <ClinicalFooter setView={setView} t={t} />

      {/* FLOATING AI HEALTH ASSISTANT CHATBOT WIDGET */}
      <AIChatbotWidget
        lang={lang}
        onMessageLogged={async (query, response) => {
          if (user) {
            await saveNeonChatTranscript(user.uid, query, response);
            const activeDb = getUserDatabase(user.uid);
            setConversations(activeDb.conversations);
          } else {
            const guestUid = "guest_temp_user";
            const activeDb = getUserDatabase(guestUid);
            const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const updated = [
              ...activeDb.conversations,
              { id: `u_${Date.now()}`, sender: "user" as const, text: query, timestamp: timeFormatted },
              { id: `b_${Date.now() + 1}`, sender: "bot" as const, text: response, timestamp: timeFormatted }
            ];
            saveUserDatabase(guestUid, { conversations: updated });
            setConversations(updated);
          }
        }}
      />

      {/* AUTHENTICATION MODAL */}
      <InlineAuthModal
        isOpen={isAuthModalOpen}
        mode={authModalInitialMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleUserLoginSuccess}
      />

      {/* CLINICAL HISTORY & APPOINTMENTS DASHBOARD MODAL */}
      <ClinicalHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        user={user}
        historyRecords={historyRecords}
        appointmentRecords={appointmentRecords}
        conversations={conversations}
        medications={medications}
        healthConditions={healthConditions}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onClearHistory={handleClearHistory}
        lang={lang}
        initialTab={historyInitialTab}
      />

    </div>
    </TooltipProvider>
  );
}