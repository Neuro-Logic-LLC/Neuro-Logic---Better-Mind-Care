const loadSSMParams = require('../utils/loadSSMParams');

(async () => {
  await loadSSMParams();
})();

const HARD_DEFAULT_AUTH_KEY = process.env.EVEXIA_BEARER_TOKEN;


const pickEnv = (...names) => {
  for (const n of names) {
    const v = (process.env[n] || '').trim();
    if (v) return v;
  }
  return '';
};

const pickPatientAddV2Path = () =>
  pickEnv('EVEXIA_ADD_PATIENT_V2_URL') || '/api/EDIPlatform/PatientAddV2';

const pickBaseUrl = () =>
  pickEnv('EVEXIA_BASE', 'EVEXIA_API_BASE_URL', 'EVEXIA_SANDBOX_API_BASE_URL') ||
  'https://int.evexiadiagnostics.com';

const pickAuthKey = () =>
  pickEnv('EVEXIA_AUTH_KEY', 'EVEXIA_SANDBOX_AUTH_KEY') || HARD_DEFAULT_AUTH_KEY;

async function patientAddV2(patientData) {
  const ExternalClientID = process.env.EVEXIA_EXTERNAL_CLIENT_ID;
  const AUTH = pickAuthKey();
  const BASE = pickBaseUrl();
  const PATH = pickPatientAddV2Path();

  
  const url = new URL(PATH, BASE);
  const payload = { ...patientData, ExternalClientID };
console.log('[Evexia DEBUG] Sending patientAddV2 payload:', JSON.stringify(payload, null, 2));
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: AUTH,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) throw new Error(`Evexia patientAddV2 failed: ${r.status}`);
  return r.json();
}

// Core Evexia order flow
async function runEvexiaSequence(patientData) {
  const patient = await patientAddV2(patientData);
  const clientId = process.env.EVEXIA_EXTERNAL_CLIENT_ID;
  const PatientID = patient.PatientID; // or however it's returned

  // Helper for Evexia POSTs
  const postEvx = async (path, body) => {
    const url = new URL(path, pickBaseUrl());
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: pickAuthKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(`Evexia ${path} failed: ${resp.status}`);
    return resp.json();
  };

  // Step 1: Create Order
  const orderResp = await postEvx('/api/EDIPlatform/OrderAdd', {
    externalClientID: clientId,
    patientID: PatientID,
    orderType: '',
    phlebotomyOption: ''
  });
  const patientOrderID = orderResp.PatientOrderID;

  // Step 2: Add Items
  await postEvx('/api/EDIPlatform/OrderItemAdd', {
    externalClientID: clientId,
    patientOrderID,
    productID: patientData.productID,
    isPanel: !!patientData.isPanel
  });

  // Step 3: Complete Order
  await postEvx('/api/EDIPlatform/PatientOrderComplete', {
    externalClientID: clientId,
    patientID: PatientID,
    patientOrderID
  });

  console.log('Evexia order sequence complete for patient', PatientID);
}

module.exports = runEvexiaSequence;
