exports.up = (pgm) => {
  pgm.addColumn("drivers", {
    decision_mode: {
      type: "text",
      notNull: true,
      default: "heuristic",
    },
  });
};
exports.down = (pgm) => {
  pgm.dropColumn("drivers", "decision_mode");
};
