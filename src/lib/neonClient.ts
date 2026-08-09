import { neon } from "@neondatabase/serverless";
import { AuthUser } from "@/components/AuthModal";
import { RiskAssessmentRecord, SavedAppointmentRecord } from "@/components/ClinicalHistoryModal";
import { getUserDatabase, saveUserDatabase, ChatRecord } from "@/lib/userDatabase";

// Neon Postgres Connection Connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_NEON_DATABASE_URL;

function buildStableUserId(provider: "google" | "email", email: string): string {
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return `${provider}_${Math.abs(hash).toString(36)}`;
}

export function getNeonSql() {
  if (!DATABASE_URL) return null;
  try {
    return neon(DATABASE_URL);
  } catch (e) {
    console.warn("Neon SQL init warning (will use local fallback engine):", e);
    return null;
  }
}

// 1. Neon Managed Google Authentication Client
export async function neonSignInWithGoogle(googleEmailInput?: string): Promise<AuthUser> {
  const sql = getNeonSql();
  const normalizedGoogleEmail = (googleEmailInput || "").trim().toLowerCase();
  if (!normalizedGoogleEmail) {
    throw new Error("A Google email is required for sign-in.");
  }

  const nameFromEmail = normalizedGoogleEmail.split("@")[0].replace(/[._-]+/g, " ");
  const displayName = nameFromEmail
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const googleUser: AuthUser = {
    uid: buildStableUserId("google", normalizedGoogleEmail),
    name: displayName || "Google User",
    email: normalizedGoogleEmail,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || normalizedGoogleEmail)}&background=4285F4&color=fff`,
    provider: "google",
    createdAt: new Date().toISOString()
  };

  if (sql) {
    try {
      // Upsert Neon User into neon_users table
      await sql`
        INSERT INTO neon_users (id, email, name, avatar_url, provider)
        VALUES (${googleUser.uid}, ${googleUser.email}, ${googleUser.name}, ${googleUser.avatarUrl}, ${googleUser.provider})
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url;
      `;
    } catch (e) {
      console.error("Neon Postgres Google Auth sync error:", e);
    }
  }

  // Ensure local session persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("hp_user_session", JSON.stringify(googleUser));
    localStorage.setItem("healthPredictUser", JSON.stringify(googleUser));
  }

  return googleUser;
}

// 2. Neon Managed Email/Password Authentication Client
export async function neonSignInWithEmail(
  email: string,
  pass: string,
  fullName: string,
  mode: "signin" | "signup"
): Promise<AuthUser> {
  const sql = getNeonSql();
  const normalizedEmail = email.trim().toLowerCase();
  const userId = buildStableUserId("email", normalizedEmail);
  const userName = fullName || normalizedEmail.split("@")[0];
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`;

  const emailUser: AuthUser = {
    uid: userId,
    name: userName,
    email: normalizedEmail,
    avatarUrl: avatar,
    provider: "email",
    createdAt: new Date().toISOString()
  };

  if (sql) {
    try {
      await sql`
        INSERT INTO neon_users (id, email, name, avatar_url, provider)
        VALUES (${emailUser.uid}, ${emailUser.email}, ${emailUser.name}, ${emailUser.avatarUrl}, ${emailUser.provider})
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name;
      `;
    } catch (e) {
      console.error("Neon Postgres Email Auth sync error:", e);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("hp_user_session", JSON.stringify(emailUser));
    localStorage.setItem("healthPredictUser", JSON.stringify(emailUser));
  }

  return emailUser;
}

