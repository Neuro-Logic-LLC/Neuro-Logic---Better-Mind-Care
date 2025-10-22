// routes/evexiaImport.js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const initKnex = require('../db/initKnex');

router.post('/import-lab-result', async (req, res) => {
  const { patientID, patientOrderID } = req.body;
  const externalClientID = process.env.EVEXIA_EXTERNAL_CLIENT_ID 
  const BearerToken = process.env.EVEXIA_BEARER_TOKEN
  if (!patientID || !patientOrderID) {
    return res.status(400).json({ error: 'Missing PatientID or PatientOrderID' });
  }

  try {
    const knex = await initKnex();

    // ---- Evexia credentials ----
    const body = {
      PartnerAuthorizationKey:
        process.env.EVEXIA_BEARER_TOKEN,
      ExternalClientID:
        process.env.EVEXIA_EXTERNAL_CLIENT_ID,
      patientID,
      patientOrderID
    };

    const evexiaUrl = 'https://int.evexiadiagnostics.com/api/EDIPlatform/LabResultGet';
    const url = new URL(evexiaUrl);
    url.searchParams.set('patientID', patientID);
    url.searchParams.set('patientOrderID', patientOrderID);
    url.searchParams.set('externalClientID', body.ExternalClientID);
    url.searchParams.set('Specimen', 'TEST'); // optional

    const r = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: BearerToken,
        Accept: 'application/json'
      }
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Evexia API ${r.status}: ${text}`);
    }
    console.log(r);
    const data = await r.json();
    console.log('[Evexia response]', JSON.stringify(data, null, 2));

    // Try multiple possible locations for the Base64 report
    const reportB64 =
      data?.Report ||
      data?.Result?.Report ||
      data?.Result?.[0]?.Report ||
      data?.ReportBase64 ||
      null;

    if (!reportB64) {
      return res.status(404).json({ error: 'No report base64 found', data });
    }

    // Save decoded PDF to DB
    const pdfBuffer = Buffer.from(reportB64, 'base64');
    await knex('lab_results')
      .insert({
        patient_id: patientID,
        patient_order_id: patientOrderID,
        external_client_id: body.ExternalClientID,
        report_pdf: pdfBuffer,
        raw_json: data,
        updated_at: knex.fn.now()
      })
      .onConflict('patient_order_id')
      .merge();

    res.json({ ok: true, inserted: true });
  } catch (err) {
    console.error('[evexia import error]', err);  
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
