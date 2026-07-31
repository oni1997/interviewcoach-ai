package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	openai "github.com/sashabaranov/go-openai"

	"github.com/oni1997/interviewcoach-ai/backend/config"
	"github.com/oni1997/interviewcoach-ai/backend/database"
)

type AIHandler struct {
	Config *config.Config
}

type GenerateQuestionsRequest struct {
	JobRole        string `json:"job_role" binding:"required"`
	InterviewType  string `json:"interview_type" binding:"required,oneof=technical behavioral"`
	NumQuestions   int    `json:"num_questions"`
}

type ScoreAnswerRequest struct {
	Question       string `json:"question" binding:"required"`
	Answer         string `json:"answer" binding:"required"`
	JobRole        string `json:"job_role"`
	InterviewType  string `json:"interview_type"`
}

type ScoreAnswersRequest struct {
	JobRole       string             `json:"job_role"`
	InterviewType string             `json:"interview_type"`
	Items         []ScoreAnswerItem  `json:"items" binding:"required,min=1"`
}

type ScoreAnswerItem struct {
	QuestionID string `json:"question_id" binding:"required"`
	Question   string `json:"question" binding:"required"`
	Answer     string `json:"answer" binding:"required"`
}

type ScoredAnswer struct {
	QuestionID  string  `json:"question_id"`
	Score       float64 `json:"score"`
	Feedback    string  `json:"feedback"`
	Strengths   string  `json:"strengths"`
	Improvements string `json:"improvements"`
}

func (h *AIHandler) GenerateQuestions(c *gin.Context) {
	var req GenerateQuestionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.NumQuestions <= 0 || req.NumQuestions > 10 {
		req.NumQuestions = 5
	}

	if h.Config.AIKey == "" {
		questions := h.fallbackQuestions(req.JobRole, req.InterviewType, req.NumQuestions)
		c.JSON(http.StatusOK, gin.H{"questions": questions, "source": "fallback"})
		return
	}

	prompt := h.buildQuestionPrompt(req.JobRole, req.InterviewType, req.NumQuestions)

	client := openai.NewClient(h.Config.AIKey)
	resp, err := client.CreateChatCompletion(context.Background(), openai.ChatCompletionRequest{
		Model: openai.GPT4oMini,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: "You are an expert interview coach. Generate realistic interview questions. Return ONLY a JSON array of strings, no markdown, no explanation."},
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		Temperature: 0.7,
		MaxTokens:   1000,
	})
	if err != nil {
		questions := h.fallbackQuestions(req.JobRole, req.InterviewType, req.NumQuestions)
		c.JSON(http.StatusOK, gin.H{"questions": questions, "source": "fallback"})
		return
	}

	content := resp.Choices[0].Message.Content
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var questions []string
	if err := json.Unmarshal([]byte(content), &questions); err != nil {
		questions = h.fallbackQuestions(req.JobRole, req.InterviewType, req.NumQuestions)
		c.JSON(http.StatusOK, gin.H{"questions": questions, "source": "fallback"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"questions": questions, "source": "ai"})
}

func (h *AIHandler) ScoreAnswers(c *gin.Context) {
	sessionID := c.Param("id")

	var req ScoreAnswersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var overallScore float64
	var scoredAnswers []ScoredAnswer

	if h.Config.AIKey == "" {
		for _, item := range req.Items {
			score := h.fallbackScore(item.Answer)
			feedback := fmt.Sprintf("Good effort on this %s question. Consider providing more specific examples.", req.InterviewType)
			overallScore += score

			scoredAnswers = append(scoredAnswers, ScoredAnswer{
				QuestionID:  item.QuestionID,
				Score:       score,
				Feedback:    feedback,
				Strengths:   "Attempted an answer",
				Improvements: "Add more detail and specific examples",
			})

			database.DB.Exec(
				`INSERT INTO interview_feedback (answer_id, feedback_text, strengths, improvements)
				 SELECT id, $1, $2, $3 FROM interview_answers WHERE question_id = $4`,
				feedback, "Attempted an answer", "Add more detail and specific examples", item.QuestionID,
			)
		}
		if len(req.Items) > 0 {
			overallScore = overallScore / float64(len(req.Items))
		}

		database.DB.Exec(
			`UPDATE interview_sessions SET overall_score = $1 WHERE id = $2`,
			overallScore, sessionID,
		)

		c.JSON(http.StatusOK, gin.H{"scored_answers": scoredAnswers, "overall_score": overallScore, "source": "fallback"})
		return
	}

	prompt := h.buildScorePrompt(req.JobRole, req.InterviewType, req.Items)

	client := openai.NewClient(h.Config.AIKey)
	resp, err := client.CreateChatCompletion(context.Background(), openai.ChatCompletionRequest{
		Model: openai.GPT4oMini,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: "You are an expert interview evaluator. Score interview answers on a scale of 1-10. Return a JSON array with objects containing: question_id (string), score (number 1-10), feedback (string), strengths (string), improvements (string). Return ONLY the JSON array."},
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		Temperature: 0.3,
		MaxTokens:   2000,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI scoring failed"})
		return
	}

	content := resp.Choices[0].Message.Content
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	if err := json.Unmarshal([]byte(content), &scoredAnswers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse AI response"})
		return
	}

	for _, sa := range scoredAnswers {
		overallScore += sa.Score

		var answerID string
		err := database.DB.QueryRow(
			`SELECT id FROM interview_answers WHERE question_id = $1`, sa.QuestionID,
		).Scan(&answerID)
		if err != nil {
			continue
		}

		database.DB.Exec(
			`UPDATE interview_answers SET score = $1 WHERE id = $2`, sa.Score, answerID,
		)

		database.DB.Exec(
			`INSERT INTO interview_feedback (answer_id, feedback_text, strengths, improvements)
			 VALUES ($1, $2, $3, $4)`,
			answerID, sa.Feedback, sa.Strengths, sa.Improvements,
		)
	}

	if len(req.Items) > 0 {
		overallScore = overallScore / float64(len(req.Items))
	}

	database.DB.Exec(
		`UPDATE interview_sessions SET overall_score = $1 WHERE id = $2`,
		overallScore, sessionID,
	)

	c.JSON(http.StatusOK, gin.H{"scored_answers": scoredAnswers, "overall_score": overallScore, "source": "ai"})
}

