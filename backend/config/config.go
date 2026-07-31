package config

import (
	"os"
	"fmt"
	"github.com/joho/godotenv"
)

type Config struct {
<<<<<<< HEAD
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	ServerPort string
	AIKey      string
	GEMINI_API_KEY      string
=======
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	JWTSecret      string
	ServerPort     string
	AIKey          string
	GEMINI_API_KEY string
	NVIDIA_API_KEY string
	NVIDIA_MODEL   string
>>>>>>> 7d7c34f000c23813729e54fda65e92601914768c
}

func Load() *Config {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️  Error loading .env file:", err)
	} else {
		fmt.Println("✅ .env file loaded successfully")
	}
	return &Config{
<<<<<<< HEAD
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "interviewcoach"),
		JWTSecret:  getEnv("JWT_SECRET", "change-me-in-production"),
		ServerPort: getEnv("SERVER_PORT", "8080"),
		AIKey:      getEnv("AI_API_KEY", ""),
		GEMINI_API_KEY: getEnv("GEMINI_API_KEY", ""),
=======
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "postgres"),
		DBPassword:     getEnv("DB_PASSWORD", ""),
		DBName:         getEnv("DB_NAME", "interviewcoach"),
		JWTSecret:      getEnv("JWT_SECRET", "change-me-in-production"),
		ServerPort:     getEnv("SERVER_PORT", "8080"),
		AIKey:          getEnv("AI_API_KEY", ""),
		GEMINI_API_KEY: getEnv("GEMINI_API_KEY", ""),
		NVIDIA_API_KEY: getEnv("NVIDIA_API_KEY", ""),
		NVIDIA_MODEL:   getEnv("NVIDIA_MODEL", "google/diffusiongemma-26b-a4b-it"),
>>>>>>> 7d7c34f000c23813729e54fda65e92601914768c
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}