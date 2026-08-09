"use client";

import React, { useState } from "react";
import {
  X, History, Calendar, MapPin, ShieldCheck, Stethoscope, ChevronRight, Activity, Trash2,
  Clock, CheckCircle2, Navigation, MessageSquareText, Pill, AlertTriangle, FileText, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Language, TRANSLATIONS } from "@/lib/translations";
import { AuthUser } from "./AuthModal";
import { Button } from "@/components/ui/button";
import { ChatRecord } from "@/lib/userDatabase";

export interface RiskAssessmentRecord {
  id: string;
  timestamp: string;
  age: number;
  bmi: number;
  bp: string;
  glucose: number;
  cholesterol: number;
  city: string;
  riskTier: "low" | "moderate" | "high";
  riskScore: number;
  symptomsText?: string;
}

export interface SavedAppointmentRecord {
  appointmentId: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalCity: string;
  patientName: string;
  patientAge: number;
  doctor: string;
  date: string;
  timeSlot: string;
  symptoms: string;
  status: string;
  timestamp: string;
}

interface ClinicalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  historyRecords: RiskAssessmentRecord[];
  appointmentRecords: SavedAppointmentRecord[];
  conversations?: ChatRecord[];
  medications?: string[];
  healthConditions?: string[];
  onOpenAuth: () => void;
  onSelectRecordToReRun?: (record: RiskAssessmentRecord) => void;
  onClearHistory?: () => void;
  lang?: Language;
  initialTab?: "history" | "appointments" | "chats" | "medications";
}

