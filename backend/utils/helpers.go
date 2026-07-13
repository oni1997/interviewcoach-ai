package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/oni1997/interviewcoach-ai/backend/config"
)

func GenerateToken(userID, email string, cfg *config.Config) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}