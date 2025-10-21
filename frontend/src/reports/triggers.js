/** @format */

/**
 * @typedef {Object} IntakeSnapshot
 * @property {number} [understandCondition]
 */

/**
 * @typedef {Object} Triggers
 * @property {boolean} isPreventionMode
 * @property {boolean} isSymptomMode
 */

/**
 * Minimal rules function that maps the intake response
 * to actionable booleans we can build the report from.
 * Designed to remain small and composable so we can
 * layer in additional triggers (BMI, labs, cognition)
 * without rewriting existing consumers.
 *
 * @param {IntakeSnapshot} [intake]
 * @returns {Triggers}
 */
export function deriveTriggers(intake = {}) {
  const code = Number(intake?.understandCondition);

  return {
    isPreventionMode: code === 1 || code === 2,
    isSymptomMode: code === 3 || code === 4 || code === 5
  };
}

export default deriveTriggers;
