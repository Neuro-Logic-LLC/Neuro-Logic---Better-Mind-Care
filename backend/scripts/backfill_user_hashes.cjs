// src/backend/scripts/backfill_user_hashes.cjs
const crypto = require("node:crypto");
const knexFactory = require("knex");
const knexConfig = require("../../../knexfile.js"); // <-- path from scripts/ to project root
const ENV = process.env.NODE_ENV || "development";
const knex = knexFactory(knexConfig[ENV]);

(async () => {
  try {
    const PGP = process.env.PGPCRYPTO_KEY;
    const PEPPER = process.env.EMAIL_HASH_PEPPER;
    if (!PGP || !PEPPER) {
      console.error("Missing PGPCRYPTO_KEY or EMAIL_HASH_PEPPER in env");
      process.exit(1);
    }

    const canon = (s) => String(s || "").trim().toLowerCase();
    const hmac = (v) =>
      crypto.createHmac("sha256", PEPPER).update(canon(v)).digest("hex");

    const BATCH = 500;

    for (;;) {
      const rows = await knex("users")
        .select(
          "id",
          knex.raw("pgp_sym_decrypt(email::bytea, ?) as email_plain", [PGP]),
          knex.raw("pgp_sym_decrypt(username::bytea, ?) as username_plain", [PGP])
        )
        .where(function () {
          this.whereNull("email_hash").orWhereNull("username_hash");
        })
        .limit(BATCH);

      if (!rows.length) break;

      for (const r of rows) {
        await knex("users")
          .where({ id: r.id })
          .update({
            email_hash: r.email_plain ? hmac(r.email_plain) : null,
            username_hash: r.username_plain ? hmac(r.username_plain) : null,
          });
      }
      console.log(`Updated ${rows.length} rows...`);
    }

    console.log("✅ Backfill complete");
  } catch (e) {
    console.error("Backfill error:", e);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();   