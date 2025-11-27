/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable("drivers", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    name: { type: "text", notNull: true },
    target_rate_per_hour: { type: "numeric(10,2)", notNull: true },
    vehicle_type: { type: "text", notNull: true },
    fuel_cost_per_unit: { type: "numeric(10,3)" },
    maintenance_per_mile: { type: "numeric(10,3)" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") }
  });

  pgm.createTable("orders", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    driver_id: { type: "uuid", references: "drivers" },
    platform: { type: "text", notNull: true, default: "doordash" },
    payout: { type: "numeric(10,2)", notNull: true },
    miles: { type: "numeric(10,2)" },
    estimated_minutes: { type: "integer" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") }
  });

  pgm.createTable("decisions", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    order_id: { type: "uuid", references: "orders", notNull: true },
    driver_id: { type: "uuid", references: "drivers" },
    accept: { type: "boolean", notNull: true },
    net_payout: { type: "numeric(10,2)", notNull: true },
    required_dollars: { type: "numeric(10,2)", notNull: true },
    projected_gross_per_hour: { type: "numeric(10,2)", notNull: true },
    projected_net_per_hour: { type: "numeric(10,2)", notNull: true },
    finish_iso: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") }
  });

  pgm.createTable("decision_events", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    decision_id: { type: "uuid", references: "decisions", notNull: true },
    event_type: { type: "text", notNull: true },
    payload: { type: "jsonb" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") }
  });
};

exports.down = (pgm) => {
  pgm.dropTable("decision_events");
  pgm.dropTable("decisions");
  pgm.dropTable("orders");
  pgm.dropTable("drivers");
};
