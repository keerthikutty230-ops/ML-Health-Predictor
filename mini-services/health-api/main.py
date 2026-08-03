import logging
logger = logging.getLogger("health-api")
"""
AI Health Risk Predictor - Enhanced FastAPI Backend
=====================================================
1. Auto-generates 500-patient synthetic dataset (Pima Indians / Synthea inspired)
2. Gradient Boosting Classifier for chronic disease risk (Low / Moderate / High)
3. KNN cosine similarity for historical patient matching
4. Location-aware hospital recommender (City + State filtering)
5. Conditional OTC medication guidance (Moderate only; High triggers emergency escalation)
6. Google Gemini AI integration for executive medical summaries

Data Source:  Synthetic dataset generated on startup using numpy with seed=42,
              modeled after Pima Indians Diabetes Dataset (Kaggle benchmark)
              extended with cardiovascular risk factors. No external download.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("health-api")

app = FastAPI(title="AI Health Risk Predictor API", description="Enhanced ML backend with location-aware hospital recommendations and conditional care guidance", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

model = None
scaler = None
nn_model = None
df_patients = None
df_hospitals = None
FEATURE_COLS = ["age", "bmi", "blood_pressure_systolic", "blood_pressure_diastolic", "glucose", "cholesterol", "heart_rate", "insulin"]


# ========================================================================
# 1. SYNTHETIC DATA GENERATION
# ========================================================================
def generate_synthetic_dataset(n_patients=500, seed=42):
    rng = np.random.RandomState(seed)
    ages = rng.normal(48, 14, n_patients).clip(18, 80).astype(int)
    bmis = rng.normal(28.5, 6.5, n_patients).clip(16, 50).round(1)
    bp_sys = rng.normal(130, 22, n_patients).clip(90, 200).astype(int)
    bp_dia = rng.normal(85, 14, n_patients).clip(55, 130).astype(int)
    glucose = rng.normal(115, 35, n_patients).clip(60, 250).astype(int)
    cholesterol = rng.normal(210, 45, n_patients).clip(100, 400).astype(int)
    heart_rate = rng.normal(75, 12, n_patients).clip(50, 120).astype(int)
    insulin = rng.lognormal(3.5, 0.8, n_patients).clip(2, 500).round(1)

    risk_score = np.zeros(n_patients)
    risk_score += np.where(ages > 50, 0.15, 0.0) + np.where(ages > 65, 0.15, 0.0)
    risk_score += np.where(bmis > 25, 0.1, 0.0) + np.where(bmis > 30, 0.15, 0.0)
    risk_score += np.where(bp_sys > 130, 0.1, 0.0) + np.where(bp_sys > 140, 0.15, 0.0) + np.where(bp_dia > 90, 0.1, 0.0)
    risk_score += np.where(glucose > 100, 0.15, 0.0) + np.where(glucose > 126, 0.2, 0.0)
    risk_score += np.where(cholesterol > 200, 0.1, 0.0) + np.where(cholesterol > 240, 0.15, 0.0)
    risk_score += rng.normal(0, 0.12, n_patients)
    risk_score = risk_score.clip(0, 1)

    def score_to_label(s):
        if s < 0.33: return "low"
        elif s < 0.60: return "moderate"
        else: return "high"
    risk_labels = [score_to_label(s) for s in risk_score]

    def generate_diagnosis(risk, age, bmi, glucose, chol, sys_bp, dia_bp):
        conditions = []
        if risk == "high":
            if glucose > 126: conditions.append("Type 2 Diabetes")
            if chol > 240 or sys_bp > 140: conditions.append("Cardiovascular Disease")
            if sys_bp > 140 and dia_bp > 90: conditions.append("Hypertension Stage 2")
            if not conditions: conditions.append("Metabolic Syndrome")
        elif risk == "moderate":
            if glucose > 100: conditions.append("Prediabetes")
            if sys_bp > 130: conditions.append("Elevated Blood Pressure")
            if bmi > 30: conditions.append("Obesity")
            if not conditions: conditions.append("Metabolic Risk Factors")
        else:
            conditions.append("Generally Healthy")
        return ", ".join(conditions)

    diagnoses = [generate_diagnosis(risk_labels[i], ages[i], bmis[i], glucose[i], cholesterol[i], bp_sys[i], bp_dia[i]) for i in range(n_patients)]

    def generate_progression(risk):
        if risk == "high":
            return "Initial screening showed elevated markers. Follow-up at 6 months confirmed progressive risk. Treatment plan initiated with lifestyle modifications and medication."
        elif risk == "moderate":
            return "Routine checkup revealed borderline indicators. Referred for monitoring. 3-month follow-up showed stable condition with recommended dietary changes."
        else:
            return "Standard health screening within normal ranges. Annual checkup recommended. No immediate medical intervention required."
    progressions = [generate_progression(r) for r in risk_labels]

    return pd.DataFrame({
        "patient_id": [f"P-{1000 + i}" for i in range(n_patients)],
        "age": ages, "bmi": bmis, "blood_pressure_systolic": bp_sys, "blood_pressure_diastolic": bp_dia,
        "glucose": glucose, "cholesterol": cholesterol, "heart_rate": heart_rate, "insulin": insulin,
        "risk_level": risk_labels, "risk_score": risk_score.round(3),
        "diagnosis": diagnoses, "progression_notes": progressions,
    })


# ========================================================================
# 2. LOCATION-AWARE HOSPITAL DATABASE (multi-city)
# ========================================================================
def generate_hospital_database():
    """30 hospitals across 6 US cities with full location data."""
    hospitals = [
        # New York, NY
        {"id": "H-001", "name": "Manhattan General Hospital", "city": "New York", "state": "NY", "specialties": ["Cardiology", "Endocrinology", "Internal Medicine"], "rating": 4.8, "distance_km": 2.1, "address": "450 W 57th St, New York, NY 10019", "phone": "+1 (212) 555-1001", "beds": 520, "emergency": True, "doctors": ["Dr. Sarah Chen (Cardiology)", "Dr. James Park (Endocrinology)"]},
        {"id": "H-002", "name": "NYU Langone Cardiovascular Center", "city": "New York", "state": "NY", "specialties": ["Cardiology", "Cardiac Surgery", "Vascular Surgery"], "rating": 4.9, "distance_km": 5.3, "address": "550 First Ave, New York, NY 10016", "phone": "+1 (212) 555-1002", "beds": 806, "emergency": True, "doctors": ["Dr. Michael Ross (Cardiac Surgery)"]},
        {"id": "H-003", "name": "Brooklyn Community Health Center", "city": "New York", "state": "NY", "specialties": ["Family Practice", "Internal Medicine", "Preventive Care"], "rating": 4.3, "distance_km": 8.7, "address": "1200 Flatbush Ave, Brooklyn, NY 11226", "phone": "+1 (718) 555-1003", "beds": 150, "emergency": True, "doctors": ["Dr. Lisa Wong (Family Practice)"]},
        {"id": "H-004", "name": "Mount Sinai Diabetes Center", "city": "New York", "state": "NY", "specialties": ["Endocrinology", "Diabetes Education", "Nutrition"], "rating": 4.7, "distance_km": 3.8, "address": "1 Gustave L. Levy Pl, New York, NY 10029", "phone": "+1 (212) 555-1004", "beds": 1134, "emergency": False, "doctors": ["Dr. Priya Sharma (Endocrinology)"]},
        {"id": "H-005", "name": "Columbia University Medical Center", "city": "New York", "state": "NY", "specialties": ["Cardiology", "Endocrinology", "Nephrology", "Neurology"], "rating": 4.9, "distance_km": 6.2, "address": "622 W 168th St, New York, NY 10032", "phone": "+1 (212) 555-1005", "beds": 815, "emergency": True, "doctors": ["Dr. Robert Kim (Nephrology)"]},
        # Los Angeles, CA
        {"id": "H-006", "name": "Cedars-Sinai Medical Center", "city": "Los Angeles", "state": "CA", "specialties": ["Cardiology", "Endocrinology", "Oncology", "Orthopedics"], "rating": 4.9, "distance_km": 4.5, "address": "8700 Beverly Blvd, Los Angeles, CA 90048", "phone": "+1 (310) 555-2001", "beds": 886, "emergency": True, "doctors": ["Dr. Emily Tran (Cardiology)", "Dr. David Lee (Endocrinology)"]},
        {"id": "H-007", "name": "UCLA Medical Center", "city": "Los Angeles", "state": "CA", "specialties": ["Cardiology", "Endocrinology", "Nephrology", "Neurology"], "rating": 4.8, "distance_km": 8.1, "address": "757 Westwood Plz, Los Angeles, CA 90095", "phone": "+1 (310) 555-2002", "beds": 520, "emergency": True, "doctors": ["Dr. Karen Johnson (Cardiology)"]},
        {"id": "H-008", "name": "Kaiser Permanente LA", "city": "Los Angeles", "state": "CA", "specialties": ["Internal Medicine", "Family Practice", "Preventive Care"], "rating": 4.4, "distance_km": 2.3, "address": "4760 Sunset Blvd, Los Angeles, CA 90027", "phone": "+1 (323) 555-2003", "beds": 250, "emergency": True, "doctors": ["Dr. Maria Garcia (Internal Medicine)"]},
        {"id": "H-009", "name": "Hollywood Diabetes & Endocrine Clinic", "city": "Los Angeles", "state": "CA", "specialties": ["Endocrinology", "Diabetes Education", "Nutrition"], "rating": 4.5, "distance_km": 5.9, "address": "6320 W Sunset Blvd, Los Angeles, CA 90028", "phone": "+1 (323) 555-2004", "beds": 80, "emergency": False, "doctors": ["Dr. Alan Wright (Endocrinology)"]},
        # Chicago, IL
        {"id": "H-010", "name": "Northwestern Memorial Hospital", "city": "Chicago", "state": "IL", "specialties": ["Cardiology", "Endocrinology", "Nephrology", "Neurology"], "rating": 4.8, "distance_km": 3.2, "address": "251 E Huron St, Chicago, IL 60611", "phone": "+1 (312) 555-3001", "beds": 894, "emergency": True, "doctors": ["Dr. William Brown (Cardiology)", "Dr. Susan Taylor (Endocrinology)"]},
        {"id": "H-011", "name": "Rush University Medical Center", "city": "Chicago", "state": "IL", "specialties": ["Cardiology", "Cardiac Surgery", "Vascular Surgery"], "rating": 4.7, "distance_km": 5.8, "address": "1653 W Congress Pkwy, Chicago, IL 60612", "phone": "+1 (312) 555-3002", "beds": 664, "emergency": True, "doctors": ["Dr. Richard Davis (Cardiac Surgery)"]},
        {"id": "H-012", "name": "University of Chicago Medical Center", "city": "Chicago", "state": "IL", "specialties": ["Cardiology", "Endocrinology", "Oncology"], "rating": 4.9, "distance_km": 9.4, "address": "5841 S Maryland Ave, Chicago, IL 60637", "phone": "+1 (773) 555-3003", "beds": 470, "emergency": True, "doctors": ["Dr. Jennifer Liu (Endocrinology)"]},
        {"id": "H-013", "name": "Chicago Community Family Clinic", "city": "Chicago", "state": "IL", "specialties": ["Family Practice", "Internal Medicine", "Preventive Care"], "rating": 4.2, "distance_km": 1.5, "address": "233 E Erie St, Chicago, IL 60611", "phone": "+1 (312) 555-3004", "beds": 60, "emergency": False, "doctors": ["Dr. Patricia Moore (Family Practice)"]},
        # Houston, TX
        {"id": "H-014", "name": "Houston Methodist Hospital", "city": "Houston", "state": "TX", "specialties": ["Cardiology", "Endocrinology", "Nephrology", "Neurology"], "rating": 4.9, "distance_km": 3.7, "address": "6565 Fannin St, Houston, TX 77030", "phone": "+1 (713) 555-4001", "beds": 907, "emergency": True, "doctors": ["Dr. Thomas Martinez (Cardiology)", "Dr. Angela White (Endocrinology)"]},
        {"id": "H-015", "name": "Baylor St. Luke's Medical Center", "city": "Houston", "state": "TX", "specialties": ["Cardiology", "Cardiac Surgery", "Vascular Surgery"], "rating": 4.6, "distance_km": 6.1, "address": "6720 Bertner Ave, Houston, TX 77030", "phone": "+1 (832) 555-4002", "beds": 850, "emergency": True, "doctors": ["Dr. Kevin Thompson (Cardiac Surgery)"]},
        {"id": "H-016", "name": "Texas Diabetes Institute", "city": "Houston", "state": "TX", "specialties": ["Endocrinology", "Diabetes Education", "Nutrition"], "rating": 4.7, "distance_km": 4.3, "address": "7700 Floyd Curl Dr, San Antonio, TX 78229", "phone": "+1 (210) 555-4003", "beds": 200, "emergency": False, "doctors": ["Dr. Robert Hernandez (Endocrinology)"]},
        {"id": "H-017", "name": "Memorial Hermann Hospital", "city": "Houston", "state": "TX", "specialties": ["Internal Medicine", "Family Practice", "Preventive Care"], "rating": 4.4, "distance_km": 2.0, "address": "6411 Fannin St, Houston, TX 77030", "phone": "+1 (713) 555-4004", "beds": 680, "emergency": True, "doctors": ["Dr. Linda Clark (Internal Medicine)"]},
        # Boston, MA
        {"id": "H-018", "name": "Massachusetts General Hospital", "city": "Boston", "state": "MA", "specialties": ["Cardiology", "Endocrinology", "Nephrology", "Neurology"], "rating": 4.9, "distance_km": 2.8, "address": "55 Fruit St, Boston, MA 02114", "phone": "+1 (617) 555-5001", "beds": 999, "emergency": True, "doctors": ["Dr. Elizabeth Adams (Cardiology)", "Dr. Michael Rivera (Endocrinology)"]},
        {"id": "H-019", "name": "Brigham and Women's Hospital", "city": "Boston", "state": "MA", "specialties": ["Cardiology", "Cardiac Surgery", "Vascular Surgery"], "rating": 4.8, "distance_km": 3.5, "address": "75 Francis St, Boston, MA 02115", "phone": "+1 (617) 555-5002", "beds": 793, "emergency": True, "doctors": ["Dr. Christopher Hall (Cardiac Surgery)"]},
        {"id": "H-020", "name": "Boston Diabetes & Endocrine Center", "city": "Boston", "state": "MA", "specialties": ["Endocrinology", "Diabetes Education", "Nutrition"], "rating": 4.6, "distance_km": 4.1, "address": "2 Longfellow Pl, Boston, MA 02114", "phone": "+1 (617) 555-5003", "beds": 100, "emergency": False, "doctors": ["Dr. Sarah Mitchell (Endocrinology)"]},
        # San Francisco, CA
        {"id": "H-021", "name": "UCSF Medical Center", "city": "San Francisco", "state": "CA", "specialties": ["Cardiology", "Endocrinology", "Nephrology", "Neurology"], "rating": 4.9, "distance_km": 3.9, "address": "505 Parnassus Ave, San Francisco, CA 94143", "phone": "+1 (415) 555-6001", "beds": 600, "emergency": True, "doctors": ["Dr. Daniel Kim (Cardiology)", "Dr. Rachel Green (Endocrinology)"]},
        {"id": "H-022", "name": "CPMC Pacific Campus", "city": "San Francisco", "state": "CA", "specialties": ["Cardiology", "Cardiac Surgery", "Vascular Surgery"], "rating": 4.7, "distance_km": 5.2, "address": "2333 Buchanan St, San Francisco, CA 94115", "phone": "+1 (415) 555-6002", "beds": 370, "emergency": True, "doctors": ["Dr. Andrew Scott (Cardiac Surgery)"]},
        {"id": "H-023", "name": "SF Community Family Health", "city": "San Francisco", "state": "CA", "specialties": ["Family Practice", "Internal Medicine", "Preventive Care"], "rating": 4.3, "distance_km": 1.2, "address": "2400 Geary Blvd, San Francisco, CA 94115", "phone": "+1 (415) 555-6003", "beds": 90, "emergency": True, "doctors": ["Dr. Michelle Young (Family Practice)"]},
    ]
    return pd.DataFrame(hospitals)


# ========================================================================
# 3. CONDITIONAL CARE & OTC MEDICATION GUIDANCE
# ========================================================================
OTC_MEDICATION_GUIDE = {
    "elevated_bp": {
        "title": "Blood Pressure Management",
        "precautions": ["Reduce sodium intake to under 2,300 mg/day", "Engage in 30 minutes of moderate aerobic activity daily", "Monitor BP at home twice daily for 2 weeks", "Limit alcohol to 1 drink/day for women, 2 for men", "Practice stress-reduction techniques (deep breathing, meditation)"],
        "otc_guidance": ["Acetaminophen (Tylenol) is preferred over NSAIDs for pain relief, as ibuprofen can raise blood pressure", "Omega-3 fish oil supplements (1,000-2,000 mg daily) may support cardiovascular health", "Magnesium supplements (200-400 mg daily) have shown mild BP-lowering effects"],
        "avoid": ["Avoid decongestants containing pseudoephedrine (Sudafed) as they can raise BP", "Avoid NSAIDs like ibuprofen (Advil) and naproxen (Aleve) for prolonged use", "Avoid excessive caffeine intake (limit to 2 cups of coffee/day)"]
    },
    "prediabetes": {
        "title": "Blood Sugar Management",
        "precautions": ["Follow a low-glycemic-index diet rich in vegetables, lean proteins, and whole grains", "Exercise at least 150 minutes per week (30 min, 5 days/week)", "Monitor fasting blood glucose weekly", "Aim for 5-7% gradual weight loss if overweight", "Get adequate sleep (7-9 hours/night) to improve insulin sensitivity"],
        "otc_guidance": ["Chromium picolinate (200-400 mcg daily) may help improve insulin sensitivity", "Alpha-lipoic acid (300-600 mg daily) has shown benefit for blood sugar control", "Berberine supplements (500 mg, 2-3 times daily) may support glucose metabolism"],
        "avoid": ["Avoid sugary beverages and refined carbohydrates", "Avoid skipping meals, which can cause blood sugar fluctuations", "Avoid sedentary lifestyle for prolonged periods"]
    },
    "obesity_risk": {
        "title": "Weight Management Support",
        "precautions": ["Consult a registered dietitian for a personalized meal plan", "Keep a food diary to track caloric intake", "Gradually increase physical activity (start with walking 20 min/day)", "Focus on sustainable habit changes rather than crash diets", "Consider behavioral therapy for emotional eating patterns"],
        "otc_guidance": ["Psyllium husk fiber (5g before meals) may promote satiety", "Green tea extract (300-500 mg EGCG daily) may support metabolism", "Probiotic supplements may support gut health and weight management"],
        "avoid": ["Avoid weight-loss supplements claiming rapid results", "Avoid extreme calorie restriction without medical supervision", "Avoid skipping meals as a weight-loss strategy"]
    },
    "cholesterol": {
        "title": "Cholesterol Management",
        "precautions": ["Reduce saturated fat intake (limit red meat, full-fat dairy)", "Increase soluble fiber intake (oats, beans, fruits, vegetables)", "Include heart-healthy fats (olive oil, avocados, nuts)", "Exercise regularly (150 min/week moderate intensity)", "Quit smoking if applicable - smoking lowers HDL cholesterol"],
        "otc_guidance": ["Plant sterols/stanols (2g daily) can help reduce LDL cholesterol", "Omega-3 fatty acids (1,000-4,000 mg daily) support heart health", "Niacin (vitamin B3) supplements may help raise HDL cholesterol - consult doctor first", "Red yeast rice supplements contain naturally occurring statins - use with caution"],
        "avoid": ["Avoid trans fats (partially hydrogenated oils) completely", "Avoid excessive alcohol consumption which raises triglycerides", "Avoid high-dose niacin without medical supervision"]
    }
}

def generate_care_guidance(risk_tier: str, user_inputs):
    """Generate conditional care guidance based on risk tier.
    Moderate: Return OTC guidance and precautions.
    High: Return emergency escalation only.
    Low: Return general wellness tips.
    """
    if risk_tier == "high":
        return {
            "tier": "high",
            "show_medications": False,
            "emergency_escalation": True,
            "message": "Your results indicate significant health concerns that require immediate professional medical attention. Please contact a healthcare provider or visit the nearest emergency room.",
            "actions": ["Schedule an appointment with a primary care physician within 24-48 hours", "If experiencing chest pain, shortness of breath, or severe symptoms, call 911 immediately", "Bring all health records and this assessment to your doctor appointment", "Do not attempt to self-medicate or use over-the-counter remedies without medical supervision"],
        }
    elif risk_tier == "moderate":
        guides = []
        if user_inputs.blood_pressure_systolic > 130 or user_inputs.blood_pressure_diastolic > 85:
            guides.append(OTC_MEDICATION_GUIDE["elevated_bp"])
        if user_inputs.glucose > 100:
            guides.append(OTC_MEDICATION_GUIDE["prediabetes"])
        if user_inputs.bmi > 30:
            guides.append(OTC_MEDICATION_GUIDE["obesity_risk"])
        if user_inputs.cholesterol > 200:
            guides.append(OTC_MEDICATION_GUIDE["cholesterol"])
        if not guides:
            guides.append(OTC_MEDICATION_GUIDE["elevated_bp"])
        return {
            "tier": "moderate",
            "show_medications": True,
            "emergency_escalation": False,
            "message": "Your results suggest moderate risk factors. The following temporary precautions and OTC guidance may help while you schedule a medical consultation.",
            "care_guides": guides,
            "disclaimer": "These OTC suggestions are for TEMPORARY relief only and do not replace professional medical advice. Always consult your healthcare provider before starting any supplement regimen.",
        }
    else:
        return {
            "tier": "low",
            "show_medications": False,
            "emergency_escalation": False,
            "message": "Your health indicators are within normal ranges. Continue maintaining a healthy lifestyle with regular checkups.",
            "actions": ["Continue regular annual health screenings", "Maintain a balanced diet and regular exercise routine", "Stay hydrated and prioritize sleep quality", "Keep track of any changes in your health metrics"]
        }


# ========================================================================
# 4. MODEL TRAINING
# ========================================================================
def train_model(df):
    global model, scaler, nn_model, df_patients
    df_patients = df
    X = df[FEATURE_COLS].values
    label_map = {"low": 0, "moderate": 1, "high": 2}
    y = df["risk_level"].map(label_map).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = GradientBoostingClassifier(n_estimators=150, max_depth=5, learning_rate=0.1, min_samples_split=10, min_samples_leaf=5, subsample=0.8, random_state=42)
    model.fit(X_scaled, y)
    logger.info(f"Model trained. Accuracy: {model.score(X_scaled, y):.4f}")
    nn_model = NearestNeighbors(n_neighbors=3, metric="cosine", algorithm="brute")
    nn_model.fit(X_scaled)


# ========================================================================
# Pydantic models
# ========================================================================
class HealthInput(BaseModel):
    age: int = Field(..., ge=1, le=120)
    bmi: float = Field(..., ge=10, le=60)
    blood_pressure_systolic: int = Field(..., ge=70, le=250)
    blood_pressure_diastolic: int = Field(..., ge=40, le=150)
    glucose: int = Field(..., ge=40, le=400)
    cholesterol: int = Field(..., ge=80, le=500)
    heart_rate: int = Field(..., ge=30, le=200)
    insulin: float = Field(..., ge=0, le=1000)
    city: str = Field(default="New York", description="User's city")
    state: str = Field(default="NY", description="User's state")
    gemini_api_key: Optional[str] = Field(None)


class FullPredictionResponse(BaseModel):
    risk: dict
    historical_matches: list
    recommended_hospitals: list
    care_guidance: dict
    user_profile: dict
    ai_summary: Optional[str] = None


# ========================================================================
# API ENDPOINTS
# ========================================================================
@app.on_event("startup")
async def startup_event():
    logger.info("Generating synthetic patient dataset (500 records)...")
    df = generate_synthetic_dataset(n_patients=500, seed=42)
    logger.info(f"Dataset generated: {len(df)} patients, risk distribution: {df['risk_level'].value_counts().to_dict()}")
    train_model(df)
    global df_hospitals
    df_hospitals = generate_hospital_database()
    logger.info(f"Location-aware hospital database loaded: {len(df_hospitals)} facilities across multiple cities")
    logger.info("Health Risk Predictor API v2.0 ready.")


@app.get("/api/status")
async def status():
    return {"status": "healthy", "model_loaded": model is not None, "patients_in_db": len(df_patients) if df_patients is not None else 0, "hospitals_available": len(df_hospitals) if df_hospitals is not None else 0, "cities_available": list(df_hospitals[["city", "state"]].drop_duplicates().to_dict('records')) if df_hospitals is not None else []}


@app.get("/api/cities")
async def get_cities():
    """Return available cities for location selection."""
    if df_hospitals is None:
        raise HTTPException(status_code=503, detail="Not initialized")
    cities = df_hospitals[["city", "state"]].drop_duplicates().sort_values(["state", "city"]).to_dict('records')
    return {"cities": cities}


@app.post("/api/full-prediction")
async def full_prediction(input_data: HealthInput):
    if model is None or scaler is None or nn_model is None or df_patients is None or df_hospitals is None:
        raise HTTPException(status_code=503, detail="Model not initialized")

    # 1. Risk Prediction
    user_vector = np.array([[input_data.age, input_data.bmi, input_data.blood_pressure_systolic, input_data.blood_pressure_diastolic, input_data.glucose, input_data.cholesterol, input_data.heart_rate, input_data.insulin]])
    user_scaled = scaler.transform(user_vector)
    prediction = model.predict(user_scaled)[0]
    probabilities = model.predict_proba(user_scaled)[0]
    inv_map = {0: "low", 1: "moderate", 2: "high"}
    predicted_tier = inv_map[prediction]
    importance = dict(sorted(zip(FEATURE_COLS, model.feature_importances_.round(4)), key=lambda x: x[1], reverse=True))
    risk_result = {
        "risk_tier": predicted_tier, "risk_score": round(float(probabilities[prediction]), 4),
        "risk_probability": {"low": round(float(probabilities[0]), 4), "moderate": round(float(probabilities[1]), 4), "high": round(float(probabilities[2]), 4)},
        "feature_importance": importance
    }

    # 2. Historical Similarity Matching
    distances, indices = nn_model.kneighbors(user_scaled, n_neighbors=3)
    matches = []
    seen = set()
    for i in range(len(indices[0])):
        idx = indices[0][i]
        patient = df_patients.iloc[idx]
        similarity = round(1.0 - distances[0][i], 4)
        if patient["patient_id"] in seen: continue
        seen.add(patient["patient_id"])
        user_traits = {"Age": input_data.age, "Bmi": input_data.bmi, "Bp Sys": input_data.blood_pressure_systolic, "Glucose": input_data.glucose, "Cholesterol": input_data.cholesterol}
        pat_traits = {"Age": patient["age"], "Bmi": patient["bmi"], "Bp Sys": patient["blood_pressure_systolic"], "Glucose": patient["glucose"], "Cholesterol": patient["cholesterol"]}
        overlapping = []
        for key in user_traits:
            u, p = user_traits[key], float(pat_traits[key])
            diff_pct = abs(u - p) / max(u, p, 1) * 100
            if diff_pct < 15:
                overlapping.append({"trait": key.replace(" ", " ").title(), "user_value": float(u), "patient_value": round(p, 1), "deviation_pct": round(diff_pct, 1)})
        matches.append({"patient_id": patient["patient_id"], "similarity_score": similarity, "profile": {"age": int(patient["age"]), "bmi": float(patient["bmi"]), "blood_pressure": f"{int(patient['blood_pressure_systolic'])}/{int(patient['blood_pressure_diastolic'])}", "glucose": int(patient["glucose"]), "cholesterol": int(patient["cholesterol"]), "heart_rate": int(patient["heart_rate"])}, "risk_level": patient["risk_level"], "diagnosis": patient["diagnosis"], "overlapping_traits": overlapping, "historical_progression": patient["progression_notes"]})
        if len(matches) >= 2: break

    # 3. Location-Aware Hospital Recommendation
    city_filter = input_data.city.strip().title()
    state_filter = input_data.state.strip().upper()
    local_hospitals = df_hospitals[
        (df_hospitals["city"].str.lower() == city_filter.lower()) &
        (df_hospitals["state"].str.upper() == state_filter.upper())
    ]
    if len(local_hospitals) == 0:
        local_hospitals = df_hospitals[df_hospitals["state"].str.upper() == state_filter.upper()]
    if len(local_hospitals) == 0:
        local_hospitals = df_hospitals

    required_specialties = ["Internal Medicine"]
    if input_data.blood_pressure_systolic > 130 or input_data.cholesterol > 200: required_specialties.append("Cardiology")
    if input_data.glucose > 100 or input_data.bmi > 30: required_specialties.append("Endocrinology")
    if input_data.glucose > 126 and input_data.blood_pressure_systolic > 140: required_specialties.append("Nephrology")

    hospital_results = []
    for _, h in local_hospitals.iterrows():
        h_specs = h["specialties"]
        spec_matches = len(set(required_specialties) & set(h_specs))
        spec_score = spec_matches / len(required_specialties) if required_specialties else 0
        dist_score = max(0, 1 - h["distance_km"] / 20)
        rating_score = h["rating"] / 5.0
        if predicted_tier == "high":
            combined = spec_score * 0.45 + rating_score * 0.35 + dist_score * 0.20
        else:
            combined = spec_score * 0.35 + rating_score * 0.25 + dist_score * 0.40
        hospital_results.append({"id": h["id"], "name": h["name"], "city": h["city"], "state": h["state"], "matched_specialties": list(set(required_specialties) & set(h_specs)), "all_specialties": h_specs, "rating": h["rating"], "distance_km": h["distance_km"], "address": h["address"], "phone": h["phone"], "beds": int(h["beds"]), "emergency": h["emergency"], "doctors": h.get("doctors", []), "match_score": round(combined, 4)})
    hospital_results.sort(key=lambda x: x["match_score"], reverse=True)

    # 4. Conditional Care Guidance
    care_guidance = generate_care_guidance(predicted_tier, input_data)

    # 5. User profile for comparative display
    user_profile = {"age": input_data.age, "bmi": input_data.bmi, "blood_pressure": f"{input_data.blood_pressure_systolic}/{input_data.blood_pressure_diastolic}", "glucose": input_data.glucose, "cholesterol": input_data.cholesterol, "heart_rate": input_data.heart_rate, "insulin": input_data.insulin, "location": f"{input_data.city}, {input_data.state}"}

    # 6. Gemini AI Summary
    ai_summary = None
    if input_data.gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=input_data.gemini_api_key)
            m = genai.GenerativeModel("gemini-2.0-flash")
            prompt = f"""You are a compassionate, professional medical AI assistant. Generate a clear executive health summary.
