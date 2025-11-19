// src/backend/utils/parseEvexiaPdfText.js
function norm(s = '') {
  return s
    .replace(/\u00A0/g, ' ')
    .replace(/[–-]/g, '-')
    .replace(/\r/g, '');
}

function cleanLine(s = '') {
  return s.trim().replace(/\s+/g, ' ');
}

function pick(rx, t) {
  const m = rx.exec(t);
  return m ? cleanLine(m[1]) : null;
}

function parseHeader(t) {
  // Evexia/LabCorp common labels seen in your sample
  return {
    patientName: pick(/Patient Name:\s*([A-Za-z ,.'-]+)/i, t),
    patientId: pick(/Patient ID:\s*([A-Za-z0-9-]+)/i, t),
    dob: pick(/Date of Birth:\s*([\d/.-]+)/i, t) || pick(/\bDOB:\s*([\d/.-]+)/i, t),
    sex: pick(/\bSex:\s*(Male|Female|M|F)\b/i, t),
    mrn: pick(/\bMRN:\s*([A-Za-z0-9-]+)/i, t),

    account: pick(/\bAccount #:\s*([A-Za-z0-9-]+)/i, t),
    requisition:
      pick(/\bRequisition #:\s*([A-Za-z0-9-]+)/i, t) ||
      pick(/\bReq(?:uisition)? #:\s*([A-Za-z0-9-]+)/i, t),
    control: pick(/\bControl #:\s*([A-Za-z0-9-]+)/i, t),
    accession: pick(/\bAccession #:\s*([A-Za-z0-9-]+)/i, t),

    orderingPhysician:
      pick(/Ordering Physician:\s*([A-Za-z ,.'-]+)/i, t) ||
      pick(/\bPhysician:\s*([A-Za-z ,.'-]+)/i, t),
    collected:
      pick(/Collection Date:\s*([0-9/ :APMapm-]+)/i, t) ||
      pick(/\bCollected:\s*([0-9/ :APMapm-]+)/i, t),
    received: pick(/\bReceived:\s*([0-9/ :APMapm-]+)/i, t),
    finalized:
      pick(/Final(?:ized)?(?: Date)?:\s*([0-9/ :APMapm-]+)/i, t) ||
      pick(/\bReported:\s*([0-9/ :APMapm-]+)/i, t),

    specimen:
      pick(/\bSpecimen(?: ID)?:\s*([A-Za-z0-9-]+)/i, t) ||
      pick(/\bSpecimen:\s*([A-Za-z ,0-9-]+)/i, t),
    location: pick(/\bLocation:\s*([A-Za-z ,0-9-]+)/i, t),
    client: pick(/\bClient:\s*([A-Za-z ,0-9-]+)/i, t)
  };
}

function sliceProfilesBlock(t) {
  const s = norm(t);
  // Find the "Profiles/Tests" section and cut it until the next big header/table
  const startRx = /Profiles\/Tests/i;
  const endRx =
    /(?:Responsible Party|Patient Service Center Request|Client:|Ordering Physician:|Specimen|Result(?:s)?\s*[:]|Page\s+\d+\s+of\s+\d+)/i;

  const start = s.search(startRx);
  if (start < 0) return s; // fallback: whole text
  let rest = s.slice(start);

  const mEnd = endRx.exec(rest);
  if (mEnd) rest = rest.slice(0, mEnd.index);
  return rest;
}

function parseOrderedTests(t) {
  const s = norm(t);
  const lines = s.split(/\r?\n/).map(x => x.replace(/\s+$/, ''));
  const out = [];

  // --- Pass A: line starts with code, name same/next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^(?<code>\d{5,7})\b(.*)$/.exec(line);
    if (!m) continue;
    const code = m.groups.code;
    let name = cleanLine(m[2] || '');

    if (!name || /^[|.\-]*$/.test(name)) {
      // take the next non-empty line as name
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length) {
        name = cleanLine(lines[j]);
        i = j;
      }
    }
    if (!name) continue;

    // strip trailing (code)
    name = name.replace(new RegExp(`\\(0?${code}\\)\\s*$`), '').trim();

    // skip obvious headers
    if (/^(code|test ordered|profiles\/tests)$/i.test(name)) continue;

    out.push({ code, name });
  }

  // --- Pass B: Name (CODE) anywhere, dotAll to handle wraps
  {
    const rx = /([A-Za-z][A-Za-z0-9 ,+/'&.\-\n]{2,200})\(\s*(\d{5,7})\s*\)/gs;
    let m;
    while ((m = rx.exec(s))) {
      let name = cleanLine(m[1].replace(/\n+/g, ' '));
      const code = m[2];
      if (!name || /^(code|test ordered)$/i.test(name)) continue;
      out.push({ code, name });
    }
  }

  // --- Pass C: fallback - find lone codes and pull nearby words as the name
  {
    const rxCode = /\b(\d{5,7})\b/g;
    let m;
    while ((m = rxCode.exec(s))) {
      const code = m[1];

      // If we already have this code captured with a name, skip
      if (out.some(o => o.code === code)) continue;

      // Look ahead up to ~120 chars for a plausible name, otherwise look behind
      const ahead = s.slice(m.index, m.index + 220);
      let mAhead = /(?:\b\d{5,7}\b[^\S\r\n]*)?([A-Za-z][A-Za-z0-9 ,+/'&.\-]{3,120})/.exec(ahead);
      let name = mAhead ? cleanLine(mAhead[1]) : '';

      if (!name || /^(page|code|test ordered)$/i.test(name)) {
        const behind = s.slice(Math.max(0, m.index - 220), m.index);
        const mBehind = /([A-Za-z][A-Za-z0-9 ,+/'&.\-]{3,120})[^\S\r\n]*$/.exec(behind);
        name = mBehind ? cleanLine(mBehind[1]) : '';
      }

      if (name) out.push({ code, name });
    }
  }

  // de-dup by code+name
  const seen = new Set();
  return out
    .map(o => ({ code: o.code, name: o.name.replace(/\s{2,}/g, ' ').trim() }))
    .filter(o => {
      // kill garbage names
      if (!o.name || /^(page|code|test ordered)$/i.test(o.name)) return false;
      const k = `${o.code}|${o.name.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}


function parseResults(t) {
  const out = [];
  const rx =
    /^([A-Za-z0-9 ,/()'&.\-]+?)\s+([<>]?\s?\d+(?:\.\d+)?)\s+([A-Za-z%/µ]+)\s+([<>]?\s?\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*(H|L|High|Low)?$/gm;
  let m;
  while ((m = rx.exec(t))) {
    const name = cleanLine(m[1]);
    const units = (m[3] || '').trim();

    // kill pagination/footer and instructions like "1 of 2"
    if (/authorization|please|sign|date/i.test(name)) continue;
    if (units.toLowerCase() === 'of') continue;

    const valueStr = (m[2] || '').replace(/\s+/g, '');
    const value = Number(valueStr.replace(/[<>]/g, ''));
    if (!Number.isFinite(value)) continue;

    const reference = cleanLine((m[4] || '').replace(/\s*-\s*/g, '-'));
    let flag = (m[5] || 'N').toUpperCase();
    if (flag === 'HIGH') flag = 'H';
    if (flag === 'LOW') flag = 'L';
    const comparator = /^[<>]/.test(valueStr) ? valueStr[0] : undefined;

    out.push({ name, value, units, reference, flag, ...(comparator ? { comparator } : {}) });
  }
  return out;
}

function parseEvexiaPdfText(rawText) {
  const text = norm(rawText || '');
  const header = parseHeader(text);
  const results = parseResults(text);

  // Always try to parse ordered tests (don’t gate on results length)
  const orderedTests = Array.from(
    new Map(parseOrderedTests(text).map(t => [`${t.code}|${t.name}`, t])).values()
  );

  return {
    header,
    results,
    orderedTests,
    rawTextLength: text.length
  };
}

module.exports = { parseEvexiaPdfText };
