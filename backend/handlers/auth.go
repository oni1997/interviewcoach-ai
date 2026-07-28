package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/oni1997/interviewcoach-ai/backend/config"
	"github.com/oni1997/interviewcoach-ai/backend/database"
	"github.com/oni1997/interviewcoach-ai/backend/models"
	"github.com/oni1997/interviewcoach-ai/backend/utils"
)

type AuthHandler struct {
	Config *config.Config
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	var user models.User
	err = database.DB.QueryRow(
		`INSERT INTO users (email, password, name) VALUES ($1, $2, $3)
		 RETURNING id, email, name, created_at, updated_at`,
		req.Email, string(hashed), req.Name,
	).Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	_, _ = database.DB.Exec(
		`INSERT INTO profiles (user_id) VALUES ($1)`, user.ID,
	)

	token, err := utils.GenerateToken(user.ID, user.Email, h.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	var hashedPassword string
	err := database.DB.QueryRow(
		`SELECT id, email, password, name, created_at, updated_at FROM users WHERE email = $1`,
		req.Email,
	).Scan(&user.ID, &user.Email, &hashedPassword, &user.Name, &user.CreatedAt, &user.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Email, h.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("user_id")

	var user models.User
	err := database.DB.QueryRow(
		`SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID string
	err := database.DB.QueryRow(`SELECT id FROM users WHERE email = $1`, req.Email).Scan(&userID)
	
	//return success even if email doesn't exist
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Password reset instructions sent to your email."})
		return
	}

	//generate token
	token, err := utils.GenerateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	//save token to database with an expiry
	_, err = database.DB.Exec(
		`INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
		userID, token,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	//send the email asynchronously and log any errors to terminal
	go func() {
		if err := utils.SendResetEmail(req.Email, token, h.Config); err != nil {
			log.Printf("ERROR SENDING EMAIL: %v", err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Password reset instructions sent to your email."})
}