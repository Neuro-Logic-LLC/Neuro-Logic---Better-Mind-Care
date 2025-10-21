// controllers/intakeController.js
const initKnex = require('../db/initKnex');

const { generatePatientReport } = require('../utils/reportGenerator');

exports.submitIntake = async (req, res) => {
  const knex = await initKnex();
  const { user_id, form_data, gender } = req.body;

  if (!user_id || !form_data || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { report, labRecommendations } = generatePatientReport(form_data, gender);

    // 1) Get the user’s plain email (decrypt from users)
    const row = await knex('users')
      .select(knex.raw('pgp_sym_decrypt(email::bytea, ?) AS email', [process.env.PGPCRYPTO_KEY]))
      .where({ id: user_id, is_deleted: false })
      .first();

    if (!row?.email) return res.status(404).json({ error: 'User email not found' });
    const plainEmail = row.email;

    // 2) Encrypt email for storage in intake_reports (at rest stays encrypted)
    const encryptedEmail = knex.raw('pgp_sym_encrypt(?, ?)', [
      plainEmail,
      process.env.PGPCRYPTO_KEY
    ]);

    // 3) Insert the report (store encrypted email), but return plain email to the client
    const [inserted] = await knex('intake_reports')
      .insert({
        user_id,
        form_data, // jsonb is fine; Knex will serialize the object
        report_output: { report, labRecommendations }, // jsonb
        submitted_at: knex.fn.now(),
        user_email: encryptedEmail // ← encrypted at rest
      })
      .returning(['id', 'report_output', 'submitted_at']);

    const saved = {
      ...inserted,
      user_email: plainEmail // ← return plain for the UI (no \x…)
    };

    return res.json({ success: true, saved });
  } catch (err) {
    console.error('❌ Intake submission failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const knex = await initKnex();
    const KEY = process.env.PGPCRYPTO_KEY;
    const userId = req.user?.id;

    console.log('Current user ID:', userId);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rows = await knex('intake_reports as ir')
      .join('users as u', 'ir.user_id', 'u.id')
      .select(
        'ir.id',
        'ir.report_output',
        knex.raw('COALESCE(ir.submitted_at, NOW()) as submitted_at'),
        knex.raw('pgp_sym_decrypt(u.email::bytea, ?) as user_email', [KEY])
      )
      .where('ir.user_id', userId)
      .orderBy('submitted_at', 'desc');

    console.log('Fetched reports:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('getMyReports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};