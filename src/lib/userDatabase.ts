import { RiskAssessmentRecord, SavedAppointmentRecord } from "@/components/ClinicalHistoryModal";

export interface ChatRecord {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

export interface UserFullDatabaseRecord {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  provider: "google" | "email";
  createdAt: string;
  reports: RiskAssessmentRecord[];
  appointments: SavedAppointmentRecord[];
  conversations: ChatRecord[];
  medications: string[];
  healthConditions: string[];
}

// Sample pre-existing historical data for returning Google User (Dr. Ramesh Kumar)
const DEMO_GOOGLE_USER_DB: UserFullDatabaseRecord = {
  uid: "g_user_ramesh_kumar_2026",
  name: "Dr. Ramesh Kumar",
  email: "ramesh.kumar@gmail.com",
  avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=120&q=80",
  provider: "google",
  createdAt: "2026-01-15T10:30:00.000Z",
  reports: [
    {
      id: "rec_20260205_101",
      timestamp: "2026-02-05T14:20:00.000Z",
      age: 58,
      bmi: 28.4,
      bp: "138/88",
      glucose: 142,
      cholesterol: 215,
      city: "Vijayawada",
      riskTier: "moderate",
      riskScore: 0.64,
      symptomsText: "Experiencing mild morning fatigue and elevated fasting glucose for 2 weeks."
    },
    {
      id: "rec_20260120_088",
      timestamp: "2026-01-20T09:15:00.000Z",
      age: 58,
      bmi: 27.9,
      bp: "132/84",
      glucose: 128,
      cholesterol: 205,
      city: "Vijayawada",
      riskTier: "low",
      riskScore: 0.28,
      symptomsText: "Routine quarterly wellness check and blood pressure tracking."
    }
  ],
  appointments: [
    {
      appointmentId: "AP-2026-8842",
      hospitalName: "Manipal Hospital (Vijayawada)",
      hospitalAddress: "Tadepalli, Near Varadhi Bridge",
      hospitalCity: "Vijayawada",
      patientName: "Dr. Ramesh Kumar",
      patientAge: 58,
      doctor: "Dr. G. Prasad (Cardiology)",
      date: "2026-02-12",
      timeSlot: "10:30 AM - 11:00 AM",
      symptoms: "Cardiovascular risk consultation & Lipid review",
      status: "Confirmed & Sent to Hospital Dispatch",
      timestamp: "2026-02-05T14:25:00.000Z"
    },
    {
      appointmentId: "AP-2026-3190",
      hospitalName: "Apollo Hospitals (Visakhapatnam)",
      hospitalAddress: "Health City, Arilova",
      hospitalCity: "Visakhapatnam",
      patientName: "Dr. Ramesh Kumar",
      patientAge: 58,
      doctor: "Dr. S. K. Rao (Endocrinology)",
      date: "2026-01-25",
      timeSlot: "11:00 AM - 11:30 AM",
      symptoms: "Fasting glucose management & Dietary regimen",
      status: "Completed Consultation",
      timestamp: "2026-01-20T09:30:00.000Z"
    }
  ],
  conversations: [
    {
      id: "chat_001",
      sender: "user",
      text: "What is the normal blood pressure limit for adults?",
      timestamp: "2026-02-05 14:10"
    },
    {
      id: "chat_002",
      sender: "bot",
      text: "Normal blood pressure is typically below 120/80 mmHg. Elevated BP is 120-129/<80, and Hypertension Stage 1 begins at 130/80 mmHg. For your profile (138/88), lifestyle changes and clinical review are recommended.",
      timestamp: "2026-02-05 14:10"
    },
    {
      id: "chat_003",
      sender: "user",
      text: "Can I take Metformin before breakfast?",
      timestamp: "2026-02-05 14:12"
    },
    {
      id: "chat_004",
      sender: "bot",
      text: "Metformin is usually taken with meals (e.g. with breakfast or dinner) to reduce gastrointestinal upset. Always follow your prescribing physician's exact timing.",
      timestamp: "2026-02-05 14:12"
    }
  ],
  medications: ["Metformin 500mg", "Amlodipine 5mg", "Atorvastatin 10mg"],
  healthConditions: ["Borderline Hypertension", "Impaired Fasting Glucose", "Mild Hyperlipidemia"]
};

// Database storage helper
export function getUserDatabase(uid: string): UserFullDatabaseRecord {
  if (typeof window === "undefined") return DEMO_GOOGLE_USER_DB;

  const key = `hp_db_user_${uid}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Database parse error:", e);
    }
  }

  // If returning demo Google user
  if (uid === DEMO_GOOGLE_USER_DB.uid || uid.startsWith("g_user_")) {
    const defaultRecord = { ...DEMO_GOOGLE_USER_DB, uid };
    localStorage.setItem(key, JSON.stringify(defaultRecord));
    return defaultRecord;
  }

  // Fresh user record
  const freshRecord: UserFullDatabaseRecord = {
    uid,
    name: "Patient",
    email: "",
    avatarUrl: "",
    provider: "email",
    createdAt: new Date().toISOString(),
    reports: [],
    appointments: [],
    conversations: [],
    medications: [],
    healthConditions: []
  };

  localStorage.setItem(key, JSON.stringify(freshRecord));
  return freshRecord;
}

export function saveUserDatabase(uid: string, data: Partial<UserFullDatabaseRecord>): UserFullDatabaseRecord {
  const current = getUserDatabase(uid);
  const updated: UserFullDatabaseRecord = {
    ...current,
    ...data
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(`hp_db_user_${uid}`, JSON.stringify(updated));
  }
  return updated;
}
