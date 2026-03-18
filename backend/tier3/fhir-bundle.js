/**
 * Tier 3: FHIR Resource Generators and Bundle Assembler
 * Generates FHIR R4 (4.0.1) resources for validated patient data
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Generate FHIR Patient resource
 */
function generatePatientResource(patient) {
  return {
    resourceType: 'Patient',
    id: `patient-${patient.id}`,
    meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'] },
    identifier: [{
      system: 'http://careai.example.org/mrn',
      value: patient.medical_record_number
    }],
    name: [{
      use: 'official',
      text: patient.name,
      family: patient.name.split(' ').pop(),
      given: patient.name.split(' ').slice(0, -1)
    }],
    gender: patient.gender,
    birthDate: patient.date_of_birth
  };
}

/**
 * Generate FHIR Observation resource for a measurement
 */
function generateObservationResource(observation, patient) {
  const codeMap = {
    weight: { code: '29463-7', display: 'Body Weight', unit: 'kg', ucum: 'kg' },
    height: { code: '8302-2', display: 'Body Height', unit: 'cm', ucum: 'cm' },
    bmi: { code: '39156-5', display: 'Body Mass Index', unit: 'kg/m2', ucum: 'kg/m2' },
    head_circumference: { code: '9843-4', display: 'Head Circumference', unit: 'cm', ucum: 'cm' }
  };

  const mapping = codeMap[observation.type] || codeMap.weight;
  const profiles = [];

  // Add US Core pediatric profiles if applicable
  if (observation.type === 'bmi') {
    profiles.push('http://hl7.org/fhir/us/core/StructureDefinition/pediatric-bmi-for-age');
  }
  if (observation.type === 'weight') {
    profiles.push('http://hl7.org/fhir/us/core/StructureDefinition/us-core-body-weight');
  }

  const resource = {
    resourceType: 'Observation',
    id: `obs-${observation.id}`,
    meta: profiles.length > 0 ? { profile: profiles } : undefined,
    status: 'final',
    category: [{
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }]
    }],
    code: {
      coding: [{ system: 'http://loinc.org', code: mapping.code, display: mapping.display }],
      text: mapping.display
    },
    subject: { reference: `Patient/patient-${patient.id}`, display: patient.name },
    effectiveDateTime: observation.effective_date,
    valueQuantity: {
      value: observation.value,
      unit: mapping.unit,
      system: 'http://unitsofmeasure.org',
      code: mapping.ucum
    }
  };

  // Add data quality extension
  if (observation.data_quality_score !== undefined) {
    resource.extension = [{
      url: 'http://careai.example.org/fhir/StructureDefinition/data-quality-score',
      valueDecimal: observation.data_quality_score
    }];
  }

  // Add z-score as component
  if (observation.zscore !== undefined && observation.zscore !== null) {
    resource.component = [{
      code: {
        coding: [{ system: 'http://loinc.org', code: '77606-2', display: 'Weight-for-age percentile' }],
        text: 'WHO z-score'
      },
      valueQuantity: { value: observation.zscore, unit: 'z-score', system: 'http://unitsofmeasure.org', code: '{z-score}' }
    }];
  }

  return resource;
}

/**
 * Generate FHIR NutritionOrder resource
 */
function generateNutritionOrderResource(patient, orderData = {}) {
  return {
    resourceType: 'NutritionOrder',
    id: `nutorder-${patient.id}-${uuidv4().substring(0, 8)}`,
    status: 'active',
    intent: 'order',
    patient: { reference: `Patient/patient-${patient.id}`, display: patient.name },
    dateTime: new Date().toISOString().split('T')[0],
    oralDiet: {
      type: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: orderData.dietCode || '226379006',
          display: orderData.dietDisplay || 'Regular diet'
        }]
      }],
      schedule: [{
        repeat: { frequency: orderData.frequency || 3, period: 1, periodUnit: 'd' }
      }]
    }
  };
}

/**
 * Generate FHIR NutritionIntake resource
 */
function generateNutritionIntakeResource(patient, intakeData = {}) {
  return {
    resourceType: 'NutritionIntake',
    id: `nutintake-${patient.id}-${uuidv4().substring(0, 8)}`,
    status: 'completed',
    subject: { reference: `Patient/patient-${patient.id}`, display: patient.name },
    effectiveDateTime: intakeData.date || new Date().toISOString().split('T')[0],
    consumedItem: [{
      type: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: intakeData.foodCode || '226559001',
          display: intakeData.foodDisplay || 'Hospital meal'
        }]
      },
      amount: {
        value: intakeData.amount || 100,
        unit: intakeData.unit || '%',
        system: 'http://unitsofmeasure.org',
        code: intakeData.ucumUnit || '%'
      }
    }]
  };
}

/**
 * Assemble a FHIR Bundle from patient data
 */
function assembleFHIRBundle(patient, observations, options = {}) {
  const minDQScore = options.minDataQuality || 0.5;

  // Filter observations by data quality
  const qualityObs = observations.filter(o => (o.data_quality_score || 1.0) >= minDQScore);

  const entries = [];

  // Add Patient resource
  entries.push({
    resource: generatePatientResource(patient),
    request: { method: 'PUT', url: `Patient/patient-${patient.id}` }
  });

  // Add Observation resources
  for (const obs of qualityObs) {
    entries.push({
      resource: generateObservationResource(obs, patient),
      request: { method: 'PUT', url: `Observation/obs-${obs.id}` }
    });
  }

  return {
    resourceType: 'Bundle',
    id: `bundle-${patient.id}-${Date.now()}`,
    type: 'transaction',
    timestamp: new Date().toISOString(),
    total: entries.length,
    meta: {
      tag: [{
        system: 'http://careai.example.org/fhir/tags',
        code: 'validated',
        display: `CareAI validated (min DQ: ${minDQScore})`
      }]
    },
    entry: entries.map(e => ({ fullUrl: `urn:uuid:${uuidv4()}`, ...e }))
  };
}

module.exports = {
  generatePatientResource,
  generateObservationResource,
  generateNutritionOrderResource,
  generateNutritionIntakeResource,
  assembleFHIRBundle
};
