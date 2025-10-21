// src/backend/utils/labextract.js
const pdfParse = require('pdf-parse');

function normalize(s='') {
  return s.replace(/\u00A0/g, ' ').replace(/[–—]/g, '-');
}

function extractResultRows(text) {
  const out = [];
  const t = normalize(text);
  // common “name  value  unit  ref  flag” line
  const rx = /^([A-Za-z0-9 ,/()'&.\-]+?)\s+([<>]?\s?\d+(?:\.\d+)?)\s+([a-zA-Z%/µ]+)\s+([<>]?\s?\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*(H|L|High|Low)?$/gm;
  let m;
  while ((m = rx.exec(t))) {
    let flag = (m[5] || 'N').toUpperCase();
    if (flag === 'HIGH') flag = 'H';
    if (flag === 'LOW') flag = 'L';
    const num = Number((m[2] || '').replace(/\s+/g, ''));
    if (Number.isFinite(num)) {
      out.push({ name: m[1].trim(), value: num, units: m[3], reference: m[4].replace(/\s+/g, ' '), flag });
    }
  }
  return out;
}

function extractOrderedTests(text) {
  const out = [];
  const rx = /^(\d{5,})\s+(.+?)\s+\(\1\)$/gm; // e.g. "001024 Phosphorus (001024)"
  let m;
  while ((m = rx.exec(text))) out.push({ code: m[1], name: m[2].trim() });
  return out;
}

async function parseLabBuffer(buf) {
  const { text = '' } = await pdfParse(buf);
  const t = normalize(text);

  // header-ish bits (best-effort; tweak as needed)
  const patientName = /Patient Name:\s*([A-Za-z ,.'-]+)/i.exec(t)?.[1]?.trim() || null;
  const patientId   = /Patient ID:\s*([A-Za-z0-9-]+)/i.exec(t)?.[1]?.trim() || null;
  const dob         = /Date of Birth:\s*([0-9/.-]+)/i.exec(t)?.[1] || null;
  const collected   = /Collection Date:\s*([0-9/ :APMapm-]+)/i.exec(t)?.[1] || null;
  const finalized   = /Final(?:ized)?(?: Date)?:\s*([0-9/ :APMapm-]+)/i.exec(t)?.[1] || null;

  const tests = extractResultRows(t);
  const orderedTests = tests.length ? [] : extractOrderedTests(t);

  return {
    patient: { id: patientId, name: patientName, dob },
    meta: { collected, finalized },
    tests,
    orderedTests,
    rawTextLength: t.length // handy for debugging
  };
}

module.exports = { parseLabBuffer };