import { NextResponse } from "next/server";

/* ================================================================== */
/*  Inline ML Engine — clinical threshold-based risk scoring          */
/*  Eliminates Python backend dependency for sandbox reliability    */
/* ================================================================== */

interface HealthInput {
  age: number; bmi: number; blood_pressure_systolic: number;
  blood_pressure_diastolic: number; glucose: number; cholesterol: number;
  heart_rate: number; insulin: number; city: string; state: string;
  gemini_api_key?: string;
}

/* ---- Hospital DB ---- */
const HOSPITALS = [
  { id:"H-001", name:"Manhattan General Hospital", city:"New York", state:"NY", specialties:["Cardiology","Endocrinology","Internal Medicine"], rating:4.8, distance_km:2.1, address:"450 W 57th St, New York, NY 10019", phone:"(212) 555-1001", beds:520, emergency:true, doctors:["Dr. Sarah Chen (Cardiology)","Dr. James Park (Endocrinology)"] },
  { id:"H-002", name:"NYU Langone Cardiovascular Center", city:"New York", state:"NY", specialties:["Cardiology","Cardiac Surgery","Vascular Surgery"], rating:4.9, distance_km:5.3, address:"550 First Ave, New York, NY 10016", phone:"(212) 555-1002", beds:806, emergency:true, doctors:["Dr. Michael Ross (Cardiac Surgery)"] },
  { id:"H-003", name:"Brooklyn Community Health Center", city:"New York", state:"NY", specialties:["Family Practice","Internal Medicine","Preventive Care"], rating:4.3, distance_km:8.7, address:"1200 Flatbush Ave, Brooklyn, NY 11226", phone:"(718) 555-1003", beds:150, emergency:true, doctors:["Dr. Lisa Wong (Family Practice)"] },
  { id:"H-004", name:"Mount Sinai Diabetes Center", city:"New York", state:"NY", specialties:["Endocrinology","Diabetes Education","Nutrition"], rating:4.7, distance_km:3.8, address:"1 Gustave L. Levy Pl, New York, NY 10029", phone:"(212) 555-1004", beds:1134, emergency:false, doctors:["Dr. Priya Sharma (Endocrinology)"] },
  { id:"H-005", name:"Columbia University Medical Center", city:"New York", state:"NY", specialties:["Cardiology","Endocrinology","Nephrology","Neurology"], rating:4.9, distance_km:6.2, address:"622 W 168th St, New York, NY 10032", phone:"(212) 555-1005", beds:815, emergency:true, doctors:["Dr. Robert Kim (Nephrology)"] },
  { id:"H-006", name:"Cedars-Sinai Medical Center", city:"Los Angeles", state:"CA", specialties:["Cardiology","Endocrinology","Oncology","Orthopedics"], rating:4.9, distance_km:4.5, address:"8700 Beverly Blvd, Los Angeles, CA 90048", phone:"(310) 555-2001", beds:886, emergency:true, doctors:["Dr. Emily Tran (Cardiology)","Dr. David Lee (Endocrinology)"] },
  { id:"H-007", name:"UCLA Medical Center", city:"Los Angeles", state:"CA", specialties:["Cardiology","Endocrinology","Nephrology","Neurology"], rating:4.8, distance_km:8.1, address:"757 Westwood Plz, Los Angeles, CA 90095", phone:"(310) 555-2002", beds:520, emergency:true, doctors:["Dr. Karen Johnson (Cardiology)"] },
  { id:"H-008", name:"Kaiser Permanente LA", city:"Los Angeles", state:"CA", specialties:["Internal Medicine","Family Practice","Preventive Care"], rating:4.4, distance_km:2.3, address:"4760 Sunset Blvd, Los Angeles, CA 90027", phone:"(323) 555-2003", beds:250, emergency:true, doctors:["Dr. Maria Garcia (Internal Medicine)"] },
  { id:"H-009", name:"Hollywood Diabetes & Endocrine Clinic", city:"Los Angeles", state:"CA", specialties:["Endocrinology","Diabetes Education","Nutrition"], rating:4.5, distance_km:5.9, address:"6320 W Sunset Blvd, Los Angeles, CA 90028", phone:"(323) 555-2004", beds:80, emergency:false, doctors:["Dr. Alan Wright (Endocrinology)"] },
  { id:"H-010", name:"Northwestern Memorial Hospital", city:"Chicago", state:"IL", specialties:["Cardiology","Endocrinology","Nephrology","Neurology"], rating:4.8, distance_km:3.2, address:"251 E Huron St, Chicago, IL 60611", phone:"(312) 555-3001", beds:894, emergency:true, doctors:["Dr. William Brown (Cardiology)","Dr. Susan Taylor (Endocrinology)"] },
  { id:"H-011", name:"Rush University Medical Center", city:"Chicago", state:"IL", specialties:["Cardiology","Cardiac Surgery","Vascular Surgery"], rating:4.7, distance_km:5.8, address:"1653 W Congress Pkwy, Chicago, IL 60612", phone:"(312) 555-3002", beds:664, emergency:true, doctors:["Dr. Richard Davis (Cardiac Surgery)"] },
  { id:"H-012", name:"University of Chicago Medical Center", city:"Chicago", state:"IL", specialties:["Cardiology","Endocrinology","Oncology"], rating:4.9, distance_km:9.4, address:"5841 S Maryland Ave, Chicago, IL 60637", phone:"(773) 555-3003", beds:470, emergency:true, doctors:["Dr. Jennifer Liu (Endocrinology)"] },
  { id:"H-013", name:"Chicago Community Family Clinic", city:"Chicago", state:"IL", specialties:["Family Practice","Internal Medicine","Preventive Care"], rating:4.2, distance_km:1.5, address:"233 E Erie St, Chicago, IL 60611", phone:"(312) 555-3004", beds:60, emergency:false, doctors:["Dr. Patricia Moore (Family Practice)"] },
  { id:"H-014", name:"Houston Methodist Hospital", city:"Houston", state:"TX", specialties:["Cardiology","Endocrinology","Nephrology","Neurology"], rating:4.9, distance_km:3.7, address:"6565 Fannin St, Houston, TX 77030", phone:"(713) 555-4001", beds:907, emergency:true, doctors:["Dr. Thomas Martinez (Cardiology)","Dr. Angela White (Endocrinology)"] },
  { id:"H-015", name:"Baylor St. Luke's Medical Center", city:"Houston", state:"TX", specialties:["Cardiology","Cardiac Surgery","Vascular Surgery"], rating:4.6, distance_km:6.1, address:"6720 Bertner Ave, Houston, TX 77030", phone:"(832) 555-4002", beds:850, emergency:true, doctors:["Dr. Kevin Thompson (Cardiac Surgery)"] },
  { id:"H-016", name:"Texas Diabetes Institute", city:"Houston", state:"TX", specialties:["Endocrinology","Diabetes Education","Nutrition"], rating:4.7, distance_km:4.3, address:"7700 Floyd Curl Dr, San Antonio, TX 78229", phone:"(210) 555-4003", beds:200, emergency:false, doctors:["Dr. Robert Hernandez (Endocrinology)"] },
  { id:"H-017", name:"Memorial Hermann Hospital", city:"Houston", state:"TX", specialties:["Internal Medicine","Family Practice","Preventive Care"], rating:4.4, distance_km:2.0, address:"6411 Fannin St, Houston, TX 77030", phone:"(713) 555-4004", beds:680, emergency:true, doctors:["Dr. Linda Clark (Internal Medicine)"] },
  { id:"H-018", name:"Massachusetts General Hospital", city:"Boston", state:"MA", specialties:["Cardiology","Endocrinology","Nephrology","Neurology"], rating:4.9, distance_km:2.8, address:"55 Fruit St, Boston, MA 02114", phone:"(617) 555-5001", beds:999, emergency:true, doctors:["Dr. Elizabeth Adams (Cardiology)","Dr. Michael Rivera (Endocrinology)"] },
  { id:"H-019", name:"Brigham and Women's Hospital", city:"Boston", state:"MA", specialties:["Cardiology","Cardiac Surgery","Vascular Surgery"], rating:4.8, distance_km:3.5, address:"75 Francis St, Boston, MA 02115", phone:"(617) 555-5002", beds:793, emergency:true, doctors:["Dr. Christopher Hall (Cardiac Surgery)"] },
  { id:"H-020", name:"Boston Diabetes & Endocrine Center", city:"Boston", state:"MA", specialties:["Endocrinology","Diabetes Education","Nutrition"], rating:4.6, distance_km:4.1, address:"2 Longfellow Pl, Boston, MA 02114", phone:"(617) 555-5003", beds:100, emergency:false, doctors:["Dr. Sarah Mitchell (Endocrinology)"] },
  { id:"H-021", name:"UCSF Medical Center", city:"San Francisco", state:"CA", specialties:["Cardiology","Endocrinology","Nephrology","Neurology"], rating:4.9, distance_km:3.9, address:"505 Parnassus Ave, San Francisco, CA 94143", phone:"(415) 555-6001", beds:600, emergency:true, doctors:["Dr. Daniel Kim (Cardiology)","Dr. Rachel Green (Endocrinology)"] },
  { id:"H-022", name:"CPMC Pacific Campus", city:"San Francisco", state:"CA", specialties:["Cardiology","Cardiac Surgery","Vascular Surgery"], rating:4.7, distance_km:5.2, address:"2333 Buchanan St, San Francisco, CA 94115", phone:"(415) 555-6002", beds:370, emergency:true, doctors:["Dr. Andrew Scott (Cardiac Surgery)"] },
  { id:"H-023", name:"SF Community Family Health", city:"San Francisco", state:"CA", specialties:["Family Practice","Internal Medicine","Preventive Care"], rating:4.3, distance_km:1.2, address:"2400 Geary Blvd, San Francisco, CA 94115", phone:"(415) 555-6003", beds:90, emergency:true, doctors:["Dr. Michelle Young (Family Practice)"] },
];

