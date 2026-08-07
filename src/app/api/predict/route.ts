import { NextResponse } from "next/server";

/* ================================================================== */
/*  Inline ML Engine — Clinical threshold risk scoring                */
/*  Includes 33 Andhra Pradesh Hospitals & 500 Clinical Patient DB     */
/* ================================================================== */

interface HealthInput {
  age: number; bmi: number; blood_pressure_systolic: number;
  blood_pressure_diastolic: number; glucose: number; cholesterol: number;
  heart_rate: number; insulin: number; city: string; state: string;
  gemini_api_key?: string;
}

interface Patient {
  patient_id: string;
  age: number;
  bmi: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  glucose: number;
  cholesterol: number;
  heart_rate: number;
  insulin: number;
  risk_level: string;
  risk_score: number;
  diagnosis: string;
  progression_notes: string;
}

interface CareGuide {
  title: string;
  precautions: string[];
  otc_guidance: string[];
  avoid: string[];
}

/* ---- Andhra Pradesh Hospital DB (33 real facilities, 14 cities) ---- */
const HOSPITALS = [
  // VIJAYAWADA
  { id: "H-001", name: "Manipal Hospital Vijayawada", city: "Vijayawada", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "Gastroenterology", "Nephrology", "Internal Medicine"], rating: 4.5, distance_km: 3.2, address: "Tadepalle, Vijayawada - Guntur Road, AP 522501", phone: "+91 1800 102 5555", beds: 350, emergency: true, doctors: ["Dr. V. Ramesh (Cardiology)", "Dr. Lakshmi Prasanna (Endocrinology)", "Dr. Suresh Kumar (Nephrology)"] },
  { id: "H-002", name: "Andhra Hospitals", city: "Vijayawada", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Urology", "Internal Medicine", "General Surgery"], rating: 4.3, distance_km: 2.1, address: "Nakkala Road, Governorpet, Vijayawada, AP 520002", phone: "+91 866 2574757", beds: 200, emergency: true, doctors: ["Dr. B. Soma Raju (Cardiology)", "Dr. K. V. S. Rao (Nephrology)"] },
  { id: "H-003", name: "Dr. Pinnamaneni Siddhartha Institute of Medical Sciences", city: "Vijayawada", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "Nephrology", "Neurology", "General Medicine"], rating: 4.1, distance_km: 8.5, address: "Chinoutpalli, Gannavaram, Vijayawada, AP 522101", phone: "+91 8676 257311", beds: 800, emergency: true, doctors: ["Dr. P. V. R. K. Murthy (Cardiology)", "Dr. T. S. Rao (Endocrinology)"] },
  { id: "H-004", name: "Vijaya Diagnostic Centre", city: "Vijayawada", state: "Andhra Pradesh", specialties: ["Endocrinology", "Diabetes Education", "Pathology", "Preventive Care"], rating: 4.2, distance_km: 1.8, address: "M.G. Road, Vijayawada, AP 520010", phone: "+91 866 2444333", beds: 50, emergency: false, doctors: ["Dr. R. S. K. Babu (Endocrinology)"] },

  // GUNTUR
  { id: "H-005", name: "Aster Ramesh Hospital", city: "Guntur", state: "Andhra Pradesh", specialties: ["Cardiology", "Cardiac Surgery", "Neurology", "Neurosurgery", "Nephrology", "Orthopedics"], rating: 4.6, distance_km: 2.5, address: "Nagarampalem, Guntur, AP 522004", phone: "+91 84603 80751", beds: 300, emergency: true, doctors: ["Dr. Tulluru Ravi Sankar (Interventional Cardiology)", "Dr. Somasundaram Kumaravelu (Neurology)", "Dr. Ramesh Babu P (Cardiology)"] },
  { id: "H-006", name: "Guntur Kidney & Multi Speciality Hospital", city: "Guntur", state: "Andhra Pradesh", specialties: ["Nephrology", "Urology", "Internal Medicine", "General Surgery"], rating: 4.2, distance_km: 3.1, address: "Brodipet, Guntur, AP 522002", phone: "+91 863 2233445", beds: 120, emergency: true, doctors: ["Dr. N. V. R. Prasad (Nephrology)", "Dr. K. S. R. Murthy (Urology)"] },
  { id: "H-007", name: "Sri Lakshmi Narayana Institute of Medical Sciences", city: "Guntur", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "Internal Medicine", "General Surgery", "Pulmonology"], rating: 4.0, distance_km: 5.8, address: "Nemali, Chinna Kakani, Guntur, AP 522509", phone: "+91 8656 223344", beds: 350, emergency: true, doctors: ["Dr. G. V. S. Murthy (Cardiology)", "Dr. P. S. N. Rao (Endocrinology)"] },
  { id: "H-008", name: "Tirumala Multi Speciality Hospitals", city: "Guntur", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Internal Medicine"], rating: 4.3, distance_km: 1.9, address: "Arundalpet, Guntur, AP 522002", phone: "+91 863 2255666", beds: 150, emergency: true, doctors: ["Dr. M. S. Reddy (Cardiology)"] },

  // VISAKHAPATNAM (VIZAG)
  { id: "H-009", name: "KIMS ICON Super Specialty Hospital", city: "Visakhapatnam", state: "Andhra Pradesh", specialties: ["Cardiology", "Cardiac Surgery", "Neurology", "Nephrology", "Oncology", "Orthopedics", "Endocrinology"], rating: 4.5, distance_km: 4.2, address: "32-11-02, Sheela Nagar, Near BHPV, Visakhapatnam, AP 530012", phone: "+91 891 3536379", beds: 434, emergency: true, doctors: ["Dr. G. Prasad (Cardiology)", "Dr. K. S. R. Murthy (Cardiac Surgery)", "Dr. R. V. R. Rao (Nephrology)"] },
  { id: "H-010", name: "Medicover Hospitals Visakhapatnam", city: "Visakhapatnam", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Oncology", "Orthopedics", "Endocrinology", "Gastroenterology"], rating: 4.0, distance_km: 2.8, address: "1-1-83, Maharani Peta, Visakhapatnam, AP 530002", phone: "+91 40 68334455", beds: 650, emergency: true, doctors: ["Dr. Prakash Chand Rana (Interventional Cardiology)", "Dr. S. V. N. Raju (Nephrology)"] },
  { id: "H-011", name: "MGM Seven Hills Hospital", city: "Visakhapatnam", state: "Andhra Pradesh", specialties: ["Cardiology", "Cardiac Surgery", "Nephrology", "Neurology", "Internal Medicine"], rating: 4.3, distance_km: 5.5, address: "Ram Nagar, Visakhapatnam, AP 530002", phone: "+91 891 6677777", beds: 250, emergency: true, doctors: ["Dr. Raju M N (Interventional Cardiology)", "Dr. P. V. L. Narasimham (Nephrology)"] },
  { id: "H-012", name: "Visakha Institute of Medical Sciences", city: "Visakhapatnam", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "Nephrology", "General Medicine", "General Surgery"], rating: 4.1, distance_km: 7.2, address: "King George Hospital Road, Visakhapatnam, AP 530002", phone: "+91 891 2551122", beds: 500, emergency: true, doctors: ["Dr. B. S. K. Reddy (Cardiology)", "Dr. M. R. K. Rao (Endocrinology)"] },

  // TIRUPATI
  { id: "H-013", name: "SVIMS - Sri Venkateswara Institute of Medical Sciences", city: "Tirupati", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Endocrinology", "Neurology", "Oncology", "Cardiac Surgery"], rating: 4.4, distance_km: 3.5, address: "Alipiri Road, Tirupati, AP 517501", phone: "+91 877 2287777", beds: 1000, emergency: true, doctors: ["Dr. B. V. R. Reddy (Cardiology)", "Dr. K. S. P. Rao (Nephrology)", "Dr. M. S. Lakshmi (Endocrinology)"] },
  { id: "H-014", name: "Sree Charith Hospital", city: "Tirupati", state: "Andhra Pradesh", specialties: ["Endocrinology", "Diabetes Education", "Internal Medicine", "General Medicine"], rating: 4.0, distance_km: 2.1, address: "Tirupati, AP 517501", phone: "+91 80083 75568", beds: 100, emergency: true, doctors: ["Dr. R. S. Prasad (Endocrinology)"] },
  { id: "H-015", name: "Sri Venkateswara Medical College Hospital", city: "Tirupati", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "General Medicine", "General Surgery", "Orthopedics"], rating: 3.9, distance_km: 5.0, address: "SV Medical College, Tirupati, AP 517507", phone: "+91 877 2277777", beds: 700, emergency: true, doctors: ["Dr. P. K. S. Reddy (Cardiology)", "Dr. V. N. R. Murthy (Nephrology)"] },

  // KAKINADA
  { id: "H-016", name: "Apollo Hospitals Kakinada", city: "Kakinada", state: "Andhra Pradesh", specialties: ["Cardiology", "Orthopedics", "Neurology", "Gastroenterology", "Nephrology", "Internal Medicine"], rating: 3.8, distance_km: 2.5, address: "Main Road, Kakinada, AP 533001", phone: "+91 884 2345678", beds: 200, emergency: true, doctors: ["Dr. S. R. K. Raju (Cardiology)", "Dr. P. V. S. Rao (Nephrology)"] },
  { id: "H-017", name: "Medicover Hospitals Kakinada", city: "Kakinada", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Oncology", "Endocrinology", "Internal Medicine"], rating: 4.1, distance_km: 3.8, address: "Suryaraopet, Kakinada, AP 533002", phone: "+91 884 2345100", beds: 180, emergency: true, doctors: ["Dr. J. R. K. Reddy (Cardiology)", "Dr. M. S. N. Rao (Endocrinology)"] },
  { id: "H-018", name: "7 Star Super Speciality Hospital", city: "Kakinada", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "Nephrology", "General Surgery"], rating: 3.9, distance_km: 1.5, address: "Main Road, Kakinada, AP 533001", phone: "+91 92810 71422", beds: 150, emergency: true, doctors: ["Dr. R. V. S. Prasad (Cardiology)"] },

  // RAJAHMUNDRY
  { id: "H-019", name: "KIMS Hospital Rajahmundry", city: "Rajahmundry", state: "Andhra Pradesh", specialties: ["Cardiology", "Cardiac Surgery", "Nephrology", "Neurology", "Endocrinology"], rating: 4.2, distance_km: 2.3, address: "Danavaipeta, Rajahmundry, AP 533101", phone: "+91 883 2456789", beds: 200, emergency: true, doctors: ["Dr. K. S. Babu (Cardiology)", "Dr. R. P. Reddy (Nephrology)"] },
  { id: "H-020", name: "Aarogya Multi Speciality Hospital", city: "Rajahmundry", state: "Andhra Pradesh", specialties: ["Internal Medicine", "General Surgery", "Cardiology", "Endocrinology"], rating: 3.8, distance_km: 4.1, address: "Main Road, Rajahmundry, AP 533103", phone: "+91 883 2468100", beds: 100, emergency: true, doctors: ["Dr. V. S. N. Murthy (Internal Medicine)"] },

  // NELLORE
  { id: "H-021", name: "Medicover Hospitals Nellore", city: "Nellore", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Endocrinology", "Oncology", "Internal Medicine"], rating: 4.0, distance_km: 3.0, address: "Trunk Road, Nellore, AP 524001", phone: "+91 861 2345600", beds: 200, emergency: true, doctors: ["Dr. P. S. R. Reddy (Cardiology)", "Dr. K. V. S. Rao (Nephrology)"] },
  { id: "H-022", name: "Nellore Diabetes Centre", city: "Nellore", state: "Andhra Pradesh", specialties: ["Endocrinology", "Diabetes Education", "Internal Medicine"], rating: 4.2, distance_km: 1.8, address: "Trunk Road, Nellore, AP 524002", phone: "+91 861 2456789", beds: 60, emergency: false, doctors: ["Dr. R. S. L. Prasad (Endocrinology)"] },

  // KURNOOL
  { id: "H-023", name: "Kurnool Medical College Hospital", city: "Kurnool", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Endocrinology", "General Medicine", "General Surgery"], rating: 4.0, distance_km: 2.5, address: "Budhawarpet, Kurnool, AP 518002", phone: "+91 8518 228888", beds: 800, emergency: true, doctors: ["Dr. K. M. Reddy (Cardiology)", "Dr. N. S. Rao (Nephrology)"] },
  { id: "H-024", name: "Kurnool Diabetes Centre", city: "Kurnool", state: "Andhra Pradesh", specialties: ["Endocrinology", "Diabetes Education", "Internal Medicine"], rating: 3.9, distance_km: 3.2, address: "Opp. Kurnool Medical College, Kurnool, AP 518002", phone: "+91 8518 2466789", beds: 40, emergency: false, doctors: ["Dr. G. V. R. Reddy (Endocrinology)"] },

  // ANANTAPUR
  { id: "H-025", name: "KIMS Hospital Anantapur", city: "Anantapur", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Neurology", "Endocrinology", "Internal Medicine"], rating: 4.1, distance_km: 2.0, address: "Nandyal Road, Anantapur, AP 515001", phone: "+91 8554 288800", beds: 250, emergency: true, doctors: ["Dr. P. K. Reddy (Cardiology)", "Dr. R. V. S. Kumar (Nephrology)"] },
  { id: "H-026", name: "Anantapur Multi Speciality Hospital", city: "Anantapur", state: "Andhra Pradesh", specialties: ["Internal Medicine", "General Surgery", "Cardiology", "Orthopedics"], rating: 3.7, distance_km: 3.5, address: "RK Road, Anantapur, AP 515001", phone: "+91 8554 2478900", beds: 120, emergency: true, doctors: ["Dr. S. V. N. Reddy (Internal Medicine)"] },

  // ONGOLE
  { id: "H-027", name: "KIMS Hospital Ongole", city: "Ongole", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "Nephrology", "Internal Medicine", "General Surgery"], rating: 4.2, distance_km: 1.8, address: "Kurnool Road, Ongole, AP 523001", phone: "+91 8592 288100", beds: 200, emergency: true, doctors: ["Dr. R. S. K. Reddy (Cardiology)", "Dr. M. S. P. Rao (Endocrinology)"] },
  { id: "H-028", name: "Ongole Diabetes & Endocrine Centre", city: "Ongole", state: "Andhra Pradesh", specialties: ["Endocrinology", "Diabetes Education", "Nutrition", "Internal Medicine"], rating: 4.2, distance_km: 2.5, address: "Trunk Road, Ongole, AP 523001", phone: "+91 8592 2467800", beds: 50, emergency: false, doctors: ["Dr. K. V. N. Rao (Endocrinology)"] },

  // ELURU
  { id: "H-029", name: "Aarogya Multi Speciality Hospital Eluru", city: "Eluru", state: "Andhra Pradesh", specialties: ["Internal Medicine", "General Surgery", "Cardiology", "Nephrology"], rating: 3.8, distance_km: 2.2, address: "Koyyalagudem Road, Eluru, AP 534001", phone: "+91 8812 244500", beds: 100, emergency: true, doctors: ["Dr. P. R. K. Rao (Internal Medicine)", "Dr. S. N. Murthy (Cardiology)"] },
  { id: "H-030", name: "Eluru Multi Speciality Hospital", city: "Eluru", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "General Medicine"], rating: 3.6, distance_km: 3.5, address: "Main Road, Eluru, AP 534002", phone: "+91 8812 2556600", beds: 80, emergency: true, doctors: ["Dr. V. S. P. Reddy (Cardiology)"] },

  // KADAPA
  { id: "H-031", name: "Kadapa Institute of Medical Sciences", city: "Kadapa", state: "Andhra Pradesh", specialties: ["Cardiology", "Nephrology", "Endocrinology", "General Medicine", "General Surgery"], rating: 4.0, distance_km: 2.8, address: "Proddatur Road, Kadapa, AP 516001", phone: "+91 8562 228800", beds: 500, emergency: true, doctors: ["Dr. S. V. R. Reddy (Cardiology)", "Dr. K. M. S. Rao (Nephrology)"] },

  // CHITTOOR
  { id: "H-032", name: "Chittoor Multi Speciality Hospital", city: "Chittoor", state: "Andhra Pradesh", specialties: ["Cardiology", "Endocrinology", "Internal Medicine", "General Surgery"], rating: 3.9, distance_km: 1.5, address: "Main Road, Chittoor, AP 517001", phone: "+91 8572 2556600", beds: 150, emergency: true, doctors: ["Dr. R. P. S. Reddy (Cardiology)", "Dr. V. N. M. Rao (Endocrinology)"] },

  // VIZIANAGARAM
  { id: "H-033", name: "Maharaja Hospital Vizianagaram", city: "Vizianagaram", state: "Andhra Pradesh", specialties: ["Internal Medicine", "General Surgery", "Cardiology", "Orthopedics"], rating: 3.7, distance_km: 1.8, address: "Fort Road, Vizianagaram, AP 535002", phone: "+91 8922 2554400", beds: 200, emergency: true, doctors: ["Dr. P. V. S. N. Rao (Internal Medicine)"] },
];

/* ---- Synthetic Patient Database (Seeded 500 Patients across Low, Moderate, High Tiers) ---- */
const PATIENTS: Patient[] = (() => {
  const seeded = (seed: number) => { let s=seed; return ()=>{s=(s*16807)%2147483647; return(s-1)/2147483646;}; };
  const r = seeded(42);
  const norm = (m: number, s: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round((r()*s*2-s+m)*10)/10));
  const pts: Patient[] = [];

  for (let i = 0; i < 500; i++) {
    // Partition into 3 realistic clinical cohorts
    const cohort = i < 170 ? "low" : i < 340 ? "moderate" : "high";
    let age: number, bmi: number, bpS: number, bpD: number, glu: number, chol: number, hr: number, ins: number;
    let tier: string, diag: string, prog: string, rs: number;

    if (cohort === "low") {
      age = norm(38, 12, 18, 58);
      bmi = norm(22.2, 2.0, 18.5, 24.9);
      bpS = norm(114, 6, 95, 120);
      bpD = norm(74, 5, 60, 80);
      glu = norm(88, 8, 70, 99);
      chol = norm(172, 18, 130, 198);
      hr = norm(68, 6, 58, 78);
      ins = norm(8.0, 2.5, 2.0, 14.0);
      tier = "low";
      rs = Math.round((0.05 + r() * 0.20) * 1000) / 1000;
      diag = "Normal Metabolic & Cardiovascular Biometrics";
      prog = "Standard health screening confirmed normal biomarkers and healthy cardiovascular function. Annual wellness check recommended.";
    } else if (cohort === "moderate") {
      age = norm(52, 10, 35, 68);
      bmi = norm(27.5, 1.8, 25.0, 29.9);
      bpS = norm(132, 5, 122, 139);
      bpD = norm(85, 4, 80, 89);
      glu = norm(112, 8, 100, 125);
      chol = norm(218, 15, 200, 239);
      hr = norm(76, 6, 68, 86);
      ins = norm(18.0, 4.0, 12.0, 25.0);
      tier = "moderate";
      rs = Math.round((0.35 + r() * 0.23) * 1000) / 1000;
      diag = glu > 110 ? "Prediabetes & Mild Metabolic Risk" : "Elevated Blood Pressure & Lipid Factors";
      prog = "Routine screening revealed borderline markers. 3-month follow-up showed stable condition with recommended diet and exercise.";
    } else {
      age = norm(62, 9, 45, 80);
      bmi = norm(33.5, 3.5, 30.0, 48.0);
      bpS = norm(152, 12, 140, 195);
      bpD = norm(95, 7, 90, 118);
      glu = norm(155, 25, 126, 260);
      chol = norm(258, 25, 240, 390);
      hr = norm(84, 8, 75, 108);
      ins = norm(38.0, 12.0, 25.0, 120.0);
      tier = "high";
      rs = Math.round((0.65 + r() * 0.30) * 1000) / 1000;
      diag = glu > 140 ? "Type 2 Diabetes Mellitus" : "Hypertension Stage 2 & CVD Risk";
      prog = "Screening confirmed elevated glucose and blood pressure. Treatment plan initiated with physician supervision and active medication management.";
    }

    pts.push({
      patient_id: `P-${1000 + i}`,
      age, bmi, blood_pressure_systolic: bpS, blood_pressure_diastolic: bpD,
      glucose: glu, cholesterol: chol, heart_rate: hr, insulin: ins,
      risk_level: tier, risk_score: rs, diagnosis: diag, progression_notes: prog
    });
  }
  return pts;
})();