**IMPORTANT**: NOT a medical diagnosis. Always recommend consulting a healthcare professional.

## User: {input_data.age}yo, BMI={input_data.bmi}, BP={input_data.blood_pressure_systolic}/{input_data.blood_pressure_diastolic}, Glucose={input_data.glucose}, Cholesterol={input_data.cholesterol}, Location={input_data.city}, {input_data.state}

## Risk: {predicted_tier.upper()} ({risk_result['risk_score']*100:.1f}% confidence)
Probs: Low={probabilities[0]*100:.1f}% Moderate={probabilities[1]*100:.1f}% High={probabilities[2]*100:.1f}%
Top factors: {', '.join(list(importance.keys())[:3])}

## Matching Patients:
{chr(10).join([f'- {m["patient_id"]} ({m["similarity_score"]*100:.1f}% match): {m["diagnosis"]}. Progression: {m["historical_progression"]}' for m in matches])}

## Local Hospitals ({input_data.city}, {input_data.state}):
{chr(10).join([f'- {h["name"]}: {h["rating"]}/5, {h["distance_km"]}km, Specialists: {', '.join(h["doctors"])}' for h in hospital_results[:3]])}

## Care Guidance: {care_guidance['message']}

Provide a compassionate, professional summary with: 1) Brief assessment, 2) Key risk factors explained, 3) 3-5 actionable next steps, 4) Hospital guidance for {input_data.city}. Keep tone empathetic and non-alarmist."""
            response = await m.generate_content_async(prompt)
            ai_summary = response.text
        except Exception as e:
            logger.error(f"Gemini error: {e}")

    return FullPredictionResponse(risk=risk_result, historical_matches=matches, recommended_hospitals=hospital_results, care_guidance=care_guidance, user_profile=user_profile, ai_summary=ai_summary)