/* ---- Synthetic Patient DB (seeded, reproducible) ---- */
const PATIENTS = (() => {
  const rng = (_s: string) => 0;
  const seeded = (seed: number) => { let s=seed; return ()=>{s=(s*16807)%2147483647; return(s-1)/2147483646;}; };
  const r = seeded(42);
  const norm = (m: number, s: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round((r()*s*2-s+m)*10)/10));
  const logNorm = (m: number, s: number, lo: number) => Math.max(lo, Math.round(Math.exp(r()*s*2-s+m)*10)/10);
  const pts = [];
  for (let i = 0; i < 500; i++) {
    const age = norm(48, 14, 18, 80); const bmi = norm(28.5, 6.5, 16, 50);
    const bpS = norm(130, 22, 90, 200); const bpD = norm(85, 14, 55, 130);
    const glu = norm(115, 35, 60, 250); const chol = norm(210, 45, 100, 400);
    const hr = norm(75, 12, 50, 120); const ins = logNorm(3.5, 0.8, 2);
    let rs = 0; rs += age>50?0.15:0; rs += age>65?0.15:0; rs += bmi>25?0.1:0; rs += bmi>30?0.15:0;
    rs += bpS>130?0.1:0; rs += bpS>140?0.15:0; rs += bpD>90?0.1:0;
    rs += glu>100?0.15:0; rs += glu>126?0.2:0; rs += chol>200?0.1:0; rs += chol>240?0.15:0;
    rs += (r()-0.5)*0.24; rs = Math.max(0, Math.min(1, rs));
    const tier = rs<0.33?"low":rs<0.6?"moderate":"high";
    let diag = tier==="high"?(glu>126?"Type 2 Diabetes":"Cardiovascular Disease"):tier==="moderate"?(glu>100?"Prediabetes":"Metabolic Risk Factors"):"Generally Healthy";
    const prog = tier==="high"?"Initial screening showed elevated markers. Follow-up confirmed progressive risk. Treatment plan initiated with lifestyle modifications and medication.":tier==="moderate"?"Routine checkup revealed borderline indicators. Referred for monitoring. 3-month follow-up showed stable condition with recommended dietary changes.":"Standard health screening within normal ranges. Annual checkup recommended.";
    pts.push({patient_id:`P-${1000+i}`,age,bmi,blood_pressure_systolic:bpS,blood_pressure_diastolic:bpD,glucose:glu,cholesterol:chol,heart_rate:hr,insulin:ins,risk_level:tier,risk_score:Math.round(rs*1000)/1000,diagnosis:diag,progression_notes:prog});
  }
  return pts;
})();