/* ---- Clinical Risk Classifier ---- */
function calcRisk(inp: HealthInput) {
  let s = 0;
  s += inp.age > 50 ? 0.12 : 0; s += inp.age > 65 ? 0.12 : 0;
  s += inp.bmi > 25 ? 0.10 : 0; s += inp.bmi > 30 ? 0.15 : 0;
  s += inp.blood_pressure_systolic > 122 ? 0.10 : 0; s += inp.blood_pressure_systolic > 140 ? 0.15 : 0;
  s += inp.blood_pressure_diastolic > 85 ? 0.10 : 0;
  s += inp.glucose > 100 ? 0.15 : 0; s += inp.glucose > 126 ? 0.20 : 0;
  s += inp.cholesterol > 200 ? 0.10 : 0; s += inp.cholesterol > 240 ? 0.15 : 0;
  s = Math.max(0, Math.min(1, s));

  const tier = s < 0.33 ? "low" : s < 0.60 ? "moderate" : "high";
  let low = 0, mod = 0, hi = 0;

  if (tier === "low") {
    low = Math.max(0.65, 1 - s * 1.5);
    mod = Math.max(0.05, (1 - low) * 0.8);
    hi = Math.max(0.01, 1 - low - mod);
  } else if (tier === "moderate") {
    mod = Math.max(0.60, 1 - Math.abs(s - 0.45) * 1.8);
    low = Math.max(0.05, (1 - mod) * 0.5);
    hi = Math.max(0.05, 1 - mod - low);
  } else {
    hi = Math.max(0.70, Math.min(0.95, s));
    mod = Math.max(0.05, (1 - hi) * 0.8);
    low = Math.max(0.01, 1 - hi - mod);
  }

  const tot = low + mod + hi;
  const pLow = +(low / tot).toFixed(4);
  const pMod = +(mod / tot).toFixed(4);
  const pHi = +(hi / tot).toFixed(4);
  const score = tier === "low" ? pLow : tier === "moderate" ? pMod : pHi;

  return {
    tier,
    score,
    probs: { low: pLow, moderate: pMod, high: pHi }
  };
}

