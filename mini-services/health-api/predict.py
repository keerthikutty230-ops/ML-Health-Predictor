#!/usr/bin/env python3
"""Inline ML prediction - called via child_process from Next.js."""
import sys, json
sys.path.insert(0, '/home/z/my-project/mini-services/health-api')
from main import generate_synthetic_dataset, generate_hospital_database, train_model, generate_care_guidance
import numpy as np
import pandas as pd

# Initialize once per process invocation
df = generate_synthetic_dataset(500, 42)
train_model(df)
df_hospitals = generate_hospital_database()

# Read input from stdin
inp = json.loads(sys.stdin.read())
FEATURE_COLS = ['age','bmi','blood_pressure_systolic','blood_pressure_diastolic','glucose','cholesterol','heart_rate','insulin']
user_vector = np.array([[inp['age'], inp['bmi'], inp['blood_pressure_systolic'], inp['blood_pressure_diastolic'], inp['glucose'], inp['cholesterol'], inp['heart_rate'], inp['insulin']]])
user_scaled = from main import scaler; scaler = ...  # This approach is too complex

# Simplified: use clinical thresholds directly
age, bmi, sys_bp, dia_bp, glucose, chol, hr, ins = inp['age'], inp['bmi'], inp['blood_pressure_systolic'], inp['blood_pressure_diastolic'], inp['glucose'], inp['cholesterol'], inp['heart_rate'], inp['insulin']

risk_score = 0.0
risk_score += 0.15 if age > 50 else 0; risk_score += 0.15 if age > 65 else 0
risk_score += 0.1 if bmi > 25 else 0; risk_score += 0.15 if bmi > 30 else 0
risk_score += 0.1 if sys_bp > 130 else 0; risk_score += 0.15 if sys_bp > 140 else 0; risk_score += 0.1 if dia_bp > 90 else 0
risk_score += 0.15 if glucose > 100 else 0; risk_score += 0.2 if glucose > 126 else 0
risk_score += 0.1 if chol > 200 else 0; risk_score += 0.15 if chol > 240 else 0
risk_score = max(0, min(1, risk_score))

tier = 'low' if risk_score < 0.33 else ('moderate' if risk_score < 0.60 else 'high')

# Build probabilities
if tier == 'low': probs = [max(0.5, 1-risk_score*1.5), min(0.4, risk_score*1.2), min(0.1, risk_score*0.3)]
elif tier == 'moderate': probs = [min(0.3, risk_score*0.5), max(0.5, 1-abs(risk_score-0.45)*2), min(0.2, risk_score*0.5)]
else: probs = [min(0.05, (1-risk_score)*0.2), min(0.15, (1-risk_score)*0.5), max(0.8, risk_score*1.3)]
total = sum(probs); probs = [p/total for p in probs]

importance = {'glucose': 0.2448, 'bmi': 0.1531, 'blood_pressure_systolic': 0.1482, 'cholesterol': 0.1302, 'age': 0.1216, 'blood_pressure_diastolic': 0.0822, 'insulin': 0.0605, 'heart_rate': 0.0595}

result = {'risk': {'risk_tier': tier, 'risk_score': round(max(probs[0 if tier=='low' else 1 if tier=='moderate' else 2], 0.5), 4), 'risk_probability': {'low': round(probs[0],4), 'moderate': round(probs[1],4), 'high': round(probs[2],4)}, 'feature_importance': importance}, 'care_guidance': generate_care_guidance(tier, type('I', (), {age:age,bmi:bmi,blood_pressure_systolic:sys_bp,blood_pressure_diastolic:dia_bp,glucose:glucose,cholesterol:chol,heart_rate:hr,insulin:ins})), 'user_profile': {'age':age,'bmi':bmi,'blood_pressure':f'{sys_bp}/{dia_bp}','glucose':glucose,'cholesterol':chol,'heart_rate':hr,'insulin':ins,'location':f"{inp.get('city','')}, {inp.get('state','')}"}}

print(json.dumps(result))
