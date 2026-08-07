import { Language } from "@/lib/translations";

export interface MultilingualText {
  en: string;
  te: string;
  hi: string;
}

export interface MedicationInfo {
  id: string;
  name: string;
  category: string;
  indication: MultilingualText;
  dietaryClashes: MultilingualText[];
  drugInteractions: Record<string, MultilingualText>; // medId -> warning
  lifestyleAdvice: MultilingualText[];
}

export const COMMON_MEDICATIONS: MedicationInfo[] = [
  {
    id: "metformin",
    name: "Metformin",
    category: "Antidiabetic",
    indication: {
      en: "Blood glucose management in Type 2 Diabetes",
      te: "టైప్ 2 మధుమేహంలో రక్తంలో చక్కెర నియంత్రణ",
      hi: "टाइप 2 मधुमेह में रक्त शर्करा नियंत्रण"
    },
    dietaryClashes: [
      {
        en: "Avoid heavy alcohol consumption (significantly increases risk of rare Lactic Acidosis).",
        te: "అధిక ఆల్కహాల్ తీసుకోవడం నివారించండి (లాక్టిక్ అసిడోసిస్ ప్రమాదాన్ని పెంచుతుంది).",
        hi: "अत्यधिक शराब के सेवन से बचें (दुर्लभ लैक्टिक एसिडोसिस का खतरा बढ़ जाता है)।"
      },
      {
        en: "Long-term use may reduce Vitamin B12 absorption; monitor B12 levels periodically.",
        te: "సుదీర్ఘమైన వాడకం విటమిన్ B12 గ్రహణ శక్తిని తగ్గిస్తుంది; B12 స్థాయిలను క్రమం తప్పకుండా తనిఖీ చేసుకోండి.",
        hi: "दीर्घकालिक उपयोग से विटामिन B12 का अवशोषण कम हो सकता है; आवधिक B12 की निगरानी करें।"
      }
    ],
    drugInteractions: {
      "glimepiride": {
        en: "Moderate: Increased risk of low blood sugar (Hypoglycemia). Monitor blood glucose closely.",
        te: "మధ్యస్థం: రక్తంలో చక్కెర తగ్గడం (హైపోగ్లైకేమియా) ప్రమాదం ఉంది. గ్లూకోజ్ స్థాయిలను తనిఖీ చేయండి.",
        hi: "मध्यम: कम रक्त शर्करा (हाइपोग्लाइसीमिया) का खतरा। ग्लूकोज की बारीकी से निगरानी करें।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Take with or after meals to reduce gastrointestinal upset.",
        te: "కడుపు అసౌకర్యాన్ని తగ్గించడానికి భోజనంతో పాటు లేదా భోజనం తర్వాత తీసుకోండి.",
        hi: "पेट की खराबी को कम करने के लिए भोजन के साथ या बाद में लें।"
      },
      {
        en: "Stay well-hydrated throughout the day.",
        te: "రోజుమొత్తం తగినంత నీరు తాగుతూ ఉండండి.",
        hi: "दिन भर पर्याप्त मात्रा में पानी पीकर हाइड्रेटेड रहें।"
      }
    ]
  },
  {
    id: "amlodipine",
    name: "Amlodipine",
    category: "Calcium Channel Blocker (BP)",
    indication: {
      en: "Hypertension (High Blood Pressure) and Angina",
      te: "రక్తపోటు (అధిక బిపి) మరియు గుండె నొప్పి నివారణ",
      hi: "उच्च रक्तचाप और एनजाइना"
    },
    dietaryClashes: [
      {
        en: "Limit or avoid Grapefruit and Grapefruit juice (can increase Amlodipine concentration in blood, leading to sudden low blood pressure).",
        te: "గ్రేప్‌ఫ్రూట్ (పంపరపనస) రసాన్ని నివారించండి (రక్తంలో మందు గాఢతను పెంచి ఆకస్మికంగా బిపి తగ్గించవచ్చు).",
        hi: "ग्रेपफ्रूट (मौसमी) जूस से बचें (रक्त में दवा की एकाग्रता बढ़ सकती है और बीपी अचानक कम हो सकता है)।"
      },
      {
        en: "Reduce dietary sodium/salt intake to maximize blood pressure control.",
        te: "రక్తపోటు నియంత్రణ కోసం ఆహారంలో ఉప్పు (సోడియం) వాడకాన్ని తగ్గించండి.",
        hi: "रक्तचाप नियंत्रण को अधिकतम करने के लिए भोजन में नमक का सेवन कम करें।"
      }
    ],
    drugInteractions: {
      "atorvastatin": {
        en: "Minor: May slightly increase Atorvastatin levels. Monitor for muscle soreness.",
        te: "తక్కువ: అటోర్వాస్టాటిన్ స్థాయిలను స్వల్పంగా పెంచవచ్చు. కండరాల నొప్పులను గమనించండి.",
        hi: "मामूली: एटोरवास्टेटिन के स्तर को थोड़ा बढ़ा सकता है। मांसपेशियों के दर्द की निगरानी करें।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Avoid sudden posture changes (standing up too quickly) to prevent dizziness.",
        te: "కళ్ళు తిరగకుండా ఉండటానికి ఆకస్మికంగా నిలబడటం వంటి మార్పులను నివారించండి.",
        hi: "चक्कर आने से बचने के लिए अचानक खड़े होने जैसी स्थिति से बचें।"
      },
      {
        en: "Monitor ankles for mild swelling (peripheral edema).",
        te: "కాళ్ళ మడమల వాపు ఉందో లేదో గమనిస్తూ ఉండండి.",
        hi: "टखनों में हल्की सूजन की निगरानी करें।"
      }
    ]
  },
  {
    id: "atorvastatin",
    name: "Atorvastatin",
    category: "Statin (Lipid Lowering)",
    indication: {
      en: "High Cholesterol and Cardiovascular risk reduction",
      te: "అధిక కొలెస్ట్రాల్ మరియు గుండె జబ్బుల ప్రమాదాన్ని తగ్గించడం",
      hi: "उच्च कोलेस्ट्रॉल और हृदय जोखिम में कमी"
    },
    dietaryClashes: [
      {
        en: "Avoid large amounts of Grapefruit juice (>1 quart daily) as it inhibits CYP3A4 breakdown of statins, raising toxicity risk.",
        te: "గ్రేప్‌ఫ్రూట్ జ్యూస్ నివారించండి (ఇది స్టాటిన్ విషతుల్యత ప్రమాదాన్ని పెంచుతుంది).",
        hi: "अत्यधिक ग्रेपफ्रूट जूस से बचें (यह टॉक्सिसिटी का खतरा बढ़ाता है)।"
      },
      {
        en: "Avoid excessive alcohol consumption to prevent liver enzyme strain.",
        te: "కాలేయ ఆరోగ్యం కోసం ఆల్కహాల్ తీసుకోవడం నివారించండి.",
        hi: "लिवर के स्वास्थ्य के लिए अत्यधिक शराब से बचें।"
      }
    ],
    drugInteractions: {
      "amlodipine": {
        en: "Minor: May slightly increase Atorvastatin serum levels.",
        te: "తక్కువ: అటోర్వాస్టాటిన్ సీరం స్థాయిలను స్వల్పంగా పెంచవచ్చు.",
        hi: "मामूली: एटोरवास्टेटिन के स्तर को थोड़ा बढ़ा सकता है।"
      },
      "gemfibrozil": {
        en: "Severe: High risk of muscle damage (rhabdomyolysis). Avoid combination unless directed by cardiologist.",
        te: "తీవ్రమైనది: కండరాల దెబ్బతినే ప్రమాదం ఉంది. కార్డియాలజిస్ట్ సలహా లేకుండా ఈ కలయికను నివారించండి.",
        hi: "गंभीर: मांसपेशियों की क्षति का उच्च जोखिम। हृदय रोग विशेषज्ञ के बिना संयोजन से बचें।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Report unexplained muscle pain, tenderness, or weakness to your doctor immediately.",
        te: "కండరాల నొప్పులు లేదా బలహీనత ఉంటే వెంటనే మీ డాక్టర్‌కు తెలియజేయండి.",
        hi: "मांसपेशियों में दर्द या कमजोरी की स्थिति में तुरंत डॉक्टर को बताएं।"
      },
      {
        en: "Best taken in the evening or at bedtime.",
        te: "రాత్రి పడుకునే ముందు తీసుకోవడం ఉత్తమం.",
        hi: "रात को सोते समय लेना सबसे अच्छा है।"
      }
    ]
  },
  {
    id: "aspirin",
    name: "Aspirin (Low Dose 75-150mg)",
    category: "Antiplatelet / Blood Thinner",
    indication: {
      en: "Prevention of blood clots, heart attacks, and stroke",
      te: "రక్తం గడ్డకట్టడం, గుండెపోటు మరియు పక్షవాతం నివారణ",
      hi: "खून के थक्के, दिल के दौरे और स्ट्रोक की रोकथाम"
    },
    dietaryClashes: [
      {
        en: "Avoid alcohol as it compounds gastric mucosal irritation and increases GI bleeding risk.",
        te: "ఆల్కహాల్ నివారించండి (ఇది కడుపులో రక్తస్రావం ప్రమాదాన్ని పెంచుతుంది).",
        hi: "शराब से बचें (यह पेट में ब्लीडिंग का खतरा बढ़ाता है)।"
      },
      {
        en: "Limit high doses of Vitamin E or Ginkgo Biloba supplements without physician advice.",
        te: "డాక్టర్ సలహా లేకుండా అధిక విటమిన్ E లేదా జింకో బిలోబా సప్లిమెంట్లు వాడకండి.",
        hi: "डॉक्टर की सलाह के बिना विटामिन E की उच्च खुराक न लें।"
      }
    ],
    drugInteractions: {
      "ibuprofen": {
        en: "Moderate: Ibuprofen interferes with Aspirin's cardioprotective effect. Take Aspirin at least 30 mins before Ibuprofen.",
        te: "మధ్యస్థం: ఇబుప్రోఫెన్ ఆస్పిరిన్ గుండె సంరక్షణ ప్రభావాన్ని తగ్గిస్తుంది. ఆస్పిరిన్‌ను ఇబుప్రోఫెన్‌కు కనీసం 30 నిమిషాల ముందు తీసుకోండి.",
        hi: "मध्यम: इबूप्रोफेन एस्पिरिन के हृदय सुरक्षा प्रभाव में हस्तक्षेप करता है।"
      },
      "clopidogrel": {
        en: "High: Dual antiplatelet therapy significantly increases bleeding risk. Requires strict doctor oversight.",
        te: "అధికం: రక్తం పలచబడే మందుల కలయిక రక్తస్రావం ప్రమాదాన్ని పెంచుతుంది. డాక్టర్ పర్యవేక్షణ అవసరం.",
        hi: "उच्च: ब्लीडिंग का जोखिम काफी बढ़ जाता है। डॉक्टर की देखरेख की आवश्यकता है।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Take with food or a glass of milk to prevent stomach discomfort.",
        te: "కడుపు నొప్పి రాకుండా ఉండటానికి ఆహారంతో లేదా పాలతో తీసుకోండి.",
        hi: "पेट की परेशानी से बचने के लिए भोजन या दूध के साथ लें।"
      },
      {
        en: "Watch for signs of unexplained bruising or bleeding gums.",
        te: "చర్మంపై నల్లటి మచ్చలు లేదా చిగుళ్ళ నుండి రక్తస్రావం గమనించండి.",
        hi: "त्वचा पर नीले निशान या मसूड़ों से खून बहने पर ध्यान दें।"
      }
    ]
  },
  {
    id: "lisinopril",
    name: "Lisinopril / Telmisartan",
    category: "ACE Inhibitor / ARB (BP)",
    indication: {
      en: "Blood pressure management and kidney protection",
      te: "రక్తపోటు నియంత్రణ మరియు మూత్రపిండాల సంరక్షణ",
      hi: "रक्तचाप प्रबंधन और गुर्दे की सुरक्षा"
    },
    dietaryClashes: [
      {
        en: "Avoid Potassium salt substitutes or high-dose Potassium supplements (risk of elevated blood potassium / Hyperkalemia).",
        te: "పొటాషియం సాల్ట్ లేదా సప్లిమెంట్లు వాడకండి (రక్తంలో పొటాషియం పెరిగే ప్రమాదం ఉంది).",
        hi: "पोटेशियम नमक के विकल्पों से बचें (हाइपरकलेमिया का खतरा)।"
      },
      {
        en: "Limit alcohol consumption.",
        te: "ఆల్కహాల్ తీసుకోవడం పరిమితం చేయండి.",
        hi: "शराब का सेवन सीमित करें।"
      }
    ],
    drugInteractions: {
      "ibuprofen": {
        en: "Moderate: Regular NSAID use reduces blood pressure lowering efficacy and increases kidney strain.",
        te: "మధ్యస్థం: పెయిన్ కిల్లర్స్ వాడకం బిపి నియంత్రణను తగ్గిస్తుంది మరియు మూత్రపిండాలపై భారం పెంచుతుంది.",
        hi: "मध्यम: नियमित पेनकिलर का उपयोग बीपी नियंत्रण कम करता है।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Report persistent dry cough (if on Lisinopril) or lightheadedness to your physician.",
        te: "వరుసగా పొడి దగ్గు లేదా తలతిరుగుడు ఉంటే డాక్టర్‌కు తెలియజేయండి.",
        hi: "लगातार सूखी खांसी या चक्कर आने पर डॉक्टर को सूचित करें।"
      },
      {
        en: "Stay hydrated during hot weather or strenuous exercise.",
        te: "ఎండలో లేదా వ్యాయామం చేసేటప్పుడు తగినంత నీరు తాగండి.",
        hi: "गर्मी या व्यायाम के दौरान हाइड्रेटेड रहें।"
      }
    ]
  },
  {
    id: "levothyroxine",
    name: "Levothyroxine",
    category: "Thyroid Hormone",
    indication: {
      en: "Hypothyroidism (Underactive Thyroid)",
      te: "హైపోథైరాయిడిజమ్ (థైరాయిడ్ లోపం)",
      hi: "हाइपोथायरायडिज्म (कम सक्रिय थायराइड)"
    },
    dietaryClashes: [
      {
        en: "Do NOT take alongside Calcium, Iron supplements, Soy, or high-fiber foods.",
        te: "కాల్సియం, ఐరన్ సప్లిమెంట్లు లేదా సోయా తో కలిపి తీసుకోవద్దు.",
        hi: "कैल्शियम, आयरन या सोया के साथ न लें।"
      },
      {
        en: "Wait at least 30 to 60 minutes before drinking coffee or eating breakfast after taking your tablet.",
        te: "మాత్ర వేసుకున్న తర్వాత కాఫీ లేదా అల్పాహారం తినడానికి కనీసం 30-60 నిమిషాలు వేచి ఉండండి.",
        hi: "गोली लेने के बाद कॉफी या नाश्ते से पहले कम से कम 30-60 मिनट प्रतीक्षा करें।"
      }
    ],
    drugInteractions: {
      "calcium_carbonate": {
        en: "Moderate: Calcium binds thyroid hormone and blocks absorption. Separate doses by at least 4 hours.",
        te: "మధ్యస్థం: కాల్సియం థైరాయిడ్ హార్మోన్ గ్రహణ శక్తిని అడ్డుకుంటుంది. కనీసం 4 గంటల విరామం ఇవ్వండి.",
        hi: "मध्यम: कैल्शियम थायराइड हार्मोन के अवशोषण को रोकता है। कम से कम 4 घंटे का अंतर रखें।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Take first thing in the morning on an empty stomach with a full glass of plain water.",
        te: "ఉదయం పరిగడుపున ఒక పూర్తి గ్లాసు నీటితో తీసుకోండి.",
        hi: "सुबह खाली पेट एक गिलास पानी के साथ लें।"
      }
    ]
  },
  {
    id: "omeprazole",
    name: "Omeprazole / Pantoprazole",
    category: "Proton Pump Inhibitor (PPI)",
    indication: {
      en: "Acid Reflux, GERD, and Stomach Ulcers",
      te: "ఎసిడిటీ, అల్సర్లు మరియు గుండె మంట నివారణ",
      hi: "एसिड रिफ्लक्स, जीईआरडी और पेट के छाले"
    },
    dietaryClashes: [
      {
        en: "Long-term use (>1 year) can reduce Vitamin B12, Magnesium, and Calcium absorption.",
        te: "దీర్ఘకాలిక వాడకం విటమిన్ B12 మరియు మెగ్నీషియం గ్రహణ శక్తిని తగ్గిస్తుంది.",
        hi: "दीर्घकालिक उपयोग विटामिन B12 और मैग्नीशियम अवशोषण घटा सकता है।"
      },
      {
        en: "Avoid spicy, greasy, or caffeine-heavy foods that trigger acid secretion.",
        te: "కారం మరియు వేయించిన ఆహారాలు నివారించండి.",
        hi: "मसालेदार और तले हुए भोजन से बचें।"
      }
    ],
    drugInteractions: {
      "clopidogrel": {
        en: "Moderate: Omeprazole may reduce activation of Clopidogrel. Discuss alternatives like Pantoprazole with your doctor.",
        te: "మధ్యస్థం: ఒమెప్రజోల్ క్లోపిడోగ్రెల్ ప్రభావాన్ని తగ్గించవచ్చు. డాక్టర్‌తో చర్చించండి.",
        hi: "मध्यम: ओमेप्राजोल क्लोपिडोग्रेल की प्रभावशीलता कम कर सकता है।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Take 30 to 60 minutes before your first meal of the day.",
        te: "రోజులో మొదటి ఆహారానికి 30-60 నిమిషాల ముందు తీసుకోండి.",
        hi: "दिन के पहले भोजन से 30-60 मिनट पहले लें।"
      }
    ]
  },
  {
    id: "clopidogrel",
    name: "Clopidogrel",
    category: "Antiplatelet Agent",
    indication: {
      en: "Prevents blood clots after stenting or stroke",
      te: "స్టెంటింగ్ లేదా పక్షవాతం తర్వాత రక్తం గడ్డకట్టకుండా నిరోధిస్తుంది",
      hi: "स्टेंटिंग या स्ट्रोक के बाद खून के थक्कों को रोकता है"
    },
    dietaryClashes: [
      {
        en: "Avoid excessive garlic, ginger, or green tea supplements in concentrated form (may enhance antiplatelet effect).",
        te: "అల్లం, వెల్లుల్లి లేదా గ్రీన్ టీ అధికంగా తీసుకోవడం నివారించండి.",
        hi: "अत्यधिक लहसुन, अदरक या ग्रीन टी सप्लीमेंट से बचें।"
      }
    ],
    drugInteractions: {
      "aspirin": {
        en: "High: Combination increases bleeding risk. Used under strict cardiovascular supervision.",
        te: "అధికం: రక్తం పలచబడే మందుల కలయిక రక్తస్రావం ప్రమాదాన్ని పెంచుతుంది.",
        hi: "उच्च: ब्लीडिंग का जोखिम काफी बढ़ जाता है।"
      }
    },
    lifestyleAdvice: [
      {
        en: "Inform dentists and surgeons that you take Clopidogrel prior to any procedure.",
        te: "ఏదైనా శస్త్రచికిత్స లేదా డెంటల్ చికిత్సకు ముందు డాక్టర్‌కు క్లోపిడోగ్రెల్ వాడుతున్నట్లు తెలియజేయండి.",
        hi: "किसी भी सर्जरी या दंत चिकित्सा से पहले डॉक्टर को बताएं।"
      }
    ]
  }
];