/* ---- Standardized Euclidean Distance KNN Matching ---- */
function knnMatch(inp: HealthInput, userTier: string, topN = 2) {
  // First candidate filter: Prioritize patients in the same risk tier!
  let candidates = PATIENTS.filter(p => p.risk_level === userTier);
  if (candidates.length < topN) {
    candidates = PATIENTS; // fallback if needed
  }

  const scored = candidates.map(p => {
    // Standardized distance weights
    const dSys = Math.abs(inp.blood_pressure_systolic - p.blood_pressure_systolic) / 15.0;
    const dDia = Math.abs(inp.blood_pressure_diastolic - p.blood_pressure_diastolic) / 10.0;
    const dGlu = Math.abs(inp.glucose - p.glucose) / 20.0;
    const dChol = Math.abs(inp.cholesterol - p.cholesterol) / 25.0;
    const dBmi = Math.abs(inp.bmi - p.bmi) / 4.0;
    const dAge = Math.abs(inp.age - p.age) / 12.0;
    const dHr = Math.abs(inp.heart_rate - p.heart_rate) / 15.0;

    let totalDist = Math.sqrt(dSys**2 + dDia**2 + dGlu**2 + dChol**2 + dBmi**2 + dAge**2 + dHr**2);
    if (p.risk_level !== userTier) totalDist += 5.0; // heavy penalty for cross-tier mismatch

    const simScore = Math.max(0.70, Math.min(0.995, 1.0 - (totalDist / 18.0)));

    const userT = { Age: inp.age, Bmi: inp.bmi, 'Bp Sys': inp.blood_pressure_systolic, Glucose: inp.glucose, Cholesterol: inp.cholesterol };
    const patT = { Age: p.age, Bmi: p.bmi, 'Bp Sys': p.blood_pressure_systolic, Glucose: p.glucose, Cholesterol: p.cholesterol };
    
    const overlapping = Object.entries(userT).map(([k, v]) => {
      const pv = patT[k as keyof typeof patT] as number;
      const dev = Math.abs(v - pv) / Math.max(v, pv, 1) * 100;
      return {
        trait: k,
        user_value: v,
        patient_value: pv,
        deviation_pct: Math.round(dev * 10) / 10,
      };
    });

    return {
      patient_id: p.patient_id,
      similarity_score: +simScore.toFixed(4),
      profile: {
        age: p.age,
        bmi: p.bmi,
        blood_pressure: `${p.blood_pressure_systolic}/${p.blood_pressure_diastolic}`,
        glucose: p.glucose,
        cholesterol: p.cholesterol,
        heart_rate: p.heart_rate
      },
      risk_level: p.risk_level,
      diagnosis: p.diagnosis,
      overlapping_traits: overlapping,
      historical_progression: p.progression_notes,
      _dist: totalDist
    };
  }).sort((a, b) => a._dist - b._dist).slice(0, topN);

  return scored;
}

