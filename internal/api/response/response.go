package response

// ApiResponse represents a standardized API response
type ApiResponse struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// Success creates a successful response
func Success(data any) ApiResponse {
	return ApiResponse{
		Success: true,
		Data:    data,
	}
}

// Error creates an error response
func Error(err string) ApiResponse {
	return ApiResponse{
		Success: false,
		Error:   err,
	}
}
