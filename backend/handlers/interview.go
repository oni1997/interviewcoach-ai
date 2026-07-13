package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/oni1997/interviewcoach-ai/backend/database"
	"github.com/oni1997/interviewcoach-ai/backend/models"
)

type InterviewHandler struct{}

func (h *InterviewHandler) ListJobRoles(c *gin.Context) {
	rows, err := database.DB.Query(`SELECT id, title, category, description FROM job_roles ORDER BY title`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var roles []models.JobRole
	for rows.Next() {
		var r models.JobRole
		if err := rows.Scan(&r.ID, &r.Title, &r.Category, &r.Description); err != nil {
			continue
		}
		roles = append(roles, r)
	}

	c.JSON(http.StatusOK, roles)
}

func (h *InterviewHandler) CreateSession(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.InterviewType != "technical" && req.InterviewType != "behavioral" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interview_type must be 'technical' or 'behavioral'"})
		return
	}

	var session models.InterviewSession
	err := database.DB.QueryRow(
		`INSERT INTO interview_sessions (user_id, job_role_id, custom_role, interview_type)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, job_role_id, custom_role, interview_type, status, started_at`,
		userID, req.JobRoleID, req.CustomRole, req.InterviewType,
	).Scan(&session.ID, &session.UserID, &session.JobRoleID, &session.CustomRole,
		&session.InterviewType, &session.Status, &session.StartedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

func (h *InterviewHandler) GetSession(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	var session models.InterviewSession
	err := database.DB.QueryRow(
		`SELECT s.id, s.user_id, s.job_role_id, s.custom_role, s.interview_type,
		        s.status, s.overall_score, s.started_at, s.completed_at,
		        COALESCE(j.title, s.custom_role) as role_title
		 FROM interview_sessions s
		 LEFT JOIN job_roles j ON s.job_role_id = j.id
		 WHERE s.id = $1 AND s.user_id = $2`,
		sessionID, userID,
	).Scan(&session.ID, &session.UserID, &session.JobRoleID, &session.CustomRole,
		&session.InterviewType, &session.Status, &session.OverallScore,
		&session.StartedAt, &session.CompletedAt, &session.RoleTitle)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	rows, err := database.DB.Query(
		`SELECT id, question_text, question_order FROM interview_questions
		 WHERE session_id = $1 ORDER BY question_order`, sessionID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var q models.Question
			_ = rows.Scan(&q.ID, &q.QuestionText, &q.QuestionOrder)
			session.Questions = append(session.Questions, q)
		}
	}

	c.JSON(http.StatusOK, session)
}

func (h *InterviewHandler) AddQuestions(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	var sessionStatus string
	err := database.DB.QueryRow(
		`SELECT status FROM interview_sessions WHERE id = $1 AND user_id = $2`,
		sessionID, userID,
	).Scan(&sessionStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}
	if sessionStatus != "in_progress" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session is not in progress"})
		return
	}

	var req struct {
		Questions []string `json:"questions" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i, q := range req.Questions {
		_, err := database.DB.Exec(
			`INSERT INTO interview_questions (session_id, question_text, question_order) VALUES ($1, $2, $3)`,
			sessionID, q, i+1,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add question"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Questions added", "count": len(req.Questions)})
}

func (h *InterviewHandler) SubmitAnswers(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	var sessionStatus string
	err := database.DB.QueryRow(
		`SELECT status FROM interview_sessions WHERE id = $1 AND user_id = $2`,
		sessionID, userID,
	).Scan(&sessionStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}
	if sessionStatus != "in_progress" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session is not in progress"})
		return
	}

	var req models.SubmitAnswersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, a := range req.Answers {
		var exists bool
		_ = database.DB.QueryRow(
			`SELECT EXISTS(SELECT 1 FROM interview_questions WHERE id = $1 AND session_id = $2)`,
			a.QuestionID, sessionID,
		).Scan(&exists)
		if !exists {
			continue
		}

		_, _ = database.DB.Exec(
			`INSERT INTO interview_answers (question_id, answer_text) VALUES ($1, $2)`,
			a.QuestionID, a.AnswerText,
		)
	}

	now := time.Now()
	_, err = database.DB.Exec(
		`UPDATE interview_sessions SET status = 'completed', completed_at = $1 WHERE id = $2`,
		now, sessionID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Answers submitted"})
}