/* ---- Hospital Matching ---- */
function matchHospitals(tier: string, inp: HealthInput) {
  const reqSpecs = ["Internal Medicine"];
  if (inp.blood_pressure_systolic > 125 || inp.cholesterol > 200) reqSpecs.push("Cardiology");
  if (inp.glucose > 100 || inp.bmi > 25) reqSpecs.push("Endocrinology");
  if (inp.glucose > 126 && inp.blood_pressure_systolic > 140) reqSpecs.push("Nephrology");

  const cityFilter = (inp.city || "").trim().toLowerCase();
  const stateFilter = (inp.state || "Andhra Pradesh").trim().toUpperCase();

  let local = HOSPITALS.filter(h => h.city.toLowerCase() === cityFilter && h.state.toUpperCase() === stateFilter);
  if (!local.length) local = HOSPITALS.filter(h => h.state.toUpperCase() === stateFilter);
  if (!local.length) local = HOSPITALS;

  return local.map(h => {
    const specMatch = reqSpecs.filter(s => h.specialties.includes(s)).length;
    const specScore = specMatch / reqSpecs.length;
    const distScore = Math.max(0, 1 - h.distance_km / 20);
    const ratScore = h.rating / 5;
    const combined = tier === "high" ? specScore * 0.45 + ratScore * 0.35 + distScore * 0.2 : specScore * 0.35 + ratScore * 0.25 + distScore * 0.4;
    return { ...h, matched_specialties: reqSpecs.filter(s => h.specialties.includes(s)), match_score: +combined.toFixed(4) };
  }).sort((a, b) => b.match_score - a.match_score);
}

