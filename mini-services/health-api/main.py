"""
AI Health Risk Predictor - FastAPI Backend
=============================================
A production-grade ML backend that:
  1. Initializes a synthetic patient dataset (inspired by Pima Indians / Synthea benchmarks)
  2. Trains a Gradient Boosting classification model for chronic disease risk
  3. Provides KNN-based historical similarity matching
  4. Recommends hospitals by specialty & proximity
  5. Integrates Google Gemini for professional medical summaries

Data Source:  The backend auto-generates a 500-patient synthetic dataset on startup
             modeled after the Pima Indians Diabetes Dataset structure (Kaggle),
             extended with additional clinical features for cardiovascular risk.
             No external download required - data is created using numpy's random
             seed to ensure reproducibility and realistic clinical distributions.
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
import os
import json
import logging

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("health-api")

# ---------------------------------------------------------------------------
# App initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Health Risk Predictor API",
    description="Production-grade health risk prediction with historical matching",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global model state
# ---------------------------------------------------------------------------
model: Optional[GradientBoostingClassifier] = None
scaler: Optional[StandardScaler] = None
nn_model: Optional[NearestNeighbors] = None
df_patients: Optional[pd.DataFrame] = None
df_hospitals: Optional[pd.DataFrame] = None
FEATURE_COLS = [
    "age", "bmi", "blood_pressure_systolic", "blood_pressure_diastolic",
    "glucose", "cholesterol", "heart_rate", "insulin",
]


# ========================================================================
# 1. SYNTHETIC DATA GENERATION
# ========================================================================
def generate_synthetic_dataset(n_patients: int = 500, seed: int = 42) -> pd.DataFrame:
    """
    Generate a realistic synthetic patient dataset.

    The dataset is modeled after the Pima Indians Diabetes Dataset (a standard
    Kaggle benchmark for diabetes prediction), extended with cardiovascular
    risk factors. Features follow clinically realistic distributions:

    - Age: 18-80, normal distribution centered at 45
    - BMI: 18-45, skewed right (obesity prevalence)
    - Blood Pressure: Systolic 90-200, Diastolic 60-130
    - Glucose (fasting): 70-220 mg/dL
    - Cholesterol (total): 120-350 mg/dL
    - Heart Rate: 55-110 bpm
    - Insulin: 2-400 mu U/mL (log-normal distribution)

    The outcome label (risk_level) is derived from clinical thresholds
    combined with probabilistic noise to simulate real-world diagnostic
    complexity.

    Returns:
        pd.DataFrame with n_patients rows and clinical feature columns.
    """
    rng = np.random.RandomState(seed)

    # Generate features with realistic clinical distributions
    ages = rng.normal(48, 14, n_patients).clip(18, 80).astype(int)
    bmis = rng.normal(28.5, 6.5, n_patients).clip(16, 50).round(1)
    bp_sys = rng.normal(130, 22, n_patients).clip(90, 200).astype(int)
    bp_dia = rng.normal(85, 14, n_patients).clip(55, 130).astype(int)
    glucose = rng.normal(115, 35, n_patients).clip(60, 250).astype(int)
    cholesterol = rng.normal(210, 45, n_patients).clip(100, 400).astype(int)
    heart_rate = rng.normal(75, 12, n_patients).clip(50, 120).astype(int)
    # Insulin follows a log-normal distribution (many low values, few very high)
    insulin = rng.lognormal(3.5, 0.8, n_patients).clip(2, 500).round(1)

    # --- Derive risk labels using clinical thresholds + noise ---
    # Start with a base risk score from 0 to 1
    risk_score = np.zeros(n_patients)

    # Age factor: >50 adds risk
    risk_score += np.where(ages > 50, 0.15, 0.0)
    risk_score += np.where(ages > 65, 0.15, 0.0)

    # BMI factor: >25 overweight, >30 obese
    risk_score += np.where(bmis > 25, 0.1, 0.0)
    risk_score += np.where(bmis > 30, 0.15, 0.0)

    # Blood pressure: Stage 1 hypertension >130/85, Stage 2 >140/90
    risk_score += np.where(bp_sys > 130, 0.1, 0.0)
    risk_score += np.where(bp_sys > 140, 0.15, 0.0)
    risk_score += np.where(bp_dia > 90, 0.1, 0.0)

    # Glucose: prediabetes >100, diabetes >126
    risk_score += np.where(glucose > 100, 0.15, 0.0)
    risk_score += np.where(glucose > 126, 0.2, 0.0)

    # Cholesterol: borderline >200, high >240
    risk_score += np.where(cholesterol > 200, 0.1, 0.0)
    risk_score += np.where(cholesterol > 240, 0.15, 0.0)

    # Add stochastic noise (real diagnostics are not deterministic)
    risk_score += rng.normal(0, 0.12, n_patients)
    risk_score = risk_score.clip(0, 1)

    # Map to risk tiers
    def score_to_label(s):
        if s < 0.33:
            return "low"
        elif s < 0.60:
            return "moderate"
        else:
            return "high"

    risk_labels = [score_to_label(s) for s in risk_score]

    # Generate diagnosis descriptions based on risk
    def generate_diagnosis(risk, age, bmi, glucose, chol, sys_bp, dia_bp):
        conditions = []
        if risk == "high":
            if glucose > 126:
                conditions.append("Type 2 Diabetes")
            if chol > 240 or sys_bp > 140:
                conditions.append("Cardiovascular Disease")
            if sys_bp > 140 and dia_bp > 90:
                conditions.append("Hypertension Stage 2")
            if not conditions:
                conditions.append("Metabolic Syndrome")
        elif risk == "moderate":
            if glucose > 100:
                conditions.append("Prediabetes")
            if sys_bp > 130:
                conditions.append("Elevated Blood Pressure")
            if bmi > 30:
                conditions.append("Obesity")
            if not conditions:
                conditions.append("Metabolic Risk Factors")
        else:
            conditions.append("Generally Healthy")
        return ", ".join(conditions)

    diagnoses = [
        generate_diagnosis(risk_labels[i], ages[i], bmis[i], glucose[i], cholesterol[i], bp_sys[i], bp_dia[i])
        for i in range(n_patients)
    ]

    # Build historical progression notes
    def generate_progression(risk):
        if risk == "high":
            return (
                "Initial screening showed elevated markers. "
                "Follow-up at 6 months confirmed progressive risk. "
                "Treatment plan initiated with lifestyle modifications and medication."
            )
        elif risk == "moderate":
            return (
                "Routine checkup revealed borderline indicators. "
                "Referred for monitoring. "
                "3-month follow-up showed stable condition with recommended dietary changes."
            )
        else:
            return (
                "Standard health screening within normal ranges. "
                "Annual checkup recommended. "
                "No immediate medical intervention required."
            )

    progressions = [generate_progression(r) for r in risk_labels]

    df = pd.DataFrame({
        "patient_id": [f"P-{1000 + i}" for i in range(n_patients)],
        "age": ages,
        "bmi": bmis,
        "blood_pressure_systolic": bp_sys,
        "blood_pressure_diastolic": bp_dia,
        "glucose": glucose,
        "cholesterol": cholesterol,
        "heart_rate": heart_rate,
        "insulin": insulin,
        "risk_level": risk_labels,
        "risk_score": risk_score.round(3),
        "diagnosis": diagnoses,
        "progression_notes": progressions,
    })

    return df


# ========================================================================
# 2. MOCK HOSPITAL DATABASE
# ========================================================================
def generate_hospital_database() -> pd.DataFrame:
    """
    Create a realistic mock hospital database with specializations,
    quality ratings, and proximity tiers for recommendation sorting.
    """
    hospitals = [
        {
            "id": "H-001",
            "name": "Metro General Hospital",
            "specialties": ["Cardiology", "Endocrinology", "Internal Medicine"],
            "rating": 4.8,
            "distance_km": 2.3,
            "address": "1200 Health Boulevard, Downtown",
            "phone": "+1 (555) 100-2001",
            "beds": 450,
            "emergency": True,
        },
        {
            "id": "H-002",
            "name": "University Medical Center",
            "specialties": ["Cardiology", "Endocrinology", "Nephrology", "Neurology"],
            "rating": 4.9,
            "distance_km": 5.7,
            "address": "500 Research Drive, University District",
            "phone": "+1 (555) 100-2002",
            "beds": 820,
            "emergency": True,
        },
        {
            "id": "H-003",
            "name": "St. Claire Community Hospital",
            "specialties": ["Internal Medicine", "Family Practice", "Pediatrics"],
            "rating": 4.3,
            "distance_km": 1.8,
            "address": "80 Elm Street, Westside",
            "phone": "+1 (555) 100-2003",
            "beds": 180,
            "emergency": True,
        },
        {
            "id": "H-004",
            "name": "Heart & Vascular Institute",
            "specialties": ["Cardiology", "Cardiac Surgery", "Vascular Surgery"],
            "rating": 4.7,
            "distance_km": 8.1,
            "address": "300 Cardio Way, Medical Park",
            "phone": "+1 (555) 100-2004",
            "beds": 250,
            "emergency": True,
        },
        {
            "id": "H-005",
            "name": "Riverside Diabetes & Endocrine Center",
            "specialties": ["Endocrinology", "Diabetes Education", "Nutrition"],
            "rating": 4.6,
            "distance_km": 4.2,
            "address": "75 Wellness Avenue, Riverside",
            "phone": "+1 (555) 100-2005",
            "beds": 120,
            "emergency": False,
        },
        {
            "id": "H-006",
            "name": "Pacific Regional Medical Center",
            "specialties": ["Cardiology", "Endocrinology", "Oncology", "Orthopedics"],
            "rating": 4.5,
            "distance_km": 12.4,
            "address": "2000 Pacific Highway, Eastside",
            "phone": "+1 (555) 100-2006",
            "beds": 600,
            "emergency": True,
        },
        {
            "id": "H-007",
            "name": "Greenfield Family Clinic",
            "specialties": ["Family Practice", "Internal Medicine", "Preventive Care"],
            "rating": 4.4,
            "distance_km": 0.9,
            "address": "15 Main Street, Greenfield",
            "phone": "+1 (555) 100-2007",
            "beds": 50,
            "emergency": False,
        },
        {
            "id": "H-008",
            "name": "National Cardiovascular Research Hospital",
            "specialties": ["Cardiology", "Cardiac Surgery", "Cardiac Rehabilitation"],
            "rating": 4.9,
            "distance_km": 15.0,
            "address": "1 Research Park, National Medical District",
            "phone": "+1 (555) 100-2008",
            "beds": 350,
            "emergency": True,
        },
    ]
    return pd.DataFrame(hospitals)


# ========================================================================
# 3. MODEL TRAINING
# ========================================================================
def train_model(df: pd.DataFrame):
    """
    Train a Gradient Boosting Classifier for chronic disease risk prediction.
    Also fits a StandardScaler and NearestNeighbors model for similarity matching.
    """
    global model, scaler, nn_model, df_patients

    df_patients = df

    X = df[FEATURE_COLS].values
    # Encode risk labels to numeric
    label_map = {"low": 0, "moderate": 1, "high": 2}
    y = df["risk_level"].map(label_map).values

    # Fit scaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train Gradient Boosting Classifier
    model = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.1,
        min_samples_split=10,
        min_samples_leaf=5,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_scaled, y)
    train_acc = model.score(X_scaled, y)
    logger.info(f"Model trained. Training accuracy: {train_acc:.4f}")

    # Fit Nearest Neighbors for historical matching
    nn_model = NearestNeighbors(n_neighbors=3, metric="cosine", algorithm="brute")
    nn_model.fit(X_scaled)
    logger.info("KNN similarity model fitted.")


# ========================================================================
# Pydantic models for request/response
# ========================================================================
class HealthInput(BaseModel):
    age: int = Field(..., ge=1, le=120, description="Patient age in years")
    bmi: float = Field(..., ge=10, le=60, description="Body Mass Index")
    blood_pressure_systolic: int = Field(..., ge=70, le=250, description="Systolic BP (mmHg)")
    blood_pressure_diastolic: int = Field(..., ge=40, le=150, description="Diastolic BP (mmHg)")
    glucose: int = Field(..., ge=40, le=400, description="Fasting glucose (mg/dL)")
    cholesterol: int = Field(..., ge=80, le=500, description="Total cholesterol (mg/dL)")
    heart_rate: int = Field(..., ge=30, le=200, description="Resting heart rate (bpm)")
    insulin: float = Field(..., ge=0, le=1000, description="Insulin level (mu U/mL)")
    gemini_api_key: Optional[str] = Field(None, description="Optional Gemini API key for AI summary")


class RiskResponse(BaseModel):
    risk_tier: str
    risk_score: float
    risk_probability: dict
    feature_importance: dict


class MatchResponse(BaseModel):
    matches: list


class HospitalResponse(BaseModel):
    hospitals: list


class FullPredictionResponse(BaseModel):
    risk: RiskResponse
    historical_matches: list
    recommended_hospitals: list
    ai_summary: Optional[str] = None


# ========================================================================
# API ENDPOINTS
# ========================================================================
@app.on_event("startup")
async def startup_event():
    """
    On startup: generate synthetic dataset, train ML model, load hospital data.
    This replaces the need for an external dataset download -- the data is
    created in-memory using clinically realistic distributions.
    """
    logger.info("Generating synthetic patient dataset (500 records)...")
    df = generate_synthetic_dataset(n_patients=500, seed=42)
    logger.info(f"Dataset generated: {len(df)} patients")
    logger.info(f"Risk distribution: {df['risk_level'].value_counts().to_dict()}")

    train_model(df)

    global df_hospitals
    df_hospitals = generate_hospital_database()
    logger.info(f"Hospital database loaded: {len(df_hospitals)} facilities")
    logger.info("Health Risk Predictor API is ready.")


@app.get("/api/status")
async def status():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "patients_in_db": len(df_patients) if df_patients is not None else 0,
        "hospitals_available": len(df_hospitals) if df_hospitals is not None else 0,
    }


@app.get("/api/data/stats")
async def data_stats():
    """Return dataset statistics for transparency."""
    if df_patients is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    return {
        "total_patients": len(df_patients),
        "risk_distribution": df_patients["risk_level"].value_counts().to_dict(),
        "feature_stats": df_patients[FEATURE_COLS].describe().to_dict(),
        "data_source": "Synthetic dataset generated on startup, modeled after Pima Indians Diabetes Dataset (Kaggle benchmark) extended with cardiovascular risk factors.",
    }


@app.post("/api/predict", response_model=RiskResponse)
async def predict_risk(input_data: HealthInput):
    """
    Predict chronic disease risk tier and probability from health inputs.
    Uses the trained Gradient Boosting Classifier.
    """
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not initialized")

    # Build feature vector
    user_vector = np.array([[
        input_data.age, input_data.bmi,
        input_data.blood_pressure_systolic, input_data.blood_pressure_diastolic,
        input_data.glucose, input_data.cholesterol,
        input_data.heart_rate, input_data.insulin,
    ]])

    # Scale and predict
    user_scaled = scaler.transform(user_vector)
    prediction = model.predict(user_scaled)[0]
    probabilities = model.predict_proba(user_scaled)[0]

    label_map = {"low": 0, "moderate": 1, "high": 2}
    inv_label_map = {v: k for k, v in label_map.items()}
    predicted_tier = inv_label_map[prediction]
    predicted_score = float(probabilities[prediction])

    # Feature importance
    importance = dict(zip(FEATURE_COLS, model.feature_importances_.round(4)))
    # Sort by importance descending
    importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))

    return RiskResponse(
        risk_tier=predicted_tier,
        risk_score=round(predicted_score, 4),
        risk_probability={
            "low": round(float(probabilities[0]), 4),
            "moderate": round(float(probabilities[1]), 4),
            "high": round(float(probabilities[2]), 4),
        },
        feature_importance=importance,
    )


@app.post("/api/match", response_model=MatchResponse)
async def find_similar_patients(input_data: HealthInput):
    """
    Find the top 2 most similar historical patients using KNN cosine similarity.
    Returns their profiles, similarity scores, and clinical progression notes.
    """
    if nn_model is None or scaler is None or df_patients is None:
        raise HTTPException(status_code=503, detail="Model not initialized")

    user_vector = np.array([[
        input_data.age, input_data.bmi,
        input_data.blood_pressure_systolic, input_data.blood_pressure_diastolic,
        input_data.glucose, input_data.cholesterol,
        input_data.heart_rate, input_data.insulin,
    ]])
    user_scaled = scaler.transform(user_vector)

    # Find 3 nearest neighbors (to get top 2 excluding potential self-matches)
    distances, indices = nn_model.kneighbors(user_scaled, n_neighbors=3)

    matches = []
    seen_ids = set()
    for i in range(len(indices[0])):
        idx = indices[0][i]
        patient = df_patients.iloc[idx]
        similarity = round(1.0 - distances[0][i], 4)  # Convert distance to similarity

        if patient["patient_id"] in seen_ids:
            continue
        seen_ids.add(patient["patient_id"])

        # Identify overlapping risk traits
        user_traits = {
            "age": input_data.age,
            "bmi": input_data.bmi,
            "bp_sys": input_data.blood_pressure_systolic,
            "glucose": input_data.glucose,
            "cholesterol": input_data.cholesterol,
        }
        patient_traits = {
            "age": patient["age"],
            "bmi": patient["bmi"],
            "bp_sys": patient["blood_pressure_systolic"],
            "glucose": patient["glucose"],
            "cholesterol": patient["cholesterol"],
        }

        # Find which traits are in the same risk zone
        overlapping = []
        for key in user_traits:
            u, p = user_traits[key], patient_traits[key]
            diff_pct = abs(u - p) / max(u, p, 1) * 100
            if diff_pct < 15:
                trait_label = key.replace("_", " ").title()
                overlapping.append({
                    "trait": trait_label,
                    "user_value": float(u),
                    "patient_value": float(p),
                    "deviation_pct": round(diff_pct, 1),
                })

        match_data = {
            "patient_id": patient["patient_id"],
            "similarity_score": similarity,
            "profile": {
                "age": int(patient["age"]),
                "bmi": float(patient["bmi"]),
                "blood_pressure": f"{int(patient['blood_pressure_systolic'])}/{int(patient['blood_pressure_diastolic'])}",
                "glucose": int(patient["glucose"]),
                "cholesterol": int(patient["cholesterol"]),
                "heart_rate": int(patient["heart_rate"]),
            },
            "risk_level": patient["risk_level"],
            "diagnosis": patient["diagnosis"],
            "overlapping_traits": overlapping,
            "historical_progression": patient["progression_notes"],
        }
        matches.append(match_data)
        if len(matches) >= 2:
            break

    return MatchResponse(matches=matches)


@app.post("/api/hospitals", response_model=HospitalResponse)
async def recommend_hospitals(input_data: HealthInput):
    """
    Recommend hospitals based on predicted risk category and required specialties.
    Sorts by specialization match score and proximity.
    """
    if df_hospitals is None or model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not initialized")

    # Determine required specialties from health inputs
    required_specialties = ["Internal Medicine"]  # Always useful

    if input_data.blood_pressure_systolic > 130 or input_data.cholesterol > 200:
        required_specialties.append("Cardiology")
    if input_data.glucose > 100 or input_data.bmi > 30:
        required_specialties.append("Endocrinology")
    if input_data.glucose > 126 and input_data.blood_pressure_systolic > 140:
        required_specialties.append("Nephrology")

    # Quick risk prediction for sorting context
    user_vector = np.array([[
        input_data.age, input_data.bmi,
        input_data.blood_pressure_systolic, input_data.blood_pressure_diastolic,
        input_data.glucose, input_data.cholesterol,
        input_data.heart_rate, input_data.insulin,
    ]])
    user_scaled = scaler.transform(user_vector)
    pred = model.predict(user_scaled)[0]
    inv_map = {0: "low", 1: "moderate", 2: "high"}
    risk_tier = inv_map[pred]

    # Score each hospital
    results = []
    for _, hospital in df_hospitals.iterrows():
        h_specs = hospital["specialties"]

        # Count matching specialties
        spec_matches = len(set(required_specialties) & set(h_specs))
        spec_score = spec_matches / len(required_specialties) if required_specialties else 0

        # Distance score (closer is better, normalize to 0-1)
        distance_score = max(0, 1 - hospital["distance_km"] / 20)

        # Rating score
        rating_score = hospital["rating"] / 5.0

        # For high risk, prefer specialized hospitals even if farther
        if risk_tier == "high":
            # Heavily weight specialty match and rating
            combined_score = spec_score * 0.45 + rating_score * 0.35 + distance_score * 0.20
        else:
            combined_score = spec_score * 0.35 + rating_score * 0.25 + distance_score * 0.40

        results.append({
            "id": hospital["id"],
            "name": hospital["name"],
            "matched_specialties": list(set(required_specialties) & set(h_specs)),
            "all_specialties": h_specs,
            "rating": hospital["rating"],
            "distance_km": hospital["distance_km"],
            "address": hospital["address"],
            "phone": hospital["phone"],
            "beds": int(hospital["beds"]),
            "emergency": hospital["emergency"],
            "match_score": round(combined_score, 4),
        })

    # Sort by combined match score descending
    results.sort(key=lambda x: x["match_score"], reverse=True)

    return HospitalResponse(hospitals=results)


# ========================================================================
# 4. GEMINI AI INTEGRATION
# ========================================================================
async def generate_gemini_summary(
    risk: dict,
    matches: list,
    hospitals: list,
    api_key: str,
    user_input: HealthInput,
) -> str:
    """
    Call Google Gemini API to generate a professional, reassuring medical summary.
    """
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""
You are a professional medical AI assistant. Based on the following health risk assessment, 
generate a clean, reassuring, and professional medical summary and action plan.

**IMPORTANT**: This is NOT a medical diagnosis. Always recommend the user consult a healthcare professional.

## User Health Inputs:
- Age: {user_input.age} years
- BMI: {user_input.bmi}
- Blood Pressure: {user_input.blood_pressure_systolic}/{user_input.blood_pressure_diastolic} mmHg
- Fasting Glucose: {user_input.glucose} mg/dL
- Total Cholesterol: {user_input.cholesterol} mg/dL
- Heart Rate: {user_input.heart_rate} bpm
- Insulin: {user_input.insulin} mu U/mL

## Risk Assessment Results:
- Risk Tier: {risk['risk_tier'].upper()}
- Confidence Score: {risk['risk_score'] * 100:.1f}%
- Probability Breakdown: Low={risk['risk_probability']['low']*100:.1f}%, Moderate={risk['risk_probability']['moderate']*100:.1f}%, High={risk['risk_probability']['high']*100:.1f}%
- Most Influential Factors: {', '.join(list(risk['feature_importance'].keys())[:3])}

## Historical Patient Matches (Similar Cases):
{chr(10).join([f"- Patient {m['patient_id']} (Similarity: {m['similarity_score']*100:.1f}%): Diagnosed with {m['diagnosis']}. Progression: {m['historical_progression']}" for m in matches])}

## Recommended Hospitals (Top 3):
{chr(10).join([f"- {h['name']}: Rating {h['rating']}/5, {h['distance_km']}km away, Specialties: {', '.join(h['matched_specialties'])}" for h in hospitals[:3]])}

Please provide:
1. **Summary**: A brief, reassuring explanation of the results (2-3 sentences)
2. **Key Risk Factors**: What the top contributing factors mean
3. **Recommended Actions**: 3-5 actionable next steps
4. **Hospital Guidance**: Which hospital to consider and why

Keep the tone professional, empathetic, and non-alarmist. Use markdown formatting.
"""
        response = await gemini_model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return None


@app.post("/api/full-prediction")
async def full_prediction(input_data: HealthInput):
    """
    Combined endpoint: runs risk prediction, similarity matching, hospital
    recommendation, and optionally Gemini AI summary in one call.
    """
    # 1. Risk Prediction
    risk_result = await predict_risk(input_data)
    risk_dict = risk_result.model_dump()

    # 2. Historical Similarity Matching
    match_result = await find_similar_patients(input_data)
    matches = match_result.matches

    # 3. Hospital Recommendation
    hospital_result = await recommend_hospitals(input_data)
    hospitals = hospital_result.hospitals

    # 4. Optional Gemini AI Summary
    ai_summary = None
    if input_data.gemini_api_key:
        ai_summary = await generate_gemini_summary(
            risk_dict, matches, hospitals,
            input_data.gemini_api_key, input_data,
        )

    return FullPredictionResponse(
        risk=risk_result,
        historical_matches=matches,
        recommended_hospitals=hospitals,
        ai_summary=ai_summary,
    )
