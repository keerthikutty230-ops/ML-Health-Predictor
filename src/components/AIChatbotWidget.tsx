"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquareText, X, Send, Bot, Sparkles, ShieldCheck, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Language } from "@/lib/translations";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

interface AIChatbotWidgetProps {
  lang?: Language;
  onMessageLogged?: (userQuery: string, aiResponse: string) => void;
}

const QUICK_PROMPTS_DICT: Record<Language, string[]> = {
  en: ["Interpret my risk score", "Find nearby AP hospitals", "What is normal blood pressure?", "Emergency 108 info"],
  te: ["నా ఆరోగ్య ప్రమాదాన్ని వివరించండి", "సమీప AP ఆసుపత్రులను కనుగొనండి", "సాధారణ రక్తపోటు పరిమితి ఎంత?", "108 అత్యవసర సమాచారం"],
  hi: ["मेरे जोखिम स्कोर की व्याख्या करें", "निकटतम AP अस्पताल खोजें", "सामान्य रक्तचाप की सीमा क्या है?", "108 आपातकालीन जानकारी"],
  ta: ["எனது அபாய அளவை ব্যাখ্যা செய்யவும்", "அருகிலுள்ள மருத்துவமனைகளைக் கண்டறியவும்", "சாதாரண ரத்த அழுத்தம் என்ன?", "108 அவசரத் தகவல்"],
  kn: ["ನನ್ನ ಅಪಾಯದ ಅಂಕವನ್ನು ವಿವರಿಸಿ", "ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಿ", "ಸಾಮಾನ್ಯ ರಕ್ತದೊತ್ತಡ ಎಂದರೇನು?", "108 ತುರ್ತು ಮಾಹಿತಿ"],
  ml: ["എന്റെ റിസ്ക് സ്കോർ വിശദീകരിക്കുക", "സമീപത്തുള്ള ആശുപത്രികൾ കണ്ടെത്തുക", "സാധാരണ രക്തസമ്മർദ്ദം എന്താണ്?", "108 അടിയന്തിര വിവരം"],
  or: ["ମୋର ସଙ୍କଟ ସ୍କୋର ବ୍ୟାଖ୍ୟା କରନ୍ତୁ", "ନିକଟସ୍ଥ ହସ୍ପିଟାଲ୍ ଖୋଜନ୍ତୁ", "ସାଧାରଣ ରକ୍ତଚାପ କ'ଣ?", "108 ଜରୁରୀକାଳୀନ ସୂଚନା"],
  bn: ["আমার ঝুঁকির স্কোর ব্যাখ্যা করুন", "নিকটস্থ হাসপাতাল খুঁজুন", "সাধারণ রক্তচাপ কী?", "১০৮ জরুরি তথ্য"],
  ur: ["میرے خطرے کے اسکور کی وضاحت کریں", "قریب ترین ہسپتال تلاش کریں", "نارمل بلڈ پریشر کیا ہے؟", "108 ہنگامی معلومات"],
  pa: ["ਮੇਰੇ ਜੋਖਮ ਸਕੋਰ ਦੀ ਵਿਆਖਿਆ ਕਰੋ", "ਨੇੜਲੇ ਹਸਪਤਾਲ ਲੱਭੋ", "ਆਮ ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ ਕੀ ਹੈ?", "108 ਐਮਰਜੈਂਸੀ ਜਾਣਕਾਰੀ"],
};

