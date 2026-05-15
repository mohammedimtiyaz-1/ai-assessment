exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    email: { type: "varchar(255)", notNull: true, unique: true },
    password_hash: { type: "varchar(255)", notNull: true },
    name: { type: "varchar(255)" },
    role: { type: "varchar(50)", notNull: true, default: "student" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("content", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    owner_user_id: { type: "uuid", notNull: true, references: "users", onDelete: "cascade" },
    title: { type: "varchar(500)", notNull: true },
    type: { type: "varchar(50)", notNull: true },
    storage_ref: { type: "text" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("assessments", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    owner_user_id: { type: "uuid", notNull: true, references: "users", onDelete: "cascade" },
    title: { type: "varchar(500)", notNull: true },
    description: { type: "text" },
    config_json: { type: "jsonb", notNull: true, default: "{}" },
    status: { type: "varchar(50)", notNull: true, default: "draft" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("assessment_links", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    assessment_id: { type: "uuid", notNull: true, references: "assessments", onDelete: "cascade" },
    token: { type: "varchar(255)", notNull: true, unique: true },
    access_code_hash: { type: "varchar(255)" },
    expiry_at: { type: "timestamp" },
    active: { type: "boolean", notNull: true, default: true },
    require_login: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("questions", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    source_content_id: { type: "uuid", references: "content", onDelete: "set null" },
    body: { type: "text", notNull: true },
    answers_json: { type: "jsonb", notNull: true, default: "[]" },
    correct_answer_key: { type: "varchar(50)", notNull: true },
    difficulty: { type: "varchar(50)" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("assessment_questions", {
    assessment_id: { type: "uuid", notNull: true, references: "assessments", onDelete: "cascade" },
    question_id: { type: "uuid", notNull: true, references: "questions", onDelete: "cascade" },
    position: { type: "integer", notNull: true, default: 0 },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("assessment_questions", ["assessment_id", "question_id"], { unique: true });

  pgm.createTable("quiz_sessions", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "uuid", references: "users", onDelete: "set null" },
    guest_name: { type: "varchar(255)" },
    assessment_id: { type: "uuid", notNull: true, references: "assessments", onDelete: "cascade" },
    constraints_json: { type: "jsonb", notNull: true, default: "{}" },
    question_ids: { type: "uuid[]", notNull: true },
    started_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    finished_at: { type: "timestamp" },
    score: { type: "integer" },
    status: { type: "varchar(50)", notNull: true, default: "active" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("quiz_answers", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    session_id: { type: "uuid", notNull: true, references: "quiz_sessions", onDelete: "cascade" },
    question_id: { type: "uuid", notNull: true, references: "questions", onDelete: "cascade" },
    answer_key: { type: "varchar(50)" },
    is_correct: { type: "boolean" },
    answered_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("quiz_answers", ["session_id", "question_id"], { unique: true });
};

exports.down = (pgm) => {
  pgm.dropTable("quiz_answers", { cascade: true });
  pgm.dropTable("quiz_sessions", { cascade: true });
  pgm.dropTable("assessment_questions", { cascade: true });
  pgm.dropTable("questions", { cascade: true });
  pgm.dropTable("assessment_links", { cascade: true });
  pgm.dropTable("assessments", { cascade: true });
  pgm.dropTable("content", { cascade: true });
  pgm.dropTable("users", { cascade: true });
};
