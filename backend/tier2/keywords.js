/**
 * Tier 2: Clinical Keyword Taxonomy
 * 10 categories of clinical signals, bilingual EN+VN
 */

const TAXONOMY = {
  edema: {
    label: 'Edema/Fluid Retention',
    keywords: [
      'edema', 'oedema', 'swelling', 'pitting', 'ascites', 'fluid overload',
      'fluid retention', 'puffy', 'bilateral edema', 'peripheral edema',
      'anasarca', 'pleural effusion', 'generalized edema',
      'phù', 'phù nề', 'phù toàn thân', 'tràn dịch', 'cổ chướng'
    ],
    weight_impact: 'increase',
    severity: 'high'
  },
  dehydration: {
    label: 'Dehydration',
    keywords: [
      'dehydration', 'dehydrated', 'dry mucous', 'poor turgor', 'sunken eyes',
      'decreased urine', 'oliguria', 'hypovolemia', 'skin tenting',
      'decreased skin turgor', 'dry lips', 'dry mouth', 'concentrated urine',
      'mất nước', 'khô niêm mạc', 'da nhăn', 'thiểu niệu', 'tiểu ít'
    ],
    weight_impact: 'decrease',
    severity: 'high'
  },
  poor_intake: {
    label: 'Poor Oral Intake',
    keywords: [
      'poor intake', 'decreased intake', 'refusing', 'not eating', 'npo',
      'nil by mouth', 'anorexia', 'poor appetite', 'feeding intolerance',
      'food refusal', 'decreased po', 'minimal intake', 'unable to eat',
      'kém ăn', 'bỏ ăn', 'biếng ăn', 'không ăn', 'nhịn ăn', 'suy dinh dưỡng'
    ],
    weight_impact: 'decrease',
    severity: 'warning'
  },
  vomiting: {
    label: 'Vomiting/GI Loss',
    keywords: [
      'vomiting', 'emesis', 'nausea', 'diarrhea', 'diarrhoea', 'watery stool',
      'loose stool', 'gi losses', 'gastric output', 'bilious', 'hematemesis',
      'nôn', 'buồn nôn', 'tiêu chảy', 'phân lỏng', 'đi ngoài'
    ],
    weight_impact: 'decrease',
    severity: 'warning'
  },
  diuretics: {
    label: 'Diuretic Therapy',
    keywords: [
      'furosemide', 'lasix', 'spironolactone', 'aldactone', 'diuretic',
      'hydrochlorothiazide', 'hctz', 'bumetanide', 'metolazone',
      'lợi tiểu', 'thuốc lợi tiểu'
    ],
    weight_impact: 'decrease',
    severity: 'info'
  },
  iv_fluids: {
    label: 'IV Fluid Administration',
    keywords: [
      'iv fluid', 'intravenous fluid', 'normal saline', 'lactated ringer',
      'd5w', 'bolus', 'fluid bolus', 'maintenance fluid', 'tpn',
      'parenteral nutrition', 'lipid infusion', 'dextrose',
      'truyền dịch', 'dịch truyền', 'nuôi dưỡng tĩnh mạch'
    ],
    weight_impact: 'increase',
    severity: 'info'
  },
  steroid: {
    label: 'Steroid Therapy',
    keywords: [
      'dexamethasone', 'prednisone', 'prednisolone', 'methylprednisolone',
      'hydrocortisone', 'steroid', 'corticosteroid', 'solumedrol',
      'corticoid', 'steroid liệu pháp'
    ],
    weight_impact: 'increase',
    severity: 'info'
  },
  surgery: {
    label: 'Surgical Intervention',
    keywords: [
      'post-op', 'post-operative', 'surgery', 'surgical', 'operation',
      'procedure', 'resection', 'debridement', 'ostomy', 'drain',
      'phẫu thuật', 'hậu phẫu', 'mổ', 'sau mổ'
    ],
    weight_impact: 'variable',
    severity: 'warning'
  },
  tube_feeding: {
    label: 'Enteral/Tube Feeding',
    keywords: [
      'ng tube', 'nasogastric', 'peg tube', 'g-tube', 'j-tube',
      'tube feeding', 'enteral feeding', 'gavage', 'bolus feed',
      'continuous feed', 'formula via', 'sonde dạ dày', 'nuôi ăn qua ống'
    ],
    weight_impact: 'increase',
    severity: 'info'
  },
  growth_concern: {
    label: 'Growth/Nutrition Concern',
    keywords: [
      'failure to thrive', 'ftt', 'faltering growth', 'weight loss',
      'malnutrition', 'underweight', 'wasting', 'stunting', 'cachexia',
      'kwashiorkor', 'marasmus', 'nutritional deficiency',
      'suy dinh dưỡng', 'chậm tăng cân', 'sụt cân', 'thiếu dinh dưỡng'
    ],
    weight_impact: 'decrease',
    severity: 'high'
  }
};

module.exports = TAXONOMY;
