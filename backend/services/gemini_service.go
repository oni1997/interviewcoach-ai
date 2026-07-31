package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const geminiAPIURL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"

var modelsToTry = []string{
	"gemini-2.5-flash",
	"gemini-2.5-flash-lite",
	"gemini-3.5-flash",
}

type GenerateQuestionsRequest struct {
	Role       string   `json:"role" binding:"required"`
	Experience string   `json:"experience" binding:"required"`
	Topics     []string `json:"topics" binding:"required"`
	Count      int      `json:"count"`
	Difficulty string   `json:"difficulty"`
}

type EvaluateAnswerRequest struct {
	Question   string `json:"question" binding:"required"`
	UserAnswer string `json:"userAnswer" binding:"required"`
	Role       string `json:"role"`
}

<<<<<<< HEAD
=======
type ScoreAnswerItem struct {
	QuestionID string `json:"question_id"`
	Question   string `json:"question"`
	Answer     string `json:"answer"`
}

type ScoredAnswer struct {
	QuestionID   string  `json:"question_id"`
	Score        float64 `json:"score"`
	Feedback     string  `json:"feedback"`
	Strengths    string  `json:"strengths"`
	Improvements string  `json:"improvements"`
}

>>>>>>> 7d7c34f000c23813729e54fda65e92601914768c
type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

type Content struct {
	Parts []Part `json:"parts"`
}

type Part struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func callGemini(apiKey, modelName, prompt string) (string, error) {
	url := fmt.Sprintf(geminiAPIURL+"?key=%s", modelName, apiKey)

	reqBody := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{{Text: prompt}},
			},
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini API error %d: %s", resp.StatusCode, string(body))
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from Gemini")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}

func tryGeminiModels(apiKey, prompt string) (string, error) {
	var lastErr error

	for _, model := range modelsToTry {
		fmt.Printf("🔄 Trying model: %s\n", model)
		text, err := callGemini(apiKey, model, prompt)
		if err != nil {
			fmt.Printf("❌ FAILED %s: %v\n", model, err)
			lastErr = err
			if strings.Contains(err.Error(), "404") || strings.Contains(err.Error(), "503") {
				continue
			}
			return "", err
		}
		fmt.Printf("✅ SUCCESS with %s!\n", model)
		return text, nil
	}

	return "", fmt.Errorf("all Gemini models failed: %v", lastErr)
}

func cleanJSONResponse(text string) string {
	text = strings.ReplaceAll(text, "```json", "")
	text = strings.ReplaceAll(text, "```", "")
	text = strings.TrimSpace(text)

	firstBrace := strings.Index(text, "{")
	lastBrace := strings.LastIndex(text, "}")

	if firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace {
		text = text[firstBrace : lastBrace+1]
	}

	return text
}

func GenerateQuestionsWithGemini(apiKey string, req GenerateQuestionsRequest) (map[string]interface{}, error) {
	prompt := fmt.Sprintf(`You are an expert technical interviewer. Generate %d interview questions for:
- Role: %s
- Experience Level: %s
- Topics: %s
- Difficulty: %s

Return ONLY valid JSON in this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "string",
      "type": "technical|behavioral|system_design|coding",
      "difficulty": "easy|medium|hard",
      "topics": ["string"],
      "suggestedAnswer": "string",
      "followUpQuestions": ["string"]
    }
  ]
}`, req.Count, req.Role, req.Experience, strings.Join(req.Topics, ", "), req.Difficulty)

	text, err := tryGeminiModels(apiKey, prompt)
	if err != nil {
		return nil, err
	}

	cleaned := cleanJSONResponse(text)

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %v\nRaw text: %s", err, text)
	}

	return result, nil
}

func ScoreAnswersWithGemini(apiKey string, jobRole, interviewType string, items []ScoreAnswerItem) ([]ScoredAnswer, error) {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("You are an expert interview evaluator. Score these %s interview answers for a %s position on a scale of 1-10.\n\n", interviewType, jobRole))
	for i, item := range items {
		sb.WriteString(fmt.Sprintf("Question %d (ID: %s): %s\nAnswer: %s\n\n", i+1, item.QuestionID, item.Question, item.Answer))
	}
	sb.WriteString(`Return ONLY valid JSON, a JSON array. Each object must have:
{
  "question_id": "string",
  "score": number (1-10),
  "feedback": "string (detailed)",
  "strengths": "string",
  "improvements": "string"
}`)

	text, err := tryGeminiModels(apiKey, sb.String())
	if err != nil {
		return nil, err
	}

	cleaned := cleanJSONResponse(text)
	if !strings.HasPrefix(strings.TrimSpace(cleaned), "[") {
		if i := strings.Index(cleaned, "["); i != -1 {
			if j := strings.LastIndex(cleaned, "]"); j != -1 && j > i {
				cleaned = cleaned[i : j+1]
			}
		}
	}

	var scored []ScoredAnswer
	if err := json.Unmarshal([]byte(cleaned), &scored); err != nil {
		return nil, fmt.Errorf("failed to parse scored answers: %v\nRaw text: %s", err, text)
	}

	return scored, nil
}

func EvaluateAnswerWithGemini(apiKey string, req EvaluateAnswerRequest) (map[string]interface{}, error) {
	prompt := fmt.Sprintf(`You are a senior technical interviewer evaluating a candidate's answer.

Question: %s
Role: %s
Candidate's Answer: %s

Evaluate and return ONLY valid JSON:
{
  "score": number (0-100),
  "feedback": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingPoints": ["string"],
  "improvedAnswer": "string"
}`, req.Question, req.Role, req.UserAnswer)

	text, err := tryGeminiModels(apiKey, prompt)
	if err != nil {
		return nil, err
	}

	cleaned := cleanJSONResponse(text)

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %v\nRaw text: %s", err, text)
	}

	return result, nil
}
