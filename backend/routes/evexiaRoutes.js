// src/backend/routes/evexiaRoutes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const pdfParse = require('pdf-parse');
const { parseEvexiaPdfText } = require('../utils/parseEvexiaPdfText');
const knex = require('../');
const initKnex = require('../db/initKnex');
/**
 * Hardcoded fallbacks only if env is empty (blocked in production below).
 */
const HARD_DEFAULT_AUTH_KEY = process.env.EVEXIA_BEARER_TOKEN;
const HARD_DEFAULT_CLIENT_ID = process.env.EVEXIA_EXTERNAL_CLIENT_ID;

const LOG_SLICE = Number(process.env.EVEXIA_LOG_SLICE || 1200);
const DEBUG = /^(1|true)$/i.test(process.env.EVEXIA_DEBUG || '');
const IS_PROD = process.env.NODE_ENV === 'production';

const dlog = (...a) => DEBUG && console.log('[Evexia]', ...a);
const makeFilename = (pid, poid) => `lab-${pid}-${poid}.pdf`;

const pickEnv = (...names) => {
  for (const n of names) {
    const v = (process.env[n] || '').trim();
    if (v) return v;
  }
  return '';
};

const normalizeAuth = v => {
  if (!v) return '';
  return /^bearer\s/i.test(v) ? v : `Bearer ${v}`;
};

const PATHS = {
  ORDER_ADD: '/api/EDIPlatform/OrderAdd',
  ORDER_ITEM_ADD: '/api/EDIPlatform/OrderItemAdd',
  ORDER_COMPLETE: '/api/EDIPlatform/PatientOrderComplete',
  ORDER_CANCEL: '/api/EDIPlatform/OrderCancel',
  ORDER_LIST: '/api/EDIPlatform/OrderList',
  EVEXIA_ADD_PATIENT_V2: '/api/EDIPlatform/PatientAddV2',
  EVEXIA_ORDER_ITEM_DELETE: '/api/EDIPlatform/OrderItemDelete',
  EVEXIA_PATIENT_LIST: '/api/EDIPlatform/PatientList'
};

const pickAuthKey = () =>
  pickEnv('EVEXIA_AUTH_KEY', 'EVEXIA_SANDBOX_AUTH_KEY') || HARD_DEFAULT_AUTH_KEY;

const pickBaseUrl = () =>
  pickEnv('EVEXIA_BASE', 'EVEXIA_API_BASE_URL', 'EVEXIA_SANDBOX_API_BASE_URL') ||
  'https://int.evexiadiagnostics.com';

const pickLabResultsPath = () => pickEnv('EVEXIA_RESULTS_URL') || '/api/EDIPlatform/LabResultGet';

const pickAnalyteResultsPath = () =>
  pickEnv('EVEXIA_ANALYTE_RESULTS_URL') || '/api/EDIPlatform/ResultAnalyteGet';

const pickOrderDetailsPath = () =>
  pickEnv('EVEXIA_ORDER_DETAILS_URL') || '/api/EDIPlatform/OrderDetail';

const pickPatientListDetailsPath = () =>
  pickEnv('EVEXIA_ORDER_DETAILS_URL') || '/api/EDIPlatform/PatientList';

const pickOrderListDetailsPath = () => pickEnv('ORDER_LIST') || '/api/EDIPlatform/OrderList';

const pickPatientAddV2Path = () =>
  pickEnv('EVEXIA_ADD_PATIENT_V2_URL') || '/api/EDIPlatform/PatientAddV2';

const pickOrderItemDeletePath = () =>
  pickEnv('EVEXIA_ORDER_ITEM_DELETE') || '/api/EDIPlatform/OrderItemDelete';

// const pickPatientDeletePath = () =>
//   pickEnv('EVEXIA_PATIENT_DELETE_URL') || '/api/EDIPlatform/PatientDelete';

const pickOrderItemAddPath = () =>
  pickEnv('EVEXIA_ORDER_ITEM_ADD') || '/API/EDIPlatform/OrderItemAdd';

function trimOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

const pickClientId = (req, q) =>
  (req.get && req.get('x-evexia-client-id')) ||
  q.ExternalClientID ||
  q.externalClientID ||
  q.externalClientId ||
  pickEnv(
    'EVEXIA_FORCE_CLIENT_ID',
    'EVEXIA_EXTERNAL_CLIENT_ID',
    'EVEXIA_SANDBOX_EXTERNAL_CLIENT_ID'
  ) ||
  HARD_DEFAULT_CLIENT_ID;

// Decide if caller wants base64 instead of binary PDF (existing behavior)
function wantsBase64(req) {
  const q = { ...(req.query || {}), ...(req.body || {}) };

  const yn = String(q.base64 ?? q.returnBase64 ?? '').toLowerCase();
  if (yn === '1' || yn === 'true' || yn === 'yes') return true;

  const fmt = String(q.format ?? '').toLowerCase();
  if (fmt === 'base64' || fmt === 'b64' || fmt === 'base64json') return true;

  const hdr = (req.get && req.get('x-return-base64')) || '';
  const h = String(hdr).toLowerCase();
  if (h === '1' || h === 'true' || h === 'yes') return true;

  const accept = req.get && req.get('accept') ? req.get('accept').toLowerCase() : '';
  if (
    accept &&
    !accept.includes('application/pdf') &&
    (accept.includes('text/plain') || accept.includes('application/json'))
  ) {
    return true;
  }

  return false;
}

// NEW: caller wants structured JSON parsed from the PDF
function wantsStructuredJSON(req) {
  const q = { ...(req.query || {}), ...(req.body || {}) };
  const fmt = String(q.format || '').toLowerCase();
  if (fmt === 'json') return true; // explicit
  if (fmt === 'base64json') return false; // legacy base64 wrapper
  const accept = req.get && req.get('accept') ? req.get('accept').toLowerCase() : '';
  return accept.includes('application/json'); // Accept header path
}

// Prefer finalized report; accept first available; tolerate casing
function selectReportBase64(data) {
  if (!data) return null;
  const arr = Array.isArray(data.Result)
    ? data.Result
    : Array.isArray(data.result)
    ? data.result
    : null;
  if (!arr || !arr.length) return null;

  const finalHit = arr.find(
    x => x && (x.isFinal === true || x.IsFinal === true) && typeof x.Report === 'string'
  );
  if (finalHit) return finalHit.Report;

  const anyHit = arr.find(x => x && typeof x.Report === 'string');
  return anyHit ? anyHit.Report : null;
}

