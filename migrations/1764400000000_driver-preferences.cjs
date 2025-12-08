// migrations/1764400000000_driver-preferences.cjs

/**
 * Add per-driver preference fields:
 *  - preferred_zones: list of zone names or codes
 *  - preferred_time_buckets: list of time-of-day buckets (e.g. "morning", "evening")
 *
 * Both are TEXT[] with an empty-array default so the change is backwards compatible.
 */

/** @param {import("node-pg-migrate").MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns("drivers", {
    preferred_zones: {
      type: "text[]",
      notNull: true,
      default: "{}",
    },
    preferred_time_buckets: {
      type: "text[]",
      notNull: true,
      default: "{}",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("drivers", ["preferred_zones", "preferred_time_buckets"]);
};