export default function ClinicalHistoryModal({
  isOpen,
  onClose,
  user,
  historyRecords,
  appointmentRecords,
  conversations = [],
  medications = [],
  healthConditions = [],
  onOpenAuth,
  onSelectRecordToReRun,
  onClearHistory,
  lang = "en",
  initialTab = "history"
}: ClinicalHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<"history" | "appointments" | "chats" | "medications">(initialTab);

  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;

  if (!isOpen) return null;

  return (
    <div
      id="historyModalBackdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    >
      <motion.div
          id="historyModalBox"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-[#F4EBDD] border border-[#0D0B09]/15 rounded-3xl shadow-2xl overflow-hidden text-[#0D0B09] flex flex-col"
        >
          {/* MODAL HEADER */}
          <div className="p-6 border-b border-[#0D0B09]/10 flex items-center justify-between bg-[#EED4AC]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#1E3F20]/10 border border-[#1E3F20]/20 flex items-center justify-center text-[#1E3F20]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0D0B09] flex items-center gap-2">
                  Patient Health Records & Dashboard
                  {user && (
                    <span className="text-xs font-normal text-emerald-800 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Linked to {user.name}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#0D0B09]/60">
                  {user ? `Signed in as ${user.email}` : "Sign in to save and sync your clinical risk evaluations across sessions"}
                </p>
              </div>
            </div>

            <button
              id="historyModalCloseBtn"
              onClick={onClose}
              className="p-2 rounded-xl text-[#0D0B09]/60 hover:text-[#0D0B09] hover:bg-[#0D0B09]/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* LOGGED OUT BANNER */}
          {!user && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>You are currently viewing temporary local records. Sign in with Google to sync across all devices!</span>
              </div>
              <Button
                onClick={() => { onClose(); onOpenAuth(); }}
                className="bg-[#1E3F20] hover:bg-[#152e17] text-white font-bold text-xs h-8 rounded-lg px-3"
              >
                Sign In / Sync Now
              </Button>
            </div>
          )}

          {/* TAB BAR */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-[#0D0B09]/10 bg-[#EED4AC]/20 overflow-x-auto">
            <button
              id="tabReportsBtn"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-t-xl transition-all border-b-2 cursor-pointer ${
                activeTab === "history"
                  ? "border-[#1E3F20] text-[#1E3F20] bg-[#1E3F20]/5"
                  : "border-transparent text-[#0D0B09]/60 hover:text-[#0D0B09]"
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Risk Reports ({historyRecords.length})</span>
            </button>

            <button
              id="tabAppointmentsBtn"
              onClick={() => setActiveTab("appointments")}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-t-xl transition-all border-b-2 cursor-pointer ${
                activeTab === "appointments"
                  ? "border-[#1E3F20] text-[#1E3F20] bg-[#1E3F20]/5"
                  : "border-transparent text-[#0D0B09]/60 hover:text-[#0D0B09]"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Booked OPD Appointments ({appointmentRecords.length})</span>
            </button>

            <button
              id="tabChatsBtn"
              onClick={() => setActiveTab("chats")}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-t-xl transition-all border-b-2 cursor-pointer ${
                activeTab === "chats"
                  ? "border-[#1E3F20] text-[#1E3F20] bg-[#1E3F20]/5"
                  : "border-transparent text-[#0D0B09]/60 hover:text-[#0D0B09]"
              }`}
            >
              <MessageSquareText className="h-4 w-4" />
              <span>AI Chat Transcripts ({conversations.length})</span>
            </button>

            <button
              id="tabMedicationsBtn"
              onClick={() => setActiveTab("medications")}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-t-xl transition-all border-b-2 cursor-pointer ${
                activeTab === "medications"
                  ? "border-[#1E3F20] text-[#1E3F20] bg-[#1E3F20]/5"
                  : "border-transparent text-[#0D0B09]/60 hover:text-[#0D0B09]"
              }`}
            >
              <Pill className="h-4 w-4" />
              <span>Medications & Conditions ({medications.length})</span>
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* TAB 1: RISK REPORTS */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {historyRecords.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Activity className="h-12 w-12 text-[#0D0B09]/40 mx-auto animate-pulse" />
                    <p className="text-[#0D0B09]/70 text-sm font-medium">No past risk evaluations recorded yet.</p>
                    <p className="text-xs text-[#0D0B09]/50">Run a clinical assessment on the portal to automatically save your biometrics here.</p>
                  </div>
                ) : (
                  historyRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-5 rounded-2xl bg-[#EED4AC]/30 border border-[#EED4AC] hover:border-[#0D0B09]/20 transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              rec.riskTier === "low"
                                ? "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20"
                                : rec.riskTier === "moderate"
                                ? "bg-amber-500/10 text-amber-800 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-800 border border-rose-500/20"
                            }`}
                          >
                            {rec.riskTier} Risk ({Math.round(rec.riskScore * 100)}%)
                          </span>
                          <span className="text-xs text-[#0D0B09]/60 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-[#0D0B09]/50" />
                            {new Date(rec.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {onSelectRecordToReRun && (
                          <Button
                            onClick={() => { onSelectRecordToReRun(rec); onClose(); }}
                            variant="outline"
                            className="h-8 border-[#1E3F20]/30 text-[#1E3F20] hover:bg-[#1E3F20]/10 text-xs rounded-xl px-3 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Re-Test Parameters</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">Age / City</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5">{rec.age} yrs • {rec.city}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">Blood Pressure</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5">{rec.bp} mmHg</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">Fasting Glucose</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5">{rec.glucose} mg/dL</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">Cholesterol</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5">{rec.cholesterol} mg/dL</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">BMI Index</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5">{rec.bmi}</p>
                        </div>
                      </div>

                      {rec.symptomsText && (
                        <p className="text-xs text-[#0D0B09]/80 italic bg-[#F4EBDD]/50 p-2.5 rounded-xl border border-[#0D0B09]/10">
                          &quot;{rec.symptomsText}&quot;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: APPOINTMENTS */}
            {activeTab === "appointments" && (
              <div className="space-y-4">
                {appointmentRecords.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Calendar className="h-12 w-12 text-[#0D0B09]/40 mx-auto animate-pulse" />
                    <p className="text-[#0D0B09]/70 text-sm font-medium">No hospital appointments reserved yet.</p>
                    <p className="text-xs text-[#0D0B09]/50">Select any hospital in the AP Hospital Network section to book an OPD consultation.</p>
                  </div>
                ) : (
                  appointmentRecords.map((apt) => (
                    <div
                      key={apt.appointmentId}
                      className="p-5 rounded-2xl bg-[#EED4AC]/30 border border-[#EED4AC] hover:border-[#0D0B09]/20 transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#0D0B09]">{apt.hospitalName}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {apt.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#0D0B09]/70 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#1E3F20]" />
                            {apt.hospitalAddress}, {apt.hospitalCity}
                          </p>
                        </div>

                        <span className="text-xs font-mono font-bold text-[#1E3F20] bg-[#1E3F20]/10 px-3 py-1.5 rounded-xl border border-[#1E3F20]/20">
                          ID: {apt.appointmentId}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">Assigned Specialist</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5 flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5 text-[#1E3F20]" /> {apt.doctor}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">Scheduled Date & Slot</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5">{apt.date} • {apt.timeSlot}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10">
                          <p className="text-[10px] text-[#0D0B09]/60 font-medium">Patient Details</p>
                          <p className="font-bold text-[#0D0B09] mt-0.5">{apt.patientName} ({apt.patientAge} yrs)</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-[#0D0B09]/70 italic">Chief Complaint: {apt.symptoms}</p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.hospitalName + " " + apt.hospitalAddress + " " + apt.hospitalCity)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E3F20]/10 border border-[#1E3F20]/20 text-[#1E3F20] hover:bg-[#1E3F20]/20 text-xs font-semibold transition-all"
                        >
                          <Navigation className="h-3.5 w-3.5 text-[#1E3F20]" />
                          <span>Google Maps Directions</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: AI CHAT CONVERSATIONS */}
            {activeTab === "chats" && (
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <MessageSquareText className="h-12 w-12 text-[#0D0B09]/40 mx-auto animate-pulse" />
                    <p className="text-[#0D0B09]/70 text-sm font-medium">No saved AI chat transcripts.</p>
                    <p className="text-xs text-[#0D0B09]/50">Ask the HealthPredict AI floating assistant any medical query to store transcripts here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 bg-[#EED4AC]/30 p-4 rounded-2xl border border-[#EED4AC]">
                    {conversations.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                          c.sender === "user"
                            ? "bg-[#1E3F20]/10 border border-[#1E3F20]/20 text-[#1E3F20] ml-8"
                            : "bg-[#F4EBDD] border border-[#0D0B09]/10 text-[#0D0B09]/80 mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-75 font-semibold">
                          <span>{c.sender === "user" ? "You" : "HealthPredict AI Assistant"}</span>
                          <span>{c.timestamp}</span>
                        </div>
                        <p className="leading-relaxed text-[#0D0B09] font-medium">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MEDICATIONS & CONDITIONS */}
            {activeTab === "medications" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#EED4AC]/30 border border-[#EED4AC] space-y-3">
                  <h3 className="text-sm font-bold text-[#0D0B09] flex items-center gap-2 border-b border-[#0D0B09]/10 pb-2">
                    <Pill className="h-4 w-4 text-[#1E3F20]" /> Active Medications & Prescriptions
                  </h3>
                  {medications.length === 0 ? (
                    <p className="text-xs text-[#0D0B09]/60 py-4">No active prescriptions logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {medications.map((med, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10 flex items-center justify-between text-xs font-semibold text-[#0D0B09]/85">
                          <span>{med}</span>
                          <span className="text-[10px] text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Active</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-[#EED4AC]/30 border border-[#EED4AC] space-y-3">
                  <h3 className="text-sm font-bold text-[#0D0B09] flex items-center gap-2 border-b border-[#0D0B09]/10 pb-2">
                    <ShieldCheck className="h-4 w-4 text-amber-700" /> Monitored Clinical Conditions
                  </h3>
                  {healthConditions.length === 0 ? (
                    <p className="text-xs text-[#0D0B09]/60 py-4">No chronic conditions recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {healthConditions.map((cond, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#F4EBDD] border border-[#0D0B09]/10 flex items-center justify-between text-xs font-semibold text-[#0D0B09]/85">
                          <span>{cond}</span>
                          <span className="text-[10px] text-amber-800 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Monitored</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 border-t border-[#0D0B09]/10 bg-[#EED4AC] flex items-center justify-between">
            <span className="text-xs text-[#0D0B09]/60">HealthPredict AI Clinical Data Security Standard</span>
            {onClearHistory && (historyRecords.length > 0 || appointmentRecords.length > 0) && (
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-700 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Local Data</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
  );
}