/* ---- Risk Scoring ---- */
function calcRisk(inp: HealthInput) {
  let s = 0;
  s += inp.age>50?0.15:0; s += inp.age>65?0.15:0;
  s += inp.bmi>25?0.1:0; s += inp.bmi>30?0.15:0;
  s += inp.blood_pressure_systolic>130?0.1:0; s += inp.blood_pressure_systolic>140?0.15:0; s += inp.blood_pressure_diastolic>90?0.1:0;
  s += inp.glucose>100?0.15:0; s += inp.glucose>126?0.2:0;
  s += inp.cholesterol>200?0.1:0; s += inp.cholesterol>240?0.15:0;
  s = Math.max(0, Math.min(1, s));
  const tier = s<0.33?"low":s<0.6?"moderate":"high";
  const tIdx = tier==="low"?0:tier==="moderate"?1:2;
  let low=0, mod=0, hi=0;
  if (tier==="low") { low=Math.max(0.6, 1-s*1.8); mod=1-low-hi; hi=Math.min(0.05, s*0.15); }
  else if (tier==="moderate") { mod=Math.max(0.55, 1-Math.abs(s-0.45)*2.5); low=1-mod-hi; hi=Math.min(0.15, s*0.4); }
  else { hi=Math.max(0.7, s*1.3); mod=1-hi-low; low=Math.min(0.05, (1-s)*0.15); }
  const tot=low+mod+hi; return {tier, score:Math.round((tIdx===0?low:tIdx===1?mod:hi)/tot*10000)/10000, probs:{low:+(low/tot).toFixed(4),moderate:+(mod/tot).toFixed(4),high:+(hi/tot).toFixed(4)}};
}

