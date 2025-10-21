// src/backend/report/buildPatientReport.js
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs/promises');
const { parseLabBuffer } = require('../utils/labextract');

async function buildPatientReport({ templatePath, labPdfBuffer, mapping = {} }) {
  const tplBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(tplBytes);
  const form = pdfDoc.getForm();

  const lab = await parseLabBuffer(labPdfBuffer);

  if (form.getFields().length > 0) {
    const set = (name, val) => { try { form.getTextField(name).setText(val ?? ''); } catch {} };

    set(mapping.patientName || 'patient_name', lab.patient.name || '');
    set(mapping.patientId   || 'patient_id',   lab.patient.id   || '');
    set(mapping.dob         || 'dob',          lab.patient.dob  || '');
    set(mapping.collected   || 'collected',    lab.meta.collected || '');
    set(mapping.finalized   || 'finalized',    lab.meta.finalized || '');

    // Example: pick a few common tests
    const pick = n => lab.tests.find(t => t.name.toLowerCase().includes(n));
    const a1c  = pick('hemoglobin a1c');
    if (a1c) {
      set(mapping.a1c_value || 'a1c_value', String(a1c.value));
      set(mapping.a1c_units || 'a1c_units', a1c.units);
      set(mapping.a1c_ref   || 'a1c_ref',   a1c.reference);
      set(mapping.a1c_flag  || 'a1c_flag',  a1c.flag);
    }

    form.flatten();
  } else {
    const page = pdfDoc.getPage(0);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const draw = (txt, x, y, size=10) => page.drawText(txt ?? '', { x, y, size, font, color: rgb(0,0,0) });

    // adjust coordinates to your template
    draw(lab.patient.name || '', 120, 700);
    draw(lab.patient.id   || '', 120, 685);
    draw(lab.patient.dob  || '', 120, 670);
    draw(lab.meta.collected || '', 420, 700);
    draw(lab.meta.finalized || '', 420, 685);

    let y = 630;
    for (const t of lab.tests.slice(0, 12)) {
      draw(t.name, 40, y);
      draw(String(t.value), 260, y);
      draw(t.units, 310, y);
      draw(t.reference, 360, y);
      draw(t.flag, 500, y);
      y -= 14;
    }
  }

  return Buffer.from(await pdfDoc.save());
}

module.exports = { buildPatientReport };