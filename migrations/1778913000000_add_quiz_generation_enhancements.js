exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add question_type column to questions table using raw SQL
  pgm.sql(`
    ALTER TABLE questions 
    ADD COLUMN IF NOT EXISTS question_type varchar(50) NOT NULL DEFAULT 'mcq'
  `);

  // Add check constraint for question_type
  pgm.sql(`
    ALTER TABLE questions 
    ADD CONSTRAINT questions_question_type_check 
    CHECK (question_type IN ('mcq', 'essay', 'fill-blanks', 'match-following', 'riddle'))
  `);

  // Create quiz_configurations table using raw SQL
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS quiz_configurations (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      content_id uuid NOT NULL REFERENCES content ON DELETE cascade,
      difficulty varchar(50) NOT NULL DEFAULT 'medium',
      question_type varchar(50) NOT NULL DEFAULT 'mcq',
      question_count integer NOT NULL,
      question_ids uuid[] NOT NULL,
      generated_at timestamp NOT NULL DEFAULT now(),
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  // Add indexes for quiz_configurations
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS quiz_configurations_content_id_idx ON quiz_configurations(content_id)
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS quiz_configurations_generated_at_idx ON quiz_configurations(generated_at)
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS quiz_configurations_content_id_generated_at_idx ON quiz_configurations(content_id, generated_at)
  `);
};

exports.down = (pgm) => {
  // Drop indexes
  pgm.sql(`DROP INDEX IF EXISTS quiz_configurations_content_id_generated_at_idx`);
  pgm.sql(`DROP INDEX IF EXISTS quiz_configurations_generated_at_idx`);
  pgm.sql(`DROP INDEX IF EXISTS quiz_configurations_content_id_idx`);

  // Drop quiz_configurations table
  pgm.sql(`DROP TABLE IF EXISTS quiz_configurations CASCADE`);

  // Drop check constraint
  pgm.sql(`ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check`);

  // Remove question_type column from questions table
  pgm.sql(`ALTER TABLE questions DROP COLUMN IF EXISTS question_type`);
};