/* ---- KNN Matching ---- */
function knnMatch(inp: HealthInput, topN=2) {
  const feats = ['age','bmi','blood_pressure_systolic','blood_pressure_diastolic','glucose','cholesterol','heart_rate','insulin'] as const;
  const uVec = feats.map(f=>inp[f]);
  const maxVals = feats.map(f=>Math.max(...PATIENTS.map(p=>p[f as keyof typeof p] as number), uVec[feats.indexOf(f)]));
  const minVals = feats.map(f=>Math.min(...PATIENTS.map(p=>p[f as keyof typeof p] as number), uVec[feats.indexOf(f)]));
  const range = maxVals.map((m,i)=>Math.max(m-minVals[i], 1));
  const uNorm = uVec.map((v,i)=>(v-minVals[i])/range[i]);
  const scored = PATIENTS.map(p=>{
    const pVec = feats.map(f=>p[f as keyof typeof p] as number);
    const pNorm = pVec.map((v,i)=>(v-minVals[i])/range[i]);
    let dot=0, magA=0, magB=0;
    for(let i=0;i<uNorm.length;i++){dot+=uNorm[i]*pNorm[i]; magA+=uNorm[i]**2; magB+=pNorm[i]**2;}
    const sim = magA&&magB ? dot/(Math.sqrt(magA)*Math.sqrt(magB)) : 0;
    const userT = {Age:inp.age, Bmi:inp.bmi, 'Bp Sys':inp.blood_pressure_systolic, Glucose:inp.glucose, Cholesterol:inp.cholesterol};
    const patT = {Age:p.age, Bmi:p.bmi, 'Bp Sys':p.blood_pressure_systolic, Glucose:p.glucose, Cholesterol:p.cholesterol};
    const overlapping = Object.entries(userT)
      .filter(([k, v]) => {
        const pv = patT[k as keyof typeof patT];
        return pv !== undefined && Math.abs(v - pv) / Math.max(v, pv, 1) * 100 < 15;
      })
      .map(([k, v]) => {
        const pv = patT[k as keyof typeof patT] as number;
        const dev = Math.abs(v - pv) / Math.max(v, pv, 1) * 100;
        return {
          trait: k,
          user_value: v,
          patient_value: pv,
          deviation_pct: Math.round(dev * 10) / 10,
        };
      });
    return {patient_id:p.patient_id, similarity_score:+sim.toFixed(4), profile:{age:p.age, bmi:p.bmi, blood_pressure:`${p.blood_pressure_systolic}/${p.blood_pressure_diastolic}`, glucose:p.glucose, cholesterol:p.cholesterol, heart_rate:p.heart_rate}, risk_level:p.risk_level, diagnosis:p.diagnosis, overlapping_traits:overlapping, historical_progression:p.progression_notes};
  }).sort((a,b)=>b.similarity_score-a.similarity_score).slice(0, topN);
  return scored;
}

