# OpenAI API URL Commands

## Chat Completions (for Daily Greetings and Exam Generation)

### Basic Chat Completion
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "You are a supportive assistant for a 15-year-old student."
      },
      {
        "role": "user",
        "content": "Provide a helpful revision tip (2-3 sentences max)."
      }
    ],
    "max_tokens": 150,
    "temperature": 0.8
  }'
```

### Using PowerShell (Windows)
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_API_KEY"
}

$body = @{
    model = "gpt-4o-mini"
    messages = @(
        @{
            role = "system"
            content = "You are a supportive assistant for a 15-year-old student."
        },
        @{
            role = "user"
            content = "Provide a helpful revision tip (2-3 sentences max)."
        }
    )
    max_tokens = 150
    temperature = 0.8
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Method Post -Headers $headers -Body $body
```

## API Endpoints

### Chat Completions
**URL:** `https://api.openai.com/v1/chat/completions`
**Method:** POST

### Models List
**URL:** `https://api.openai.com/v1/models`
**Method:** GET

### Example: List Available Models
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Using Your API Key from .env

If you want to use the API key from your .env file in PowerShell:

```powershell
# Read API key from .env
$envContent = Get-Content .env | Where-Object { $_ -match "OPENAI_API_KEY=" }
$apiKey = ($envContent -split "=")[1]

# Use in curl/API call
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $apiKey"
}
```

## Quick Test Command

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello!"}],
    "max_tokens": 50
  }'
```



