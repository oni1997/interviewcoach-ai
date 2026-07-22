package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/oni1997/interviewcoach-ai/backend/config"
	"github.com/oni1997/interviewcoach-ai/backend/handlers"
	"github.com/oni1997/interviewcoach-ai/backend/middleware"
)

func Setup(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	auth := &handlers.AuthHandler{Config: cfg}
	profile := &handlers.ProfileHandler{}
	interview := &handlers.InterviewHandler{}
	dashboard := &handlers.DashboardHandler{}

	api := r.Group("/api")

	api.POST("/auth/register", auth.Register)
	api.POST("/auth/login", auth.Login)
	api.GET("/auth/me", middleware.AuthRequired(cfg), auth.Me)

	api.GET("/profile", middleware.AuthRequired(cfg), profile.Get)
	api.PUT("/profile", middleware.AuthRequired(cfg), profile.Update)

	api.GET("/job-roles", interview.ListJobRoles)
	api.POST("/sessions", middleware.AuthRequired(cfg), interview.CreateSession)
	api.GET("/sessions/:id", middleware.AuthRequired(cfg), interview.GetSession)
	api.POST("/sessions/:id/questions", middleware.AuthRequired(cfg), interview.AddQuestions)
	api.POST("/sessions/:id/answers", middleware.AuthRequired(cfg), interview.SubmitAnswers)

	api.GET("/dashboard/stats", middleware.AuthRequired(cfg), dashboard.GetStats)
	api.GET("/dashboard/history", middleware.AuthRequired(cfg), dashboard.GetHistory)
	api.POST("/profile/resume", middleware.AuthRequired(cfg), profile.UploadResume)
	api.DELETE("/profile/resume", middleware.AuthRequired(cfg), profile.DeleteResume)

	return r
}