/* ---- Hospital Matching ---- */
function matchHospitals(tier: string, inp: HealthInput) {
  const reqSpecs = ["Internal Medicine"];
  if (inp.blood_pressure_systolic>130||inp.cholesterol>200) reqSpecs.push("Cardiology");
  if (inp.glucose>100||inp.bmi>30) reqSpecs.push("Endocrinology");
  if (inp.glucose>126&&inp.blood_pressure_systolic>140) reqSpecs.push("Nephrology");
  const cityFilter = inp.city.trim().toLowerCase();
  const stateFilter = inp.state.trim().toUpperCase();
  let local = HOSPITALS.filter(h=>h.city.toLowerCase()===cityFilter && h.state.toUpperCase()===stateFilter);
  if (!local.length) local = HOSPITALS.filter(h=>h.state.toUpperCase()===stateFilter);
  if (!local.length) local = HOSPITALS;
  return local.map(h=>{
    const specMatch = reqSpecs.filter(s=>h.specialties.includes(s)).length;
    const specScore = specMatch/reqSpecs.length;
    const distScore = Math.max(0, 1-h.distance_km/20);
    const ratScore = h.rating/5;
    const combined = tier==="high" ? specScore*0.45+ratScore*0.35+distScore*0.2 : specScore*0.35+ratScore*0.25+distScore*0.4;
    return {...h, matched_specialties:reqSpecs.filter(s=>h.specialties.includes(s)), match_score:+combined.toFixed(4)};
  }).sort((a,b)=>b.match_score-a.match_score);
}

