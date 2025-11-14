# Create Program with AI - API Documentation

## Endpoint

**POST** `/api/create-program-ai`

Creates a personalized 2-week fitness program using AI based on user data and available exercises in the database.

---

## Authentication

All requests must include a Supabase JWT token in the Authorization header.

**Header:**
```
Authorization: Bearer <supabase_access_token>
```

The token is obtained from Supabase Auth after user signs in. The backend will:
- Verify the token is valid
- Extract the user ID from the token
- Verify the user exists and is active in the database
- Use the authenticated user's ID to create the program

---

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token: `Bearer <supabase_jwt_token>` |
| `Content-Type` | Yes | `application/json` |

### Request Body

```json
{
  "userData": {
    "fitness_level": "beginner" | "intermediate" | "advanced",
    "goals": ["lose_weight", "gain_muscle", "maintain", "improve_endurance", "increase_flexibility"],
    "gender": "male" | "female" | "other" | "prefer_not_to_say" | null,
    "height": number | null,
    "weight": number | null,
    "weight_goal": number | null,
    "preferences": {
      "available_equipment": ["dumbbells", "bench", "barbell", ...] | null,
      "workout_days_per_week": number | null,
      "preferred_duration_minutes": number | null
    }
  },
  "programRequirements": {
    "duration_weeks": number | null,
    "focus": "weight loss" | "muscle gain" | "endurance" | ... | null
  }
}
```

### Required Fields

- `userData.fitness_level` (required): One of: `"beginner"`, `"intermediate"`, `"advanced"`
- `userData.goals` (required): Array of goal strings from the enum values

### Optional Fields

All other fields are optional. If not provided, the AI will make reasonable assumptions.

### Field Descriptions

#### `userData`
- **fitness_level**: User's current fitness level
- **goals**: Array of fitness goals (can include multiple)
- **gender**: User's gender (optional)
- **height**: Height in centimeters (optional)
- **weight**: Current weight in kilograms (optional)
- **weight_goal**: Target weight in kilograms (optional)
- **preferences.available_equipment**: Array of equipment the user has access to (optional)
- **preferences.workout_days_per_week**: Preferred number of workout days per week (default: 3)
- **preferences.preferred_duration_minutes**: Preferred workout duration in minutes (default: 45)

#### `programRequirements`
- **duration_weeks**: Will be overridden to 2 weeks (always)
- **focus**: Specific focus area for the program (optional)

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "program_id": 123,
  "program": {
    "program_id": 123,
    "name": "Programa Personalizado de Fuerza",
    "description": "Programa diseñado para...",
    "duration_weeks": 2,
    "difficulty_level": "beginner",
    "program_type": "strength"
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Missing authorization header"
}
```
or
```json
{
  "error": "Invalid or expired token"
}
```

#### 400 Bad Request
```json
{
  "error": "Missing required fields: userData.fitness_level and userData.goals"
}
```
or
```json
{
  "error": "No exercises available in database"
}
```
or
```json
{
  "error": "Invalid program structure from LLM"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Program Structure

The created program will have:

- **Duration**: Always 2 weeks (14 days)
- **Workouts**: 2-3 workouts per week (4-6 total workouts)
- **Each Workout Contains**:
  - Warmup block (calentamiento)
  - Main blocks (entrenamiento principal)
  - Cooldown block (enfriamiento)
- **Workouts are distributed** strategically throughout the week with rest days

---

## Example Request (Swift/iOS)

```swift
import Foundation

struct CreateProgramRequest: Codable {
    struct UserData: Codable {
        let fitness_level: String
        let goals: [String]
        let gender: String?
        let height: Double?
        let weight: Double?
        let weight_goal: Double?
        let preferences: Preferences?
        
        struct Preferences: Codable {
            let available_equipment: [String]?
            let workout_days_per_week: Int?
            let preferred_duration_minutes: Int?
        }
    }
    
    struct ProgramRequirements: Codable {
        let duration_weeks: Int?
        let focus: String?
    }
    
    let userData: UserData
    let programRequirements: ProgramRequirements?
}

struct CreateProgramResponse: Codable {
    let success: Bool
    let program_id: Int
    let program: Program
    
    struct Program: Codable {
        let program_id: Int
        let name: String
        let description: String?
        let duration_weeks: Int
        let difficulty_level: String?
        let program_type: String?
    }
}

func createProgramWithAI(
    userData: CreateProgramRequest.UserData,
    programRequirements: CreateProgramRequest.ProgramRequirements? = nil,
    accessToken: String
) async throws -> CreateProgramResponse {
    let url = URL(string: "\(API_BASE_URL)/api/create-program-ai")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = CreateProgramRequest(
        userData: userData,
        programRequirements: programRequirements
    )
    
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw APIError.invalidResponse
    }
    
    if httpResponse.statusCode == 201 {
        return try JSONDecoder().decode(CreateProgramResponse.self, from: data)
    } else {
        let errorResponse = try? JSONDecoder().decode(["error": String].self, from: data)
        throw APIError.serverError(errorResponse?["error"] ?? "Unknown error")
    }
}

// Usage example:
let userData = CreateProgramRequest.UserData(
    fitness_level: "beginner",
    goals: ["lose_weight", "gain_muscle"],
    gender: "male",
    height: 175.0,
    weight: 80.0,
    weight_goal: 75.0,
    preferences: CreateProgramRequest.UserData.Preferences(
        available_equipment: ["dumbbells", "bench"],
        workout_days_per_week: 3,
        preferred_duration_minutes: 45
    )
)

let programRequirements = CreateProgramRequest.ProgramRequirements(
    duration_weeks: nil, // Will be set to 2 automatically
    focus: "weight loss"
)

do {
    let response = try await createProgramWithAI(
        userData: userData,
        programRequirements: programRequirements,
        accessToken: supabaseAuthToken
    )
    print("Program created: \(response.program.name)")
    print("Program ID: \(response.program_id)")
} catch {
    print("Error: \(error)")
}
```

---

## Example Request (cURL)

```bash
curl -X POST https://your-domain.com/api/create-program-ai \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userData": {
      "fitness_level": "beginner",
      "goals": ["lose_weight", "gain_muscle"],
      "gender": "male",
      "height": 175,
      "weight": 80,
      "weight_goal": 75,
      "preferences": {
        "available_equipment": ["dumbbells", "bench"],
        "workout_days_per_week": 3,
        "preferred_duration_minutes": 45
      }
    },
    "programRequirements": {
      "focus": "weight loss"
    }
  }'
```

---

## Notes

1. **Authentication**: The user ID is extracted from the JWT token, not from the request body. This prevents users from creating programs for other users.

2. **Program Duration**: All programs are created with a duration of exactly 2 weeks, regardless of what is specified in `programRequirements.duration_weeks`.

3. **Workout Distribution**: The AI will distribute workouts strategically (e.g., Monday/Wednesday/Friday or Tuesday/Thursday/Saturday) with rest days in between.

4. **Exercise Selection**: The AI only uses exercises that exist in the database. Exercise IDs are validated before program creation.

5. **Processing Time**: This endpoint may take 10-30 seconds to complete as it:
   - Fetches available exercises
   - Generates program with LLM
   - Validates the response
   - Creates all database records

6. **Error Handling**: If any step fails, the entire operation is rolled back and an error is returned.

---

## Status Codes

| Code | Description |
|------|-------------|
| 201 | Program created successfully |
| 400 | Bad request (missing fields, validation errors) |
| 401 | Unauthorized (invalid or missing token) |
| 500 | Internal server error |

