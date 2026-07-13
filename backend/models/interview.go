package models

import "time"

type JobRole struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

type InterviewSession struct {
	ID             string         `json:"id"`
	UserID         string         `json:"user_id"`
	JobRoleID      *int           `json:"job_role_id"`
	CustomRole     string         `json:"custom_role"`
	InterviewType  string         `json:"interview_type"`
	Status         string         `json:"status"`
	OverallScore   *float64       `json:"overall_score"`
	StartedAt      time.Time      `json:"started_at"`
	CompletedAt    *time.Time     `json:"completed_at"`
	RoleTitle      string         `json:"role_title,omitempty"`
	Questions      []Question     `json:"questions,omitempty"`
}

type InterviewQuestion struct {
	ID            string    `json:"id"`
	SessionID     string    `json:"session_id"`
	QuestionText  string    `json:"question_text"`
	QuestionOrder int       `json:"question_order"`
	CreatedAt     time.Time `json:"created_at"`
}

type InterviewAnswer struct {
	ID           string    `json:"id"`
	QuestionID   string    `json:"question_id"`
	AnswerText   string    `json:"answer_text"`
	Score        *float64  `json:"score"`
	SubmittedAt  time.Time `json:"submitted_at"`
}

type InterviewFeedback struct {
	ID            string    `json:"id"`
	AnswerID      string    `json:"answer_id"`
	FeedbackText  string    `json:"feedback_text"`
	Strengths     string    `json:"strengths"`
	Improvements  string    `json:"improvements"`
	CreatedAt     time.Time `json:"created_at"`
}

type Question = InterviewQuestion
type Answer = InterviewAnswer
type Feedback = InterviewFeedback

type CreateSessionRequest struct {
	JobRoleID     *int   `json:"job_role_id"`
	CustomRole    string `json:"custom_role"`
	InterviewType string `json:"interview_type" binding:"required,oneof=technical behavioral"`
}

type SubmitAnswerRequest struct {
	QuestionID string `json:"question_id" binding:"required"`
	AnswerText string `json:"answer_text" binding:"required"`
}

type SubmitAnswersRequest struct {
	Answers []SubmitAnswerRequest `json:"answers" binding:"required,min=1"`
}