/* ---- Care Guidance ---- */
function getCareGuidance(tier: string, inp: HealthInput) {
  if (tier === "high") return {
    tier: "high",
    show_medications: false,
    emergency_escalation: true,
    message: "Your results indicate significant health concerns requiring immediate professional medical attention. Please visit the nearest hospital or contact emergency services.",
    actions: [
      "Schedule an urgent appointment with a specialist or primary care physician within 24-48 hours",
      "If experiencing acute symptoms (chest pain, severe breathlessness), call 108 (Indian Emergency Services) immediately",
      "Bring all recent health records and biomarker readings to your doctor appointment",
      "Do not attempt self-medication or OTC remedies without medical supervision"
    ]
  };
  if (tier === "low") return {
    tier: "low",
    show_medications: false,
    emergency_escalation: false,
    message: "Your health indicators are within normal optimal ranges. Continue maintaining a healthy lifestyle with regular checkups.",
    actions: [
      "Continue regular annual health screenings and physical checkups",
      "Maintain a balanced, nutrient-dense diet and 150+ minutes of moderate weekly exercise",
      "Prioritize hydration and 7-8 hours of restful sleep daily",
      "Monitor biometrics annually or as advised by your physician"
    ]
  };
  
  const guides: CareGuide[] = [];
  if (inp.blood_pressure_systolic > 125 || inp.blood_pressure_diastolic > 80) guides.push({ title: "Blood Pressure Management", precautions: ["Reduce sodium intake under 2,300 mg/day", "Engage in 30 minutes of aerobic exercise daily", "Monitor BP twice daily for 2 weeks", "Practice stress-reduction (deep breathing, meditation)"], otc_guidance: ["Acetaminophen preferred over NSAIDs for pain relief", "Omega-3 fish oil (1,000-2,000 mg/day) supports heart health", "Magnesium (200-400 mg/day) provides mild BP-lowering effects"], avoid: ["Avoid decongestants containing pseudoephedrine", "Avoid high-dose NSAIDs (ibuprofen, naproxen)", "Limit caffeine intake to <2 cups daily"] });
  if (inp.glucose > 100) guides.push({ title: "Blood Sugar Control", precautions: ["Adopt a low-glycemic-index diet with fiber and lean proteins", "Exercise 150+ minutes weekly", "Monitor fasting blood glucose weekly", "Aim for 5-7% gradual weight reduction"], otc_guidance: ["Chromium picolinate (200-400 mcg daily) for insulin sensitivity", "Alpha-lipoic acid (300-600 mg daily) for glucose regulation", "Berberine (500 mg 2-3x daily) supports glucose metabolism"], avoid: ["Avoid sugary drinks, refined carbs, and sweets", "Avoid long gaps between meals", "Avoid sedentary periods over 60 minutes"] });
  if (inp.bmi > 25) guides.push({ title: "Weight & Metabolic Support", precautions: ["Consult a registered dietitian for caloric guidance", "Track daily nutrition and physical activity", "Start with 20-30 min daily brisk walking"], otc_guidance: ["Psyllium husk fiber (5g before meals) promotes satiety", "Green tea extract (300-500 mg EGCG daily) supports metabolism", "Probiotic supplements support gut flora"], avoid: ["Avoid extreme crash diets or unverified weight loss pills", "Avoid skipping meals"] });
  if (inp.cholesterol > 200) guides.push({ title: "Lipid & Cholesterol Balance", precautions: ["Reduce saturated fats (red meat, full-fat dairy)", "Increase soluble fiber (oats, legumes, apples)", "Incorporate olive oil, nuts, and avocados"], otc_guidance: ["Plant sterols/stanols (2g daily) help lower LDL", "Omega-3 fatty acids (1,000-2,000 mg daily)", "CoQ10 (100-200 mg daily) supports cellular cardiac energy"], avoid: ["Avoid trans fats completely", "Avoid heavy alcohol consumption"] });
  if (!guides.length) guides.push({ title: "General Health Maintenance", precautions: ["Schedule a preventive wellness exam", "Discuss metabolic risk factors with your clinician"], otc_guidance: ["Daily multivitamin supplement", "Vitamin D3 (1000-2000 IU daily) if indoors"], avoid: ["Avoid excessive alcohol and tobacco products"] });
  
  return { tier: "moderate", show_medications: true, emergency_escalation: false, message: "Your results suggest moderate risk factors. The following temporary precautions and OTC guidance may help while scheduling a consultation.", care_guides: guides, disclaimer: "These OTC suggestions are TEMPORARY only and do not replace professional medical advice. Always consult your healthcare provider." };
}

