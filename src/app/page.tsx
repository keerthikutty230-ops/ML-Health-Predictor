"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DEFAULT_INPUTS: HealthInputs = {
  age: 45, bmi: 25.0, blood_pressure_systolic: 120, blood_pressure_diastolic: 80,
  glucose: 95, cholesterol: 190, heart_rate: 72, insulin: 15.0,
};

interface SliderField {
  key: keyof HealthInputs; label: string; unit: string;
  min: number; max: number; step: number; icon: React.ReactNode;
  tooltip: string; normalRange: [number, number];
}
const SLIDER_FIELDS: SliderField[] = [
  { key: "age", label: "Age", unit: "years", min: 1, max: 100, step: 1, icon: <User className="h-4 w-4" />, tooltip: "Patient age", normalRange: [18, 65] },
  { key: "bmi", label: "BMI", unit: "kg/m2", min: 10, max: 50, step: 0.1, icon: <Activity className="h-4 w-4" />, tooltip: "Body Mass Index (18.5-24.9 normal)", normalRange: [18.5, 24.9] },
  { key: "blood_pressure_systolic", label: "Systolic BP", unit: "mmHg", min: 70, max: 220, step: 1, icon: <Heart className="h-4 w-4" />, tooltip: "Systolic BP (normal <120)", normalRange: [90, 120] },
  { key: "blood_pressure_diastolic", label: "Diastolic BP", unit: "mmHg", min: 40, max: 140, step: 1, icon: <Heart className="h-4 w-4" />, tooltip: "Diastolic BP (normal <80)", normalRange: [60, 80] },
  { key: "glucose", label: "Fasting Glucose", unit: "mg/dL", min: 40, max: 350, step: 1, icon: <Zap className="h-4 w-4" />, tooltip: "Fasting glucose (normal 70-100)", normalRange: [70, 100] },
  { key: "cholesterol", label: "Total Cholesterol", unit: "mg/dL", min: 80, max: 450, step: 1, icon: <BarChart3 className="h-4 w-4" />, tooltip: "Cholesterol (desirable <200)", normalRange: [100, 200] },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", min: 30, max: 200, step: 1, icon: <Activity className="h-4 w-4" />, tooltip: "Resting heart rate (60-100 normal)", normalRange: [60, 100] },
  { key: "insulin", label: "Insulin", unit: "uU/mL", min: 0, max: 300, step: 0.5, icon: <Activity className="h-4 w-4" />, tooltip: "Fasting insulin (2-20 normal)", normalRange: [2, 20] },
];

