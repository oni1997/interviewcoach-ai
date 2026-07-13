package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/oni1997/interviewcoach-ai/backend/database"
	"github.com/oni1997/interviewcoach-ai/backend/models"
)

type ProfileHandler struct{}

func (h *ProfileHandler) Get(c *gin.Context) {
	userID := c.GetString("user_id")

	var profile models.Profile
	err := database.DB.QueryRow(
		`SELECT id, user_id, headline, bio, target_role, experience_level, skills, created_at, updated_at
		 FROM profiles WHERE user_id = $1`, userID,
	).Scan(&profile.ID, &profile.UserID, &profile.Headline, &profile.Bio,
		&profile.TargetRole, &profile.ExperienceLevel, &profile.Skills,
		&profile.CreatedAt, &profile.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) Update(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := database.DB.Exec(
		`UPDATE profiles SET
			headline = COALESCE($1, headline),
			bio = COALESCE($2, bio),
			target_role = COALESCE($3, target_role),
			experience_level = COALESCE($4, experience_level),
			skills = COALESCE($5, skills),
			updated_at = NOW()
		 WHERE user_id = $6`,
		req.Headline, req.Bio, req.TargetRole, req.ExperienceLevel, req.Skills, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	var profile models.Profile
	_ = database.DB.QueryRow(
		`SELECT id, user_id, headline, bio, target_role, experience_level, skills, created_at, updated_at
		 FROM profiles WHERE user_id = $1`, userID,
	).Scan(&profile.ID, &profile.UserID, &profile.Headline, &profile.Bio,
		&profile.TargetRole, &profile.ExperienceLevel, &profile.Skills,
		&profile.CreatedAt, &profile.UpdatedAt)

	c.JSON(http.StatusOK, profile)
}