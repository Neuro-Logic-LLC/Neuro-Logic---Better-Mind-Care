import { useState } from 'react';
import PatientDemographicsForm from '../../components/forms/PatientDemographicsForm';
import HealthQuestionsForm from '../../components/forms/HealthQuestionsForm';

function IntakeForm() {
  const [gender, setGender] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');

  return (
    <div className="form-section" style={{ background: 'linear-gradient(to top, var(--seafoam), white)', minHeight: '100vh' }}>
      <div className="form-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ marginBottom: '2rem' }}>Get Started</h2>
        <PatientDemographicsForm
          setGender={setGender}
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={setSelectedPatientId}
        />
      </div>

      <div className="form-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
