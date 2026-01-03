import 'dotenv/config';
import pool from '../lib/db';

const migrations = [
  // Subjects (top-level categories)
  `CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Topics (sub-categories of subjects)
  `CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Tasks
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(50) NOT NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    deadline DATE,
    status VARCHAR(20) DEFAULT 'pending',
    importance INTEGER DEFAULT 3,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Revision Sessions
  `CREATE TABLE IF NOT EXISTS revision_sessions (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL,
    actual_duration_seconds INTEGER,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Revision Materials
  `CREATE TABLE IF NOT EXISTS revision_materials (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_data BYTEA,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Exams
  `CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    revision_material_id INTEGER NOT NULL REFERENCES revision_materials(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL,
    total_questions INTEGER NOT NULL,
    estimated_duration INTEGER,
    difficulty VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(revision_material_id, version_number)
  );`,

  // Exam Attempts
  `CREATE TABLE IF NOT EXISTS exam_attempts (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    exam_type VARCHAR(20) NOT NULL DEFAULT 'exam',
    answers JSONB,
    score INTEGER,
    total_correct INTEGER,
    total_questions INTEGER,
    confidence_level INTEGER,
    completed_at TIMESTAMP,
    time_taken INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

  // Confidence Tracking
  `CREATE TABLE IF NOT EXISTS confidence_tracking (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL,
    exam_attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE SET NULL,
    confidence_level INTEGER NOT NULL,
    previous_confidence_level INTEGER,
    notes TEXT,
    tracked_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
  );`,

  // Performance Scores
  `CREATE TABLE IF NOT EXISTS performance_scores (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL,
    exam_attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE SET NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    performance_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

  // Rewards
  `CREATE TABLE IF NOT EXISTS rewards (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    reward_type VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

  // User Rewards
  `CREATE TABLE IF NOT EXISTS user_rewards (
    id SERIAL PRIMARY KEY,
    reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
  );`,

  // Study Streaks
  `CREATE TABLE IF NOT EXISTS study_streaks (
    id SERIAL PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    total_study_days INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Parent Nominations
  `CREATE TABLE IF NOT EXISTS parent_nominations (
    id SERIAL PRIMARY KEY,
    student_user_id INTEGER NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    nominated_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Parent Users
  `CREATE TABLE IF NOT EXISTS parent_users (
    id SERIAL PRIMARY KEY,
    nomination_id INTEGER NOT NULL REFERENCES parent_nominations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Parent Messages
  `CREATE TABLE IF NOT EXISTS parent_messages (
    id SERIAL PRIMARY KEY,
    parent_user_id INTEGER NOT NULL REFERENCES parent_users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'message',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

  // Study Boundaries
  `CREATE TABLE IF NOT EXISTS study_boundaries (
    id SERIAL PRIMARY KEY,
    student_agreed BOOLEAN DEFAULT FALSE,
    parent_agreed BOOLEAN DEFAULT FALSE,
    max_session_duration_minutes INTEGER NOT NULL,
    cooldown_duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    student_agreed_at TIMESTAMP,
    parent_agreed_at TIMESTAMP,
    activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (student_agreed = TRUE AND parent_agreed = TRUE AND is_active = TRUE OR is_active = FALSE)
  );`,

  // Boundary Sessions
  `CREATE TABLE IF NOT EXISTS boundary_sessions (
    id SERIAL PRIMARY KEY,
    boundary_id INTEGER NOT NULL REFERENCES study_boundaries(id) ON DELETE CASCADE,
    revision_session_id INTEGER REFERENCES revision_sessions(id) ON DELETE SET NULL,
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP,
    cooldown_start TIMESTAMP,
    cooldown_end TIMESTAMP,
    is_locked BOOLEAN DEFAULT FALSE,
    parent_override_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const migration of migrations) {
      await client.query(migration);
      console.log('✓ Migration executed successfully');
    }
    
    await client.query('COMMIT');
    console.log('\n✅ All migrations completed successfully!');
    console.log('Tables created: subjects, topics, tasks, revision_sessions, revision_materials, exams, exam_attempts, confidence_tracking, performance_scores, rewards, user_rewards, study_streaks, parent_nominations, parent_users, parent_messages, study_boundaries, boundary_sessions');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
