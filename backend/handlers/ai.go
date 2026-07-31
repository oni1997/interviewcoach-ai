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
	"github.com/oni1997/interviewcoach-ai/backend/services"
)

type AIHandler struct {
	Config *config.Config
}

type GenerateQuestionsRequest struct {
	JobRole       string   `json:"job_role"`
	Role          string   `json:"role"`
	Experience    string   `json:"experience"`
	Topics        []string `json:"topics"`
	Count         int      `json:"count"`
	NumQuestions  int      `json:"num_questions"`
	Difficulty    string   `json:"difficulty"`
	InterviewType string   `json:"interview_type" binding:"omitempty,oneof=technical behavioral"`
}

type EvaluateAnswerRequest struct {
	Question   string `json:"question" binding:"required"`
	UserAnswer string `json:"userAnswer"`
	Answer     string `json:"answer" binding:"required_without=UserAnswer"`
	JobRole    string `json:"job_role"`
	Role       string `json:"role"`
}

type ScoreAnswersRequest struct {
	JobRole       string                  `json:"job_role"`
	InterviewType string                  `json:"interview_type"`
	Items         []services.ScoreAnswerItem `json:"items" binding:"required,min=1"`
}

func (h *AIHandler) hasGemini() bool {
	return h.Config != nil && h.Config.GEMINI_API_KEY != ""
}

func (h *AIHandler) hasOpenAI() bool {
	return h.Config != nil && h.Config.AIKey != ""
}

func (h *AIHandler) GenerateQuestions(c *gin.Context) {
	var req GenerateQuestionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	role := req.Role
	if role == "" {
		role = req.JobRole
	}
	if role == "" {
		role = "Software Engineer"
	}

	count := req.Count
	if count == 0 {
		count = req.NumQuestions
	}
	if count <= 0 || count > 10 {
		count = 5
	}

	interviewType := req.InterviewType
	if interviewType == "" {
		interviewType = "technical"
	}

	// 1) Gemini primary
	if h.hasGemini() {
		greq := services.GenerateQuestionsRequest{
			Role:       role,
			Experience: req.Experience,
			Topics:     req.Topics,
			Count:      count,
			Difficulty: req.Difficulty,
		}
		if greq.Difficulty == "" {
			greq.Difficulty = "mixed"
		}
		if greq.Experience == "" {
			greq.Experience = "mid-level"
		}
		result, err := services.GenerateQuestionsWithGemini(h.Config.GEMINI_API_KEY, greq)
		if err == nil {
			result["source"] = "gemini"
			c.JSON(http.StatusOK, result)
			return
		}
		fmt.Printf("⚠️  Gemini question generation failed, falling back: %v\n", err)
	}

	// 2) OpenAI fallback
	if h.hasOpenAI() {
		questions, err := h.generateWithOpenAI(role, interviewType, count)
		if err == nil {
			c.JSON(http.StatusOK, gin.H{"questions": questions, "source": "openai"})
			return
		}
		fmt.Printf("⚠️  OpenAI question generation failed, falling back: %v\n", err)
	}

	// 3) Local fallback
	c.JSON(http.StatusOK, gin.H{"questions": h.fallbackQuestions(role, interviewType, count), "source": "fallback"})
}

func (h *AIHandler) EvaluateAnswer(c *gin.Context) {
	var req EvaluateAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	answer := req.UserAnswer
	if answer == "" {
		answer = req.Answer
	}
	role := req.Role
	if role == "" {
		role = req.JobRole
	}

	// 1) Gemini primary
	if h.hasGemini() {
		greq := services.EvaluateAnswerRequest{
			Question:   req.Question,
			UserAnswer: answer,
			Role:       role,
		}
		result, err := services.EvaluateAnswerWithGemini(h.Config.GEMINI_API_KEY, greq)
		if err == nil {
			result["source"] = "gemini"
			c.JSON(http.StatusOK, result)
			return
		}
		fmt.Printf("⚠️  Gemini evaluation failed, falling back: %v\n", err)
	}

	// 2) OpenAI fallback
	if h.hasOpenAI() {
		result, err := h.evaluateWithOpenAI(req.Question, answer, role)
		if err == nil {
			result["source"] = "openai"
			c.JSON(http.StatusOK, result)
			return
		}
		fmt.Printf("⚠️  OpenAI evaluation failed, falling back: %v\n", err)
	}

	// 3) Local heuristic fallback
	score := h.fallbackScore(answer)
	c.JSON(http.StatusOK, gin.H{
		"score":      score * 10,
		"feedback":   "This is a heuristic evaluation. Connect an AI provider to get detailed feedback.",
		"strengths":  []string{"Attempted an answer"},
		"weaknesses": []string{"Add more specific examples and structure"},
		"source":     "fallback",
	})
}

func (h *AIHandler) generateWithOpenAI(jobRole, interviewType string, num int) ([]string, error) {
	prompt := h.buildQuestionPrompt(jobRole, interviewType, num)
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
		return nil, err
	}

	content := cleanAIJSON(resp.Choices[0].Message.Content)
	var questions []string
	if err := json.Unmarshal([]byte(content), &questions); err != nil {
		return nil, err
	}
	return questions, nil
}