/**
 * @openapi
 * tags:
 *   - name: Evexia
 *     description: Evexia order helpers
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     EvxCombinedOrderRequest:
 *       type: object
 *       required: [PatientID, OrderType, PhlebotomyOption]
 *       properties:
 *         PatientID:
 *           type: string
 *           example: "113119"
 *         OrderType:
 *           type: string
 *           description: Evexia order type
 *           enum: [ClientBill, PatientPay, Insurance]
 *           example: ClientBill
 *         PhlebotomyOption:
 *           type: string
 *           description: Where the draw happens
 *           enum: [PSC, Mobile, InOffice]
 *           example: PSC
 *         CollectionDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2025-10-08"
 *         ptau:
 *           type: boolean
 *           description: Place a PTAU order
 *           example: true
 *         apoe:
 *           type: boolean
 *           description: Place an APOE order
 *           example: true
 *         requireBoth:
 *           type: boolean
 *           description: If true, cancel the first leg if the second fails. All or nothing.
 *           example: false
 *
 *     EvxLegResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *         orderId:
 *           type: string
 *           nullable: true
 *         error:
 *           type: string
 *           nullable: true
 *
 *     EvxCombinedOrderResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           description: True when overall outcome is considered success for the chosen policy
 *         requireBoth:
 *           type: boolean
 *         ptau:
 *           $ref: '#/components/schemas/EvxLegResult'
 *         apoe:
 *           $ref: '#/components/schemas/EvxLegResult'
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @openapi
 * /patient-order-combined:
 *   post:
 *     tags: [Evexia]
 *     summary: Place PTAU and APOE as two separate Evexia orders in sequence
 *     description: >
 *       PTAU is placed first, then APOE. If APOE fails and `requireBoth` is true, attempts to cancel the PTAU order.
 *       Use this when the lab cannot accept both items in one order but you want a single "combine" action in the UI.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EvxCombinedOrderRequest'
 *           examples:
 *             bothTestsPartialOk:
 *               summary: Both tests. Partial fulfillment OK.
 *               value:
 *                 PatientID: "113119"
 *                 OrderType: "ClientBill"
 *                 PhlebotomyOption: "PSC"
 *                 CollectionDate: "2025-10-08"
 *                 ptau: true
 *                 apoe: true
 *                 requireBoth: false
 *             bundleAllOrNothing:
 *               summary: Both tests. All or nothing policy.
 *               value:
 *                 PatientID: "113119"
 *                 OrderType: "ClientBill"
 *                 PhlebotomyOption: "PSC"
 *                 ptau: true
 *                 apoe: true
 *                 requireBoth: true
 *     responses:
 *       '200':
 *         description: Both legs succeeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvxCombinedOrderResponse'
 *             example:
 *               ok: true
 *               requireBoth: false
 *               ptau: { ok: true, orderId: "901234", error: null }
 *               apoe: { ok: true, orderId: "901235", error: null }
 *       '207':
 *         description: Partial success. One leg ok, the other failed (only returned when requireBoth is false)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvxCombinedOrderResponse'
 *             example:
 *               ok: true
 *               requireBoth: false
 *               ptau: { ok: true, orderId: "901234", error: null }
 *               apoe: { ok: false, orderId: null, error: "Evexia 422: invalid product for lab" }
 *       '502':
 *         description: Both legs failed or requireBoth true and compensation canceled the first leg
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvxCombinedOrderResponse'
 *             example:
 *               ok: false
 *               requireBoth: true
 *               ptau: { ok: false, orderId: null, error: "Canceled due to APOE failure" }
 *               apoe: { ok: false, orderId: null, error: "Evexia 500: upstream error" }
 *       '504':
 *         description: Upstream timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example: { error: "Upstream request timed out" }
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

async function labResultHandler(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const externalClientID = String(
      q.externalClientID || process.env.EVEXIA_EXTERNAL_CLIENT_ID || ''
    ).trim();
    const patientOrderID = String(q.PatientOrderID ?? q.patientOrderID ?? '').trim();
    const patientID = String(q.PatientID ?? q.patientID ?? '').trim();

    if (!patientOrderID || !patientID) {
      return res.status(400).json({ error: 'Missing PatientID or PatientOrderID' });
    }

    const BASE = pickBaseUrl();
    const AUTH = pickAuthKey();
    const PATH = '/api/EDIPlatform/LabResultGet';

    const url = new URL(PATH, BASE);
    url.searchParams.set('externalClientID', externalClientID);
    url.searchParams.set('patientID', patientID);
    url.searchParams.set('patientOrderID', patientOrderID);

    console.log('➡️ Forwarding LabResultGet (GET):', url.toString());

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json,text/plain,application/pdf,*/*'
      }
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('❌ Evexia error:', text);
      return res.status(r.status).json({ error: 'Evexia API error', detail: text });
    }

    const ct = (r.headers.get('content-type') || '').toLowerCase();

    // --- Direct PDF passthrough ---
    if (ct.includes('application/pdf')) {
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      return res.status(200).send(buf);
    }

    // --- JSON or text (Evexia often wraps it) ---
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
      if (typeof data === 'string') data = JSON.parse(data);
    } catch {
      data = text;
    }

    // --- Extract base64 ---
    const b64 =
      data?.Report ||
      data?.Result?.Report ||
      data?.Result?.[0]?.Report ||
      data?.ReportBase64 ||
      null;

    if (!b64) {
      return res.status(404).json({ error: 'No PDF content found in Evexia response', raw: data });
    }

    const clean = b64.replace(/^data:application\/pdf;?base64,?/i, '').replace(/\s+/g, '');
    const pdf = Buffer.from(clean, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).send(pdf);
  } catch (err) {
    console.error('❌ LabResultGet error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}

// GET /patients — proxy list, no DB writes here
async function listAllPatients(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const ExternalClientID = process.env.EVEXIA_EXTERNAL_CLIENT_ID;
    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();
    const PATH = pickPatientListDetailsPath();

    if (!ExternalClientID) {
      return res.status(400).json({ error: 'Missing ExternalClientID' });
    }
    if (!AUTH || (IS_PROD && AUTH === HARD_DEFAULT_AUTH_KEY)) {
      return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    }
    if (IS_PROD && ExternalClientID === HARD_DEFAULT_CLIENT_ID) {
      return res.status(500).json({ error: 'Server missing EVEXIA client id env' });
    }

    const url = new URL(PATH, BASE);
    url.searchParams.set('externalClientID', ExternalClientID);

    const maskedClient = ExternalClientID ? ExternalClientID.slice(0, 6) + '…' : '(none)';
    dlog('Upstream GET', url.toString().replace(ExternalClientID, maskedClient));

    const controller = new AbortController();
    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json, application/pdf, */*',
        'User-Agent': 'BetterMindCare-EvexiaProxy/1.0'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    if (r.status === 204) return res.status(204).send();

    if (r.status >= 400) {
      const errText = await r.text();
      return res
        .status(r.status)
        .json({ error: 'Upstream error', status: r.status, body: errText });
    }

    const ct = (r.headers.get('content-type') || '').toLowerCase();

    if (ct.startsWith('application/json')) {
      // just proxy JSON list through
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (ct.startsWith('application/pdf')) {
      // stream PDF to client to avoid buffering whole file in memory
      res.setHeader('Content-Type', 'application/pdf');
      // @ts-ignore: readable web stream to node stream
      r.body.pipe(res);
      return;
    }

    // fallback: passthrough as text
    const text = await r.text();
    return res.status(200).send(text);
  } catch (e) {
    const code = e.name === 'AbortError' ? 504 : 500;
    dlog('listAllPatients failed:', e);
    return res.status(code).json({ error: 'Proxy failure', detail: String(e) });
  }
}

async function analyteResultHandler(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const PatientID = String(q.PatientID ?? q.patientID ?? '').trim();
    const PatientOrderID = String(
      q.PatientOrderID ?? q.patientOrderID ?? q.patientOrderId ?? ''
    ).trim();
    const Specimen = String(q.Specimen ?? q.SpecimenID ?? q.specimen ?? '').trim();

    if (!PatientID || !PatientOrderID) {
      return res.status(400).json({ error: 'Missing PatientID or PatientOrderID' });
    }

    const clientId = pickClientId(req, q);
    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();
    const PATH = pickAnalyteResultsPath();

    // Block accidental prod with fallbacks
    if (!AUTH || (IS_PROD && AUTH === HARD_DEFAULT_AUTH_KEY)) {
      return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    }
    if (IS_PROD && clientId === HARD_DEFAULT_CLIENT_ID) {
      return res.status(500).json({ error: 'Server missing EVEXIA client id env' });
    }

    // Build upstream URL (Specimen optional—omit unless present)
    const url = new URL(PATH, BASE);
    url.searchParams.set('externalClientID', clientId);
    url.searchParams.set('patientID', PatientID);
    url.searchParams.set('patientOrderID', PatientOrderID);
    if (Specimen) {
      url.searchParams.set('SpecimenID', Specimen);
    }

    const maskedClient = clientId ? clientId.slice(0, 6) + '…' : '(none)';
    dlog('Upstream GET', url.toString().replace(clientId, maskedClient));

    const controller = new AbortController();
    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'text/plain, application/json, application/pdf, */*',
        'User-Agent': 'BetterMindCare-EvexiaProxy/1.0'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    const ct = (r.headers.get('content-type') || '').toLowerCase();

    // Handle different content types
    if (r.status === 204) {
      return res.status(204).send(); // No content
    }

    if (r.status >= 400) {
      const errText = await r.text();
      return res.status(r.status).json({
        error: 'Upstream error',
        status: r.status,
        body: errText
      });
    }

    if (ct.includes('application/json')) {
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (ct.includes('application/pdf')) {
      const buf = await r.arrayBuffer();
      res.setHeader('Content-Type', 'application/pdf');
      return res.status(200).send(Buffer.from(buf));
    }

    // Persist PDF to DB
    try {
      const knex = await initKnex();
      await knex('lab_results')
        .insert({
          patient_id: PatientID,
          patient_order_id: PatientOrderID,
          external_client_id: pickClientId(req, req.query || req.body || {}),
          specimen: Specimen || null,
          report_pdf: Buffer.from(buf),
          raw_json: { _source: 'application/pdf' },
          updated_at: knex.fn.now()
        })
        .onConflict('patient_order_id')
        .merge({
          external_client_id: pickClientId(req, req.query || req.body || {}),
          specimen: Specimen || null,
          report_pdf: Buffer.from(buf),
          updated_at: knex.fn.now()
        });
    } catch (e) {
      console.error('[Evexia] DB upsert (pdf) failed:', e);
    }

    // Default fallback for other content types (e.g., text/plain)
    const text = await r.text();
    res.setHeader('Content-Type', ct || 'text/plain');
    return res.status(200).send(text);
  } catch (err) {
    console.error('analyteResultHandler error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

async function orderDetailHandler(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const PatientID = String(q.PatientID ?? q.patientID ?? '').trim();
    const PatientOrderID = String(
      q.PatientOrderID ?? q.patientOrderID ?? q.patientOrderId ?? ''
    ).trim();

    if (!PatientID || !PatientOrderID) {
      return res.status(400).json({ error: 'Missing PatientID or PatientOrderID' });
    }

    const externalClientID = pickClientId(req, q);
    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();
    const PATH = pickOrderDetailsPath();

    if (!AUTH || (IS_PROD && AUTH === HARD_DEFAULT_AUTH_KEY)) {
      return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    }
    if (IS_PROD && externalClientID === HARD_DEFAULT_CLIENT_ID) {
      return res.status(500).json({ error: 'Server missing EVEXIA client id env' });
    }

    // Build upstream URL
    const url = new URL(PATH, BASE);
    url.searchParams.set('externalClientID', externalClientID);
    url.searchParams.set('patientID', PatientID);
    url.searchParams.set('patientOrderID', PatientOrderID);

    const maskedClient = externalClientID ? externalClientID.slice(0, 6) + '…' : '(none)';
    dlog('Upstream GET', url.toString().replace(externalClientID, maskedClient));

    const controller = new AbortController();
    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'BetterMindCare-EvexiaProxy/1.0'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    const ct = (r.headers.get('content-type') || '').toLowerCase();
    const raw = ct.includes('application/json') ? await r.json() : await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        error: 'Upstream error',
        upstreamStatus: r.status,
        upstreamContentType: ct,
        upstreamPreview: (typeof raw === 'string' ? raw : JSON.stringify(raw)).slice(0, LOG_SLICE)
      });
    }

    // Normalize fields
    const data =
      typeof raw === 'string'
        ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return { _raw: raw };
            }
          })()
        : raw;

    const statusDescr = data?.StatusDescr ?? data?.statusDescr ?? data?.status_description ?? null;

    const productName =
      data?.ProductName ??
      data?.productName ??
      data?.Order?.ProductName ??
      data?.Order?.TestName ??
      data?.Test?.Name ??
      null;

    const productID =
      data?.ProductID ??
      data?.productID ??
      data?.Order?.ProductID ??
      data?.Order?.TestID ??
      data?.Test?.ID ??
      null;

    return res.status(200).json({
      patient: { id: PatientID },
      order: {
        id: PatientOrderID,
        statusDescr,
        productName,
        productID,
        externalClientID
      },
      upstream: data
    });
  } catch (err) {
    console.error('[Evexia] orderDetailsHandler error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

// --- Orchestrator: matches your diagram in one hit ---
async function orderSummaryHandler(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };
    const PatientID = String(q.PatientID ?? q.patientID ?? '').trim();
    const PatientOrderID = String(
      q.PatientOrderID ?? q.patientOrderID ?? q.patientOrderId ?? ''
    ).trim();
    const Specimen = String(q.Specimen ?? q.SpecimenID ?? q.specimen ?? '').trim();

    if (!PatientID || !PatientOrderID) {
      return res.status(400).json({ error: 'Missing PatientID or PatientOrderID' });
    }

    // Build base to call our own routes (keeps business logic server-side)
    const localBase = `${req.protocol}://${req.get('host')}${req.baseUrl || ''}`;
    const fwdHeaders = {
      // preserve client override if caller sent it
      Accept: 'application/json',
      ...(req.get('x-evexia-client-id')
        ? { 'x-evexia-client-id': req.get('x-evexia-client-id') }
        : {})
    };

    // 1) Order details
    const odUrl = new URL(`${localBase}/order-detail`);
    odUrl.searchParams.set('PatientID', PatientID);
    odUrl.searchParams.set('PatientOrderID', PatientOrderID);

    const odResp = await fetch(odUrl, { headers: fwdHeaders });
    if (!odResp.ok) {
      const preview = await odResp.text().catch(() => '');
      return res
        .status(odResp.status)
        .json({ error: 'order-details failed', preview: preview.slice(0, LOG_SLICE) });
    }
    const od = await odResp.json();
    const statusDescr = od?.order?.statusDescr ?? null;

    const summary = {
      patient: { id: PatientID },
      order: {
        id: PatientOrderID,
        statusDescr,
        productName: od?.order?.productName ?? null
      }
    };

    // Not ready? Return early with just order details.
    if (statusDescr !== 'LabResultReady') {
      return res.status(200).json({ ...summary, ready: false });
    }

    // 2) Lab Result (request JSON parse path in your handler):contentReference[oaicite:2]{index=2}
    const lrUrl = new URL(`/api/evexia/lab-result`);
    lrUrl.searchParams.set('PatientID', PatientID);
    lrUrl.searchParams.set('PatientOrderID', PatientOrderID);
    if (Specimen) lrUrl.searchParams.set('Specimen', Specimen);
    lrUrl.searchParams.set('format', 'json'); // triggers structured JSON in labResultHandler:contentReference[oaicite:3]{index=3}

    const [labResp, analyteResp] = await Promise.all([
      fetch(lrUrl, { headers: { ...fwdHeaders, Accept: 'application/json' } }),
      (() => {
        const aUrl = new URL(`${localBase}/analyte-result`);
        aUrl.searchParams.set('PatientID', PatientID);
        aUrl.searchParams.set('PatientOrderID', PatientOrderID);
        if (Specimen) aUrl.searchParams.set('Specimen', Specimen);
        return fetch(aUrl, { headers: { ...fwdHeaders, Accept: 'application/json' } });
      })()
    ]);

    const labJson = labResp.ok ? await labResp.json() : null;
    let analytes = null;
    if (analyteResp.status === 204) {
      analytes = null;
    } else {
      analytes = analyteResp.ok ? await analyteResp.json() : null;
    }

    // Prefer product/test names from parsed lab JSON if we didn’t get one earlier
    const productNames = Array.isArray(labJson?.tests)
      ? labJson.tests.map(t => t?.testName || t?.name).filter(Boolean)
      : [];

    if (!summary.order.productName && productNames.length) {
      summary.order.productName = productNames.join(', ');
    }

    return res.status(200).json({
      ready: true,
      ...summary,
      lab: labJson,
      analytes
    });
  } catch (err) {
    console.error('[Evexia] orderSummaryHandler error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

// --- Combined flow: place PTAU then APOE as two separate orders ---
async function patientOrderCombinedPtauFirst(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    // Inputs (match your existing create endpoint)
    const PatientID = String(q.PatientID ?? q.patientID ?? '').trim();
    const OrderType = String(q.OrderType ?? q.orderType ?? '').trim();
    const PhlebotomyOption = String(q.PhlebotomyOption ?? q.phlebotomyOption ?? '').trim();
    const CollectionDate = String(q.CollectionDate ?? q.collectionDate ?? '').trim();

    // What to place
    const wantPtau = !!(q.wantPtau ?? q.ptau ?? q.PTAU);
    const wantApoe = !!(q.wantApoe ?? q.apoe ?? q.APOE);

    // Business rule: all-or-nothing?
    const requireBoth = ['1', 'true', 'yes', 'on'].includes(
      String(q.requireBoth ?? 'false').toLowerCase()
    );

    if (!PatientID || !OrderType || !PhlebotomyOption) {
      return res.status(400).json({ error: 'Missing PatientID, OrderType, or PhlebotomyOption' });
    }
    if (!wantPtau && !wantApoe) {
      return res.status(400).json({ error: 'Pick at least one test (ptau/apoe)' });
    }

    const clientId = pickClientId(req, q);
    const AUTH_RAW = pickAuthKey();
    const AUTH = process.env.EVEXIA_BEARER_TOKEN; // match other routes but ensure Bearer
    const BASE = pickBaseUrl();

    if (!AUTH) return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });

    const PTAU_PRODUCT_ID = 200018; // Labcorp
    const APOE_PRODUCT_ID = 6724; // Kashi

    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const postEvx = async (path, body) => {
      const url = new URL(path, BASE);
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: AUTH,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        const text = await r.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        if (!r.ok) {
          const e = new Error('Upstream error');
          e.status = r.status;
          e.body = data;
          throw e;
        }
        return data;
      } finally {
        clearTimeout(to);
      }
    };

    const createOrder = async () => {
      const resp = await postEvx('/api/EDIPlatform/OrderAdd', {
        externalClientID: clientId,
        patientID: PatientID,
        orderType: OrderType,
        phlebotomyOption: PhlebotomyOption,
        ...(CollectionDate ? { collectionDate: CollectionDate } : {})
      });
      return resp?.PatientOrderID ?? resp?.patientOrderID ?? resp?.patientOrderId ?? null;
    };

    const addItem = (patientOrderID, productID, isPanel) =>
      postEvx('/api/EDIPlatform/OrderItemAdd', {
        externalClientID: clientId,
        patientOrderID,
        productID,
        isPanel: !!isPanel
      });

    const addItems = (patientOrderID, clientId, productIDList, isPanel) => {
      postEvx('/api/EDIPlatform/OrderItemAddMultiple', {
        externalClientID: clientId,
        patientOrderID,
        items: productIDList.map(productID => ({
          productID,
          isPanel: !!isPanel
        }))
      });
    };

    const completeOrder = patientOrderID =>
      postEvx('/api/EDIPlatform/PatientOrderComplete', {
        externalClientID: clientId,
        patientID: PatientID,
        patientOrderID
      });

    // Best-effort cancel (only used if requireBoth=true and second leg fails)
    const cancelOrder = (patientOrderID, reason) =>
      postEvx('/api/EDIPlatform/OrderEmpty', {
        externalClientID: clientId,
        patientID: PatientID,
        patientOrderID
      });

    const result = {
      ptau: { ok: false, orderId: null, error: null },
      apoe: { ok: false, orderId: null, error: null }
    };

    // 1) PTAU
    let ptauId = null;
    if (wantPtau) {
      try {
        ptauId = await createOrder();
        if (!ptauId) throw new Error('No patientOrderID from PatientOrderAdd (PTAU)');
        await addItem(ptauId, PTAU_PRODUCT_ID);
        await completeOrder(ptauId);
        result.ptau.ok = true;
        result.ptau.orderId = String(ptauId);
      } catch (e) {
        result.ptau.error = e?.status
          ? `Evexia ${e.status}: ${stringifyUpstream(e.body)}`
          : e?.message || 'error';
      }
    }

    // 2) APOE (separate order)
    let apoeId = null;
    if (wantApoe) {
      try {
        apoeId = await createOrder();
        if (!apoeId) throw new Error('No patientOrderID from PatientOrderAdd (APOE)');
        await addItem(apoeId, APOE_PRODUCT_ID);
        await completeOrder(apoeId);
        result.apoe.ok = true;
        result.apoe.orderId = String(apoeId);
      } catch (e) {
        result.apoe.error = e?.status
          ? `Evexia ${e.status}: ${stringifyUpstream(e.body)}`
          : e?.message || 'error';

        // Compensate only if we promised "both or nothing"
        if (requireBoth && result.ptau.ok) {
          try {
            await cancelOrder(ptauId, 'Compensating cancel after APOE failure');
            result.ptau.ok = false;
            result.ptau.error = 'Canceled due to APOE failure';
          } catch (cErr) {
            result.ptau.error = `APOE failed; also failed to cancel PTAU: ${
              cErr?.status
                ? `Evexia ${cErr.status}: ${stringifyUpstream(cErr.body)}`
                : cErr?.message || 'cancel error'
            }`;
          }
        }
      }
    }

    const anyOk = result.ptau.ok || result.apoe.ok;
    // 207 for partial success; 200 for full; 502 when both failed
    const http = anyOk ? (result.ptau.ok && result.apoe.ok ? 200 : 207) : 502;

    return res.status(http).json({
      ok: anyOk && (!requireBoth || (result.ptau.ok && result.apoe.ok)),
      requireBoth,
      ptau: result.ptau,
      apoe: result.apoe
    });
  } catch (err) {
    console.error('[Evexia] combined order error:', err);
    if (err.name === 'AbortError')
      return res.status(504).json({ error: 'Upstream request timed out' });
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
/**
 * @openapi
 * /patient-order-combined-apoe-first:
 *   post:
 *     tags: [Evexia]
 *     summary: Place APOE then PTAU as two separate Evexia orders in sequence
 *     description: >
 *       APOE is placed first, then PTAU. If PTAU fails and `requireBoth` is true, attempts to cancel the APOE order.
 *       Use when the user started with APOE so the UX order matches back-end sequencing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EvxCombinedOrderRequest'
 *           example:
 *             PatientID: "113119"
 *             OrderType: "ClientBill"
 *             PhlebotomyOption: "PSC"
 *             CollectionDate: "2025-10-08"
 *             apoe: true
 *             ptau: true
 *             requireBoth: false
 *     responses:
 *       '200':
 *         description: Both legs succeeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvxCombinedOrderResponse'
 *       '207':
 *         description: Partial success (only returned when requireBoth is false)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvxCombinedOrderResponse'
 *       '502':
 *         description: Both legs failed or compensation canceled the first leg
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvxCombinedOrderResponse'
 *       '504':
 *         description: Upstream timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// --- Combined flow (APOE first): place APOE then PTAU as two separate orders ---
async function patientOrderCombinedApoeFirst(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    // Inputs (match your existing create endpoint)
    const PatientID = String(q.PatientID ?? q.patientID ?? '').trim();
    const OrderType = String(q.OrderType ?? q.orderType ?? '').trim();
    const PhlebotomyOption = String(q.PhlebotomyOption ?? q.phlebotomyOption ?? '').trim();
    const CollectionDate = String(q.CollectionDate ?? q.collectionDate ?? '').trim();
    const clientId = pickClientId(req, q);
    const AUTH_RAW = pickAuthKey();

    const AUTH = process.env.EVEXIA_BEARER_TOKEN; // match other routes but ensure Bearer
    const BASE = pickBaseUrl();

    // What to place
    const wantPtau = !!(q.wantPtau ?? q.ptau ?? q.PTAU);
    const wantApoe = !!(q.wantApoe ?? q.apoe ?? q.APOE);

    // All-or-nothing?
    const requireBoth = ['1', 'true', 'yes', 'on'].includes(
      String(q.requireBoth ?? 'false').toLowerCase()
    );

    if (!PatientID || !OrderType || !PhlebotomyOption) {
      return res.status(400).json({ error: 'Missing PatientID, OrderType, or PhlebotomyOption' });
    }
    if (!wantPtau && !wantApoe) {
      return res.status(400).json({ error: 'Pick at least one test (ptau/apoe)' });
    }

    if (!AUTH) return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });

    const PTAU_PRODUCT_ID = 200018; // Labcorp
    const APOE_PRODUCT_ID = 6724; // Kashi

    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const postEvx = async (path, body) => {
      const url = new URL(path, BASE);
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: AUTH,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        const text = await r.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        if (!r.ok) {
          const e = new Error('Upstream error');
          e.status = r.status;
          e.body = data;
          throw e;
        }
        return data;
      } finally {
        clearTimeout(to);
      }
    };

    const createOrder = async () => {
      const resp = await postEvx('/api/EDIPlatform/PatientOrderAdd', {
        externalClientID: clientId,
        patientID: PatientID,
        orderType: OrderType,
        phlebotomyOption: PhlebotomyOption,
        ...(CollectionDate ? { collectionDate: CollectionDate } : {})
      });
      return resp?.PatientOrderID ?? resp?.patientOrderID ?? resp?.patientOrderId ?? null;
    };

    const addItem = (patientOrderID, productID) =>
      postEvx('/api/EDIPlatform/OrderItemAdd', {
        externalClientID: clientId,
        patientOrderID,
        productID,
        isPanel: 'false'
      });

    const completeOrder = patientOrderID =>
      postEvx('/api/EDIPlatform/PatientOrderComplete', {
        externalClientID: clientId,
        patientID: PatientID,
        patientOrderID
      });

    const cancelOrder = (patientOrderID, reason) =>
      postEvx('/api/EDIPlatform/OrderCancel', {
        externalClientID: clientId,
        patientOrderID,
        reason: reason || 'Compensating cancel'
      });

    const result = {
      ptau: { ok: false, orderId: null, error: null },
      apoe: { ok: false, orderId: null, error: null }
    };

    // 1) APOE
    let apoeId = null;
    if (wantApoe) {
      try {
        apoeId = await createOrder();
        if (!apoeId) throw new Error('No patientOrderID from PatientOrderAdd (APOE)');
        await addItem(apoeId, APOE_PRODUCT_ID);
        await completeOrder(apoeId);
        result.apoe.ok = true;
        result.apoe.orderId = String(apoeId);
      } catch (e) {
        result.apoe.error = e?.status
          ? `Evexia ${e.status}: ${stringifyUpstream(e.body)}`
          : e?.message || 'error';
      }
    }

    // 2) PTAU (separate order)
    let ptauId = null;
    if (wantPtau) {
      try {
        ptauId = await createOrder();
        if (!ptauId) throw new Error('No patientOrderID from PatientOrderAdd (PTAU)');
        await addItem(ptauId, PTAU_PRODUCT_ID);
        await completeOrder(ptauId);
        result.ptau.ok = true;
        result.ptau.orderId = String(ptauId);
      } catch (e) {
        result.ptau.error = e?.status
          ? `Evexia ${e.status}: ${stringifyUpstream(e.body)}`
          : e?.message || 'error';

        // Compensate only if we promised "both or nothing"
        if (requireBoth && result.apoe.ok) {
          try {
            await cancelOrder(apoeId, 'Compensating cancel after PTAU failure');
            result.apoe.ok = false;
            result.apoe.error = 'Canceled due to PTAU failure';
          } catch (cErr) {
            result.apoe.error = `PTAU failed; also failed to cancel APOE: ${
              cErr?.status
                ? `Evexia ${cErr.status}: ${stringifyUpstream(cErr.body)}`
                : cErr?.message || 'cancel error'
            }`;
          }
        }
      }
    }

    const anyOk = result.ptau.ok || result.apoe.ok;
    const http = anyOk ? (result.ptau.ok && result.apoe.ok ? 200 : 207) : 502;

    return res.status(http).json({
      ok: anyOk && (!requireBoth || (result.ptau.ok && result.apoe.ok)),
      requireBoth,
      ptau: result.ptau,
      apoe: result.apoe
    });
  } catch (err) {
    console.error('[Evexia] combined order (APOE first) error:', err);
    if (err.name === 'AbortError')
      return res.status(504).json({ error: 'Upstream request timed out' });
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

function stringifyUpstream(b) {
  if (!b) return 'no body';
  if (typeof b === 'string') return b.slice(0, 500);
  try {
    return JSON.stringify(b).slice(0, 500);
  } catch {
    return 'unserializable';
  }
}

async function OrderItemAdd(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const rawPatientOrderID = (q.patientOrderID ?? q.PatientOrderID ?? '').toString().trim();
    const rawProductID = (q.ProductID ?? q.productID ?? q.productId ?? '').toString().trim();
    const rawIsPanel = q.IsPanel ?? q.isPanel ?? 'false';

    const patientOrderID = Number(rawPatientOrderID);
    const ProductID = Number(rawProductID);
    const clientId = pickClientId(req, q);
    // Only allow these two
    const pTauProductID = 200018; // Labcorp
    const apoeProductID = 6724; // Kashi
    const allowedProducts = new Set([pTauProductID, apoeProductID]);

    // Parse boolean but stringify for payload
    const isPanelBool = (() => {
      if (typeof rawIsPanel === 'boolean') return rawIsPanel;
      const s = String(rawIsPanel).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'on';
    })();
    const isPanel = String(isPanelBool); // "true" or "false"

    // Validate
    if (!Number.isFinite(patientOrderID) || patientOrderID <= 0) {
      return res.status(400).json({ error: 'Missing or invalid patientOrderID' });
    }
    if (!Number.isFinite(ProductID) || !allowedProducts.has(ProductID)) {
      return res.status(400).json({ error: 'Invalid or unsupported ProductID' });
    }

    const AUTH = pickAuthKey(); // should return e.g. "Bearer <token>"
    const BASE = pickBaseUrl();
    const PATH = '/api/EDIPlatform/OrderItemAdd';

    if (!AUTH) return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    if (!BASE) return res.status(500).json({ error: 'Server missing EVEXIA_BASE_URL' });

    let url;
    try {
      url = new URL(PATH, BASE);
    } catch {
      return res.status(500).json({ error: 'Invalid EVEXIA_BASE_URL' });
    }

    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      externalClientID: clientId,
      patientOrderID,
      productID: ProductID,
      isPanel
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: AUTH, // must be "Bearer <token>"
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Upstream error', body: data });
    }

    return res.status(200).json({ success: true, upstream: data });
  } catch (err) {
    console.error('[Evexia] patientOrderItemAdd error:', err);
    if (err.name === 'AbortError')
      return res.status(504).json({ error: 'Upstream request timed out' });
    return res.status(500).json({ error: err.message });
  }
}

// Complete the order (triggers requisition/lab process)
// Expected body:
// { PatientID: "113119", PatientOrderID: "211177" }

async function OrderItemsAdd(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const rawPatientOrderID = (q.patientOrderID ?? q.PatientOrderID ?? '').toString().trim();
    const rawProductIDList = (q.productIDList ?? q.ProductIDList ?? '').toString().trim();
    const rawIsPanel = q.IsPanel ?? q.isPanel ?? 'false';

    const patientOrderID = Number(rawPatientOrderID);

    // pick client id (may be string or number depending on implementation)
    const clientId = pickClientId(req, q);

    // parse boolean-ish values and stringify for payload
    const isPanelBool = (() => {
      if (typeof rawIsPanel === 'boolean') return rawIsPanel;
      const s = String(rawIsPanel).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'on';
    })();
    const isPanel = String(isPanelBool); // "true" or "false"

    // validation
    if (!Number.isFinite(patientOrderID) || patientOrderID <= 0) {
      return res.status(400).json({ error: 'Missing or invalid patientOrderID' });
    }
    if (!rawProductIDList) {
      return res.status(400).json({ error: 'Missing productIDList' });
    }
    if (!clientId && clientId !== 0) {
      // treat 0 as a valid id if your system uses it; adjust if not needed
      return res.status(400).json({ error: 'Missing or invalid clientId' });
    }

    const AUTH = pickAuthKey(); // should return e.g. "Bearer <token>"
    const BASE = pickBaseUrl();
    const PATH = '/api/EDIPlatform/OrderItemsAdd';

    if (!AUTH) return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    if (!BASE) return res.status(500).json({ error: 'Server missing EVEXIA_BASE_URL' });

    let url;
    try {
      url = new URL(PATH, BASE);
    } catch {
      return res.status(500).json({ error: 'Invalid EVEXIA_BASE_URL' });
    }

    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      externalClientID: clientId,
      patientOrderID,
      productIDList: rawProductIDList, // e.g. "200018,6724"
      isPanel // "true" or "false"
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: AUTH, // must be "Bearer <token>"
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Upstream error', body: data });
    }

    return res.status(200).json({ success: true, upstream: data });
  } catch (err) {
    console.error('[Evexia] patientOrderItemsAdd error:', err);
    if (err && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
}

async function OrderListHandler(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const PatientID = String(q.PatientID ?? q.patientID ?? '').trim();
    // const Limit = String(q.Limit ?? q.limit ?? '0').trim();
    // const StartAfter = String(q.StartAfter ?? q.startAfter ?? '0').trim();

    if (!PatientID) {
      return res.status(400).json({ error: 'Missing PatientID' });
    }

    const clientId = pickClientId(req, q);
    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();
    const PATH = '/api/EDIPlatform/OrderList';

    if (!AUTH) return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    if (!BASE) return res.status(500).json({ error: 'Server missing EVEXIA_BASE_URL' });

    const url = new URL(PATH, BASE);
    url.searchParams.set('externalClientID', clientId);
    url.searchParams.set('patientID', PatientID);

    // url.searchParams.set('limit', Limit);
    // url.searchParams.set('startAfter', StartAfter);

    const maskedClient = clientId ? clientId.slice(0, 6) + '…' : '(none)';
    dlog('Upstream GET', url.toString().replace(clientId, maskedClient));

    const controller = new AbortController();
    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'BetterMindCare-EvexiaProxy/1.0'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(to));
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    let raw;
    if (ct.includes('application/json')) {
      raw = await r.json();
    } else {
      const txt = await r.text();
      // Evexia often returns JSON-as-text; try to parse
      try {
        raw = JSON.parse(txt);
      } catch {
        raw = txt;
      }
    }

    if (!r.ok) {
      return res.status(r.status).json({
        error: 'Upstream error',
        upstreamStatus: r.status,
        upstreamContentType: ct,
        upstreamPreview: (typeof raw === 'string' ? raw : JSON.stringify(raw)).slice(0, LOG_SLICE)
      });
    }

    if (typeof raw === 'string') {
      // keep plain text if it truly isn't JSON
      res.setHeader('Content-Type', ct || 'text/plain');
      return res.status(200).send(raw);
    }

    return res.status(200).json(raw);
  } catch (err) {
    console.error('[Evexia] orderListHandler error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

const patientOrderCompleteHandler = async (req, res) => {
  try {
    const patientOrderID = req.query.patientOrderID || req.body?.patientOrderID;

    const externalClientID = process.env.EVEXIA_EXTERNAL_CLIENT_ID;
    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();

    const patientPay = String(req.query.patientPay ?? req.body?.patientPay ?? 'false');
    const includeFHR = String(req.query.includeFHR ?? req.body?.includeFHR ?? 'false');
    const clientPhysicianID = req.query.clientPhysicianID || req.body?.clientPhysicianID || 0;

    if (!patientOrderID || !externalClientID) {
      return res.status(400).json({ error: 'patientOrderID and externalClientID are required' });
    }

    if (!BASE) return res.status(500).json({ error: 'Missing EVEXIA_BASE_URL' });
    if (!AUTH) return res.status(500).json({ error: 'Missing EVEXIA_AUTH_KEY' });

    const COMPLETE_PATH = '/api/EDIPlatform/PatientOrderComplete';
    const url = new URL(COMPLETE_PATH, BASE);

    url.searchParams.set('patientOrderID', patientOrderID);
    url.searchParams.set('externalClientID', externalClientID);
    url.searchParams.set('patientPay', patientPay);
    url.searchParams.set('includeFHR', includeFHR);
    url.searchParams.set('clientPhysicianID', clientPhysicianID);

    console.log('➡️ Forwarding to Evexia:', url.toString());

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json'
      }
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Upstream error', upstream: data });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('patientOrderCompleteHandler error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

function trimOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

async function callEvexia(url, options) {
  let resp, text;
  try {
    resp = await fetch(url, options);
    text = await resp.text(); // read once

    // try to JSON-parse but don't die if it's not JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!resp.ok) {
      const msg = data?.error || data?.message || text || resp.statusText;
      const err = new Error(`Upstream ${resp.status} ${resp.statusText} – ${msg.slice(0, 500)}`);
      err.status = resp.status;
      err.body = text;
      err.url = url;
      throw err;
    }

    return data ?? text; // return JSON or raw text
  } catch (e) {
    // LOG EVERYTHING server-side
    console.error('Upstream call failed', {
      url: e.url || url,
      status: e.status || resp?.status,
      body: e.body || text,
      message: e.message
    });

    // return useful info to client (trim/avoid PII if needed)
    throw e;
  }
}

async function patientAddV2(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const ExternalClientID = process.env.EVEXIA_EXTERNAL_CLIENT_ID;
    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();
    const PATH = pickPatientAddV2Path(); // implement like pickPatientListDetailsPath()

    if (!ExternalClientID) {
      return res.status(400).json({ error: 'Missing ExternalClientID' });
    }
    if (!AUTH || (IS_PROD && AUTH === HARD_DEFAULT_AUTH_KEY)) {
      return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    }
    if (IS_PROD && ExternalClientID === HARD_DEFAULT_CLIENT_ID) {
      return res.status(500).json({ error: 'Server missing EVEXIA client id env' });
    }

    // Build URL with the same pattern as listAllPatients
    const url = new URL(PATH, BASE);

    // Minimal log without PHI
    const maskedClient = ExternalClientID ? ExternalClientID.slice(0, 6) + '…' : '(none)';
    dlog(
      'Upstream POST',
      url.toString().replace(ExternalClientID, maskedClient),
      'keys:',
      Object.keys(q)
    );

    const controller = new AbortController();
    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const to = setTimeout(() => controller.abort(), timeoutMs);

    // Map to upstream schema exactly as they expect
    const payload = {
      EmailAddress: String(q.EmailAddress || '').trim(),
      FirstName: String(q.FirstName || '').trim(),
      LastName: String(q.LastName || '').trim(),
      StreetAddress: String(q.StreetAddress || '').trim(),
      StreetAddress2: String(q.StreetAddress2 || '').trim(),
      City: String(q.City || '').trim(),
      State: String(q.State || '').trim(),
      PostalCode: String(q.PostalCode || '').trim(),
      Phone: String(q.Phone || '').trim(),
      DOB: String(q.DOB || '').trim(), // convert to vendor-required format if needed
      Gender: String(q.Gender || '').trim(),
      Guardian: String(q.Guardian || '').trim(),
      GuardianRelationship: String(q.GuardianRelationship || '').trim(),
      GuardianAddress: String(q.GuardianAddress || '').trim(),
      GuardianAddress2: String(q.GuardianAddress2 || '').trim(),
      GuardianCity: String(q.GuardianCity || '').trim(),
      GuardianPostalCode: String(q.GuardianPostalCode || '').trim(),
      GuardianState: String(q.GuardianState || '').trim(),
      GuardianPhone: String(q.GuardianPhone || '').trim(),
      ExternalClientID // always from server env, like your GET route
    };

    // Required field check to match your earlier validator
    const required = [
      'EmailAddress',
      'FirstName',
      'LastName',
      'StreetAddress',
      'City',
      'State',
      'PostalCode',
      'Phone',
      'DOB',
      'Gender',
      'ExternalClientID'
    ];
    for (const k of required) {
      const v = payload[k];
      if (!v || String(v).trim() === '') {
        clearTimeout(to);
        return res.status(400).json({ error: `Missing required field: ${k}` });
      }
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: AUTH, // use the same AUTH you already have working
        Accept: 'application/json, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'BetterMindCare-EvexiaProxy/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    if (r.status === 204) return res.status(204).send();

    const text = await r.text();
    if (r.status >= 400) {
      // surface upstream for debugging
      return res.status(r.status).json({
        error: 'Upstream error',
        status: r.status,
        body: text.slice(0, 1000),
        url: url.toString()
      });
    }

    // try JSON parse, else return raw
    try {
      const data = JSON.parse(text);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(data);
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(text);
    }
  } catch (e) {
    const code = e.name === 'AbortError' ? 504 : 500;
    dlog('patientAddV2 failed:', e);
    return res.status(code).json({ error: 'Proxy failure', detail: String(e) });
  }
}

// GET /api/evexia/patient-list -> forwards to PatientList
// Required params: externalClientID (string), patientID (int)
async function patientListHandler(req, res) {
  try {
    const externalClientID = trimOrNull(req.query.externalClientID || req.body?.externalClientID);
    const patientID = trimOrNull(req.query.patientID || req.body?.patientID);
    if (!externalClientID || !patientID) {
      return res.status(400).json({ error: 'externalClientID and patientID are required' });
    }

    const BASE = pickBaseUrl();
    const AUTH = pickAuthKey();
    if (!BASE) return res.status(500).json({ error: 'Missing EVEXIA_BASE_URL' });
    if (!AUTH) return res.status(500).json({ error: 'Missing EVEXIA_AUTH_KEY' });

    const url = new URL(PATHS.PATIENT_LIST, BASE);
    url.searchParams.set('externalClientID', externalClientID);
    url.searchParams.set('patientID', patientID);

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json'
      }
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Upstream error', upstream: data });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('patientListHandler error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

const getClientId = (req, res) => {
  res.json({ externalClientID: process.env.EVEXIA_EXTERNAL_CLIENT_ID });
};

const OrderItemDelete = async (req, res) => {
  try {
    // Merge query and body params for flexibility
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const externalClientID = trimOrNull(
      q.externalClientID || process.env.EVEXIA_EXTERNAL_CLIENT_ID
    );
    const patientOrderID = trimOrNull(q.patientOrderID);
    const productID = trimOrNull(q.productID);
    const rawIsPanel = q.isPanel ?? q.IsPanel ?? 'false';

    // Validation
    if (!externalClientID || !patientOrderID || !productID) {
      return res.status(400).json({
        error: 'externalClientID, patientOrderID, and productID are required'
      });
    }

    // Base + Auth
    const BASE = pickBaseUrl();
    const AUTH = pickAuthKey();

    if (!BASE) return res.status(500).json({ error: 'Missing EVEXIA_BASE_URL' });
    if (!AUTH) return res.status(500).json({ error: 'Missing EVEXIA_AUTH_KEY' });

    // Normalize isPanel → always "true" or "false" string
    const isPanelBool = (() => {
      if (typeof rawIsPanel === 'boolean') return rawIsPanel;
      const s = String(rawIsPanel).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'on';
    })();
    const isPanel = isPanelBool ? 'true' : 'false';

    // Build Evexia URL
    const DELETE_PATH = pickOrderItemDeletePath();
    const url = new URL(DELETE_PATH, BASE);

    // Prepare payload — Evexia’s newer servers expect POST with JSON
    const payload = {
      externalClientID,
      patientOrderID,
      productID,
      isPanel
    };

    console.log('➡️ Forwarding OrderItemDelete (POST):', url.toString(), payload);

    // Perform POST request to Evexia
    const r = await fetch(url, {
      method: 'POST', // ✅ POST to match “Add” behavior
      headers: {
        Authorization: AUTH, // must include Bearer prefix
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      console.error('Upstream error:', data);
      return res.status(r.status).json({ error: 'Upstream error', upstream: data });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('OrderItemDelete error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

async function OrderEmpty(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const rawPatientID = String(q.patientID ?? q.PatientID ?? '').trim();
    const rawPatientOrderID = String(q.patientOrderID ?? q.PatientOrderID ?? '').trim();
    const clientId = pickClientId(req, q);

    if (!rawPatientID || !rawPatientOrderID) {
      return res.status(400).json({ error: 'Missing patientID or patientOrderID' });
    }

    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();
    const PATH = '/api/EDIPlatform/OrderEmpty';

    if (!AUTH) return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    if (!BASE) return res.status(500).json({ error: 'Server missing EVEXIA_BASE_URL' });

    const url = new URL(PATH, BASE);
    url.searchParams.set('patientID', rawPatientID);
    url.searchParams.set('patientOrderID', rawPatientOrderID);
    url.searchParams.set('externalClientID', clientId);

    const maskedClient = clientId ? clientId.slice(0, 6) + '…' : '(none)';
    dlog('Upstream GET', url.toString().replace(clientId, maskedClient));

    const controller = new AbortController();
    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'BetterMindCare-EvexiaProxy/1.0'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Upstream error', body: data });
    }

    return res.status(200).json({ success: true, upstream: data });
  } catch (err) {
    console.error('[Evexia] OrderEmpty error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: err.message });
  }
}

async function addOrderHandler(req, res) {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const PatientID = String(q.patientID ?? q.PatientID ?? '').trim();
    const OrderType = String(q.orderType ?? q.OrderType ?? '').trim();
    const PhlebotomyOption = String(q.phlebotomyOption ?? q.PhlebotomyOption ?? '').trim();
    let CollectionDate = String(q.collectionDate ?? q.CollectionDate ?? '').trim();
    const ExternalClientID = String(
      q.externalClientID ?? q.ExternalClientID ?? process.env.EVEXIA_EXTERNAL_CLIENT_ID ?? ''
    ).trim();

    if (!PatientID) {
      return res.status(400).json({
        error: 'Missing required fields: patientID, orderType, or phlebotomyOption'
      });
    }

    if (!CollectionDate) {
      CollectionDate = new Date().toISOString().split('T')[0];
    }

    const AUTH = pickAuthKey();
    const BASE = pickBaseUrl();
    const PATH = '/api/EDIPlatform/OrderAdd';

    if (!AUTH) return res.status(500).json({ error: 'Server missing EVEXIA_AUTH_KEY' });
    if (!BASE) return res.status(500).json({ error: 'Server missing EVEXIA_BASE_URL' });

    const url = new URL(PATH, BASE);

    const payload = {
      patientID: PatientID,
      orderType: OrderType,
      phlebotomyOption: PhlebotomyOption,
      collectionDate: CollectionDate,
      externalClientID: ExternalClientID
    };

    const timeoutMs = Number(process.env.EVEXIA_TIMEOUT_MS || 15000);
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: AUTH,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).finally(() => clearTimeout(to));

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      return res.status(r.status).json({
        error: 'Upstream error',
        upstreamStatus: r.status,
        upstreamBody: data
      });
    }

    // Expected Evexia response shape
    return res.status(200).json({
      Success: true,
      PatientOrderID:
        data.PatientOrderID ?? data.patientOrderID ?? data.patientOrderId ?? data?.id ?? null
    });
  } catch (err) {
    console.error('[Evexia] addOrderHandler error:', err);
    if (err.name === 'AbortError')
      return res.status(504).json({ error: 'Upstream request timed out' });
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

const OrderCancel = async (req, res) => {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const externalClientID = trimOrNull(
      q.externalClientID || process.env.EVEXIA_EXTERNAL_CLIENT_ID
    );
    const patientOrderID = trimOrNull(q.patientOrderID);

    if (!externalClientID || !patientOrderID) {
      return res.status(400).json({
        error: 'externalClientID and patientOrderID are required'
      });
    }

    const BASE = pickBaseUrl();
    const AUTH = pickAuthKey();

    if (!BASE) return res.status(500).json({ error: 'Missing EVEXIA_BASE_URL' });
    if (!AUTH) return res.status(500).json({ error: 'Missing EVEXIA_AUTH_KEY' });

    const CANCEL_PATH = '/api/EDIPlatform/OrderCancel';
    const url = new URL(CANCEL_PATH, BASE);

    // ✅ Add query params (Evexia expects GET with params)
    url.searchParams.set('externalClientID', externalClientID);
    url.searchParams.set('patientOrderID', patientOrderID);

    console.log('➡️ Forwarding OrderCancel (GET):', url.toString());

    // ✅ GET — no body, no Content-Type header
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json'
      }
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      console.error('Upstream error (OrderCancel):', data);
      return res.status(r.status).json({
        error: 'Upstream error',
        upstream: data
      });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('OrderCancel error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

const getRequisition = async (req, res) => {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const externalClientID = trimOrNull(
      q.externalClientID || process.env.EVEXIA_EXTERNAL_CLIENT_ID
    );
    const patientOrderID = trimOrNull(q.patientOrderID);
    const patientID = String(q.PatientID ?? q.patientID ?? '').trim();

    if (!patientOrderID) {
      return res.status(400).json({ error: 'patientOrderID required' });
    }

    if (!patientID) {
      return res.status(400).json({ error: 'patientID required' });
    }

    const BASE = pickBaseUrl();
    const AUTH = pickAuthKey();

    if (!BASE) return res.status(500).json({ error: 'Missing EVEXIA_BASE_URL' });
    if (!AUTH) return res.status(500).json({ error: 'Missing EVEXIA_AUTH_KEY' });

    const REQISITION_PATH = '/api/EDIPlatform/RequisitionGet';
    const url = new URL(REQISITION_PATH, BASE);
    url.searchParams.set('externalClientID', externalClientID);
    url.searchParams.set('patientID', patientID);
    url.searchParams.set('patientOrderID', patientOrderID);

    console.log('➡️ Forwarding RequisitionGet (GET):', url.toString());

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json'
      }
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('❌ Evexia error:', text);
      return res.status(r.status).json({ error: 'Evexia API error', detail: text });
    }

    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
      // Sometimes Evexia wraps JSON as a string again — handle that
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
    } catch (err) {
      console.error('⚠️ Failed to parse Evexia JSON:', err);
      data = raw;
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ getRequisition error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

const getDrawCenterLocator = async (req, res) => {
  try {
    const q = { ...(req.query || {}), ...(req.body || {}) };

    const externalClientID = String(
      q.externalClientID || process.env.EVEXIA_EXTERNAL_CLIENT_ID || ''
    ).trim();

    const postalCode = String(q.postalCode || '').trim();
    const distance = String(q.distance || '').trim() || '25';

    const BASE = pickBaseUrl();
    const AUTH = pickAuthKey();

    if (!BASE) return res.status(500).json({ error: 'Missing EVEXIA_BASE_URL' });
    if (!AUTH) return res.status(500).json({ error: 'Missing EVEXIA_AUTH_KEY' });

    const url = new URL('/api/EDIPlatform/DrawCenterLocator', BASE);
    url.searchParams.set('externalClientID', externalClientID);
    url.searchParams.set('postalCode', postalCode);
    url.searchParams.set('distance', distance);
    if (externalClientID) url.searchParams.set('externalClientID', externalClientID);

    console.log('➡️ Forwarding DrawCenterLocator (GET):', url.toString());

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json',
      },
    });

const text = await r.text();

if (r.status === 204) {
  // Evexia explicitly says "no content" — return empty list instead of error
  return res.status(200).json({ DrawCenters: [] });
}

if (!r.ok) {
  console.error('❌ Evexia error:', text);
  return res.status(r.status).json({ error: 'Evexia API error', detail: text });
}

let data;
try {
  data = JSON.parse(text);
} catch {
  console.error('❌ Invalid JSON from Evexia:', text.slice(0, 500));
  return res.status(502).json({
    error: 'Invalid response from Evexia API',
    raw: text.slice(0, 500),
  });
}

return res.status(200).json(data);
  } catch (err) {
    console.error('❌ getDrawCenterLocator error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

router.post('/order-add', addOrderHandler);

router.get('/patient-order-complete', patientOrderCompleteHandler);

router.get('/order-empty', OrderEmpty);

// patient routes
router.get('/client-id', getClientId);

router.post('/order-item-add', OrderItemAdd);
router.post('/order-items-add', OrderItemsAdd);
router.get('/order-item-delete', OrderItemDelete);
router.post('/order-item-delete', OrderItemDelete);
router.get('/order-list', OrderListHandler);

//patient order routes

router.get('/order-summary', orderSummaryHandler);
router.post('/order-summary', orderSummaryHandler);
router.get('/order-detail', orderDetailHandler);

//lab result(pdf)/patient analyte routes

router.post('/analyte-result', analyteResultHandler);

// ✅ mount the combined flow
router.post('/patient-order-combined-ptau-first', patientOrderCombinedPtauFirst);
router.post('/patient-order-combined-apoe-first', patientOrderCombinedApoeFirst);

router.get('/lab-result', labResultHandler);
router.post('/lab-result', labResultHandler);

router.get('/list-all-patients', listAllPatients);

router.post('/patient-add', patientAddV2);
router.get('/order-cancel', OrderCancel);
router.post('/order-cancel', OrderCancel);
router.get('/requisition-get', getRequisition);
router.post('/requisition-get', getRequisition);

router.get('/draw-center-locator', getDrawCenterLocator);
router.post('/draw-center-locator', getDrawCenterLocator);
module.exports = router;