const RISK_CFG: Record<RiskTier, {
  color: string; bg: string; badge: string; icon: React.ReactNode;
  bar: string; label: string; desc: string;
}> = {
  low: {
    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />, bar: "bg-emerald-500",
    label: "Low Risk", desc: "Your health indicators are within normal ranges.",
  },
  moderate: {
    color: "text-amber-700", bg: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: <AlertTriangle className="h-6 w-6 text-amber-600" />, bar: "bg-amber-500",
    label: "Moderate Risk", desc: "Some indicators suggest elevated risk factors.",
  },
  high: {
    color: "text-red-700", bg: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800 border-red-300",
    icon: <AlertOctagon className="h-6 w-6 text-red-600" />, bar: "bg-red-500",
    label: "High Risk", desc: "Multiple indicators suggest significant health concerns.",
  },
};

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };
const ML = "/api/ml";

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function getRiskCfg(tier: string) {
  return RISK_CFG[tier as RiskTier] ?? RISK_CFG.low;
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
export default function Page() {
  const [view, setView] = useState<"landing" | "app">("landing");
  const [inputs, setInputs] = useState<HealthInputs>({ ...DEFAULT_INPUTS });
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const resultsRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);

  useEffect(() => {
    apiFetch(`${ML}/status`).then(d => {
      setApiStatus("online");
      if (d.cities_available) setCities(d.cities_available);
    }).catch(() => setApiStatus("offline"));
  }, []);

  const updateInput = useCallback((key: keyof HealthInputs, v: number) =>
    setInputs(p => ({ ...p, [key]: v })), []);

  const handleAnalyze = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await apiFetch(`${ML}/full-prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inputs, city, state: stateVal, gemini_api_key: geminiKey || undefined }),
      });
      setResult(data);
      setView("app");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setInputs({ ...DEFAULT_INPUTS }); setResult(null); setError(null);
  };

  const rc = result ? getRiskCfg(result.risk.risk_tier) : null;

  /* ======================= LANDING PAGE ======================= */
  if (view === "landing") {
    return (
      <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white">
        {/* NAV */}
        <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Stethoscope className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">HealthPredict AI</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={apiStatus === "online" ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : "border-red-500/50 text-red-400 bg-red-500/10"}>
                <span className={"h-1.5 w-1.5 rounded-full mr-1.5 " + (apiStatus === "online" ? "bg-emerald-400" : "bg-red-400 animate-pulse")} />
                {apiStatus === "online" ? "ML Online" : "Connecting"}
              </Badge>
              <Button onClick={() => setView("app")}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 h-9 text-sm font-semibold px-5">
                Launch App
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <motion.section style={{ opacity: heroOpacity, scale: heroScale }}
          className="min-h-screen flex items-center justify-center px-4 pt-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 mb-6 px-4 py-1.5 text-sm">
                ML-Powered Health Intelligence
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Know Your Health<br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Before It Knows You
                </span>
              </h1>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              AI-driven chronic disease risk assessment with patient similarity matching,
              location-aware hospital recommendations, and intelligent care guidance \u2014 all in seconds.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => setView("app")}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-xl shadow-emerald-500/30 h-12 text-base font-semibold px-8">
                <Search className="h-5 w-5 mr-2" />Start Health Assessment
              </Button>
              <Button size="lg" variant="outline"
                className="border-white/20 text-white hover:bg-white/10 h-12 text-base px-8"
                onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>
                Learn More <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex items-center justify-center gap-8 pt-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" />500 Patient DB</span>
              <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-teal-400" />ML Classification</span>
              <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-cyan-400" />23 Hospitals</span>
            </motion.div>
          </div>
        </motion.section>

        {/* FEATURES GRID */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Gauge className="h-6 w-6" />, title: "ML Risk Engine", desc: "Gradient Boosting Classifier trained on 500 synthetic patient records evaluates 8 clinical biomarkers for chronic disease risk." },
              { icon: <Users className="h-6 w-6" />, title: "Patient Similarity Proof", desc: "KNN cosine similarity finds the top 2 closest historical cases, showing overlapping traits and clinical progression as evidence." },
              { icon: <MapPinned className="h-6 w-6" />, title: "Location-Aware Hospitals", desc: "Select your city and state to get matched with nearby specialized facilities and doctors, sorted by relevance." },
              { icon: <ClipboardList className="h-6 w-6" />, title: "Conditional Care Guidance", desc: "Moderate risk shows OTC precautions. High risk triggers emergency escalation \u2014 no unsafe medication suggestions." },
              { icon: <Sparkles className="h-6 w-6" />, title: "Gemini AI Summary", desc: "Optional integration with Google Gemini generates a compassionate, professional executive health summary." },
              { icon: <Shield className="h-6 w-6" />, title: "Privacy-First Design", desc: "All data is synthetic and anonymized. No personal health data is stored or transmitted beyond your session." },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-all h-full">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-4">{f.icon}</div>
                    <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ABOUT US */}
        <section id="about" className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div {...fadeIn} whileInView>
              <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                <CardContent className="pt-8 pb-8 text-center space-y-6">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
                    <Stethoscope className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold">About HealthPredict AI</h2>
                  <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    Our mission is to make health risk intelligence transparent, accessible, and actionable.
                    We believe everyone deserves to understand their health metrics in context \u2014 with evidence
                    from comparable patient histories and clear pathways to professional care.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-6 pt-4">
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-emerald-400">500+</div>
                      <div className="text-sm text-slate-400">Synthetic Patient Records</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-teal-400">23</div>
                      <div className="text-sm text-slate-400">Partner Hospital Facilities</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-cyan-400">6</div>
                      <div className="text-sm text-slate-400">US Cities Covered</div>
                    </div>
                  </div>
                  <Button size="lg" onClick={() => setView("app")}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/25 h-11 mt-2">
                    <ArrowRight className="h-4 w-4 mr-2" />Begin Your Assessment
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-white/10 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>HealthPredict AI \u2014 For educational and informational purposes only. Not a medical diagnosis.</p>
            <p className="flex items-center gap-1">Scikit-Learn + FastAPI + Next.js</p>
          </div>
        </footer>
      </div>
      </TooltipProvider>
    );
  }

  /* ======================= APP VIEW ======================= */
  return (
    <TooltipProvider>
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => { setView("landing"); setResult(null); }}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-bold text-gray-900 leading-tight">HealthPredict AI</div>
                <div className="text-[10px] text-muted-foreground">Intelligent Health Assessment</div>
              </div>
            </button>
            <Badge variant="outline"
              className={apiStatus === "online" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"}>
              <span className={"h-1.5 w-1.5 rounded-full mr-1.5 " + (apiStatus === "online" ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
              {apiStatus === "online" ? "ML Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ============ LEFT PANEL: INPUTS ============ */}
          <div className="lg:col-span-5 space-y-5">
            <motion.div {...fadeIn}>
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-emerald-600" />Health Metrics
                  </CardTitle>
                  <CardDescription>Enter your biometrics for chronic disease risk analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SLIDER_FIELDS.map(f => {
                    const v = inputs[f.key];
                    const [lo, hi] = f.normalRange;
                    const ok = v >= lo && v <= hi;
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-1.5">
                            {f.icon} {f.label}
                            <Tooltip><TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">{f.tooltip}</TooltipContent></Tooltip>
                          </Label>
                          <div className="flex items-center gap-1.5">
                            <span className={"text-sm font-semibold tabular-nums " + (ok ? "text-emerald-600" : "text-red-500")}>{v}</span>
                            <span className="text-[10px] text-muted-foreground">{f.unit}</span>
                          </div>
                        </div>
                        <Slider value={[v]} onValueChange={([x]) => updateInput(f.key, x)}
                          min={f.min} max={f.max} step={f.step} className="w-full" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{f.min}</span>
                          <span className="text-emerald-600 font-medium">Normal: {lo} \u2013 {hi}</span>
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
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPinned className="h-4 w-4 text-orange-600" />Your Location
                  </CardTitle>
                  <CardDescription>Select your city for nearby hospital recommendations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">City</Label>
                      <Select value={city} onValueChange={(v) => { setCity(v); const found = cities.find(c => c.city === v); if (found) setStateVal(found.state); }}>
                        <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.city + c.state} value={c.city}>{c.city}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <Select value={stateVal} onValueChange={setStateVal}>
                        <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>{[...new Set(cities.map(c => c.state))].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* GEMINI KEY */}
            <motion.div {...fadeIn} transition={{ duration: 0.4, delay: 0.12 }}>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowGemini(!showGemini)} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setShowGemini(!showGemini); }}>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-violet-600" />AI Summary
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optional</Badge>
                    </CardTitle>
                    {showGemini ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                <AnimatePresence>
                  {showGemini && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <CardContent className="pt-0">
                        <Label className="text-sm text-muted-foreground">Google Gemini API key for AI medical summary.</Label>
                        <Input type="password" placeholder="AIza..." value={geminiKey}
                          onChange={e => setGeminiKey(e.target.value)} className="mt-2" />
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>

            {/* ACTION BUTTONS */}
            <motion.div {...fadeIn} transition={{ duration: 0.4, delay: 0.15 }} className="flex gap-3">
              <Button onClick={handleAnalyze}
                disabled={loading || apiStatus !== "online" || !city}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 h-11 text-sm font-semibold">
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                  : <><Search className="h-4 w-4 mr-2" />Run Prediction</>}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={loading} className="h-11">Reset</Button>
            </motion.div>

            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                <p>Uses a <strong>500-patient synthetic dataset</strong> (Pima Indians / Kaggle). <strong>Not a diagnosis.</strong></p>
              </div>
            </div>
          </div>

          {/* ============ RIGHT PANEL: RESULTS ============ */}
          <div ref={resultsRef} className="lg:col-span-7 space-y-5">
            {/* Loading skeletons */}
            {loading && (
              <div className="space-y-5">
                {[1, 2, 3].map(i => (
                  <Card key={i}><CardContent className="py-6 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent></Card>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && (
              <motion.div {...fadeIn}>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Prediction Failed</p>
                      <p className="text-xs text-red-600 mt-0.5">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Empty state */}
            {!loading && !error && !result && (
              <motion.div {...fadeIn}>
                <Card className="border-dashed">
                  <CardContent className="py-16 flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                      <Search className="h-7 w-7 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No Results Yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Enter health metrics, select your city, and click Run Prediction.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ========== RESULTS ========== */}
            <AnimatePresence>
              {result && !loading && (
                <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                  {/* RISK ASSESSMENT CARD */}
                  <Card className={rc?.bg + " border-2"}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <TrendingUp className="h-4 w-4" />Risk Assessment
                        </CardTitle>
                        <Badge className={rc?.badge + " border text-xs font-semibold px-3 py-1"}>{rc?.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        {rc?.icon}
                        <div className="flex-1">
                          <p className={"text-sm font-medium " + rc?.color}>{rc?.desc}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Confidence: <span className="font-semibold text-foreground">{(result.risk.risk_score * 100).toFixed(1)}%</span>
                            {" \u00B7 "}
                            Location: <span className="font-medium">{result.user_profile.location}</span>
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Probability</p>
                        {(["low", "moderate", "high"] as const).map(t => {
                          const p = result.risk.risk_probability[t] * 100;
                          const cfg = getRiskCfg(t);
                          return (
                            <div key={t} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">{cfg.label}</span>
                                <span className="tabular-nums font-semibold">{p.toFixed(1)}%</span>
                              </div>
                              <div className="h-2.5 bg-black/5 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: p + "%" }}
                                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                  className={"h-full rounded-full " + cfg.bar} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Top Risk Factors</p>
                        <div className="space-y-1.5">
                          {Object.entries(result.risk.feature_importance).slice(0, 5).map(([f, imp], i) => (
                            <div key={f} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                              <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }}
                                  animate={{ width: Math.min(imp * 300, 100) + "%" }}
                                  transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
                                  className="h-full bg-gray-400 rounded-full" />
                              </div>
                              <span className="text-xs font-medium w-36 truncate">
                                {f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                                {(imp * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* COMPARATIVE PATIENT ANALYSIS - SIDE BY SIDE GRID */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />Comparative Patient Analysis
                      </CardTitle>
                      <CardDescription>
                        Side-by-side comparison of your health profile vs. the 2 most similar historical cases.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Comparison Table */}
                      <div className="overflow-x-auto -mx-4 px-4">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2">
                              <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metric</th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50/50 rounded-t-lg">
                                <div className="flex flex-col items-center"><User className="h-3.5 w-3.5 mb-0.5" /><span>You</span></div>
                              </th>
                              {result.historical_matches.map((m, idx) => {
                                const mc = getRiskCfg(m.risk_level);
                                return (
                                  <th key={m.patient_id}
                                    className={"text-center py-2 px-2 text-xs font-semibold uppercase tracking-wider rounded-t-lg " + mc.color}
                                    style={{ backgroundColor: mc.bg.includes("red") ? "rgba(239,68,68,0.05)" : mc.bg.includes("amber") ? "rgba(245,158,11,0.05)" : "rgba(16,185,129,0.05)" }}>
                                    <div className="flex flex-col items-center">
                                      <Badge variant="outline" className="text-[9px] font-mono mb-0.5">{m.patient_id}</Badge>
                                      <span>{(m.similarity_score * 100).toFixed(1)}% match</span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: "Age", unit: "yr", uVal: result.user_profile.age, pVals: result.historical_matches.map(m => m.profile.age), norm: [18, 65] as [number, number] },
                              { label: "BMI", unit: "", uVal: result.user_profile.bmi, pVals: result.historical_matches.map(m => m.profile.bmi), norm: [18.5, 24.9] as [number, number] },
                              { label: "BP", unit: "mmHg", uVal: null, uStr: result.user_profile.blood_pressure, pVals: null, pStrs: result.historical_matches.map(m => m.profile.blood_pressure), norm: null },
                              { label: "Glucose", unit: "mg/dL", uVal: result.user_profile.glucose, pVals: result.historical_matches.map(m => m.profile.glucose), norm: [70, 100] as [number, number] },
                              { label: "Cholesterol", unit: "mg/dL", uVal: result.user_profile.cholesterol, pVals: result.historical_matches.map(m => m.profile.cholesterol), norm: [100, 200] as [number, number] },
                              { label: "Heart Rate", unit: "bpm", uVal: result.user_profile.heart_rate, pVals: result.historical_matches.map(m => m.profile.heart_rate), norm: [60, 100] as [number, number] },
                            ].map((row, ri) => (
                              <tr key={row.label} className={ri % 2 === 0 ? "bg-muted/20" : ""}>
                                <td className="py-2 px-2 font-medium text-xs">{row.label} <span className="text-muted-foreground">{row.unit}</span></td>
                                <td className="py-2 px-2 text-center font-semibold text-emerald-700 text-xs">
                                  {row.uStr ?? (row.uVal !== null ? row.uVal : "")}
                                </td>
                                {result.historical_matches.map((m, mi) => {
                                  const cellStr = row.pStrs ? row.pStrs[mi] : (row.pVals ? String(row.pVals[mi]) : "");
                                  return <td key={mi} className="py-2 px-2 text-center text-xs font-medium">{cellStr}</td>;
                                })}
                              </tr>
                            ))}
                            {/* Risk Level row */}
                            <tr className="border-t-2">
                              <td className="py-2.5 px-2 font-semibold text-xs">Risk Level</td>
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
                            {/* Diagnosis row */}
                            <tr className="bg-muted/20">
                              <td className="py-2.5 px-2 font-semibold text-xs">Diagnosis</td>
                              <td className="py-2.5 px-2 text-center text-xs text-muted-foreground italic">Awaiting assessment</td>
                              {result.historical_matches.map((m, mi) => (
                                <td key={mi} className="py-2.5 px-2 text-center text-xs max-w-[140px]">{m.diagnosis}</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Overlapping Traits Badges */}
                      {result.historical_matches.map((m, idx) => (
                        <div key={m.patient_id} className="rounded-lg border p-3 bg-muted/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px] font-mono">{m.patient_id}</Badge>
                            <span className="text-xs font-medium">Overlapping Traits</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{(m.similarity_score * 100).toFixed(1)}% similarity</span>
                          </div>
                          {m.overlapping_traits.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {m.overlapping_traits.map(t => (
                                <Badge key={t.trait} variant="secondary"
                                  className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {t.trait}: <span className="font-semibold">{t.user_value}</span> vs {t.patient_value}
                                  <span className="text-emerald-500 ml-0.5">({t.deviation_pct}% dev)</span>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No closely overlapping traits detected.</p>
                          )}
                          {/* Clinical Progression */}
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Clinical Progression</p>
                            <p className="text-xs leading-relaxed text-gray-600">{m.historical_progression}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* CONDITIONAL CARE GUIDANCE - HIGH RISK EMERGENCY */}
                  {result.care_guidance.emergency_escalation && (
                    <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                      <Card className="border-2 border-red-300 bg-red-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base text-red-800">
                            <AlertOctagon className="h-4 w-4" />Immediate Medical Attention Required
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-red-700 font-medium">{result.care_guidance.message}</p>
                          <div className="space-y-2">
                            {result.care_guidance.actions?.map((a, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <Cross className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 rounded-lg bg-red-100/60 border border-red-200 p-3">
                            <p className="text-xs text-red-700 font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              OTC medications and self-treatment are NOT recommended for high-risk results.
                              Please seek immediate professional medical care.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* CONDITIONAL CARE GUIDANCE - MODERATE OTC */}
                  {result.care_guidance.show_medications && result.care_guidance.care_guides && (
                    <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                      <Card className="border-2 border-amber-200 bg-amber-50/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <ClipboardList className="h-4 w-4 text-amber-600" />Temporary Precautions & OTC Guidance
                          </CardTitle>
                          <CardDescription>For moderate risk \u2014 consult a doctor for sustained care.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-amber-800">{result.care_guidance.message}</p>
                          {result.care_guidance.care_guides.map((g, gi) => (
                            <div key={gi} className="rounded-lg border bg-white/60 p-4 space-y-3">
                              <button className="flex items-center justify-between w-full text-left"
                                onClick={() => setExpandedGuide(expandedGuide === gi ? null : gi)}>
                                <div className="flex items-center gap-2">
                                  <Pill className="h-4 w-4 text-amber-600" />
                                  <h4 className="text-sm font-semibold">{g.title}</h4>
                                </div>
                                {expandedGuide === gi
                                  ? <ChevronUp className="h-4 w-4" />
                                  : <ChevronDown className="h-4 w-4" />}
                              </button>
                              <AnimatePresence>
                                {expandedGuide === gi && (
                                  <motion.div initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                                    <div>
                                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Precautions</p>
                                      {g.precautions.map((p, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                          <span>{p}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1.5">OTC Supplements</p>
                                      {g.otc_guidance.map((o, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                          <Syringe className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                                          <span>{o}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1.5">Avoid</p>
                                      {g.avoid.map((a, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                          <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
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
                            <p className="text-xs text-amber-600 italic border-t pt-2">{result.care_guidance.disclaimer}</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* CONDITIONAL CARE GUIDANCE - LOW RISK */}
                  {!result.care_guidance.show_medications && !result.care_guidance.emergency_escalation && (
                    <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                      <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-emerald-800">{result.care_guidance.message}</p>
                              {result.care_guidance.actions?.map((a, i) => (
                                <p key={i} className="text-xs text-emerald-700 mt-1">{a}</p>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* HOSPITAL RECOMMENDATIONS */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-orange-600" />
                        Recommended Hospitals in {result.user_profile.location}
                      </CardTitle>
                      <CardDescription>Sorted by specialty match, quality, and proximity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.recommended_hospitals.slice(0, 4).map((h, i) => (
                        <motion.div key={h.id} initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}>
                          <Card className="border hover:shadow-md transition-shadow">
                            <CardContent className="py-3 px-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {i === 0 && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Best Match</Badge>}
                                    <h4 className="text-sm font-semibold truncate">{h.name}</h4>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mb-1.5">
                                    {h.matched_specialties.map(s => (
                                      <Badge key={s} variant="secondary"
                                        className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">{s}</Badge>
                                    ))}
                                  </div>
                                  {h.doctors.length > 0 && (
                                    <p className="text-xs text-muted-foreground mb-1.5">{h.doctors.join(" | ")}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{h.city}, {h.state}</span>
                                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{h.rating}/5</span>
                                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{h.beds} beds</span>
                                    {h.emergency && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-200">24/7 ER</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-lg font-bold tabular-nums text-emerald-600">
                                    {(h.match_score * 100).toFixed(0)}%
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">match</div>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 truncate max-w-[60%]">
                                  <MapPin className="h-3 w-3 shrink-0" />{h.address}
                                </span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <Phone className="h-3 w-3" />{h.phone}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* AI SUMMARY */}
                  {result.ai_summary && (
                    <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
                      <Card className="border-2 border-violet-200 bg-violet-50/40">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Sparkles className="h-4 w-4 text-violet-600" />AI Health Summary
                          </CardTitle>
                          <CardDescription>Generated by Google Gemini.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none text-gray-700 bg-white/70 rounded-lg p-4 border whitespace-pre-wrap text-xs leading-relaxed">
                            {result.ai_summary}
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

      <footer className="border-t bg-white/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>HealthPredict AI \u2014 Not a medical diagnosis.</p>
          <p>Scikit-Learn + FastAPI + Next.js</p>
        </div>
      </footer>
    </div>
    </TooltipProvider>
  );
}