export interface InteractionCheckResult {
  selectedMeds: MedicationInfo[];
  dietaryWarnings: string[];
  drugDrugWarnings: { med1: string; med2: string; warning: string }[];
  lifestyleTips: string[];
}

export function checkMedicationInteractions(selectedIds: string[], lang: Language = "en"): InteractionCheckResult {
  const selectedMeds = COMMON_MEDICATIONS.filter(m => selectedIds.includes(m.id));
  const dietaryWarnings: string[] = [];
  const drugDrugWarnings: { med1: string; med2: string; warning: string }[] = [];
  const lifestyleTips: string[] = [];

  const lKey = lang || "en";

  // Collect dietary clashes & lifestyle advice
  selectedMeds.forEach(med => {
    med.dietaryClashes.forEach(d => {
      const text = d[lKey] || d.en;
      const formatted = `[${med.name}] ${text}`;
      if (!dietaryWarnings.includes(formatted)) dietaryWarnings.push(formatted);
    });
    med.lifestyleAdvice.forEach(l => {
      const text = l[lKey] || l.en;
      const formatted = `[${med.name}] ${text}`;
      if (!lifestyleTips.includes(formatted)) lifestyleTips.push(formatted);
    });
  });

  // Check drug-drug interactions between selected meds
  for (let i = 0; i < selectedMeds.length; i++) {
    for (let j = i + 1; j < selectedMeds.length; j++) {
      const m1 = selectedMeds[i];
      const m2 = selectedMeds[j];

      if (m1.drugInteractions[m2.id]) {
        const warnText = m1.drugInteractions[m2.id][lKey] || m1.drugInteractions[m2.id].en;
        drugDrugWarnings.push({ med1: m1.name, med2: m2.name, warning: warnText });
      } else if (m2.drugInteractions[m1.id]) {
        const warnText = m2.drugInteractions[m1.id][lKey] || m2.drugInteractions[m1.id].en;
        drugDrugWarnings.push({ med1: m2.name, med2: m1.name, warning: warnText });
      }
    }
  }

  return {
    selectedMeds,
    dietaryWarnings,
    drugDrugWarnings,
    lifestyleTips
  };
}
