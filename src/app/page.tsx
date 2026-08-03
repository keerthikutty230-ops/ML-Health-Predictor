"use client";

import React, { useState, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity, Heart, Building2, Search, Shield, TrendingUp,
  User, Stethoscope, MapPin, Phone, Star, AlertTriangle,
  CheckCircle2, Info, FileText, Sparkles, ChevronDown,
  ChevronUp, Loader2, Zap, BarChart3, ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HealthInputs {
  age: number; bmi: number;
  blood_pressure_systolic: number; blood_pressure_diastolic: number;
  glucose: number; cholesterol: number; heart_rate: number; insulin: number;
}
interface OverlappingTrait { trait: string; user_value: number; patient_value: number; deviation_pct: number; }
interface HistoricalMatch {
  patient_id: string; similarity_score: number;
  profile: { age: number; bmi: number; blood_pressure: string; glucose: number; cholesterol: number; heart_rate: number };
  risk_level: string; diagnosis: string;
  overlapping_traits: OverlappingTrait[]; historical_progression: string;
}
interface Hospital {
  id: string; name: string; matched_specialties: string[];
  all_specialties: string[]; rating: number; distance_km: number;
  address: string; phone: string; beds: number;
  emergency: boolean; match_score: number;
}
interface RiskResult {
  risk_tier: string; risk_score: number;
  risk_probability: { low: number; moderate: number; high: number };
  feature_importance: Record<string, number>;
}
interface PredictionResult {
  risk: RiskResult; historical_matches: HistoricalMatch[];
  recommended_hospitals: Hospital[]; ai_summary: string | null;
}

const DEFAULT_INPUTS: HealthInputs = { age: 45, bmi: 25.0, blood_pressure_systolic: 120, blood_pressure_diastolic: 80, glucose: 95, cholesterol: 190, heart_rate: 72, insulin: 15.0 };

interface SliderField {
  key: keyof HealthInputs; label: string; unit: string;
  min: number; max: number; step: number;
  icon: React.ReactNode; tooltip: string; normalRange: [number, number];
}
const SLIDER_FIELDS: SliderField[] = [
  { key: "age", label: "Age", unit: "years", min: 1, max: 100, step: 1, icon: <User className="h-4 w-4" />, tooltip: "Patient age in years", normalRange: [18, 65] },
  { key: "bmi", label: "BMI", unit: "kg/m\u00B2", min: 10, max: 50, step: 0.1, icon: <Activity className="h-4 w-4" />, tooltip: "Body Mass Index (18.5-24.9 normal)", normalRange: [18.5, 24.9] },
  { key: "blood_pressure_systolic", label: "Systolic BP", unit: "mmHg", min: 70, max: 220, step: 1, icon: <Heart className="h-4 w-4" />, tooltip: "Systolic BP (normal <120)", normalRange: [90, 120] },
  { key: "blood_pressure_diastolic", label: "Diastolic BP", unit: "mmHg", min: 40, max: 140, step: 1, icon: <Heart className="h-4 w-4" />, tooltip: "Diastolic BP (normal <80)", normalRange: [60, 80] },
  { key: "glucose", label: "Fasting Glucose", unit: "mg/dL", min: 40, max: 350, step: 1, icon: <Zap className="h-4 w-4" />, tooltip: "Fasting glucose (normal 70-100)", normalRange: [70, 100] },
  { key: "cholesterol", label: "Total Cholesterol", unit: "mg/dL", min: 80, max: 450, step: 1, icon: <BarChart3 className="h-4 w-4" />, tooltip: "Total cholesterol (desirable <200)", normalRange: [100, 200] },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", min: 30, max: 180, step: 1, icon: <Activity className="h-4 w-4" />, tooltip: "Resting HR (normal 60-100)", normalRange: [60, 100] },
  { key: "insulin", label: "Insulin", unit: "mu U/mL", min: 0, max: 500, step: 0.5, icon: <Sparkles className="h-4 w-4" />, tooltip: "Fasting insulin (normal 2-25)", normalRange: [2, 25] },
];

const RISK_CONFIG: Record<string, { color: string; bg: string; badge: string; icon: React.ReactNode; progressColor: string; label: string; description: string }> = {
  low: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />, progressColor: "bg-emerald-500", label: "Low Risk", description: "Your health indicators are within normal ranges." },
  moderate: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800 border-amber-300", icon: <AlertTriangle className="h-6 w-6 text-amber-600" />, progressColor: "bg-amber-500", label: "Moderate Risk", description: "Some indicators suggest elevated health risk factors." },
  high: { color: "text-red-700", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-800 border-red-300", icon: <AlertTriangle className="h-6 w-6 text-red-600" />, progressColor: "bg-red-500", label: "High Risk", description: "Multiple indicators suggest significant health concerns." },
};

const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const ML_API = "/api/ml";

async function fetchPrediction(inputs: HealthInputs, geminiKey?: string): Promise<PredictionResult> {
  const payload = { ...inputs } as Record<string, unknown>;
  if (geminiKey) payload.gemini_api_key = geminiKey;
  const res = await fetch(`${ML_API}/full-prediction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function HealthPredictorPage() {
  const [inputs, setInputs] = useState<HealthInputs>({ ...DEFAULT_INPUTS });
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");

  React.useEffect(() => {
    fetch(`${ML_API}/status`).then((r) => r.json()).then((d) => setApiStatus(d.status === "healthy" ? "online" : "offline")).catch(() => setApiStatus("offline"));
  }, []);

  const updateInput = useCallback((key: keyof HealthInputs, value: number) => { setInputs((prev) => ({ ...prev, [key]: value })); }, []);
  const handleSubmit = async () => { setLoading(true); setError(null); setResult(null); try { const data = await fetchPrediction(inputs, geminiKey || undefined); setResult(data); } catch (err) { setError(err instanceof Error ? err.message : "An unexpected error occurred."); } finally { setLoading(false); } };
  const handleReset = () => { setInputs({ ...DEFAULT_INPUTS }); setResult(null); setError(null); };
  const riskConfig = result ? RISK_CONFIG[result.risk.risk_tier] : null;

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"><Stethoscope className="h-5 w-5 text-white" /></div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">AI Health Risk Predictor</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">ML-Powered Assessment with Historical Patient Matching</p>
                </div>
              </div>
              <Badge variant="outline" className={`${apiStatus === "online" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : apiStatus === "checking" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-red-300 bg-red-50 text-red-700"}`}>
                <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus === "online" ? "bg-emerald-500" : apiStatus === "checking" ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
                {apiStatus === "online" ? "ML Engine Online" : apiStatus === "checking" ? "Connecting..." : "Engine Offline"}
              </Badge>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* LEFT: INPUT FORM */}
            <div className="lg:col-span-5 space-y-5">
              <motion.div {...fadeInUp}>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-emerald-600" /> Health Metrics Input</CardTitle>
                    <CardDescription>Adjust sliders to enter patient health metrics for chronic disease risk analysis.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {SLIDER_FIELDS.map((field) => {
                      const value = inputs[field.key];
                      const [lo, hi] = field.normalRange;
                      const isNormal = value >= lo && value <= hi;
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                              {field.icon} {field.label}
                              <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">{field.tooltip}</TooltipContent></Tooltip>
                            </Label>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-semibold tabular-nums ${isNormal ? "text-emerald-600" : "text-red-500"}`}>{value}</span>
                              <span className="text-[10px] text-muted-foreground">{field.unit}</span>
                            </div>
                          </div>
                          <Slider value={[value]} onValueChange={([v]) => updateInput(field.key, v)} min={field.min} max={field.max} step={field.step} className="w-full" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{field.min}</span>
                            <span className="text-emerald-600 font-medium">Normal: {lo} \u2013 {hi}</span>
                            <span>{field.max}</span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.08 }}>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGemini(!showGemini)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowGemini(!showGemini); }}>
                      <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-600" /> AI Summary (Gemini) <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optional</Badge></CardTitle>
                      {showGemini ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                  <AnimatePresence>{showGemini && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <CardContent className="pt-0">
                        <Label htmlFor="gemini-key" className="text-sm text-muted-foreground">Enter your Google Gemini API key for an AI-powered medical summary.</Label>
                        <Input id="gemini-key" type="password" placeholder="AIza..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="mt-2" />
                      </CardContent>
                    </motion.div>
                  )}</AnimatePresence>
                </Card>
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.12 }} className="flex gap-3">
                <Button onClick={handleSubmit} disabled={loading || apiStatus !== "online"} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 h-11 text-sm font-semibold">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <><Search className="h-4 w-4 mr-2" /> Run Prediction</>}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={loading} className="h-11">Reset</Button>
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.16 }}>
                <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                    <p>Uses a <strong>500-patient synthetic dataset</strong> modeled after Pima Indians Diabetes Dataset (Kaggle). <strong>Not a medical diagnosis.</strong> Always consult a healthcare professional.</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT: RESULTS */}
            <div className="lg:col-span-7 space-y-5">
              {loading && (<div className="space-y-5">
                <Card><CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 mt-1" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-32 w-full rounded-lg" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-52" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-24 w-full rounded-lg" /><Skeleton className="h-24 w-full rounded-lg" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
              </div>)}

              {error && (<motion.div {...fadeInUp}><Card className="border-red-200 bg-red-50"><CardContent className="py-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-500 shrink-0" /><div><p className="text-sm font-medium text-red-800">Prediction Failed</p><p className="text-xs text-red-600 mt-0.5">{error}</p></div></CardContent></Card></motion.div>)}

              {!loading && !error && !result && (<motion.div {...fadeInUp}><Card className="border-dashed"><CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4"><Search className="h-7 w-7 text-emerald-400" /></div>
                <p className="text-sm font-medium text-muted-foreground">No Results Yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">Enter health metrics and click &quot;Run Prediction&quot; to see your personalized risk assessment, patient matches, and hospital recommendations.</p>
              </CardContent></Card></motion.div>)}

              <AnimatePresence>
              {result && !loading && (<motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">

                {/* RISK TIER CARD */}
                <Card className={`${riskConfig?.bg} border-2`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Risk Assessment</CardTitle>
                      <Badge className={`${riskConfig?.badge} border text-xs font-semibold px-3 py-1`}>{riskConfig?.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      {riskConfig?.icon}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${riskConfig?.color}`}>{riskConfig?.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Confidence: <span className="font-semibold text-foreground">{(result.risk.risk_score * 100).toFixed(1)}%</span></p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Probability Breakdown</p>
                      {(["low", "moderate", "high"] as const).map((tier) => {
                        const pct = result.risk.risk_probability[tier] * 100;
                        const cfg = RISK_CONFIG[tier];
                        return (<div key={tier} className="space-y-1">
                          <div className="flex justify-between text-xs"><span className="font-medium">{cfg.label}</span><span className="tabular-nums font-semibold">{pct.toFixed(1)}%</span></div>
                          <div className="h-2.5 bg-black/5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }} className={`h-full rounded-full ${cfg.progressColor}`} /></div>
                        </div>);
                      })}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Top Contributing Risk Factors</p>
                      <div className="space-y-1.5">
                        {Object.entries(result.risk.feature_importance).slice(0, 5).map(([feat, imp], i) => (
                          <div key={feat} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">{i + 1}.</span>
                            <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(imp * 300, 100)}%` }} transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }} className="h-full bg-gray-400 rounded-full" /></div>
                            <span className="text-xs font-medium w-36 sm:w-40 truncate">{feat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{(imp * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* HISTORICAL MATCHES */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-blue-600" /> Historical Patient Match Evidence</CardTitle>
                    <CardDescription>Top 2 most similar cases from our 500-patient database matched via cosine similarity.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.historical_matches.map((match, idx) => (
                      <motion.div key={match.patient_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 + idx * 0.1 }}>
                        <Card className={`border ${match.risk_level === "high" ? "border-red-200 bg-red-50/40" : match.risk_level === "moderate" ? "border-amber-200 bg-amber-50/40" : "border-emerald-200 bg-emerald-50/40"}`}>
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono">{match.patient_id}</Badge>
                                <Badge className={`${RISK_CONFIG[match.risk_level]?.badge} border text-[10px]`}>{RISK_CONFIG[match.risk_level]?.label}</Badge>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Similarity</span>
                                <span className="text-sm font-bold tabular-nums">{(match.similarity_score * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {match.overlapping_traits.map((t) => (<Badge key={t.trait} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{t.trait}: {t.user_value} vs {t.patient_value} ({t.deviation_pct}% dev)</Badge>))}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2"><span className="font-medium text-foreground">Diagnosis:</span> {match.diagnosis}</div>
                            <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors" onClick={() => setExpandedMatch(expandedMatch === idx ? null : idx)}>
                              {expandedMatch === idx ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {expandedMatch === idx ? "Hide" : "Show"} Clinical Progression
                            </button>
                            <AnimatePresence>{expandedMatch === idx && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="mt-2 pt-2 border-t space-y-2">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                    <div><span className="text-muted-foreground">Age:</span> <span className="font-medium">{match.profile.age}</span></div>
                                    <div><span className="text-muted-foreground">BMI:</span> <span className="font-medium">{match.profile.bmi}</span></div>
                                    <div><span className="text-muted-foreground">BP:</span> <span className="font-medium">{match.profile.blood_pressure}</span></div>
                                    <div><span className="text-muted-foreground">Glucose:</span> <span className="font-medium">{match.profile.glucose}</span></div>
                                    <div><span className="text-muted-foreground">Cholesterol:</span> <span className="font-medium">{match.profile.cholesterol}</span></div>
                                    <div><span className="text-muted-foreground">Heart Rate:</span> <span className="font-medium">{match.profile.heart_rate}</span></div>
                                  </div>
                                  <div className="bg-white/60 rounded-lg p-2.5 border">
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Historical Clinical Progression</p>
                                    <p className="text-xs leading-relaxed">{match.historical_progression}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}</AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                {/* RECOMMENDED HOSPITALS */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-orange-600" /> Recommended Hospitals</CardTitle>
                    <CardDescription>Facilities ranked by specialty match, quality rating, and proximity.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.recommended_hospitals.slice(0, 4).map((hospital, idx) => (
                      <motion.div key={hospital.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 + idx * 0.06 }}>
                        <Card className="border hover:shadow-md transition-shadow">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {idx === 0 && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Best Match</Badge>}
                                  <h4 className="text-sm font-semibold truncate">{hospital.name}</h4>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {hospital.matched_specialties.map((s) => (<Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">{s}</Badge>))}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{hospital.distance_km} km</span>
                                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{hospital.rating}/5</span>
                                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{hospital.beds} beds</span>
                                  {hospital.emergency && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-200">24/7 ER</Badge>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-lg font-bold tabular-nums text-emerald-600">{(hospital.match_score * 100).toFixed(0)}%</div>
                                <div className="text-[10px] text-muted-foreground">match</div>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 truncate max-w-[60%]"><MapPin className="h-3 w-3 shrink-0" />{hospital.address}</span>
                              <span className="flex items-center gap-1 shrink-0"><Phone className="h-3 w-3" />{hospital.phone}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                {/* AI SUMMARY */}
                {result.ai_summary && (
                  <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.4 }}>
                    <Card className="border-2 border-violet-200 bg-violet-50/40 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-600" /> AI-Powered Medical Summary</CardTitle>
                        <CardDescription>Generated by Google Gemini based on your assessment, matches, and recommendations.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none text-gray-700 bg-white/70 rounded-lg p-4 border whitespace-pre-wrap text-xs leading-relaxed">{result.ai_summary}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

              </motion.div>)}
              </AnimatePresence>
            </div>
          </div>
        </main>

        <footer className="border-t bg-white/60 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>AI Health Risk Predictor — For educational purposes only. Not a medical diagnosis.</p>
            <p className="flex items-center gap-1">Powered by <span className="font-medium">Scikit-Learn</span> + <span className="font-medium">FastAPI</span> + <span className="font-medium">Next.js</span></p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
