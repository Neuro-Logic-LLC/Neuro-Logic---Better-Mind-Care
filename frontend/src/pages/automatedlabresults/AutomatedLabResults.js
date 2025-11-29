import { useState } from 'react';


export default function AutomatedLabResults() {
  const HemoglobinA1c = useState('');
  const FastingGlucose = useState('');
  const FastingInsulin = useState('');
  const CPeptide = useState('');
  const LDLCholesterol = useState('');
  const Triglycerides = useState('');
  const HDLCholesterol = useState('');
  const ApoB = useState('');
  const HDLTriglycerideRatio = useState('');



  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
  };

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend>Recent Lab Results (optional)</legend>
          <ol>
            <li>Hemoglobin A1c (%)</li>
            <li>Fasting glucose (mg/dL)</li>
            <li>Fasting insulin (µIU/mL)</li>
            <li>C-peptide (ng/mL)</li>
            <li>LDL cholesterol (mg/dL)</li>
            <li>triglycerides</li>
            <li>HDL cholesterol (mg/dL)</li>
            <li>ApoB (mg/dL)</li>
            <li>HDL : Triglyceride ratio</li>
            <li></li>
          </ol>
        </fieldset>
      </form>
    </div>
  );
}
