package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/oni1997/interviewcoach-ai/backend/database"
)

type DashboardHandler struct{}

func (h *DashboardHandler) GetStats(c *gin.Context) {
	userID := c.GetString("user_id")

	var totalSessions, completedSessions int
	var avgScore *float64

	_ = database.DB.QueryRow(
		`SELECT COUNT(*) FROM interview_sessions WHERE user_id = $1`, userID,
	).Scan(&totalSessions)

	_ = database.DB.QueryRow(
		`SELECT COUNT(*) FROM interview_sessions WHERE user_id = $1 AND status = 'completed'`, userID,
	).Scan(&completedSessions)

	_ = database.DB.QueryRow(
		`SELECT AVG(overall_score) FROM interview_sessions WHERE user_id = $1 AND overall_score IS NOT NULL`,
		userID,
	).Scan(&avgScore)

	c.JSON(http.StatusOK, gin.H{
		"total_sessions":    totalSessions,
		"completed_sessions": completedSessions,
		"average_score":     avgScore,
	})
}

func (h *DashboardHandler) GetHistory(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := database.DB.Query(
		`SELECT s.id, s.interview_type, s.status, s.overall_score, s.started_at, s.completed_at,
		        COALESCE(j.title, s.custom_role) as role_title
		 FROM interview_sessions s
		 LEFT JOIN job_roles j ON s.job_role_id = j.id
		 WHERE s.user_id = $1
		 ORDER BY s.started_at DESC`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	type SessionSummary struct {
		ID            string  `json:"id"`
		InterviewType string  `json:"interview_type"`
		Status        string  `json:"status"`
		OverallScore  *float64 `json:"overall_score"`
		StartedAt     string  `json:"started_at"`
		CompletedAt   *string `json:"completed_at"`
		RoleTitle     string  `json:"role_title"`
	}

	var sessions []SessionSummary
	for rows.Next() {
		var s SessionSummary
		_ = rows.Scan(&s.ID, &s.InterviewType, &s.Status, &s.OverallScore,
			&s.StartedAt, &s.CompletedAt, &s.RoleTitle)
		sessions = append(sessions, s)
	}

	c.JSON(http.StatusOK, sessions)
}