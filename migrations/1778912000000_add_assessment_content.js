exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("assessment_content", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    assessment_id: { type: "uuid", notNull: true, references: "assessments", onDelete: "cascade" },
    content_id: { type: "uuid", notNull: true, references: "content", onDelete: "cascade" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("assessment_content", ["assessment_id"]);
  pgm.createIndex("assessment_content", ["content_id"]);
  pgm.createIndex("assessment_content", ["assessment_id", "content_id"], { unique: true });
};

exports.down = (pgm) => {
  pgm.dropTable("assessment_content", { cascade: true });
};