func (h *AIHandler) evaluateWithOpenAI(question, answer, role string) (map[string]interface{}, error) {
	client := openai.NewClient(h.Config.AIKey)
	resp, err := client.CreateChatCompletion(context.Background(), openai.ChatCompletionRequest{
		Model: openai.GPT4oMini,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: "You are a senior technical interviewer. Evaluate the candidate's answer for the given question. Return ONLY a JSON object with keys: score (0-100), feedback, strengths (array of strings), weaknesses (array of strings)."},
			{Role: openai.ChatMessageRoleUser, Content: fmt.Sprintf("Role: %s\nQuestion: %s\nAnswer: %s", role, question, answer)},
		},
		Temperature: 0.3,
		MaxTokens:   1000,
	})
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(cleanAIJSON(resp.Choices[0].Message.Content)), &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (h *AIHandler) ScoreAnswers(c *gin.Context) {
	sessionID := c.Param("id")

	var req ScoreAnswersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var overallScore float64
	var scoredAnswers []services.ScoredAnswer

	if req.InterviewType == "" {
		req.InterviewType = "technical"
	}
	if req.JobRole == "" {
		req.JobRole = "Software Engineer"
	}

	// 1) Gemini primary
	if h.hasGemini() {
		scored, err := services.ScoreAnswersWithGemini(h.Config.GEMINI_API_KEY, req.JobRole, req.InterviewType, req.Items)
		if err == nil {
			scoredAnswers = scored
			source := "gemini"
			h.persistScoredAnswers(scoredAnswers, sessionID, &overallScore)
			c.JSON(http.StatusOK, gin.H{"scored_answers": scoredAnswers, "overall_score": overallScore, "source": source})
			return
		}
		fmt.Printf("⚠️  Gemini scoring failed, falling back: %v\n", err)
	}

	// 2) OpenAI fallback
	if h.hasOpenAI() {
		scored, err := h.scoreWithOpenAI(req)
		if err == nil {
			scoredAnswers = scored
			h.persistScoredAnswers(scoredAnswers, sessionID, &overallScore)
			c.JSON(http.StatusOK, gin.H{"scored_answers": scoredAnswers, "overall_score": overallScore, "source": "openai"})
			return
		}
		fmt.Printf("⚠️  OpenAI scoring failed, falling back: %v\n", err)
	}

	// 3) Local heuristic fallback
	for _, item := range req.Items {
		score := h.fallbackScore(item.Answer)
		feedback := fmt.Sprintf("Good effort on this %s question. Consider providing more specific examples.", req.InterviewType)
		scoredAnswers = append(scoredAnswers, services.ScoredAnswer{
			QuestionID:   item.QuestionID,
			Score:        score,
			Feedback:     feedback,
			Strengths:    "Attempted an answer",
			Improvements: "Add more detail and specific examples",
		})
	}
	h.persistScoredAnswers(scoredAnswers, sessionID, &overallScore)
	c.JSON(http.StatusOK, gin.H{"scored_answers": scoredAnswers, "overall_score": overallScore, "source": "fallback"})
}

func (h *AIHandler) scoreWithOpenAI(req ScoreAnswersRequest) ([]services.ScoredAnswer, error) {
	client := openai.NewClient(h.Config.AIKey)
	prompt := h.buildScorePrompt(req.JobRole, req.InterviewType, req.Items)
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
		return nil, err
	}

	var scored []services.ScoredAnswer
	if err := json.Unmarshal([]byte(cleanAIJSON(resp.Choices[0].Message.Content)), &scored); err != nil {
		return nil, err
	}
	return scored, nil
}

func (h *AIHandler) persistScoredAnswers(scored []services.ScoredAnswer, sessionID string, overall *float64) {
	if len(scored) == 0 {
		return
	}
	var total float64
	for _, sa := range scored {
		total += sa.Score
		var answerID string
		err := database.DB.QueryRow(
			`SELECT id FROM interview_answers WHERE question_id = $1`, sa.QuestionID,
		).Scan(&answerID)
		if err != nil {
			continue
		}
		_, _ = database.DB.Exec(
			`UPDATE interview_answers SET score = $1 WHERE id = $2`, sa.Score, answerID,
		)
		_, _ = database.DB.Exec(
			`INSERT INTO interview_feedback (answer_id, feedback_text, strengths, improvements)
			 VALUES ($1, $2, $3, $4)`,
			answerID, sa.Feedback, sa.Strengths, sa.Improvements,
		)
	}
	*overall = total / float64(len(scored))
	_, _ = database.DB.Exec(
		`UPDATE interview_sessions SET overall_score = $1 WHERE id = $2`,
		*overall, sessionID,
	)
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
		Question    string   `json:"question"`
		Answer      string   `json:"answer"`
		Score       *float64 `json:"score"`
		Feedback    string   `json:"feedback"`
		Strengths   string   `json:"strengths"`
		Improvements string  `json:"improvements"`
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

func (h *AIHandler) buildScorePrompt(jobRole, interviewType string, items []services.ScoreAnswerItem) string {
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

func cleanAIJSON(content string) string {
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	return strings.TrimSpace(content)
}
