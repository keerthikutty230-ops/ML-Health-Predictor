export default async function genai(
  inputData: {
    age: number; bmi: number; blood_pressure_systolic: number;
    blood_pressure_diastolic: number; glucose: number; cholesterol: number;
    heart_rate: number; insulin: number; city: string; state: string;
    symptoms_text?: string;
    report_image_base64?: string;
    prescription_image_base64?: string;
    lang?: "en" | "te" | "hi" | "ta" | "kn" | "ml" | "or" | "bn" | "ur" | "pa";
  },
  riskResult: any,
  matches: any[],
  hospitals: any[],
  careGuidance: any
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasReport = Boolean(inputData.report_image_base64 || inputData.prescription_image_base64);
  const lang = inputData.lang || "en";

  const LANG_NAME_MAP: Record<string, { name: string; script: string }> = {
    en: { name: "English", script: "English" },
    te: { name: "Telugu", script: "Telugu (తెలుగు)" },
    hi: { name: "Hindi", script: "Hindi (हिंदी)" },
    ta: { name: "Tamil", script: "Tamil (தமிழ்)" },
    kn: { name: "Kannada", script: "Kannada (ಕನ್ನಡ)" },
    ml: { name: "Malayalam", script: "Malayalam (മലയാളം)" },
    or: { name: "Odia", script: "Odia (ଓଡ଼ିଆ)" },
    bn: { name: "Bengali", script: "Bengali (বাংলা)" },
    ur: { name: "Urdu", script: "Urdu (اردو)" },
    pa: { name: "Punjabi", script: "Punjabi (ਪੰਜਾਬੀ)" },
  };

  const selectedLangInfo = LANG_NAME_MAP[lang] || LANG_NAME_MAP.en;
  let langInstruction = "";
  if (lang !== "en") {
    langInstruction = `\nCRITICAL MANDATE: You MUST write the ENTIRE response strictly and 100% in ${selectedLangInfo.script} language script. Do NOT output any English paragraphs or words. All headings, clinical explanations, patient match notes, and hospital details must be in clear, natural ${selectedLangInfo.name}.`;
  }

  const promptText = hasReport
    ? `You are a compassionate, world-class medical AI assistant.${langInstruction}
Mode: MULTIMODAL MEDICAL REPORT & PRESCRIPTION ANALYSIS.

Analyze the attached images (Medical Lab Report and/or Doctor Prescription Slip) alongside patient biometrics.
Compare findings with the 2 closest historical patient cases provided below.

## 1. Patient Profile & Uploaded Media
- Age: ${inputData.age} years | BMI: ${inputData.bmi} kg/m²
- Blood Pressure: ${inputData.blood_pressure_systolic}/${inputData.blood_pressure_diastolic} mmHg
- Fasting Glucose: ${inputData.glucose} mg/dL | Cholesterol: ${inputData.cholesterol} mg/dL
- Location: ${inputData.city}, ${inputData.state}
${inputData.symptoms_text ? `- Reported Symptoms: "${inputData.symptoms_text}"` : ""}

## 2. Calculated Risk Tier & Patient Matches
- Risk Tier: ${riskResult.tier?.toUpperCase()} (${((riskResult.score || 0) * 100).toFixed(1)}% confidence)
- Historical Matches:
${matches.map(m => `  * Patient ${m.patient_id} (${(m.similarity_score * 100).toFixed(1)}% match): ${m.diagnosis}. ${m.historical_progression}`).join("\n")}

## 3. Recommended AP Hospitals (${inputData.city})
${hospitals.slice(0, 3).map(h => `  * ${h.name} (${h.rating}/5 rating, ${h.distance_km} km)`).join("\n")}

Instructions:
1. Summarize lab test findings from the report image AND prescribed medications from the prescription slip.
2. Correlate lab values with prescribed medications.
3. Explain the overall risk tier (${riskResult.tier?.toUpperCase()}) and why matched patient cases are relevant.
4. Recommend top specialized hospitals in ${inputData.city}.`
    : `You are a compassionate, world-class medical AI assistant.${langInstruction}
Mode: SYMPTOM-BASED HEALTH CONSULTATION (No media uploaded).

The patient has described their symptoms and situation below:
Symptoms: "${inputData.symptoms_text || "General health consultation request"}"
Location: ${inputData.city}, ${inputData.state}
Primary Risk Level: ${riskResult.tier?.toUpperCase()}

Instructions:
1. Explain the potential medical reasons / underlying causes behind their described symptoms in simple, supportive language.
2. State clearly whether their symptoms suggest a serious condition requiring immediate emergency care or mild/moderate management.
3. Recommend the best hospitals in ${inputData.city} for consultation or emergency care if serious.`;

  if (apiKey) {
    try {
      const parts: any[] = [{ text: promptText }];

      if (inputData.report_image_base64) {
        const match = inputData.report_image_base64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }

      if (inputData.prescription_image_base64) {
        const match = inputData.prescription_image_base64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (err) {
      console.error("Gemini API call error:", err);
    }
  }

  /* ---- Intelligent Multilingual Built-in Fallback Synthesis ---- */
  const tier = riskResult.tier || "low";
  const sympText = inputData.symptoms_text || "";

  // TELUGU FALLBACK (తెలుగు)
  if (lang === "te") {
    let teText = `### 🩺 జెమిని AI వైద్య విశ్లేషణ & సలహా (తెలుగు)\n\n`;
    teText += `**గమనిక:** *ఈ నివేదిక సమాచారం కోసం మాత్రమే. ఇది అధికారిక వైద్య నిర్ధారణ కాదు. మీ వైద్యుడిని సంప్రదించండి.*\n\n`;

    teText += `#### 1. ఆరోగ్య ప్రమాద అంచనా & లక్షణాలు\n`;
    if (sympText) teText += `మీరు తెలియజేసిన లక్షణాలు: "${sympText}".\n\n`;

    if (tier === "high") {
      teText += `**అత్యవసర హెచ్చరిక:** మీ ఆరోగ్య బయోమార్కర్లు మరియు లక్షణాలు **అధిక ప్రమాద స్థాయిని (High Risk)** సూచిస్తున్నాయి. తీవ్రమైన గుండెనొప్పి, శ్వాస తీసుకోవడంలో ఇబ్బంది లేదా అధిక రక్తపోటు సంకేతాలు ఉంటే వెంటనే **108 (ఆంధ్రప్రదేశ్ అత్యవసర సేవలు)** కి కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్లండి.\n\n`;
    } else if (tier === "moderate") {
      teText += `**సాధారణ హెచ్చరిక:** మీ నివేదిక **మధ్యస్థ ప్రమాద స్థాయిని (Moderate Risk)** సూచిస్తోంది. ఆహార నియమాలు మరియు వ్యాయామం పాటించడం ద్వారా బ్లడ్ షుగర్ మరియు బిపి నియంత్రణలో ఉంచుకోవచ్చు.\n\n`;
    } else {
      teText += `మీ ఆరోగ్య కొలతలు **తక్కువ ప్రమాద స్థాయిలో (Low Risk)** సాధారణంగా ఉన్నాయి. తగినంత నీరు తాగడం మరియు క్రమం తప్పకుండా వ్యాయామం చేయడం మంచిది.\n\n`;
    }

    if (matches.length > 0) {
      teText += `#### 2. సారూప్య రోగుల కేస్ విశ్లేషణ\n`;
      matches.forEach(m => {
        teText += `- **రోగి ${m.patient_id}** (${(m.similarity_score * 100).toFixed(1)}% పోలిక): నిర్ధారణ: ${m.diagnosis}. చరిత్ర: ${m.historical_progression}\n`;
      });
      teText += `\n`;
    }

    teText += `#### 3. సిఫార్సు చేయబడిన ఆంధ్రప్రదేశ్ ఆసుపత్రులు (${inputData.city})\n`;
    if (hospitals.length > 0) {
      hospitals.slice(0, 3).forEach(h => {
        teText += `- **${h.name}** (${h.city}) — రేటింగ్: ${h.rating}/5 | 24/7 ER: ${h.emergency ? "అందుబాటులో ఉంది" : "సాధారణం"} | ఫోన్: ${h.phone}\n`;
      });
    }

    return teText;
  }

  // HINDI FALLBACK (हिंदी)
  if (lang === "hi") {
    let hiText = `### 🩺 जेमिनी AI नैदानिक विश्लेषण और सलाह (हिंदी)\n\n`;
    hiText += `**अस्वीकरण:** *यह रिपोर्ट केवल सूचनात्मक उद्देश्यों के लिए है। यह आधिकारिक चिकित्सीय निदान नहीं है। अपने डॉक्टर से परामर्श लें।*\n\n`;

    hiText += `#### 1. स्वास्थ्य जोखिम मूल्यांकन और लक्षण\n`;
    if (sympText) hiText += `आपके द्वारा बताए गए लक्षण: "${sympText}".\n\n`;

    if (tier === "high") {
      hiText += `**आपातकालीन चेतावनी:** आपके बायोमार्कर और लक्षण **उच्च जोखिम स्तर (High Risk)** का संकेत देते हैं। यदि सीने में दर्द या सांस लेने में तकलीफ हो, तो तुरंत **108 (AP आपातकालीन सेवा)** पर कॉल करें या नजदीकी अस्पताल जाएं।\n\n`;
    } else if (tier === "moderate") {
      hiText += `**सामान्य सूचना:** आपकी रिपोर्ट **मध्यम जोखिम स्तर (Moderate Risk)** दर्शाती है। उचित आहार और व्यायाम से बीपी और शुगर नियंत्रित रखें।\n\n`;
    } else {
      hiText += `आपके स्वास्थ्य संकेतक **कम जोखिम स्तर (Low Risk)** पर सामान्य हैं। नियमित रूप से व्यायाम और पर्याप्त पानी पीना जारी रखें।\n\n`;
    }

    if (matches.length > 0) {
      hiText += `#### 2. समान रोगी मामला विश्लेषण\n`;
      matches.forEach(m => {
        hiText += `- **रोगी ${m.patient_id}** (${(m.similarity_score * 100).toFixed(1)}% मिलान): निदान: ${m.diagnosis}. इतिहास: ${m.historical_progression}\n`;
      });
      hiText += `\n`;
    }

    hiText += `#### 3. अनुशंसित आंध्र प्रदेश अस्पताल (${inputData.city})\n`;
    if (hospitals.length > 0) {
      hospitals.slice(0, 3).forEach(h => {
        hiText += `- **${h.name}** (${h.city}) — रेटिंग: ${h.rating}/5 | 24/7 आपातकालीन: ${h.emergency ? "सक्रिय" : "सामान्य"} | फोन: ${h.phone}\n`;
      });
    }

    return hiText;
  }

  // ENGLISH FALLBACK
  let feedback = `### 📋 Gemini AI Multimodal Report & Prescription Analysis\n\n`;
  feedback += `**Disclaimer:** *This is an AI-generated analysis of your uploaded media for informational purposes. Consult your physician for diagnosis.*\n\n`;

  feedback += `#### 1. Lab Report & Prescription Synthesis\n`;
  if (inputData.report_image_base64 && inputData.prescription_image_base64) {
    feedback += `Both your **Medical Lab Report** and **Doctor Prescription Slip** were analyzed multimodally alongside your biometrics.\n`;
  } else if (inputData.report_image_base64) {
    feedback += `Your **Medical Lab Report** scan was analyzed alongside your biometrics.\n`;
  } else {
    feedback += `Your **Doctor Prescription Slip** image was analyzed alongside your biometrics.\n`;
  }
  feedback += `Overall Health Risk Classification: **${tier.toUpperCase()} Risk** (${((riskResult.score || 0) * 100).toFixed(1)}% confidence).\n`;
  if (sympText) feedback += `Reported Symptoms: "${sympText}".\n`;
  feedback += `\n`;

  feedback += `#### 2. Comparative Patient Case Analysis\n`;
  if (matches.length > 0) {
    matches.forEach(m => {
      feedback += `- **Patient ${m.patient_id}** (${(m.similarity_score * 100).toFixed(1)}% similarity match):\n`;
      feedback += `  * Diagnosis: ${m.diagnosis}\n`;
      feedback += `  * History & Progression: ${m.historical_progression}\n`;
    });
    feedback += `\n`;
  }

  feedback += `#### 3. Recommended Hospital Network (${inputData.city})\n`;
  if (hospitals.length > 0) {
    hospitals.slice(0, 3).forEach(h => {
      feedback += `- **${h.name}** (${h.city}) — Rating: ${h.rating}/5 | 24/7 ER: ${h.emergency ? "Yes" : "No"}\n`;
      if (h.doctors) feedback += `  *Doctors:* ${h.doctors.join(", ")}\n`;
      feedback += `  *Phone:* ${h.phone}\n`;
    });
  }

  return feedback;
}
