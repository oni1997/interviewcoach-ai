package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/oni1997/interviewcoach-ai/backend/config"
	"github.com/oni1997/interviewcoach-ai/backend/services"
)

type AIHandler struct {
	Config *config.Config
}

func (h *AIHandler) GenerateQuestions(c *gin.Context) {
	var req services.GenerateQuestionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Count == 0 {
		req.Count = 5
	}
	if req.Difficulty == "" {
		req.Difficulty = "mixed"
	}

	questions, err := services.GenerateQuestionsWithGemini(h.Config.GEMINI_API_KEY, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate questions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, questions)
}

func (h *AIHandler) EvaluateAnswer(c *gin.Context) {
	var req services.EvaluateAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	evaluation, err := services.EvaluateAnswerWithGemini(h.Config.GEMINI_API_KEY, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to evaluate answer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, evaluation)
}