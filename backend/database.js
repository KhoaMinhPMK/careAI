const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');

const dbPath = path.resolve(__dirname, '..', config.DB_PATH);
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medical_record_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
    admission_date TEXT NOT NULL,
    ward TEXT NOT NULL,
    diagnosis TEXT,
    admission_weight_kg REAL,
    admission_height_cm REAL,
    risk_level TEXT DEFAULT 'unknown' CHECK(risk_level IN ('low', 'moderate', 'high', 'critical', 'unknown')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('weight', 'height', 'bmi', 'head_circumference')),
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    source TEXT DEFAULT 'ehr',
    zscore REAL,
    zscore_interpretation TEXT,
    data_quality_score REAL DEFAULT 1.0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS clinical_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    note_type TEXT DEFAULT 'progress' CHECK(note_type IN ('admission', 'progress', 'nutrition', 'discharge', 'consultation')),
    effective_date TEXT NOT NULL,
    extracted_signals TEXT, -- JSON string
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    observation_id INTEGER,
    tier TEXT NOT NULL CHECK(tier IN ('tier1', 'tier2', 'tier3')),
    severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'warning', 'info')),
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    explanation TEXT,
    resolved INTEGER DEFAULT 0,
    resolved_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (observation_id) REFERENCES observations(id)
  );

  CREATE TABLE IF NOT EXISTS fhir_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL,
    fhir_json TEXT NOT NULL,
    version TEXT DEFAULT '4.0.1',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS lab_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    test_category TEXT NOT NULL CHECK(test_category IN ('biochemistry', 'urinalysis', 'coagulation', 'hematology')),
    test_name TEXT NOT NULL,
    result_value REAL,
    result_text TEXT,
    unit TEXT,
    reference_min REAL,
    reference_max REAL,
    is_abnormal INTEGER DEFAULT 0,
    effective_date TEXT NOT NULL,
    ordering_doctor TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS medical_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    order_type TEXT NOT NULL CHECK(order_type IN ('medication', 'diet', 'monitoring', 'lab_order', 'care_level')),
    content TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    route TEXT,
    effective_date TEXT NOT NULL,
    ordering_doctor TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    temperature REAL,
    blood_pressure TEXT,
    spo2 INTEGER,
    crt REAL,
    effective_date TEXT NOT NULL,
    recorded_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE INDEX IF NOT EXISTS idx_observations_patient ON observations(patient_id);
  CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(effective_date);
  CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
  CREATE INDEX IF NOT EXISTS idx_fhir_exports_patient ON fhir_exports(patient_id);
  CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);
  CREATE INDEX IF NOT EXISTS idx_lab_results_date ON lab_results(effective_date);
  CREATE INDEX IF NOT EXISTS idx_medical_orders_patient ON medical_orders(patient_id);
  CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals(patient_id);
`);

module.exports = db;