// 3. Fetch User History Records from Neon Postgres
export async function fetchNeonUserHistory(userId: string) {
  const sql = getNeonSql();
  if (sql) {
    try {
      const reports = await sql`
        SELECT id, created_at as timestamp, age, bmi, blood_pressure as bp, glucose, cholesterol, city, risk_tier as "riskTier", risk_score as "riskScore", symptoms as "symptomsText"
        FROM user_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC;
      `;
      const appointments = await sql`
        SELECT appointment_id as "appointmentId", hospital_name as "hospitalName", hospital_address as "hospitalAddress", hospital_city as "hospitalCity", patient_name as "patientName", patient_age as "patientAge", doctor, appointment_date as date, time_slot as "timeSlot", symptoms, status, created_at as timestamp
        FROM user_appointments
        WHERE user_id = ${userId}
        ORDER BY created_at DESC;
      `;
      const chats = await sql`
        SELECT id, user_query, ai_response, created_at as timestamp
        FROM ai_chat_transcripts
        WHERE user_id = ${userId}
        ORDER BY created_at ASC;
      `;
      const meds = await sql`
        SELECT name, dosage, frequency
        FROM user_medications
        WHERE user_id = ${userId}
        ORDER BY created_at ASC;
      `;
      const conditions = await sql`
        SELECT name, status
        FROM user_conditions
        WHERE user_id = ${userId}
        ORDER BY created_at ASC;
      `;

      const formattedConversations: ChatRecord[] = [];
      chats.forEach((row: any) => {
        const timeFormatted = new Date(row.timestamp).toLocaleString();
        formattedConversations.push({
          id: `u_${row.id}`,
          sender: "user",
          text: row.user_query,
          timestamp: timeFormatted
        });
        formattedConversations.push({
          id: `b_${row.id}`,
          sender: "bot",
          text: row.ai_response,
          timestamp: timeFormatted
        });
      });

      return {
        reports: reports as any as RiskAssessmentRecord[],
        appointments: appointments as any as SavedAppointmentRecord[],
        conversations: formattedConversations,
        medications: meds.map((m: any) => `${m.name} ${m.dosage} (${m.frequency})`.trim()),
        healthConditions: conditions.map((c: any) => c.name)
      };
    } catch (e) {
      console.error("Neon query error:", e);
    }
  }

  // Fallback to local storage database manager
  const localDb = getUserDatabase(userId);
  return {
    reports: localDb.reports,
    appointments: localDb.appointments,
    conversations: localDb.conversations,
    medications: localDb.medications,
    healthConditions: localDb.healthConditions
  };
}

// 4. Save Risk Assessment Report into Neon Postgres
export async function saveNeonRiskReport(userId: string, record: RiskAssessmentRecord) {
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO user_history (id, user_id, age, bmi, blood_pressure, glucose, cholesterol, city, risk_tier, risk_score, symptoms)
        VALUES (${record.id}, ${userId}, ${record.age}, ${record.bmi}, ${record.bp}, ${record.glucose}, ${record.cholesterol}, ${record.city}, ${record.riskTier}, ${record.riskScore}, ${record.symptomsText || null});
      `;
    } catch (e) {
      console.error("Neon insert risk report error:", e);
    }
  }

  // Also sync with local storage DB
  const localDb = getUserDatabase(userId);
  saveUserDatabase(userId, { reports: [record, ...localDb.reports] });
}

// 5. Save Hospital Appointment into Neon Postgres
export async function saveNeonAppointment(userId: string, apt: SavedAppointmentRecord) {
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO user_appointments (id, user_id, appointment_id, hospital_name, hospital_address, hospital_city, patient_name, patient_age, doctor, appointment_date, time_slot, symptoms, status)
        VALUES (${"apt_" + Date.now()}, ${userId}, ${apt.appointmentId}, ${apt.hospitalName}, ${apt.hospitalAddress}, ${apt.hospitalCity}, ${apt.patientName}, ${apt.patientAge}, ${apt.doctor}, ${apt.date}, ${apt.timeSlot}, ${apt.symptoms}, ${apt.status});
      `;
    } catch (e) {
      console.error("Neon insert appointment error:", e);
    }
  }

  const localDb = getUserDatabase(userId);
  saveUserDatabase(userId, { appointments: [apt, ...localDb.appointments] });
}

// 6. Save AI Chat Transcript into Neon Postgres
export async function saveNeonChatTranscript(userId: string, userQuery: string, aiResponse: string) {
  const sql = getNeonSql();
  const transcriptId = `chat_${Date.now()}`;
  if (sql) {
    try {
      await sql`
        INSERT INTO ai_chat_transcripts (id, user_id, user_query, ai_response)
        VALUES (${transcriptId}, ${userId}, ${userQuery}, ${aiResponse});
      `;
    } catch (e) {
      console.error("Neon save chat transcript error:", e);
    }
  }

  // Also sync with local storage DB
  const localDb = getUserDatabase(userId);
  const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const updatedConvs = [
    ...localDb.conversations,
    { id: `u_${transcriptId}`, sender: "user" as const, text: userQuery, timestamp: timeFormatted },
    { id: `b_${transcriptId}`, sender: "bot" as const, text: aiResponse, timestamp: timeFormatted }
  ];
  saveUserDatabase(userId, { conversations: updatedConvs });
}