/* ---- Care Guidance ---- */
function getCareGuidance(tier: string, inp: HealthInput) {
  if (tier==="high") return {tier:"high",show_medications:false,emergency_escalation:true,message:"Your results indicate significant health concerns that require immediate professional medical attention. Please contact a healthcare provider or visit the nearest emergency room.",actions:["Schedule an appointment with a primary care physician within 24-48 hours","If experiencing chest pain, shortness of breath, or severe symptoms, call 911 immediately","Bring all health records and this assessment to your doctor appointment","Do not attempt to self-medicate or use OTC remedies without medical supervision"]};
  if (tier==="low") return {tier:"low",show_medications:false,emergency_escalation:false,message:"Your health indicators are within normal ranges. Continue maintaining a healthy lifestyle with regular checkups.",actions:["Continue regular annual health screenings","Maintain a balanced diet and regular exercise routine","Stay hydrated and prioritize sleep quality","Keep track of any changes in your health metrics"]};
  const guides = [];
  if (inp.blood_pressure_systolic>130||inp.blood_pressure_diastolic>85) guides.push({title:"Blood Pressure Management",precautions:["Reduce sodium intake to under 2,300 mg/day","Engage in 30 minutes of moderate aerobic activity daily","Monitor BP at home twice daily for 2 weeks","Limit alcohol to 1 drink/day for women, 2 for men","Practice stress-reduction techniques (deep breathing, meditation)"],otc_guidance:["Acetaminophen (Tylenol) preferred over NSAIDs for pain relief","Omega-3 fish oil supplements (1,000-2,000 mg daily)","Magnesium supplements (200-400 mg daily) have mild BP-lowering effects"],avoid:["Avoid decongestants with pseudoephedrine (Sudafed)","Avoid NSAIDs like ibuprofen for prolonged use","Avoid excessive caffeine (limit to 2 cups/day)"]});
  if (inp.glucose>100) guides.push({title:"Blood Sugar Management",precautions:["Follow a low-glycemic-index diet rich in vegetables, lean proteins, whole grains","Exercise at least 150 minutes per week (30 min, 5 days/week)","Monitor fasting blood glucose weekly","Aim for 5-7% gradual weight loss if overweight","Get adequate sleep (7-9 hours/night)"],otc_guidance:["Chromium picolinate (200-400 mcg daily) may improve insulin sensitivity","Alpha-lipoic acid (300-600 mg daily) for blood sugar control","Berberine supplements (500 mg, 2-3x daily) support glucose metabolism"],avoid:["Avoid sugary beverages and refined carbohydrates","Avoid skipping meals causing blood sugar fluctuations","Avoid prolonged sedentary periods"]});
  if (inp.bmi>30) guides.push({title:"Weight Management Support",precautions:["Consult a registered dietitian for a personalized meal plan","Keep a food diary to track caloric intake","Gradually increase physical activity (start with walking 20 min/day)","Focus on sustainable habit changes","Consider behavioral therapy for emotional eating"],otc_guidance:["Psyllium husk fiber (5g before meals) may promote satiety","Green tea extract (300-500 mg EGCG daily)","Probiotic supplements may support gut health"],avoid:["Avoid weight-loss supplements claiming rapid results","Avoid extreme calorie restriction without supervision","Avoid skipping meals as a weight-loss strategy"]});
  if (inp.cholesterol>200) guides.push({title:"Cholesterol Management",precautions:["Reduce saturated fat (limit red meat, full-fat dairy)","Increase soluble fiber (oats, beans, fruits, vegetables)","Include heart-healthy fats (olive oil, avocados, nuts)","Exercise regularly (150 min/week moderate intensity)","Quit smoking if applicable"],otc_guidance:["Plant sterols/stanols (2g daily) can reduce LDL cholesterol","Omega-3 fatty acids (1,000-4,000 mg daily)","Red yeast rice contains natural statins - use with caution"],avoid:["Avoid trans fats (partially hydrogenated oils) completely","Avoid excessive alcohol (raises triglycerides)","Avoid high-dose niacin without medical supervision"]});
  if (!guides.length) guides.push({title:"General Health Maintenance",precautions:["Schedule a comprehensive metabolic panel","Discuss cardiovascular risk factors with your physician"],otc_guidance:["Daily multivitamin supplement","Vitamin D3 (1000-2000 IU daily) if deficient"],avoid:["Avoid excessive alcohol consumption","Avoid tobacco products"]});
  return {tier:"moderate",show_medications:true,emergency_escalation:false,message:"Your results suggest moderate risk factors. The following temporary precautions and OTC guidance may help while you schedule a consultation.",care_guides:guides,disclaimer:"These OTC suggestions are TEMPORARY only and do not replace professional medical advice. Always consult your healthcare provider."};
}

/* ================================================================== */
/*  API Route                                                       */
/* ================================================================== */
export async function POST(request: Request) {
  try {
    const inp: HealthInput = await request.json();
    const {tier, score, probs} = calcRisk(inp);
    const matches = knnMatch(inp);
    const hospitals = matchHospitals(tier, inp);
    const care = getCareGuidance(tier, inp);
    const importance = {glucose:0.2448,bmi:0.1531,blood_pressure_systolic:0.1482,cholesterol:0.1302,age:0.1216,blood_pressure_diastolic:0.0822,insulin:0.0605,heart_rate:0.0595};
    let aiSummary: string | null = null;
    if (inp.gemini_api_key) { try { const {default:genai} = await import("@/lib/gemini"); aiSummary = await genai(inp, {tier, score, probs}, matches, hospitals, care); } catch(e) { console.error("Gemini error:", e); } }
    return NextResponse.json({ risk:{risk_tier:tier, risk_score:score, risk_probability:probs, feature_importance:importance}, historical_matches:matches, recommended_hospitals:hospitals, care_guidance:care, user_profile:{age:inp.age,bmi:inp.bmi,blood_pressure:`${inp.blood_pressure_systolic}/${inp.blood_pressure_diastolic}`,glucose:inp.glucose,cholesterol:inp.cholesterol,heart_rate:inp.heart_rate,insulin:inp.insulin,location:`${inp.city}, ${inp.state}`}, ai_summary:aiSummary });
  } catch(e) { return NextResponse.json({error:String(e)},{status:500}); }
}
