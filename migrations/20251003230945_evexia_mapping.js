// migrations/20251003_evexia_mapping.js
/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // 1) evexia_patients
  const hasEvxPatients = await knex.schema.hasTable('evexia_patients');
  if (!hasEvxPatients) {
    await knex.schema.createTable('evexia_patients', (t) => {
      t.string('evexia_patient_id', 64).primary();     // from Evexia
      t.string('external_client_id', 64).notNullable(); // your Evexia externalClientID
      t.string('email', 255);                           // optional, helps lookups
      t.string('first_name', 100);
      t.string('last_name', 100);
      t.date('dob');
      t.string('phone', 50);
      t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.schema.alterTable('evexia_patients', (t) => {
      t.index(['email'], 'evx_patients_email_idx');
    });
  }

  // 2) app_user_evexia_patient (map your app user to Evexia patient)
  const hasUserMap = await knex.schema.hasTable('app_user_evexia_patient');
  if (!hasUserMap) {
    await knex.schema.createTable('app_user_evexia_patient', (t) => {
      t.string('app_user_id', 255).notNullable();
      t
        .string('evexia_patient_id', 64)
        .notNullable()
        .references('evexia_patient_id')
        .inTable('evexia_patients')
        .onUpdate('CASCADE')
        .onDelete('RESTRICT');
      t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      t.primary(['app_user_id', 'evexia_patient_id'], { constraintName: 'app_user_evx_patient_pk' });
    });

    await knex.schema.alterTable('app_user_evexia_patient', (t) => {
      t.index(['app_user_id'], 'app_user_evx_app_user_idx');
    });
  }

  // 3) stripe_evexia_link (connect Stripe sessions to Evexia patient + optional order)
  const hasLink = await knex.schema.hasTable('stripe_evexia_link');
  if (!hasLink) {
    await knex.schema.createTable('stripe_evexia_link', (t) => {
      t
        .string('stripe_session_id', 255)
        .primary()
        .references('stripe_session_id')
        .inTable('public.stripe_payments')
        .onUpdate('CASCADE')
        .onDelete('CASCADE');
      t
        .string('evexia_patient_id', 64)
        .notNullable()
        .references('evexia_patient_id')
        .inTable('evexia_patients')
        .onUpdate('CASCADE')
        .onDelete('RESTRICT');
      t.string('evexia_patient_order_id', 64);
      t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.schema.alterTable('stripe_evexia_link', (t) => {
      t.index(['evexia_patient_id'], 'stripe_evx_patient_idx');
    });
  }

  // 4) Optional: add columns right on stripe_payments for quick reads
  const hasEvxPidCol = await knex.schema.hasColumn('public.stripe_payments', 'evexia_patient_id');
  if (!hasEvxPidCol) {
    await knex.schema.alterTable('public.stripe_payments', (t) => {
      t.string('evexia_patient_id', 64).nullable();
      t.string('evexia_patient_order_id', 64).nullable();
    });

    await knex.schema.alterTable('public.stripe_payments', (t) => {
      t.index(['evexia_patient_id'], 'stripe_payments_evx_pid_idx');
      t.index(['evexia_patient_order_id'], 'stripe_payments_evx_poid_idx');
    });
  }

  // 5) Backfill links where possible
  // 5a) If you already map app_user_id -> evexia_patient_id, link from that
  await knex.raw(`
    INSERT INTO stripe_evexia_link (stripe_session_id, evexia_patient_id)
    SELECT sp.stripe_session_id, map.evexia_patient_id
    FROM public.stripe_payments sp
    JOIN app_user_evexia_patient map
      ON map.app_user_id = sp.user_id
    ON CONFLICT (stripe_session_id) DO NOTHING
  `);

  // 5b) If user_id in stripe_payments is an email and matches evexia_patients.email, link that
  await knex.raw(`
    INSERT INTO stripe_evexia_link (stripe_session_id, evexia_patient_id)
    SELECT sp.stripe_session_id, ep.evexia_patient_id
    FROM public.stripe_payments sp
    JOIN evexia_patients ep
      ON lower(ep.email) = lower(sp.user_id)
    LEFT JOIN stripe_evexia_link l
      ON l.stripe_session_id = sp.stripe_session_id
    WHERE l.stripe_session_id IS NULL
  `);

  // 5c) Copy links onto stripe_payments columns if they exist
  await knex.raw(`
    UPDATE public.stripe_payments sp
    SET evexia_patient_id = l.evexia_patient_id
    FROM stripe_evexia_link l
    WHERE l.stripe_session_id = sp.stripe_session_id
      AND sp.evexia_patient_id IS NULL
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  // Drop optional columns and indexes on stripe_payments
  const hasEvxPidCol = await knex.schema.hasColumn('public.stripe_payments', 'evexia_patient_id');
  if (hasEvxPidCol) {
    await knex.schema.alterTable('public.stripe_payments', (t) => {
      t.dropIndex([], 'stripe_payments_evx_pid_idx');
      t.dropIndex([], 'stripe_payments_evx_poid_idx');
    });
    await knex.schema.alterTable('public.stripe_payments', (t) => {
      t.dropColumn('evexia_patient_id');
      t.dropColumn('evexia_patient_order_id');
    });
  }

  // Drop link table
  const hasLink = await knex.schema.hasTable('stripe_evexia_link');
  if (hasLink) {
    await knex.schema.dropTable('stripe_evexia_link');
  }

  // Drop mapping table
  const hasUserMap = await knex.schema.hasTable('app_user_evexia_patient');
  if (hasUserMap) {
    await knex.schema.dropTable('app_user_evexia_patient');
  }

  // Drop patients table
  const hasEvxPatients = await knex.schema.hasTable('evexia_patients');
  if (hasEvxPatients) {
    await knex.schema.dropTable('evexia_patients');
  }
};