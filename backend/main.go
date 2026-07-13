package main

import (
	"log"

	"github.com/oni1997/interviewcoach-ai/backend/config"
	"github.com/oni1997/interviewcoach-ai/backend/database"
	"github.com/oni1997/interviewcoach-ai/backend/routes"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg)
	defer database.Close()

	r := routes.Setup(cfg)

	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
