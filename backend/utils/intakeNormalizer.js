/** @format */

// --- canonical helpers ---------------------------------
const yesNo = (raw) => {
  if (raw === null || raw === undefined) return '';
  const v = String(raw).trim().toLowerCase();
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  return '';
};

const yesNoUnsure = (raw) => {
  if (raw === null || raw === undefined) return '';
  const v = String(raw).trim().toLowerCase();
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  if (v === 'unsure') return 'Unsure';
  return '';
};

// --- numeric helpers ------------------------------------
const toNumber = (raw, { min = null, max = null } = {}) => {
  if (raw === '' || raw === null || raw === undefined) return '';
  const num = Number(raw);
  if (!Number.isFinite(num)) return '';
  if (min !== null && num < min) return min;
  if (max !== null && num > max) return max;
  return num;
};

const mmddyyyyToISO = (raw) => {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return Number.isNaN(new Date(iso).getTime()) ? '' : iso;
};

// --- derived metrics ------------------------------------
const safeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const computeBmi = (feet, inches, weightLbs) => {
  const weight = safeNumber(weightLbs);
  const ft = safeNumber(feet) || 0;
  const inch = safeNumber(inches) || 0;
  const totalInches = ft * 12 + inch;
  if (!weight || !totalInches) return null;
  return Number(((weight / (totalInches ** 2)) * 703).toFixed(2));
};

const bmiBand = (bmi) => {
  if (bmi === null) return null;
  if (bmi <= 22) return 'low';
  if (bmi <= 25) return 'normal_highrisk';
  return 'over25';
};

const mapUnderstand = (value) => {
  if (typeof value === 'number') return Number(value) || null;
  if (!value) return null;
  const match = String(value).trim().match(/^(\d)/);
  if (match) {
    const code = Number(match[1]);
    return code >= 1 && code <= 5 ? code : null;
  }
  const numeric = Number(value);
  return numeric >= 1 && numeric <= 5 ? numeric : null;
};

const mapDiabetesType = (value) => {
  if (!value && value !== 0) return null;
  const v = String(value).trim().toLowerCase();
  if (v === 'type 1' || v === '1') return 1;
  if (v === 'type 2' || v === '2') return 2;
  return null;
};

// keep in sync with the front-end rule
const deriveTriggers = (intake = {}) => {
  const n = Number(intake.understandCondition);
  return {
    isPreventionMode: n === 1 || n === 2,
    isSymptomMode: n === 3 || n === 4 || n === 5
  };
};

const clampCognition = (score, type) => {
  if (score === '' || score === null || score === undefined) return '';
  const t = String(type || '').toLowerCase();
  const max = t.includes('moca') || t.includes('mmse') ? 30 : t.includes('xpresso') ? 100 : 100;
  return toNumber(score, { min: 0, max });
};

const evaluateCognitionBands = (intake) => {
  const out = {};
  const xpresso = safeNumber(intake.xpresso_score) ?? clampCognition(intake.cognitionTestScore, intake.cognitionTestType);
  if (xpresso !== null) out.xpresso = { score: xpresso, band: xpresso >= 72 ? 'xpresso_high' : xpresso >= 43 ? 'xpresso_mid' : 'xpresso_low' };

  const moca =
    safeNumber(intake.moca_score) ??
    clampCognition(intake.cognitionTestScore, intake.cognitionTestType) ??
    clampCognition(intake.cognitionPastScore, intake.cognitionPastType);
  if (moca !== null) {
    let band = 'moca_severe';
    if (moca >= 26) band = 'moca_normal';
    else if (moca >= 18) band = 'moca_mild';
    else if (moca >= 10) band = 'moca_moderate';
    out.moca = { score: moca, band };
  }

  const mmse =
    safeNumber(intake.mmse_score) ??
    clampCognition(intake.cognitionTestScore, intake.cognitionTestType) ??
    clampCognition(intake.cognitionPastScore, intake.cognitionPastType);
  if (mmse !== null) {
    let band = 'mmse_severe';
    if (mmse >= 21) band = 'mmse_mild';
    else if (mmse >= 10) band = 'mmse_moderate';
    out.mmse = { score: mmse, band };
  }
  return out;
};

// -----------------------------------------

const normalizeIntakePayload = (raw = {}) => {
  const form = { ...(raw || {}) };

  form.understandCondition = mapUnderstand(form.understandCondition);
  form.diabetesType = mapDiabetesType(form.diabetesType);

  // canonical enums
  [
    'smoking',
    'statins',
    'alcohol',
    'stress',
    'vegan',
    'migraines',
    'gum',
    'hearing',
    'allergyLeukotriene',
    'snoring',
    'hrtFemale',
    'hrtMale',
    'ed'
  ].forEach((field) => {
    if (field in form) form[field] = yesNo(form[field]);
  });

  [
    'diabetes',
    'cholesterol',
    'hbp',
    'autoimmune',
    'thyroid',
    'asthma',
    'viral',
    'sleep',
    'depression',
    'anemia',
    'hemochromatosis',
    'cataracts',
    'mold',
    'heavyMetals',
    'cognitionPast'
  ].forEach((field) => {
    if (field in form) form[field] = yesNoUnsure(form[field]);
  });

  // clamp numerics
  const bounds = {
    heightFeet: { min: 3, max: 7 },
    heightInches: { min: 0, max: 11 },
    weightLbs: { min: 60, max: 600 },
    hba1c: { min: 3, max: 15 },
    fasting_glucose: { min: 50, max: 400 },
    fasting_insulin: { min: 0, max: 200 },
    c_peptide: { min: 0, max: 15 },
    ldl: { min: 0, max: 400 },
    triglycerides: { min: 0, max: 800 },
    hdl: { min: 0, max: 200 },
    apoB: { min: 0, max: 300 },
    hdl_triglyceride_ratio: { min: 0, max: 20 }
  };

  Object.entries(bounds).forEach(([field, limit]) => {
    if (field in form) form[field] = toNumber(form[field], limit);
  });

  // cognition
  if ('cognitionTestScore' in form) {
    form.cognitionTestScore = clampCognition(form.cognitionTestScore, form.cognitionTestType);
  }
  if ('cognitionPastScore' in form) {
    form.cognitionPastScore = clampCognition(form.cognitionPastScore, form.cognitionPastType);
  }

  if ('cognitionTestDate' in form) form.cognitionTestDate = mmddyyyyToISO(form.cognitionTestDate);
  if ('cognitionPastDate' in form) form.cognitionPastDate = mmddyyyyToISO(form.cognitionPastDate);

  // derived
  const bmi = computeBmi(form.heightFeet, form.heightInches, form.weightLbs);
  const derived = {
    bmi,
    bmiBand: bmiBand(bmi),
    cognitionBands: evaluateCognitionBands(form),
    triggers: deriveTriggers(form)
  };

  return { normalizedFormData: form, derived };
};

module.exports = { normalizeIntakePayload, deriveTriggers };
