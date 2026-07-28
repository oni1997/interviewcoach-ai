package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/oni1997/interviewcoach-ai/backend/config"
	"github.com/resend/resend-go/v2"
)

func GenerateResetToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func SendResetEmail(toEmail, token string, cfg *config.Config) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY environment variable is missing")
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173" // fallback default
	}

	client := resend.NewClient(apiKey)

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

	htmlBody := fmt.Sprintf(`
		<h2>Password Reset Request</h2>
		<p>Click the link below to reset your password:</p>
		<a href="%s">Reset Password</a>
		<p>If you didn't request this, please ignore this email.</p>
	`, resetLink)

	params := &resend.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{toEmail},
		Subject: "Reset Your Password - InterviewCoach AI",
		Html:    htmlBody,
	}

	_, err := client.Emails.Send(params)
	return err
}