const INITIAL_BOT_MSG: Record<Language, string> = {
  en: "Welcome to HealthPredict AI. I am here to assist you with your clinical health intelligence queries, risk predictions, and regional hospital routing across Andhra Pradesh. How may I help you today?",
  te: "హెల్త్ ప్రెడిక్ట్ AI కి స్వాగతం! నేను మీ క్లినికల్ ఆరోగ్య సహాయకుడిని. ఆంధ్రప్రదేశ్ వ్యాప్తంగా మీ ఆరోగ్య అంచనాలు, ఆసుపత్రుల వివరాలు మరియు మందుల భద్రత గురించి నన్ను అడగండి.",
  hi: "हेल्थप्रेडिक्ट AI में आपका स्वागत है। मैं यहां आपके नैदानिक स्वास्थ्य प्रश्नों, जोखिम अनुमानों और आंध्र प्रदेश के अस्पतालों के विवरण में सहायता के लिए हूं।",
  ta: "ஹெல்த்பிரெடிக்ட் AI க்கு வரவேற்கிறோம்! உங்கள் சுகாதார சந்தேகங்கள் மற்றும் ஆந்திர மருத்துவமனை விவரங்களுக்கு உதவ நான் প্রস্তুত.",
  kn: "ಹೆಲ್ತ್‌ಪ್ರೆಡಿಕ್ಟ್ AI ಗೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಆರೋಗ್ಯ ಪ್ರಶ್ನೆಗಳು ಮತ್ತು ಆಂಧ್ರಪ್ರದೇಶದ ಆಸ್ಪತ್ರೆಗಳ ವಿವರಗಳಿಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನಿದ್ದೇನೆ.",
  ml: "ഹെൽത്ത്പ്രെഡിക്റ്റ് AI-ലേക്ക് സ്വാഗതം! നിങ്ങളുടെ ആരോഗ്യ സംശയങ്ങൾക്കും ആശുപത്രി വിവരങ്ങൾക്കും സഹായിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്.",
  or: "ହେଲଥପ୍ରେଡିକ୍ଟ AI କୁ ସ୍ୱାଗତ! ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶ୍ନ ଏବଂ ହସ୍ପିଟାଲ୍ ସୂଚନା ପାଇଁ ମୁଁ ଏଠାରେ ଅଛି।",
  bn: "হেলথপ্রেডিক্ট AI-তে স্বাগতম! আপনার স্বাস্থ্য সংক্রান্ত প্রশ্ন ও অন্ধ্রপ্রদেশ হাসপাতাল তথ্যের জন্য আমি সাহায্য করতে প্রস্তুত।",
  ur: "ہیلتھ پریڈکٹ AI میں خوش آمدید! میں آپ کی صحت کے سوالات اور آندھرا پردیش کے ہسپتالوں کی معلومات کے لیے حاضر ہوں۔",
  pa: "ਹੈਲਥਪ੍ਰੈਡਿਕਟ AI ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ! ਮੈਂ ਤੁਹਾਡੇ ਸਿਹਤ ਸਵਾਲਾਂ ਅਤੇ ਹਸਪਤਾਲਾਂ ਦੀ ਜਾਣਕਾਰੀ ਲਈ ਇੱਥੇ ਹਾਂ।",
};