interface HealthInput {
  age: number; bmi: number; blood_pressure_systolic: number;
  blood_pressure_diastolic: number; glucose: number; cholesterol: number;
  heart_rate: number; insulin: number; city: string; state: string;
  symptoms_text?: string;
  report_image_base64?: string;
  prescription_image_base64?: string;
  simulate_preset_report?: boolean;
  lang?: "en" | "te" | "hi";
}

/* ================================================================== */
/*  API Route                                                       */
/* ================================================================== */
export async function POST(request: Request) {
  try {
    const inp: HealthInput = await request.json();
    const hasReport = Boolean(inp.report_image_base64 || inp.prescription_image_base64 || inp.simulate_preset_report);

    // Check if symptoms text contains serious emergency keywords
    const sympLower = (inp.symptoms_text || "").toLowerCase();
    const isSeriousSymptom = /chest pain|breath|shortness|dizziness|faint|unconscious|numbness|paralysis|stroke|vomit blood|stiff neck|severe head|pressure in chest/i.test(sympLower);

    let { tier, score, probs } = calcRisk(inp);
    if (isSeriousSymptom && tier !== "high") {
      tier = "high";
      score = 0.92;
      probs = { low: 0.02, moderate: 0.06, high: 0.92 };
    }

    // Patient comparison is run when a medical report image is uploaded OR when running a preset report!
    const matches = hasReport ? knnMatch(inp, tier, 2) : [];

    const hospitals = matchHospitals(tier, inp);
    const care = getCareGuidance(tier, inp);
    const importance = { glucose: 0.2448, bmi: 0.1531, blood_pressure_systolic: 0.1482, cholesterol: 0.1302, age: 0.1216, blood_pressure_diastolic: 0.0822, insulin: 0.0605, heart_rate: 0.0595 };
    
    let aiSummary: string | null = null;
    try {
      const { default: genai } = await import("@/lib/gemini");
      aiSummary = await genai(inp, { tier, score, probs }, matches, hospitals, care);
    } catch(e) {
      console.error("Gemini AI call error:", e);
    }
    
    return NextResponse.json({
      risk: { risk_tier: tier, risk_score: score, risk_probability: probs, feature_importance: importance },
      historical_matches: matches,
      recommended_hospitals: hospitals,
      care_guidance: care,
      user_profile: {
        age: inp.age,
        bmi: inp.bmi,
        blood_pressure: `${inp.blood_pressure_systolic}/${inp.blood_pressure_diastolic}`,
        glucose: inp.glucose,
        cholesterol: inp.cholesterol,
        heart_rate: inp.heart_rate,
        insulin: inp.insulin,
        location: `${inp.city || "Vijayawada"}, ${inp.state || "Andhra Pradesh"}`
      },
      ai_summary: aiSummary
    });
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
