package handlers

import (
	"database/sql"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/oni1997/interviewcoach-ai/backend/database"
	"github.com/oni1997/interviewcoach-ai/backend/models"
)

type ProfileHandler struct {
	DB *sql.DB
}


func (h *ProfileHandler) Get(c *gin.Context) {
	userID := c.GetString("user_id")

	var profile models.Profile
	err := database.DB.QueryRow(
		`SELECT id, user_id, headline, bio, target_role, experience_level, skills, resume_text, created_at, updated_at
		 FROM profiles WHERE user_id = $1`, userID,
	).Scan(&profile.ID, &profile.UserID, &profile.Headline, &profile.Bio,
		&profile.TargetRole, &profile.ExperienceLevel, &profile.Skills, &profile.ResumeText,
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
		`SELECT id, user_id, headline, bio, target_role, experience_level, skills, resume_text, created_at, updated_at
		 FROM profiles WHERE user_id = $1`, userID,
	).Scan(&profile.ID, &profile.UserID, &profile.Headline, &profile.Bio,
		&profile.TargetRole, &profile.ExperienceLevel, &profile.Skills, &profile.ResumeText,
		&profile.CreatedAt, &profile.UpdatedAt)

	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) UploadResume(c *gin.Context) {
	userID := c.GetString("user_id")

	fileHeader, err := c.FormFile("resume")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No resume file uploaded"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer file.Close()

	bytesData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file contents"})
		return
	}

	//pass raw binary bytesData
	_, err = database.DB.Exec(
		`UPDATE profiles SET resume_text = $1, updated_at = NOW() WHERE user_id = $2`,
		bytesData, userID,
	)
	if err != nil {
		log.Printf("DATABASE ERROR (UPDATE profiles resume_text): %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save resume to database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Resume uploaded successfully",
		"filename": fileHeader.Filename,
	})
}

func (h *ProfileHandler) DeleteResume(c *gin.Context) {
	userID := c.GetString("user_id")

	_, err := database.DB.Exec(
		`UPDATE profiles SET resume_text = NULL, updated_at = NOW() WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		log.Printf("DATABASE ERROR (DELETE resume_text): %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete resume"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resume deleted successfully"})
}