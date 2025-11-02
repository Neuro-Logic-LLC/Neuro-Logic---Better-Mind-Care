import { useState } from 'react';
import TextInput from '../../components/inputs/InputText';

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

  const getLabResults = () => {
    fetch('/api/evexia/analyte-results', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((data) => {
        HemoglobinA1c[1](data.HemoglobinA1c);
        FastingGlucose[1](data.FastingGlucose);
        FastingInsulin[1](data.FastingInsulin);
        CPeptide[1](data.CPeptide);
        LDLCholesterol[1](data.LDLCholesterol);
        Triglycerides[1](data.Triglycerides);
        HDLCholesterol[1](data.HDLCholesterol);
        ApoB[1](data.ApoB);
        HDLTriglycerideRatio[1](data.HDLTriglycerideRatio);
      })
      .catch((error) => {
        console.error('Error fetching lab results:', error);
      });
  };

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
