package models

import "time"

type Profile struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	Headline        *string    `json:"headline"`
	Bio             *string    `json:"bio"`
	TargetRole      *string    `json:"target_role"`
	ExperienceLevel *string    `json:"experience_level"`
	Skills          *string    `json:"skills"`
	ResumeText      []byte     `json:"resume_text"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type UpdateProfileRequest struct {
	Headline        *string    `json:"headline"`
	Bio             *string    `json:"bio"`
	TargetRole      *string    `json:"target_role"`
	ExperienceLevel *string    `json:"experience_level"`
	Skills          *string    `json:"skills"`
	ResumeText      []byte     `json:"resume_text"`
}