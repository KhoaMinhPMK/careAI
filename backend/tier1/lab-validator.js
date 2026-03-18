/**
 * Tier 1: Lab Result Validator
 * Reference ranges from BV Phụ Sản - Nhi Đà Nẵng actual lab forms
 * Cross-validation rules for clinical syndromes
 */

// Reference ranges organized by test category
const LAB_REFERENCES = {
  biochemistry: {
    'ure_mau':       { name: 'Urê máu',           min: 2.5,  max: 7.5,  unit: 'mmol/L' },
    'creatinin_mau': { name: 'Creatinin máu',      min: 27,   max: 62,   unit: 'µmol/L' },
    'ast_got':       { name: 'AST (GOT)',           min: 0,    max: 37,   unit: 'U/L' },
    'alt_gpt':       { name: 'ALT (GPT)',           min: 0,    max: 40,   unit: 'U/L' },
    'sat_mau':       { name: 'Sắt máu',            min: 13,   max: 33,   unit: 'µmol/L' },
    'albumin_mau':   { name: 'Albumin máu',         min: 35,   max: 52,   unit: 'g/L' },
    'mg_mau':        { name: 'Mg máu',              min: 0.7,  max: 1.1,  unit: 'mmol/L' },
    'calci_ion':     { name: 'Calci ion hóa',       min: 1.17, max: 1.29, unit: 'mmol/L' },
    'natri':         { name: 'Na (Natri)',           min: 135,  max: 145,  unit: 'mmol/L' },
    'kali':          { name: 'K (Kali)',             min: 3.5,  max: 5.0,  unit: 'mmol/L' },
    'chloride':      { name: 'Cl (Chloride)',        min: 98,   max: 106,  unit: 'mmol/L' },
    'c3':            { name: 'Bổ thể C3',           min: 90,   max: 180,  unit: 'mg/dl' },
    'c4':            { name: 'Bổ thể C4',           min: 10,   max: 40,   unit: 'mg/dl' },
    'ferritin':      { name: 'Ferritin',             min: 12,   max: 150,  unit: 'ng/mL' },
    'creatinin_nieu':{ name: 'Creatinin niệu',      min: null,  max: null, unit: 'µmol/L' },
    'phospho':       { name: 'Phospho',              min: 0.87, max: 1.45, unit: 'mmol/L' },
    'acid_uric':     { name: 'Acid uric',            min: 120,  max: 420,  unit: 'µmol/L' },
    'glucose':       { name: 'Glucose máu',          min: 3.9,  max: 6.1,  unit: 'mmol/L' },
    'bilirubin_tp':  { name: 'Bilirubin toàn phần', min: 0,    max: 17.1, unit: 'µmol/L' },
    'ldh':           { name: 'LDH',                  min: 120,  max: 246,  unit: 'U/L' },
  },
  urinalysis: {
    'sg':            { name: 'Tỷ trọng (SG)',       min: 1.015, max: 1.025, unit: '' },
    'ph_nieu':       { name: 'pH nước tiểu',        min: 4.8,   max: 7.4,   unit: '' },
    'protein_nieu':  { name: 'Protein niệu',        min: 0,     max: 0.1,   unit: 'g/L' },
    'glucose_nieu':  { name: 'Glucose niệu',        min: 0,     max: 0.84,  unit: 'mmol/L' },
    'blood_nieu':    { name: 'Blood niệu',           min: 0,     max: 5,     unit: 'RBC/uL' },
    'leukocytes':    { name: 'Bạch cầu niệu',      min: 0,     max: 10,    unit: 'WBC/uL' },
    'creatinin_nieu_24h': { name: 'Protein niệu 24h', min: null, max: null, unit: 'µmol/L' },
  },
  coagulation: {
    'fibrinogen':    { name: 'Fibrinogen',           min: 2,    max: 4,    unit: 'g/L' },
    'pt_giay':       { name: 'PT (giây)',            min: 0,    max: 13.9, unit: 'giây' },
    'pt_phan_tram':  { name: 'PT (%)',               min: 70,   max: 140,  unit: '%' },
    'inr':           { name: 'INR',                   min: 0.9,  max: 1.3,  unit: '' },
    'aptt_giay':     { name: 'APTT (giây)',          min: 24,   max: 39,   unit: 'giây' },
    'aptt_benh_chung': { name: 'APTT Bệnh/Chứng',  min: 0.8,  max: 1.3,  unit: '' },
  }
};

