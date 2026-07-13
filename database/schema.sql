CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- PROFILES
CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    headline        VARCHAR(255),
    bio             TEXT,
    target_role     VARCHAR(255),
    experience_level VARCHAR(50),
    skills          TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- JOB ROLES (reference table for selectable roles)
CREATE TABLE job_roles (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) UNIQUE NOT NULL,
    category    VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO job_roles (title, category, description) VALUES
('Software Engineer', 'Engineering', 'General software development role'),
('Frontend Developer', 'Engineering', 'Specializes in user interfaces'),
('Backend Developer', 'Engineering', 'Specializes in server-side logic'),
('Data Scientist', 'Data', 'Analyzes and interprets complex data'),
('Product Manager', 'Product', 'Manages product development lifecycle'),
('UX Designer', 'Design', 'Designs user experiences and interfaces'),
('DevOps Engineer', 'Engineering', 'Manages infrastructure and CI/CD'),
('Data Analyst', 'Data', 'Interprets business data and metrics'),
('Mobile Developer', 'Engineering', 'Builds mobile applications'),
('QA Engineer', 'Engineering', 'Tests software quality');

-- INTERVIEW SESSIONS
CREATE TABLE interview_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_role_id     INT REFERENCES job_roles(id),
    custom_role     VARCHAR(255),
    interview_type  VARCHAR(50) NOT NULL CHECK (interview_type IN ('technical', 'behavioral')),
    status          VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    overall_score   DECIMAL(5,2),
    started_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP
);

-- INTERVIEW QUESTIONS
CREATE TABLE interview_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    question_order  INT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- INTERVIEW ANSWERS
CREATE TABLE interview_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id     UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
    answer_text     TEXT NOT NULL,
    score           DECIMAL(5,2),
    submitted_at    TIMESTAMP DEFAULT NOW()
);

-- INTERVIEW FEEDBACK
CREATE TABLE interview_feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id       UUID NOT NULL REFERENCES interview_answers(id) ON DELETE CASCADE,
    feedback_text   TEXT NOT NULL,
    strengths       TEXT,
    improvements    TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_sessions_role ON interview_sessions(job_role_id);
CREATE INDEX idx_questions_session ON interview_questions(session_id);
CREATE INDEX idx_answers_question ON interview_answers(question_id);
CREATE INDEX idx_feedback_answer ON interview_feedback(answer_id);