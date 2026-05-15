const bcrypt = require("bcrypt");
const { Client } = require("pg");
const { randomUUID } = require("crypto");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const studentEmail = "student@example.com";
    const studentPasswordHash = await bcrypt.hash("password123", 10);
    const userRes = await client.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id;`,
      [randomUUID(), studentEmail, studentPasswordHash, "student"]
    );
    const studentId = userRes.rows[0].id;

    const teacherEmail = "teacher@example.com";
    const teacherPasswordHash = await bcrypt.hash("password123", 10);
    const tRes = await client.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id;`,
      [randomUUID(), teacherEmail, teacherPasswordHash, "teacher"]
    );
    const teacherId = tRes.rows[0].id;

    const contentRes = await client.query(
      `INSERT INTO content (id, owner_user_id, title, type, storage_ref)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id;`,
      [randomUUID(), studentId, "Biology 101 - Cell Structure", "pdf", "s3://dev/biology-101.pdf"]
    );
    const contentId = contentRes.rows[0]?.id;

    const assessRes = await client.query(
      `INSERT INTO assessments (id, owner_user_id, title, description, config_json, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING id;`,
      [
        randomUUID(),
        teacherId,
        "Biology Quiz A",
        "Intro quiz",
        JSON.stringify({
          questionCount: 10,
          difficulty: "mixed",
          formats: ["mcq"],
          timeLimitSec: 900,
          allowedAttempts: 3,
          resultVisibility: "immediate_full",
          requireLogin: true,
          randomized: false,
          sameQuestions: true,
        }),
        "published",
      ]
    );
    const assessmentId = assessRes.rows[0]?.id;

    if (assessmentId) {
      const token = randomUUID().replace(/-/g, "");
      await client.query(
        `INSERT INTO assessment_links (id, assessment_id, token, active, require_login)
         VALUES ($1, $2, $3, true, true)
         ON CONFLICT DO NOTHING;`,
        [randomUUID(), assessmentId, token]
      );
    }

    if (contentId && assessmentId) {
      const qRes = await client.query(
        `INSERT INTO questions (id, source_content_id, body, answers_json, correct_answer_key, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id;`,
        [
          randomUUID(),
          contentId,
          "What is the powerhouse of the cell?",
          JSON.stringify([
            { key: "A", text: "Nucleus" },
            { key: "B", text: "Mitochondria" },
            { key: "C", text: "Ribosome" },
            { key: "D", text: "Golgi apparatus" },
          ]),
          "B",
          "easy",
        ]
      );
      const questionId = qRes.rows[0].id;
      await client.query(
        `INSERT INTO assessment_questions (assessment_id, question_id, position)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING;`,
        [assessmentId, questionId, 1]
      );
    }

    console.log("Seed complete");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