func (h *AIHandler) GetFeedback(c *gin.Context) {
	sessionID := c.Param("id")

	rows, err := database.DB.Query(
		`SELECT f.id, f.answer_id, f.feedback_text, f.strengths, f.improvements,
		        iq.question_text, ia.answer_text, ia.score
		 FROM interview_feedback f
		 JOIN interview_answers ia ON f.answer_id = ia.id
		 JOIN interview_questions iq ON ia.question_id = iq.id
		 WHERE iq.session_id = $1
		 ORDER BY iq.question_order`, sessionID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	type FeedbackItem struct {
		Question    string  `json:"question"`
		Answer      string  `json:"answer"`
		Score       *float64 `json:"score"`
		Feedback    string  `json:"feedback"`
		Strengths   string  `json:"strengths"`
		Improvements string `json:"improvements"`
	}

	var items []FeedbackItem
	for rows.Next() {
		var fi FeedbackItem
		var id, answerID string
		_ = rows.Scan(&id, &answerID, &fi.Feedback, &fi.Strengths, &fi.Improvements,
			&fi.Question, &fi.Answer, &fi.Score)
		items = append(items, fi)
	}

	c.JSON(http.StatusOK, items)
}

func (h *AIHandler) buildQuestionPrompt(jobRole, interviewType string, num int) string {
	if interviewType == "technical" {
		return fmt.Sprintf("Generate %d realistic technical interview questions for a %s position. Include a mix of coding, system design, and domain knowledge questions. Return as a JSON array of strings.", num, jobRole)
	}
	return fmt.Sprintf("Generate %d realistic behavioral interview questions for a %s position. Use STAR method scenarios covering teamwork, leadership, conflict, and problem-solving. Return as a JSON array of strings.", num, jobRole)
}

func (h *AIHandler) buildScorePrompt(jobRole, interviewType string, items []ScoreAnswerItem) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Evaluate these %s interview answers for a %s position:\n\n", interviewType, jobRole))
	for i, item := range items {
		sb.WriteString(fmt.Sprintf("Question %d (ID: %s): %s\nAnswer: %s\n\n", i+1, item.QuestionID, item.Question, item.Answer))
	}
	sb.WriteString("Return a JSON array. Each object must have: question_id, score (1-10), feedback (detailed), strengths, improvements.")
	return sb.String()
}

func (h *AIHandler) fallbackQuestions(jobRole, interviewType string, num int) []string {
	technical := map[string][]string{
		"Software Engineer": {
			"Explain the difference between a stack and a queue. When would you use each?",
			"How would you design a URL shortening service like bit.ly?",
			"Describe a time you had to debug a critical production issue. What was your approach?",
			"What is your experience with system design and scalability?",
			"How do you ensure code quality in your team?",
			"Explain RESTful API design principles.",
			"What testing strategies do you use in your projects?",
			"How would you handle a situation where requirements keep changing mid-sprint?",
		},
		"Frontend Developer": {
			"Explain the virtual DOM and how React's reconciliation works.",
			"How do you optimize frontend performance for a large application?",
			"Describe your approach to responsive design across different devices.",
			"What is your experience with state management libraries?",
			"How do you handle accessibility (a11y) in your projects?",
			"Explain the difference between CSS Grid and Flexbox.",
			"How would you implement lazy loading for routes?",
			"What strategies do you use for handling errors in React?",
		},
		"Data Scientist": {
			"Explain the bias-variance tradeoff in machine learning.",
			"How would you handle missing data in a large dataset?",
			"Describe a project where you used NLP techniques.",
			"What metrics would you use to evaluate a classification model?",
			"How do you explain complex ML concepts to non-technical stakeholders?",
			"What is your experience with feature engineering?",
			"How would you detect and handle outliers in data?",
			"Explain the difference between supervised and unsupervised learning.",
		},
	}
	behavioral := []string{
		"Tell me about a time you had a disagreement with a coworker. How did you resolve it?",
		"Describe a situation where you had to learn a new skill quickly. How did you approach it?",
		"Tell me about a project you're most proud of and why.",
		"How do you handle tight deadlines and competing priorities?",
		"Describe a time you made a mistake at work. What did you learn from it?",
		"Tell me about a time you went above and beyond for a team member.",
		"How do you handle feedback that you disagree with?",
		"Describe a situation where you had to persuade others to adopt your idea.",
		"Tell me about a time you failed. What happened and what did you do?",
		"How do you stay organized when managing multiple projects?",
	}

	if interviewType == "behavioral" {
		if num > len(behavioral) {
			num = len(behavioral)
		}
		return behavioral[:num]
	}

	pool, ok := technical[jobRole]
	if !ok {
		pool = technical["Software Engineer"]
	}
	if num > len(pool) {
		num = len(pool)
	}
	return pool[:num]
}

func (h *AIHandler) fallbackScore(answer string) float64 {
	length := len(answer)
	switch {
	case length > 300:
		return 8.0
	case length > 200:
		return 7.0
	case length > 100:
		return 6.0
	case length > 50:
		return 5.0
	default:
		return 4.0
	}
}