/**
 * Validate a single lab result against reference range
 */
function validateLabResult(testKey, value, category) {
  const refs = LAB_REFERENCES[category];
  if (!refs || !refs[testKey]) return { is_abnormal: false, level: 'normal', message: '' };

  const ref = refs[testKey];
  if (ref.min === null && ref.max === null) return { is_abnormal: false, level: 'normal', message: '' };

  const result = { is_abnormal: false, level: 'normal', message: '', ref };

  if (ref.max !== null && value > ref.max) {
    const ratio = value / ref.max;
    if (ratio > 5) {
      result.is_abnormal = true;
      result.level = 'critical';
      result.message = `${ref.name} = ${value} ${ref.unit} — TĂNG RẤT CAO (>${Math.round(ratio)}× ngưỡng trên ${ref.max})`;
    } else if (ratio > 2) {
      result.is_abnormal = true;
      result.level = 'high';
      result.message = `${ref.name} = ${value} ${ref.unit} — TĂNG CAO (>${Math.round(ratio)}× ngưỡng trên ${ref.max})`;
    } else if (ratio > 1.1) {
      result.is_abnormal = true;
      result.level = 'warning';
      result.message = `${ref.name} = ${value} ${ref.unit} — tăng nhẹ (ngưỡng trên: ${ref.max})`;
    } else {
      result.level = 'borderline';
      result.message = `${ref.name} = ${value} ${ref.unit} — sát ngưỡng trên (${ref.max})`;
    }
  } else if (ref.min !== null && value < ref.min) {
    const ratio = ref.min / value;
    if (ratio > 5) {
      result.is_abnormal = true;
      result.level = 'critical';
      result.message = `${ref.name} = ${value} ${ref.unit} — GIẢM RẤT NHIỀU (<${Math.round(1/ratio*100)}% ngưỡng dưới ${ref.min})`;
    } else if (ratio > 2) {
      result.is_abnormal = true;
      result.level = 'high';
      result.message = `${ref.name} = ${value} ${ref.unit} — GIẢM (ngưỡng dưới: ${ref.min})`;
    } else if (ratio > 1.1) {
      result.is_abnormal = true;
      result.level = 'warning';
      result.message = `${ref.name} = ${value} ${ref.unit} — giảm nhẹ (ngưỡng dưới: ${ref.min})`;
    } else {
      result.level = 'borderline';
      result.message = `${ref.name} = ${value} ${ref.unit} — sát ngưỡng dưới (${ref.min})`;
    }
  }

  return result;
}

/**
 * Cross-validate lab results for clinical syndromes
 */
