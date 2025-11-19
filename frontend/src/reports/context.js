/** @format */

import deriveTriggers from './triggers';

export const DEFAULT_GLOBAL_DISCLAIMER =
  'This educational report is not a diagnosis or a substitute for personalized medical advice. Please consult your licensed healthcare provider before making changes to your care plan.';

export const DEFAULT_FOOTER_BANNER =
  'Educational wellness content. Not medical advice. See the full disclaimer on page 1.';

const INTRO_TEMPLATES = {
  prevention: (firstName) =>
    `Hi ${firstName || 'there'}, thanks for proactively investing in your brain health. Since you indicated you are focused on prevention, this report highlights lifestyle habits, evidence-informed screenings, and coaching topics that help you stay ahead of changes.`,
  symptom: (firstName) =>
    `Hi ${firstName || 'there'}, we hear that you are noticing changes or have received a diagnosis. This report outlines supportive steps, care partner resources, and testing pathways to help you feel organized and supported.`,
  default: (firstName) =>
    `Hi ${firstName || 'there'}, thank you for sharing your goals with Better Mind Care. This overview summarizes what we discussed and the next steps to keep your plan moving forward.`
};

const SUMMARY_TEMPLATES = {
  prevention:
    'Because your goals are prevention-oriented, we start with everyday levers you can control: sleep, stress, nutrition, activity, and targeted lab screening. These touchpoints help us detect subtle shifts early.',
  symptom:
    'Because you reported active symptoms or a diagnosis, this plan balances clinical follow-up with tools that help you and your care partners feel supported. We spotlight high-impact actions and specialists to engage next.',
  default:
    'This plan summarizes what matters most from your intake today and points you toward the next best steps. Your care team will continue to refine these sections as new information arrives.'
};

/**
 * @typedef {Object} ReportContext
 * @property {string} firstName
 * @property {string} reportDate
 * @property {boolean} isDraft
 * @property {{isPreventionMode: boolean, isSymptomMode: boolean}} triggers
 * @property {string} globalDisclaimer
 * @property {string} footerBanner
 * @property {Array<Object>} sections
 * @property {Array<Object>} recommendations
 * @property {Array<string>} labs
 * @property {any} raw
 */

const todayISO = () => new Date().toISOString().slice(0, 10);

const normaliseRecommendations = (payload) => {
  const raw =
    Array.isArray(payload?.recommendations) && payload.recommendations.length
      ? payload.recommendations
      : Array.isArray(payload?.report)
        ? payload.report
        : [];

  return raw.filter(Boolean).map((item, idx) => {
    if (typeof item === 'string') {
      return {
        id: `rec-${idx}`,
        title: item,
        description: ''
      };
    }
    const title = item?.title || item?.heading || `Recommendation ${idx + 1}`;
    const description = item?.body || item?.description || item?.text || '';
    return {
      id: `rec-${idx}`,
      title,
      description
    };
  });
};

const normaliseLabs = (payload) => {
  const labs = Array.isArray(payload?.labRecommendations)
    ? payload.labRecommendations
    : Array.isArray(payload?.labs)
      ? payload.labs
      : [];

  const unique = [...new Set(labs.filter(Boolean))];
  return unique.map((lab, idx) => ({
    id: `lab-${idx}`,
    title: lab
  }));
};

const buildIntroLetter = (firstName, triggers) => {
  if (triggers.isSymptomMode) return INTRO_TEMPLATES.symptom(firstName);
  if (triggers.isPreventionMode) return INTRO_TEMPLATES.prevention(firstName);
  return INTRO_TEMPLATES.default(firstName);
};

const buildSummary = (triggers) => {
  if (triggers.isSymptomMode) return SUMMARY_TEMPLATES.symptom;
  if (triggers.isPreventionMode) return SUMMARY_TEMPLATES.prevention;
  return SUMMARY_TEMPLATES.default;
};

/**
 * Map the intake payload into a render-friendly structure.
 * Adds defaults so the UI/PDF can rely on consistent keys.
 *
 * @param {Object} payload
 * @returns {ReportContext}
 */
