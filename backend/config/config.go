package config

import (
	"os"
	"fmt"
	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	ServerPort string
	AIKey      string
	GEMINI_API_KEY      string
}

func Load() *Config {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️  Error loading .env file:", err)
	} else {
		fmt.Println("✅ .env file loaded successfully")
	}
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "interviewcoach"),
		JWTSecret:  getEnv("JWT_SECRET", "change-me-in-production"),
		ServerPort: getEnv("SERVER_PORT", "8080"),
		AIKey:      getEnv("AI_API_KEY", ""),
		GEMINI_API_KEY: getEnv("GEMINI_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}