function crossValidateLabs(labResults) {
  const alerts = [];
  const byKey = {};
  for (const lab of labResults) {
    byKey[lab.test_key] = lab.result_value;
  }

  // 1. Renal dysfunction: Urê ↑ + Creatinin ↑
  if (byKey.ure_mau > 7.5 && byKey.creatinin_mau > 62) {
    alerts.push({
      alert_type: 'LAB_RENAL_DYSFUNCTION',
      severity: 'high',
      tier: 'tier1',
      message: `Urê (${byKey.ure_mau}) và Creatinin (${byKey.creatinin_mau}) đều tăng — nghi ngờ suy chức năng thận`,
      explanation: 'Cả Urê máu và Creatinin máu đều vượt ngưỡng bình thường. Cần đánh giá chức năng thận, cân nhắc điều chỉnh liều thuốc qua thận và lượng protein trong chế độ ăn.'
    });
  }

  // 2. Nephrotic syndrome: Albumin ↓ + Protein niệu ↑↑
  if (byKey.albumin_mau < 30 && byKey.protein_nieu > 0.3) {
    alerts.push({
      alert_type: 'LAB_NEPHROTIC_SYNDROME',
      severity: 'high',
      tier: 'tier1',
      message: `Albumin thấp (${byKey.albumin_mau} g/L) + Protein niệu cao (${byKey.protein_nieu} g/L) — dấu hiệu hội chứng thận hư`,
      explanation: 'Sự kết hợp giữa albumin máu thấp và protein niệu tăng gợi ý hội chứng thận hư. Cần đánh giá dinh dưỡng cẩn thận, bù albumin nếu cần.'
    });
  }

  // 3. Hyperkalemia: K > 5.5 — cardiac risk
  if (byKey.kali > 5.5) {
    alerts.push({
      alert_type: 'LAB_HYPERKALEMIA',
      severity: 'critical',
      tier: 'tier1',
      message: `🔴 K = ${byKey.kali} mmol/L — TĂNG KALI MÁU, nguy cơ rối loạn nhịp tim`,
      explanation: 'Kali > 5.5 mmol/L có thể gây rối loạn nhịp tim nguy hiểm. Cần ECG, giới hạn kali trong chế độ ăn, và xem xét điều trị hạ kali cấp.'
    });
  }

  // 4. Hyponatremia: Na < 130
  if (byKey.natri < 130) {
    alerts.push({
      alert_type: 'LAB_HYPONATREMIA',
      severity: 'warning',
      tier: 'tier1',
      message: `Na = ${byKey.natri} mmol/L — hạ natri máu, cần đánh giá cân bằng dịch`,
      explanation: 'Hạ natri máu có thể do pha loãng (dịch truyền quá nhiều) hoặc mất natri (tiêu chảy, nôn). Ảnh hưởng đến tính toán nhu cầu dịch.'
    });
  }

  // 5. Coagulopathy: PT kéo dài + INR > 1.5
  if (byKey.inr > 1.5 || byKey.pt_giay > 16) {
    alerts.push({
      alert_type: 'LAB_COAGULOPATHY',
      severity: 'warning',
      tier: 'tier1',
      message: `Rối loạn đông máu: INR = ${byKey.inr || '-'}, PT = ${byKey.pt_giay || '-'}s`,
      explanation: 'INR hoặc PT kéo dài gợi ý rối loạn đông máu. Cần kiểm tra vitamin K, chức năng gan. Lưu ý khi can thiệp dinh dưỡng đường tĩnh mạch.'
    });
  }

  // 6. Hypocalcemia (adjusted for albumin)
  if (byKey.calci_ion < 1.0) {
    alerts.push({
      alert_type: 'LAB_HYPOCALCEMIA',
      severity: 'warning',
      tier: 'tier1',
      message: `Ca++ ion = ${byKey.calci_ion} mmol/L — hạ calci máu`,
      explanation: 'Calci ion hóa thấp. Cần bổ sung calci, kiểm tra vitamin D. Nếu albumin cũng thấp, hạ calci có thể nặng hơn thực tế.'
    });
  }

  // 7. UTI suspicion: Leukocytes + Blood + Protein
  if (byKey.leukocytes > 10 && byKey.blood_nieu > 5) {
    alerts.push({
      alert_type: 'LAB_UTI_SUSPICION',
      severity: 'warning',
      tier: 'tier1',
      message: `Bạch cầu niệu + Hồng cầu niệu tăng — nghi ngờ nhiễm trùng tiểu`,
      explanation: 'Sự kết hợp bạch cầu và hồng cầu trong nước tiểu gợi ý nhiễm trùng đường tiểu. Cần cấy nước tiểu xác định.'
    });
  }

  // 8. Liver concern: AST + ALT both elevated
  if (byKey.ast_got > 100 && byKey.alt_gpt > 100) {
    alerts.push({
      alert_type: 'LAB_HEPATIC_INJURY',
      severity: 'high',
      tier: 'tier1',
      message: `AST = ${byKey.ast_got}, ALT = ${byKey.alt_gpt} — tổn thương gan`,
      explanation: 'AST và ALT đều tăng đáng kể gợi ý tổn thương tế bào gan. Cần đánh giá nguyên nhân và cân nhắc chế độ dinh dưỡng phù hợp bệnh gan.'
    });
  }

  return alerts;
}

/**
 * Detect potential decimal shift errors in lab values
 */
function detectLabDecimalError(testKey, value, category) {
  const refs = LAB_REFERENCES[category];
  if (!refs || !refs[testKey]) return null;
  const ref = refs[testKey];
  if (ref.min === null && ref.max === null) return null;

  // Check if value × 0.1 or value × 10 would be in range
  if (ref.max !== null && value > ref.max * 8) {
    const corrected = value / 10;
    if (ref.min !== null && corrected >= ref.min * 0.8 && corrected <= ref.max * 1.2) {
      return {
        alert_type: 'LAB_DECIMAL_SHIFT',
        severity: 'critical',
        message: `${ref.name} = ${value} — có thể nhầm dấu phẩy? ${corrected} ${ref.unit} sẽ nằm trong ngưỡng`,
        suggested_value: corrected
      };
    }
  }

  return null;
}

module.exports = { LAB_REFERENCES, validateLabResult, crossValidateLabs, detectLabDecimalError };
