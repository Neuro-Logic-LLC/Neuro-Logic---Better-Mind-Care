import { useState } from 'react';
import PatientDemographicsForm from '../reportspg/patientReport';
import HealthQuestionsForm from '../../components/forms/HealthQuestionsForm';

function IntakeForm() {
  const [gender, setGender] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');

  return (
    <div className="form-section bg-gradient-white-seafoam">
      <div className="form-container">
        <h2>Get Started</h2>
        <PatientDemographicsForm
          setGender={setGender}
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={setSelectedPatientId}
        />
      </div>

      <div className="form-container">
        <HealthQuestionsForm
          gender={gender}
          setGender={setGender}
          targetUserId={selectedPatientId}
        />
      </div>
    </div>
  );
}
export default IntakeForm;