export function buildReportContext(payload = {}) {
  const firstName =
    payload.firstName ||
    payload?.patient?.firstName ||
    payload?.patient?.name ||
    'Patient';

  const reportDate =
    payload?.metadata?.reportDate ||
    payload?.reportDate ||
    payload?.submittedAt ||
    todayISO();

  const isDraft =
    payload?.metadata?.draft === true ||
    payload?.metadata?.isDraft === true ||
    payload?.isDraft === true;

  const intakeSnapshot = payload?.intake || payload?.intakeResponses || {};
  const derived = payload?.derived || {};
  const triggers =
    derived?.triggers && typeof derived.triggers === 'object'
      ? derived.triggers
      : deriveTriggers(intakeSnapshot);

  const bmi =
    safeNumber(derived?.bmi) ??
    computeBmi(
      intakeSnapshot?.heightFeet ?? intakeSnapshot?.height_feet,
      intakeSnapshot?.heightInches ?? intakeSnapshot?.height_inches,
      intakeSnapshot?.weightLbs ?? intakeSnapshot?.weight_lbs
    );
  const bmiBand = derived?.bmiBand || resolveBmiBand(bmi);

  const cognitionBands = computeCognitionBands(
    {
      ...intakeSnapshot,
      ...payload?.labs,
      ...payload?.cognition
    },
    derived?.cognitionBands
  );

  const recommendations = normaliseRecommendations(payload);
  const labs = normaliseLabs(payload);

  const introLetter =
    payload?.introLetter || buildIntroLetter(firstName, triggers);
  const summaryCopy = payload?.summary || buildSummary(triggers);

  const globalDisclaimer =
    payload?.globalDisclaimer || DEFAULT_GLOBAL_DISCLAIMER;
  const footerBanner = payload?.footerBanner || DEFAULT_FOOTER_BANNER;

  const supplementalSections =
    Array.isArray(payload?.sections) && payload.sections.length > 0
      ? payload.sections.filter(Boolean).map((section, idx) => ({
          id: section.id || `custom-${idx}`,
          title: section.title || `Section ${idx + 1}`,
          body: section.body || '',
          items: section.items || [],
          footer: footerBanner,
          meta: { source: 'payload' }
        }))
      : [];

  const sections = [
    {
      id: 'intro-letter',
      title: 'Personalized Introduction',
      body: introLetter,
      footer: footerBanner
    },
    {
      id: 'summary',
      title: 'Where We Are Today',
      body: summaryCopy,
      footer: footerBanner
    },
    recommendations.length
      ? {
          id: 'recommendations',
          title: 'Personalized Recommendations',
          items: recommendations,
          footer: footerBanner
        }
      : null,
    labs.length
      ? {
          id: 'labs',
          title: 'Recommended Labs & Follow-up',
          items: labs,
          footer: footerBanner
        }
      : null,
    ...supplementalSections
  ]
    .filter(Boolean)
    .map((section, order) => ({
      ...section,
      order
    }));

  return {
    firstName,
    reportDate,
    isDraft,
    triggers,
    globalDisclaimer,
    footerBanner,
    sections,
    recommendations,
    labs,
    derived: {
      ...derived,
      bmi,
      bmiBand,
      cognitionBands
    },
    raw: payload
  };
}

export default buildReportContext;
const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const computeBmi = (feet, inches, weightLbs) => {
  const feetNum = safeNumber(feet) || 0;
  const inchNum = safeNumber(inches) || 0;
  const weightNum = safeNumber(weightLbs);
  if (!weightNum) return null;
  const totalInches = feetNum * 12 + inchNum;
  if (!totalInches) return null;
  const bmi = (weightNum / totalInches ** 2) * 703;
  if (!Number.isFinite(bmi)) return null;
  return Number(bmi.toFixed(2));
};

const resolveBmiBand = (bmi) => {
  if (bmi === null || bmi === undefined) return null;
  if (bmi <= 22) return 'low';
  if (bmi > 22 && bmi <= 25) return 'normal_highrisk';
  if (bmi > 25) return 'over25';
  return null;
};

const evaluateXpressoBand = (score) => {
  const val = safeNumber(score);
  if (val === null) return null;
  if (val >= 72) return 'xpresso_high';
  if (val >= 43) return 'xpresso_mid';
  return 'xpresso_low';
};

const evaluateMocaBand = (score) => {
  const val = safeNumber(score);
  if (val === null) return null;
  if (val >= 26) return 'moca_normal';
  if (val >= 18) return 'moca_mild';
  if (val >= 10) return 'moca_moderate';
  return 'moca_severe';
};

const evaluateMmseBand = (score) => {
  const val = safeNumber(score);
  if (val === null) return null;
  if (val >= 21) return 'mmse_mild';
  if (val >= 10) return 'mmse_moderate';
  return 'mmse_severe';
};

const computeCognitionBands = (sources, fallbackBands) => {
  if (fallbackBands && Object.keys(fallbackBands).length > 0) {
    return fallbackBands;
  }

  const result = {};
  const xpresso =
    safeNumber(sources?.xpresso_score) ??
    (sources?.cognitionTestType === 'XpressO'
      ? safeNumber(sources?.cognitionTestScore)
      : null);
  const moca =
    safeNumber(sources?.moca_score) ??
    (['MoCA', 'Moca'].includes(sources?.cognitionTestType)
      ? safeNumber(sources?.cognitionTestScore)
      : null) ??
    (['MoCA', 'Moca'].includes(sources?.cognitionPastType)
      ? safeNumber(sources?.cognitionPastScore)
      : null);
  const mmse =
    safeNumber(sources?.mmse_score) ??
    (sources?.cognitionTestType === 'MMSE'
      ? safeNumber(sources?.cognitionTestScore)
      : null) ??
    (sources?.cognitionPastType === 'MMSE'
      ? safeNumber(sources?.cognitionPastScore)
      : null);

  if (xpresso !== null) {
    result.xpresso = { score: xpresso, band: evaluateXpressoBand(xpresso) };
  }
  if (moca !== null) {
    result.moca = { score: moca, band: evaluateMocaBand(moca) };
  }
  if (mmse !== null) {
    result.mmse = { score: mmse, band: evaluateMmseBand(mmse) };
  }
  return result;
};
