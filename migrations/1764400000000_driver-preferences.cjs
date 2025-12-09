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
