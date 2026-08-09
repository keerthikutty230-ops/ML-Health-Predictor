-- ====================================================================
--  Neon Postgres Database Schema for HealthPredict AI Portal
--  Tables: neon_users, user_history, user_appointments, ai_chat_transcripts, user_medications, user_conditions
-- ====================================================================

-- 1. Neon Users Table
CREATE TABLE IF NOT EXISTS neon_users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  provider VARCHAR(50) DEFAULT 'google',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Clinical Risk History Table
CREATE TABLE IF NOT EXISTS user_history (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES neon_users(id) ON DELETE CASCADE,
  age INT NOT NULL,
  bmi NUMERIC NOT NULL,
  blood_pressure VARCHAR(50) NOT NULL,
  glucose NUMERIC NOT NULL,
  cholesterol NUMERIC NOT NULL,
  city VARCHAR(100) NOT NULL,
  risk_tier VARCHAR(50) NOT NULL,
  risk_score NUMERIC NOT NULL,
  symptoms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Booked Hospital Appointments Table
CREATE TABLE IF NOT EXISTS user_appointments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES neon_users(id) ON DELETE CASCADE,
  appointment_id VARCHAR(100) NOT NULL,
  hospital_name VARCHAR(255) NOT NULL,
  hospital_address TEXT NOT NULL,
  hospital_city VARCHAR(100) NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  patient_age INT NOT NULL,
  doctor VARCHAR(255) NOT NULL,
  appointment_date VARCHAR(50) NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  symptoms TEXT NOT NULL,
  status VARCHAR(100) DEFAULT 'Confirmed & Sent to OPD Dispatch',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Chat Transcripts Table
CREATE TABLE IF NOT EXISTS ai_chat_transcripts (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES neon_users(id) ON DELETE CASCADE,
  user_query TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Medications Table
CREATE TABLE IF NOT EXISTS user_medications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES neon_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. User Conditions Table
CREATE TABLE IF NOT EXISTS user_conditions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES neon_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