export default function AIChatbotWidget({ lang = "en", onMessageLogged }: AIChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Re-initialize initial greeting when language changes
  useEffect(() => {
    setMessages([
      {
        id: "1",
        sender: "bot",
        text: INITIAL_BOT_MSG[lang] || INITIAL_BOT_MSG.en,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [lang]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const generateBotReply = (userQuery: string): string => {
    const q = userQuery.trim().toLowerCase();

    // TELUGU BOT RESPONSES
    if (lang === "te") {
      if (/^(hi|hello|hey|namaste|నమస్కారం)/i.test(q)) {
        return "హెల్త్ ప్రెడిక్ట్ AI కి స్వాగతం! ఆంధ్రప్రదేశ్ వ్యాప్తంగా మీ ఆరోగ్య ప్రమాద అంచనాలు, ఆసుపత్రుల మార్గాలు మరియు మందుల భద్రత గురించి సమాధానాలు ఇవ్వడానికి నేను ఇక్కడ ఉన్నాను. ఈ రోజు నేను మీకు ఎలా సహాయపడగలను?";
      }
      if (/^(thank|thanks|ధన్యవాదాలు|ఓకే)/i.test(q)) {
        return "మీకు సహాయపడినందుకు చాలా సంతోషం! ఈ సమాచారం ఉపయోగపడిందని ఆశిస్తున్నాను. వ్యక్తిగత వైద్య సలహాల కోసం దయచేసి అర్హత కలిగిన వైద్యుడిని సంప్రదించండి. జాగ్రత్తగా ఉండండి!";
      }
      if (q.includes("108") || q.includes("అత్యవసర")) {
        return "🚨 అత్యవసర ప్రక్రియ:\nతీవ్రమైన గుండెనొప్పి, శ్వాస తీసుకోవడంలో ఇబ్బంది లేదా అధిక రక్తపోటు సంకేతాలు ఉంటే వెంటనే 108 (ఆంధ్రప్రదేశ్ అత్యవసర సేవలు) కి కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్లండి.";
      }
      if (q.includes("ఆసుపత్రి") || q.includes("కనుగొనండి") || q.includes("విజయవాడ")) {
        return "మేము విజయవాడ, విశాఖపట్నం, గుంటూరు, తిరుపతి వంటి 14 ఆంధ్రప్రదేశ్ నగరాల్లో 33 నిజమైన ఆసుపత్రులతో అనుసంధానించబడి ఉన్నాము. 24/7 అత్యవసర సేవలు మరియు వైద్యుల డైరెక్టరీ ఆధారంగా మీరు ఆసుపత్రులను ఎంచుకోవచ్చు.";
      }
      if (q.includes("రక్తపోటు") || q.includes("పరిమితి") || q.includes("సాధారణ")) {
        return "సాధారణ వైద్య పరిమితులు:\n• సిస్టోలిక్ బిపి: 90–120 mmHg\n• డయాస్టోలిక్ బిపి: 60–80 mmHg\n• బ్లడ్ షుగర్ (ఫాస్టింగ్): 70–100 mg/dL\n• కొలెస్ట్రాల్: <200 mg/dL.";
      }
      return "హెల్త్ ప్రెడిక్ట్ AI ఆరోగ్య ప్రమాద అంచనాలు, రోగుల సారూప్యత మరియు ఆంధ్రప్రదేశ్ ఆసుపత్రుల సేవలను అందిస్తుంది. వ్యక్తిగత వైద్య నిర్ధారణ కోసం అర్హత కలిగిన వైద్యుడిని సంప్రదించండి.";
    }

    // HINDI BOT RESPONSES
    if (lang === "hi") {
      if (/^(hi|hello|hey|namaste|नमस्ते|नमस्कार)/i.test(q)) {
        return "हेल्थप्रेडिक्ट AI में आपका स्वागत है। मैं यहां आपके नैदानिक स्वास्थ्य प्रश्नों, जोखिम अनुमानों और आंध्र प्रदेश के अस्पतालों के विवरण में सहायता के लिए हूं। आज मैं आपकी क्या मदद कर सकता हूं?";
      }
      if (/^(thank|thanks|धन्यवाद|शुक्रिया|बाय)/i.test(q)) {
        return "आपका बहुत-बहुत स्वागत है! मुझे उम्मीद है कि जानकारी उपयोगी रही होगी। कृपया किसी भी व्यक्तिगत चिकित्सीय चिंता के लिए किसी योग्य डॉक्टर से परामर्श लें। अपना ख्याल रखें!";
      }
      if (q.includes("108") || q.includes("आपातकालीन")) {
        return "🚨 आपातकालीन प्रोटोकॉल:\nयदि सीने में तेज दर्द या सांस लेने में तकलीफ हो, तो तुरंत 108 (आंध्र प्रदेश आपातकालीन सेवा) पर कॉल करें या नजदीकी अस्पताल जाएं।";
      }
      if (q.includes("अस्पताल") || q.includes("खोजें") || q.includes("विजयवाड़ा")) {
        return "हम विजयवाड़ा, विशाखापट्टनम, गुंटूर, तिरुपति जैसे 14 आंध्र प्रदेश शहरों के 33 अस्पतालों से जुड़े हैं। आप 24/7 आपातकालीन सुविधाओं के आधार पर अस्पतालों को फ़िल्टर कर सकते हैं।";
      }
      if (q.includes("रक्तचाप") || q.includes("सामान्य") || q.includes("सीमा")) {
        return "मानक क्लिनिकल सामान्य सीमाएँ:\n• सिस्टोलिक बीपी: 90–120 mmHg\n• डायस्टोलिक बीपी: 60–80 mmHg\n• फास्टिंग ग्लूकोज: 70–100 mg/dL\n• कोलेस्ट्रॉल: <200 mg/dL.";
      }
      return "हेल्थप्रेडिक्ट AI स्वास्थ्य जोखिम मूल्यांकन और अस्पताल रूटिंग प्रदान करता है। व्यक्तिगत चिकित्सा सलाह के लिए कृपया किसी डॉक्टर से परामर्श लें।";
    }

    // ENGLISH BOT RESPONSES
    if (/^(hi|hello|hey|namaste|good morning|good afternoon|good evening|greetings)/i.test(q)) {
      return "Welcome to HealthPredict AI. I am here to assist you with your clinical health intelligence queries, risk predictions, and regional hospital routing across Andhra Pradesh. How may I help you today?";
    }
    if (/^(thank|thanks|thank you|okay bye|bye|goodbye|see you|take care)/i.test(q)) {
      return "You're very welcome. I hope you found the information helpful. Please consult a qualified physician for any personal medical concerns. Take care and stay healthy!";
    }
    if (q.includes("108") || q.includes("emergency")) {
      return "🚨 Emergency Protocol:\nIf you or someone nearby is experiencing acute symptoms like severe chest pain, breathlessness, loss of consciousness, or sudden stroke symptoms, call 108 (Andhra Pradesh Emergency Services) immediately or visit your nearest hospital emergency department.";
    }
    // Cardiology / Heart Care Routing
    if (q.includes("cardio") || q.includes("heart") || q.includes("chest") || q.includes("cardiac")) {
      return "❤️ Verified Cardiology & Heart Care Centers:\n\n• Vijayawada:\n  - Aster Ramesh Hospital (MG Road / Ramavarappadu) – 24/7 Primary Angioplasty & Emergency Cath Lab\n  - Manipal Hospitals (Sundharayya Nagar) – Comprehensive Tertiary Cardiac Surgery\n  - Kamineni Hospitals (Tadigadapa / Autonagar) – Advanced Interventional Cardiology\n\n• Visakhapatnam:\n  - KIMS ICON Hospital (Sheela Nagar) – 24/7 Cardiac Emergency Care\n  - Apollo Hospitals (Health City, Arilova) – Advanced Heart Care\n\n• Guntur:\n  - Aster Ramesh Hospital (Collectorate Road) – Dedicated Cardiac Care\n\n🚨 For acute chest pain or emergency distress, call 108 immediately.";
    }

    // Neurology / Brain & Spine Routing
    if (q.includes("neuro") || q.includes("brain") || q.includes("spine") || q.includes("stroke") || q.includes("headache") || q.includes("migraine")) {
      return "🧠 Verified Neurology & Stroke Rehabilitation Centers:\n\n• Vijayawada:\n  - Aster Ramesh Hospital (MG Road) – 24/7 Acute Stroke Intervention & Neuro-ICU\n  - Kamineni Hospitals (Tadigadapa / Autonagar) – Brain & Spine Microsurgery\n  - Manipal Hospitals (Sundharayya Nagar) – Comprehensive Neurological Sciences\n  - M J Naidu Super Speciality Hospital (Moghalrajpuram) – Neuro-trauma & Spine Center\n\n• Visakhapatnam:\n  - Apollo Hospitals (Health City, Arilova) – Comprehensive Neuro-Sciences\n  - Care Hospitals (Maharanipeta) – Stroke Care";
    }

    // Hospital / General / City Routing
    if (q.includes("hospital") || q.includes("vijayawada") || q.includes("visakhapatnam") || q.includes("guntur") || q.includes("tirupati") || q.includes("near me") || q.includes("clinic") || q.includes("checkup")) {
      if (q.includes("vijayawada") || q.includes("near me") || !q.includes("visakhapatnam") && !q.includes("guntur") && !q.includes("tirupati")) {
        return "🏥 Verified Hospitals in Vijayawada Matching Medical Categories:\n\n1. Cardiology & Emergency Heart Care:\n   • Aster Ramesh Hospital (MG Road / Ramavarappadu)\n   • Manipal Hospitals (Sundharayya Nagar)\n   • Kamineni Hospitals (Tadigadapa / Autonagar)\n\n2. Neurology, Brain & Spine:\n   • Aster Ramesh Hospital (MG Road)\n   • Kamineni Hospitals (Tadigadapa / Autonagar)\n   • Manipal Hospitals (Sundharayya Nagar)\n   • M J Naidu Super Speciality Hospital (Moghalrajpuram)\n\n3. General Multispecialty & Comprehensive Checkups:\n   • Union Hospitals (Governorpet)\n   • Aayush NRI Healthcare (Kanuru)\n   • Andhra Hospitals (Governorpet / Gollapudi)\n\nAll facilities feature 24/7 ER availability, verified doctor ratings, and direct OPD routing.";
      }
      if (q.includes("visakhapatnam") || q.includes("vizag")) {
        return "🏥 Verified Hospitals in Visakhapatnam:\n• KIMS ICON Hospital (Sheela Nagar) – 24/7 Trauma, Cardiology & Multi-organ ICU\n• Apollo Hospitals (Health City, Arilova) – Comprehensive Oncology, Neurology & Cardiology\n• Care Hospitals (Maharanipeta) – Interventional Cardiac & Critical Care\n• Medicover Hospitals (Maharanipeta) – Multispecialty Clinical Care";
      }
      if (q.includes("guntur")) {
        return "🏥 Verified Hospitals in Guntur:\n• Aster Ramesh Hospital (Collectorate Road) – Advanced Cardiac & Critical Care\n• NRI General Hospital (Chinakaani) – 1000+ Bed Super Speciality & Trauma Center\n• Lalitha Super Specialities (Kothapet) – Interventional Cardiology & Neurosurgery\n• Tirumala Multi Speciality (Arundalpet) – Internal Medicine & Nephrology";
      }
      if (q.includes("tirupati")) {
        return "🏥 Verified Hospitals in Tirupati:\n• SVIMS Institute (Alipiri Road) – Premier Tertiary & Research Hospital (1000+ Beds)\n• Amara Hospital (Karakambadi Road) – Advanced Emergency, Neuro & Trauma Care\n• Apollo Clinic (Renigunta Road) – Multispecialty Consultations & Diagnostics";
      }
      return "HealthPredict AI is connected to 33 empaneled healthcare facilities across 14 Andhra Pradesh cities (including Vijayawada, Visakhapatnam, Guntur, Tirupati, Kakinada, Nellore, and Kurnool). Filter by 24/7 ER availability or doctor specialty ratings in the hospital recommendations section.";
    }

    if (q.includes("blood pressure") || q.includes("bp") || q.includes("normal") || q.includes("dimension")) {
      return "Standard Clinical Dimensions & Normal Ranges:\n• Systolic Blood Pressure: 90–120 mmHg (<120 optimal)\n• Diastolic Blood Pressure: 60–80 mmHg (<80 optimal)\n• Fasting Glucose: 70–100 mg/dL\n• Total Cholesterol: <200 mg/dL\n• Resting Heart Rate: 60–100 bpm.";
    }
    if (q.includes("risk") || q.includes("interpret") || q.includes("score")) {
      return "HealthPredict AI evaluates 8 clinical biomarkers using a Gradient Boosting model to stratify chronic disease risk:\n🟢 Low Risk: Biometrics in healthy optimal range.\n🟡 Moderate Risk: Early elevation; lifestyle adjustments and temporary OTC precautions provided.\n🔴 High Risk: Significant elevation; immediate 108 Emergency escalation and specialist consultation required.";
    }
    if (q.includes("knn") || q.includes("similarity") || q.includes("proof")) {
      return "KNN Clinical Similarity Proofs use standardized Z-score Euclidean distance matching across 500 Kaggle clinical records to find the 2 closest historical patient cases in the exact same risk tier, displaying trait deviations and historical progression notes.";
    }
    if (q.includes("medication") || q.includes("prescription") || q.includes("drug") || q.includes("checker")) {
      return "The Prescription & Medication Interaction Checker evaluates drug-drug clashes (e.g. Aspirin + Ibuprofen), food clashes (e.g. Amlodipine + Grapefruit juice), and provides safe administration timing advice.";
    }

    return "HealthPredict AI provides educational clinical decision support. For personalized medical advice or acute emergencies, please consult a qualified physician or contact 108 (AP Emergency Services).";
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const replyText = generateBotReply(text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);

      if (onMessageLogged) {
        onMessageLogged(text, replyText);
      }
    }, 500);
  };

  const quickPrompts = QUICK_PROMPTS_DICT[lang] || QUICK_PROMPTS_DICT.en;

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden font-sans">
      
      {/* CHAT DRAWER PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            className="w-80 sm:w-96 h-[510px] rounded-2xl bg-[#F4EBDD]/95 backdrop-blur-2xl border-2 border-[#1E3F20]/30 shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* CHAT HEADER */}
            <div className="bg-[#EED4AC] border-b border-[#0D0B09]/10 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-9 w-9 rounded-xl bg-[#1E3F20] flex items-center justify-center shadow-md shadow-[#1E3F20]/20">
                    <Stethoscope className="h-5 w-5 text-[#F4EBDD]" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#EED4AC] animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#0D0B09] flex items-center gap-1.5">
                    AI Health Assistant <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                  </h4>
                  <p className="text-[10px] font-semibold text-emerald-800">Online · AP Health Intelligence ({lang.toUpperCase()})</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-lg bg-[#F4EBDD] text-[#0D0B09]/60 hover:text-[#0D0B09] hover:bg-[#EED4AC] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CHAT MESSAGES SCROLL AREA */}
            <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-[#1E3F20] text-[#F4EBDD] rounded-br-none shadow-md font-medium"
                        : "bg-[#EED4AC]/55 text-[#0D0B09] border border-[#0D0B09]/10 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-[#0D0B09]/60 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 text-xs text-[#0D0B09]/60 p-2 bg-[#EED4AC]/55 rounded-xl w-fit border border-[#0D0B09]/10">
                  <Bot className="h-4 w-4 text-[#1E3F20] animate-spin" />
                  <span className="italic">AI Assistant thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* QUICK-ACTION PILLS */}
            <div className="px-3 py-2 bg-[#EED4AC]/20 border-t border-[#0D0B09]/10 overflow-x-auto flex gap-1.5 scrollbar-none">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(qp)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#F4EBDD] text-[#0D0B09] border border-[#0D0B09]/15 hover:bg-[#1E3F20] hover:text-[#F4EBDD] transition-all shrink-0 shadow-sm cursor-pointer"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* INPUT FIELD & SEND BUTTON */}
            <div className="p-3 bg-[#EED4AC] border-t border-[#0D0B09]/10 flex items-center gap-2">
              <input
                type="text"
                placeholder={lang === "te" ? "ప్రశ్నలు అడగండి..." : lang === "hi" ? "प्रश्न पूछें..." : "Ask questions..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-[#F4EBDD] border border-[#0D0B09]/10 rounded-xl px-3 py-2 text-xs text-[#0D0B09] focus:outline-none focus:border-[#1E3F20]/60 placeholder:text-[#0D0B09]/40"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="h-9 w-9 rounded-xl bg-[#1E3F20] hover:bg-[#152e17] disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 shadow-md cursor-pointer"
              >
                <Send className="h-4 w-4 text-[#F4EBDD]" />
              </button>
            </div>

            {/* DISCLAIMER FOOTER */}
            <div className="px-3 py-1 bg-[#EED4AC] text-[9px] text-[#0D0B09]/60 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3 text-[#1E3F20]" /> Educational support tool. Consult a doctor for diagnosis.
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING TRIGGER BUBBLE */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#C7D3C0] hover:bg-[#b8c5b1] text-[#1E3F20] shadow-xl border border-[#1E3F20]/10 transition-all cursor-pointer"
      >
        <div className="relative">
          <Stethoscope className="h-5 w-5 text-[#1E3F20]" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-600 border-2 border-[#C7D3C0] animate-ping" />
        </div>
        <span className="font-bold text-xs">AI Health Assistant</span>
        <span className="bg-[#1E3F20]/10 text-[#1E3F20] border border-[#1E3F20]/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
          Online
        </span>
      </motion.button>

    </div>
  );
}
