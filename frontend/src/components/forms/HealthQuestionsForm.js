import React, { useState, useEffect } from 'react';
import QuestionsCheckbox from './QuestionsCheckbox';
import RadioQuestions from './RadioQuestions';
import TextInput from '../inputs/InputText.js';
import './FormElements.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.js';

function HealthQuestionsForm({ gender, setGender }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isDoctor = role === 'doctor';
  const [submitting, setSubmitting] = useState(false);
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedGender, setSelectedGender] = useState(gender || '');
  const [errors, setErrors] = useState({});
  const viralHelpId = 'viral-help';

  const [formData, setFormData] = useState(() => ({
    understandCondition: '',
    birthGender: gender || '',
    heightFeet: '',
    heightInches: '',
    weightLbs: '',
    smoking: '',
    diabetes: '',
    diabetesType: '',
    cholesterol: '',
    statins: '',
    hbp: '',
    autoimmune: '',
    autoimmuneOther: '',
    thyroid: '',
    stress: '',
    vegan: '',
    migraines: '',
    asthma: '',
    allergyLeukotriene: '',
    viral: '',
    viralNotes: '',
    gum: '',
    sleep: '',
    sleepMedClasses: [],
    sleepMedOther: '',
    depression: '',
    anemia: '',
    hemochromatosis: '',
    hemochromatosisRelation: '',
    hearing: '',
    cataracts: '',
    mold: '',
    heavyMetals: '',
    alcohol: '',
    cognitionWilling: '',
    cognitionTestType: '',
    cognitionTestDate: '',
    cognitionTestScore: '',
    cognitionPast: '',
    cognitionPastType: '',
    cognitionPastDate: '',
    cognitionPastScore: '',
    hrtFemale: '',
    hrtMale: '',
    ed: '',
    snoring: '',
    hba1c: '',
    fasting_glucose: '',
    fasting_insulin: '',
    c_peptide: '',
    ldl: '',
    triglycerides: '',
    hdl: '',
    apoB: '',
    hdl_triglyceride_ratio: ''
  }));

  const normalizedGender = String(
    formData.birthGender || selectedGender || gender || ''
  ).toLowerCase();

  useEffect(() => {
    if (!(isDoctor || isAdmin)) return;
    (async () => {
      try {
        const res = await fetch('/api/auth/users', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`${res.status} ${err.error || res.statusText}`);
        }
        const data = await res.json();
        const patients = (data || []).filter(
          (u) => (u.role_name || u.role || '').toLowerCase() === 'patient'
        );
        setPatientOptions(patients);
      } catch (e) {
        console.error('Failed to load users:', e);
        setPatientOptions([]);
      }
    })();
  }, [isDoctor, isAdmin]);

  useEffect(() => {
    if (!(isDoctor || isAdmin)) return;
    const lockedGender = gender || formData.birthGender || '';
    setSelectedGender(lockedGender);
    setFormData((prev) => ({
      ...prev,
      birthGender: lockedGender || prev.birthGender
    }));
  }, [isDoctor, isAdmin, gender, formData.birthGender]);

  useEffect(() => {
    if (!selectedPatientId) return;
    const found = patientOptions.find(
      (p) => String(p.id) === String(selectedPatientId)
    );
    if (found) {
      const g = (found.gender ?? '').toString();
      setSelectedGender(g);
      setGender?.(g);
      setFormData((prev) => ({ ...prev, birthGender: g || prev.birthGender }));
    }
  }, [selectedPatientId, patientOptions, setGender]);

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (id, value) => {
    if (id === 'understandCondition') {
      const input = String(value ?? '').trim();
      const match = input.match(/^(\d)/);
      const code = match ? parseInt(match[1], 10) : parseInt(input, 10);
      setFormData((prev) => ({
        ...prev,
        [id]: Number.isFinite(code) ? code : prev[id] || ''
      }));
      clearError(id);
      return;
    }

    setFormData((prev) => ({ ...prev, [id]: value }));
    clearError(id);
    if (id === 'birthGender') {
      setSelectedGender(value);
      setGender?.(value);
    }
  };

  const mapUnderstandCondition = (value) => {
    if (typeof value === 'number') {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const match = trimmed.match(/^(\d)/);
      if (match) {
        const n = Number(match[1]);
        if (n >= 1 && n <= 5) return n;
      }
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 5) {
        return numeric;
      }
    }
    return null;
  };

  const toCanonicalYesNo = (value) => {
    if (value === null || value === undefined) return '';
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'yes') return 'Yes';
    if (normalized === 'no') return 'No';
    return '';
  };

  const toCanonicalYesNoUnsure = (value) => {
    if (value === null || value === undefined) return '';
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'yes') return 'Yes';
    if (normalized === 'no') return 'No';
    if (normalized === 'unsure') return 'Unsure';
    return '';
  };

  const normaliseNumericField = (value, min, max) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    if (typeof min === 'number') {
      if (num < min) return min;
    }
    if (typeof max === 'number') {
      if (num > max) return max;
    }
    return num;
  };

  const normaliseDateMMDDYYYY = (value) => {
    if (!value) return '';
    const stripped = String(value).replace(/\D/g, '');
    if (stripped.length !== 8) return '';
    const month = Number(stripped.slice(0, 2));
    const day = Number(stripped.slice(2, 4));
    const year = Number(stripped.slice(4));
    if (
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return '';
    }
    const iso = `${year.toString().padStart(4, '0')}-${month
      .toString()
      .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const testDate = new Date(iso);
    if (Number.isNaN(testDate.getTime())) return '';
    return iso;
  };

  const mapDiabetesType = (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'type 1' || normalized === '1') return 1;
    if (normalized === 'type 2' || normalized === '2') return 2;
    return null;
  };

  const applyCognitionScoreBounds = (scoreValue, typeValue, defaultMax) => {
    if (scoreValue === '' || scoreValue === null || scoreValue === undefined) {
      return '';
    }
    const type = (typeValue || '').toString().trim();
    let max = defaultMax;
    if (/moca/i.test(type)) max = 30;
    if (/mmse/i.test(type)) max = 30;
    if (/xpresso/i.test(type)) max = 100;
    return normaliseNumericField(scoreValue, 0, max);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const userIdToUse =
      role === 'doctor' || role === 'admin' || role === 'superadmin'
        ? selectedPatientId
        : user.id;
    const genderToUse =
      role === 'doctor' || role === 'admin' || role === 'superadmin'
        ? formData.birthGender || selectedGender
        : gender || formData.birthGender;
    const patientEmail =
      role === 'doctor' || role === 'admin' || role === 'superadmin'
        ? patientOptions.find((p) => p.id === selectedPatientId)?.email || ''
        : '';

    const newErrors = {};

    if (
      (role === 'doctor' || role === 'admin' || role === 'superadmin') &&
      !selectedPatientId
    ) {
      newErrors.patientSelector = 'Please select a patient before submitting.';
    }

    const optionalKeys = new Set([
      'diabetesType',
      'autoimmuneOther',
      'viralNotes',
      'sleepMedClasses',
      'sleepMedOther',
      'allergyLeukotriene',
      'hemochromatosisRelation',
      'cognitionTestType',
      'cognitionTestDate',
      'cognitionTestScore',
      'cognitionPast',
      'cognitionPastType',
      'cognitionPastDate',
      'cognitionPastScore',
      'hrtFemale',
      'hrtMale',
      'ed',
      'snoring',
      'hba1c',
      'fasting_glucose',
      'fasting_insulin',
      'c_peptide',
      'ldl',
      'triglycerides',
      'hdl',
      'apoB',
      'hdl_triglyceride_ratio'
    ]);

    Object.entries(formData).forEach(([key, value]) => {
      if (optionalKeys.has(key)) return;
      const isEmpty = Array.isArray(value)
        ? value.length === 0
        : value === '' || value === null || value === undefined;
      if (isEmpty) {
        newErrors[key] = 'This field is required.';
      }
    });

    if (formData.diabetes === 'Yes' && !formData.diabetesType) {
      newErrors.diabetesType = 'Please indicate the diabetes type.';
    }

    if (formData.cognitionWilling === 'Yes') {
      if (!formData.cognitionTestType)
        newErrors.cognitionTestType = 'Select a test.';
      if (!formData.cognitionTestDate)
        newErrors.cognitionTestDate = 'Enter the test date.';
      if (
        formData.cognitionTestScore === '' ||
        formData.cognitionTestScore === null ||
        formData.cognitionTestScore === undefined
      ) {
        newErrors.cognitionTestScore = 'Enter the test score.';
      }
    } else if (formData.cognitionWilling === 'No') {
      if (!formData.cognitionPast) {
        newErrors.cognitionPast = 'Please answer this question.';
      } else if (formData.cognitionPast === 'Yes') {
        if (!formData.cognitionPastType)
          newErrors.cognitionPastType = 'Select the test taken.';
        if (!formData.cognitionPastDate)
          newErrors.cognitionPastDate = 'Enter the test date.';
        if (
          formData.cognitionPastScore === '' ||
          formData.cognitionPastScore === null ||
          formData.cognitionPastScore === undefined
        ) {
          newErrors.cognitionPastScore = 'Enter the test score.';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitting(false);
      const firstKey = Object.keys(newErrors)[0];
      setTimeout(() => {
        const el = document.getElementById(firstKey);
        if (el && typeof el.focus === 'function') el.focus();
      }, 0);
      return;
    }

    setErrors({});

    const understandCode = mapUnderstandCondition(formData.understandCondition);
    if (!understandCode) {
      setErrors({ understandCondition: 'Select an option.' });
      setSubmitting(false);
      return;
    }

    const payloadFormData = {
      ...formData,
      understandCondition: understandCode
    };

    const yesNoFields = [
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
    ];
    yesNoFields.forEach((field) => {
      if (payloadFormData[field] !== undefined) {
        payloadFormData[field] = toCanonicalYesNo(payloadFormData[field]);
      }
    });

    const yesNoUnsureFields = [
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
    ];
    yesNoUnsureFields.forEach((field) => {
      if (payloadFormData[field] !== undefined) {
        payloadFormData[field] = toCanonicalYesNoUnsure(payloadFormData[field]);
      }
    });

    const numericBounds = {
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

    Object.entries(numericBounds).forEach(([field, bounds]) => {
      if (payloadFormData[field] !== undefined) {
        payloadFormData[field] = normaliseNumericField(
          payloadFormData[field],
          bounds.min,
          bounds.max
        );
      }
    });

    payloadFormData.cognitionTestScore = applyCognitionScoreBounds(
      payloadFormData.cognitionTestScore,
      payloadFormData.cognitionTestType,
      100
    );

    payloadFormData.cognitionPastScore = applyCognitionScoreBounds(
      payloadFormData.cognitionPastScore,
      payloadFormData.cognitionPastType,
      100
    );

    payloadFormData.cognitionTestDate = normaliseDateMMDDYYYY(
      payloadFormData.cognitionTestDate
    );
    payloadFormData.cognitionPastDate = normaliseDateMMDDYYYY(
      payloadFormData.cognitionPastDate
    );

    payloadFormData.diabetesType = mapDiabetesType(
      payloadFormData.diabetesType
    );

    try {
      const res = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userIdToUse,
          gender: genderToUse,
          form_data: payloadFormData,
          user_email: patientEmail
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`❌ Error: ${err.error}`);
        return;
      }

      const data = await res.json();
      navigate('/report', {
        state: {
          report: {
            sections: Array.isArray(data.saved.report_output.report)
              ? data.saved.report_output.report
              : [],
            labRecommendations: data.saved.report_output.labRecommendations,
            userEmail: data.saved.user_email,
            submittedAt: data.saved.submitted_at
          }
        },
        replace: true
      });
    } catch (err) {
      console.error('❌ Submission error:', err);
      alert('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // if (!user) return <p>Loading user...</p>;

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <h2>Health Questions</h2>

      {(role === 'doctor' || role === 'admin' || role === 'superadmin') && (
        <fieldset className="patient-selector">
          <legend>Submit on Behalf of Patient</legend>
          <label htmlFor="patient-select">Select Patient:</label>
          <select
            id="patient-select"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            required
          >
            <option value="">-- Choose a patient --</option>
            {patientOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name || p.email}
              </option>
            ))}
          </select>
          {errors.patientSelector && (
            <p
              className="error-message"
              role="alert"
              id="patientSelector-error"
            >
              {errors.patientSelector}
            </p>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend>Demographics</legend>
        <RadioQuestions
          id="birthGender"
          label="Birth gender"
          options={['Male', 'Female']}
          value={formData.birthGender}
          onChange={handleChange}
          error={errors.birthGender}
        />
      </fieldset>

      <fieldset>
        <legend>Your situation</legend>
        <RadioQuestions
          id="understandCondition"
          label="Which best describes your current experience with brain health / Alzheimer's?"
          options={[
            { value: 1, label: '1. Preventative (no symptoms)' },
            { value: 2, label: '2. Preventative (family history)' },
            { value: 3, label: '3. Preventative (mild age-related decline)' },
            { value: 4, label: '4. Worrisome forgetfulness, no testing' },
            { value: 5, label: '5. Diagnosed with Alzheimer’s' }
          ]}
          value={formData.understandCondition}
          onChange={handleChange}
          error={errors.understandCondition}
        />
      </fieldset>

      <fieldset>
        <legend>Anthropometrics</legend>
        <TextInput
          id="heightFeet"
          label="Height (feet)"
          type="number"
          value={formData.heightFeet}
          onChange={(e) => handleChange('heightFeet', e.target.value)}
          required
          error={errors.heightFeet}
        />
        <TextInput
          id="heightInches"
          label="Height (inches)"
          type="number"
          value={formData.heightInches}
          onChange={(e) => handleChange('heightInches', e.target.value)}
          required
          error={errors.heightInches}
        />
        <TextInput
          id="weightLbs"
          label="Weight (lbs)"
          type="number"
          value={formData.weightLbs}
          onChange={(e) => handleChange('weightLbs', e.target.value)}
          required
          error={errors.weightLbs}
        />
      </fieldset>

      <fieldset>
        <legend>Lifestyle</legend>
        <RadioQuestions
          id="smoking"
          label="Smoking or history of smoking?"
          options={['Yes', 'No']}
          value={formData.smoking}
          onChange={handleChange}
          error={errors.smoking}
        />
        <RadioQuestions
          id="diabetes"
          label="Do you have pre-Diabetes or diabetes?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.diabetes}
          onChange={handleChange}
          error={errors.diabetes}
        />
        {formData.diabetes === 'Yes' && (
          <RadioQuestions
            id="diabetesType"
            label="If yes, which type?"
            options={['Type 1', 'Type 2']}
            value={formData.diabetesType}
            onChange={handleChange}
            error={errors.diabetesType}
          />
        )}
        <RadioQuestions
          id="cholesterol"
          label="Do you currently have high cholesterol or use statins?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.cholesterol}
          onChange={handleChange}
          error={errors.cholesterol}
        />
        {['Yes', 'Unsure'].includes(formData.cholesterol) && (
          <RadioQuestions
            id="statins"
            label="Do you currently take a statin medication?"
            options={['Yes', 'No']}
            value={formData.statins}
            onChange={handleChange}
            error={errors.statins}
          />
        )}
        <RadioQuestions
          id="hbp"
          label="Do you have high blood pressure (hypertension)?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.hbp}
          onChange={handleChange}
          error={errors.hbp}
        />
        <RadioQuestions
          id="alcohol"
          label="Do you currently drink alcohol?"
          options={['Yes', 'No']}
          value={formData.alcohol}
          onChange={handleChange}
          error={errors.alcohol}
        />
        <RadioQuestions
          id="stress"
          label="Do you have chronic stress?"
          options={['Yes', 'No']}
          value={formData.stress}
          onChange={handleChange}
          error={errors.stress}
        />
        <RadioQuestions
          id="vegan"
          label="Are you on a vegan diet?"
          options={['Yes', 'No']}
          value={formData.vegan}
          onChange={handleChange}
          error={errors.vegan}
        />
      </fieldset>

      <fieldset>
        <legend>Medical History</legend>
        <RadioQuestions
          id="autoimmune"
          label="Have you been diagnosed with or suspect you have an autoimmune condition?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.autoimmune}
          onChange={handleChange}
          error={errors.autoimmune}
        />
        {['Yes', 'Unsure'].includes(formData.autoimmune) && (
          <TextInput
            id="autoimmuneOther"
            label="Which condition (if known)?"
            value={formData.autoimmuneOther}
            onChange={(e) => handleChange('autoimmuneOther', e.target.value)}
            error={errors.autoimmuneOther}
          />
        )}
        <RadioQuestions
          id="thyroid"
          label="Have you ever been diagnosed with hypothyroidism?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.thyroid}
          onChange={handleChange}
          error={errors.thyroid}
        />
        <RadioQuestions
          id="migraines"
          label="Have you been diagnosed with migraines?"
          options={['Yes', 'No']}
          value={formData.migraines}
          onChange={handleChange}
          error={errors.migraines}
        />
        <RadioQuestions
          id="asthma"
          label="Do you have severe allergies or allergic asthma?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.asthma}
          onChange={handleChange}
          error={errors.asthma}
        />
        {formData.asthma === 'Yes' && (
          <RadioQuestions
            id="allergyLeukotriene"
            label="Currently on leukotriene inhibitor (e.g., montelukast)?"
            options={['Yes', 'No']}
            value={formData.allergyLeukotriene}
            onChange={handleChange}
            error={errors.allergyLeukotriene}
          />
        )}
        <RadioQuestions
          id="viral"
          label="Have you ever been diagnosed with chronic viral infections?"
          options={['Yes', 'No']}
          value={formData.viral}
          onChange={handleChange}
          describedBy={formData.viral === 'Yes' ? viralHelpId : undefined}
          error={errors.viral}
        />
        {formData.viral === 'Yes' && (
          <TextInput
            id="viralNotes"
            label="Which virus (if known)?"
            value={formData.viralNotes}
            onChange={(e) => handleChange('viralNotes', e.target.value)}
            helpText="Examples: hepatitis B/C, HSV (cold sores), HIV, etc."
            helpTextId={viralHelpId}
            error={errors.viralNotes}
          />
        )}
        <RadioQuestions
          id="gum"
          label="Have you been diagnosed with gum disease?"
          options={['Yes', 'No']}
          value={formData.gum}
          onChange={handleChange}
          error={errors.gum}
        />
        <RadioQuestions
          id="sleep"
          label="Do you have insomnia, anxiety, or sleep disorders?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.sleep}
          onChange={handleChange}
          error={errors.sleep}
        />
        {['Yes', 'Unsure'].includes(formData.sleep) && (
          <>
            <QuestionsCheckbox
              id="sleepMedClasses"
              label="Sleep / anxiety medication classes (select all that apply)"
              options={['Benzodiazepines', 'Z-hypnotics', 'Other']}
              values={formData.sleepMedClasses}
              onChange={handleChange}
              error={errors.sleepMedClasses}
            />
            {formData.sleepMedClasses.includes('Other') && (
              <TextInput
                id="sleepMedOther"
                label="Other sleep medication details"
                value={formData.sleepMedOther}
                onChange={(e) => handleChange('sleepMedOther', e.target.value)}
                error={errors.sleepMedOther}
              />
            )}
            <RadioQuestions
              id="snoring"
              label="Do you snore frequently?"
              options={['Yes', 'No']}
              value={formData.snoring}
              onChange={handleChange}
              error={errors.snoring}
            />
          </>
        )}
        <RadioQuestions
          id="depression"
          label="Do you currently suffer from depression?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.depression}
          onChange={handleChange}
          error={errors.depression}
        />
        <RadioQuestions
          id="anemia"
          label="Have you ever been diagnosed with anemia?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.anemia}
          onChange={handleChange}
          error={errors.anemia}
        />
        <RadioQuestions
          id="hemochromatosis"
          label="Have you or a family member ever been diagnosed with hemochromatosis?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.hemochromatosis}
          onChange={handleChange}
          error={errors.hemochromatosis}
        />
        {['Yes', 'Unsure'].includes(formData.hemochromatosis) && (
          <TextInput
            id="hemochromatosisRelation"
            label="Relation (self / parent / sibling / other)"
            value={formData.hemochromatosisRelation}
            onChange={(e) =>
              handleChange('hemochromatosisRelation', e.target.value)
            }
            error={errors.hemochromatosisRelation}
          />
        )}
        <RadioQuestions
          id="hearing"
          label="Do you have difficulty hearing or have you been diagnosed with hearing loss?"
          options={['Yes', 'No']}
          value={formData.hearing}
          onChange={handleChange}
          error={errors.hearing}
        />
        <RadioQuestions
          id="cataracts"
          label="Have you ever been diagnosed with cataracts?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.cataracts}
          onChange={handleChange}
          error={errors.cataracts}
        />
        <RadioQuestions
          id="mold"
          label="Have you ever been exposed to mold in food or your environment for an extended time?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.mold}
          onChange={handleChange}
          error={errors.mold}
        />
        <RadioQuestions
          id="heavyMetals"
          label="Have you ever been exposed to heavy metals?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.heavyMetals}
          onChange={handleChange}
          error={errors.heavyMetals}
        />
      </fieldset>

      <fieldset>
        <legend>Cognition Testing</legend>
        <RadioQuestions
          id="cognitionWilling"
          label="Would you be willing to take a 10-minute cognition test?"
          options={['Yes', 'No', 'Unsure']}
          value={formData.cognitionWilling}
          onChange={handleChange}
          error={errors.cognitionWilling}
        />
        {formData.cognitionWilling === 'Yes' && (
          <>
            <RadioQuestions
              id="cognitionTestType"
              label="Which test do you plan to take?"
              options={['XpressO', 'MoCA', 'MMSE']}
              value={formData.cognitionTestType}
              onChange={handleChange}
              error={errors.cognitionTestType}
            />
            <TextInput
              id="cognitionTestDate"
              label="Test date (MMDDYYYY)"
              value={formData.cognitionTestDate}
              onChange={(e) =>
                handleChange('cognitionTestDate', e.target.value)
              }
              error={errors.cognitionTestDate}
            />
            <TextInput
              id="cognitionTestScore"
              label="Expected or latest score"
              type="number"
              value={formData.cognitionTestScore}
              onChange={(e) =>
                handleChange('cognitionTestScore', e.target.value)
              }
              error={errors.cognitionTestScore}
            />
          </>
        )}
        {formData.cognitionWilling === 'No' && (
          <>
            <RadioQuestions
              id="cognitionPast"
              label="Have you taken a cognition test in the past?"
              options={['Yes', 'No', 'Unsure']}
              value={formData.cognitionPast}
              onChange={handleChange}
              error={errors.cognitionPast}
            />
            {formData.cognitionPast === 'Yes' && (
              <>
                <RadioQuestions
                  id="cognitionPastType"
                  label="Which test?"
                  options={['MoCA', 'MMSE']}
                  value={formData.cognitionPastType}
                  onChange={handleChange}
                  error={errors.cognitionPastType}
                />
                <TextInput
                  id="cognitionPastDate"
                  label="Test date (MMDDYYYY)"
                  value={formData.cognitionPastDate}
                  onChange={(e) =>
                    handleChange('cognitionPastDate', e.target.value)
                  }
                  error={errors.cognitionPastDate}
                />
                <TextInput
                  id="cognitionPastScore"
                  label="Score"
                  type="number"
                  value={formData.cognitionPastScore}
                  onChange={(e) =>
                    handleChange('cognitionPastScore', e.target.value)
                  }
                  error={errors.cognitionPastScore}
                />
              </>
            )}
          </>
        )}
      </fieldset>

      {normalizedGender === 'female' && (
        <RadioQuestions
          id="hrtFemale"
          label="As a woman, are you considering or currently using hormone replacement therapy (HRT)?"
          options={['Yes', 'No']}
          value={formData.hrtFemale}
          onChange={handleChange}
          error={errors.hrtFemale}
        />
      )}

      {normalizedGender === 'male' && (
        <>
          <RadioQuestions
            id="hrtMale"
            label="As a man, are you considering or currently using hormone replacement therapy (HRT)?"
            options={['Yes', 'No']}
            value={formData.hrtMale}
            onChange={handleChange}
            error={errors.hrtMale}
          />
          <RadioQuestions
            id="ed"
            label="Have you experienced erectile dysfunction and used or considered medications like sildenafil (Viagra)?"
            options={['Yes', 'No']}
            value={formData.ed}
            onChange={handleChange}
            error={errors.ed}
          />
        </>
      )}

      <fieldset>
        <legend>Recent Lab Results (optional)</legend>
        <TextInput
          id="hba1c"
          label="Hemoglobin A1c (%)"
          type="number"
          value={formData.hba1c}
          onChange={(e) => handleChange('hba1c', e.target.value)}
          error={errors.hba1c}
        />
        <TextInput
          id="fasting_glucose"
          label="Fasting glucose (mg/dL)"
          type="number"
          value={formData.fasting_glucose}
          onChange={(e) => handleChange('fasting_glucose', e.target.value)}
          error={errors.fasting_glucose}
        />
        <TextInput
          id="fasting_insulin"
          label="Fasting insulin (µIU/mL)"
          type="number"
          value={formData.fasting_insulin}
          onChange={(e) => handleChange('fasting_insulin', e.target.value)}
          error={errors.fasting_insulin}
        />
        <TextInput
          id="c_peptide"
          label="C-peptide (ng/mL)"
          type="number"
          value={formData.c_peptide}
          onChange={(e) => handleChange('c_peptide', e.target.value)}
          error={errors.c_peptide}
        />
        <TextInput
          id="ldl"
          label="LDL cholesterol (mg/dL)"
          type="number"
          value={formData.ldl}
          onChange={(e) => handleChange('ldl', e.target.value)}
          error={errors.ldl}
        />
        <TextInput
          id="triglycerides"
          label="Triglycerides (mg/dL)"
          type="number"
          value={formData.triglycerides}
          onChange={(e) => handleChange('triglycerides', e.target.value)}
          error={errors.triglycerides}
        />
        <TextInput
          id="hdl"
          label="HDL cholesterol (mg/dL)"
          type="number"
          value={formData.hdl}
          onChange={(e) => handleChange('hdl', e.target.value)}
          error={errors.hdl}
        />
        <TextInput
          id="apoB"
          label="ApoB (mg/dL)"
          type="number"
          value={formData.apoB}
          onChange={(e) => handleChange('apoB', e.target.value)}
          error={errors.apoB}
        />
        <TextInput
          id="hdl_triglyceride_ratio"
          label="HDL : Triglyceride ratio"
          type="number"
          value={formData.hdl_triglyceride_ratio}
          onChange={(e) =>
            handleChange('hdl_triglyceride_ratio', e.target.value)
          }
          error={errors.hdl_triglyceride_ratio}
        />
      </fieldset>

      <div className="form-actions">
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

export default HealthQuestionsForm;
