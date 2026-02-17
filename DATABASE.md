# Database Schema Documentation

This document describes the database schema for the Resilience Pro Admin application.

## Overview

The database uses PostgreSQL with Supabase and consists of the following main entities:
- **Users**: User profiles and authentication
- **Programs**: Training programs (4-week duration)
- **Workouts**: Individual workout sessions
- **Blocks**: Workout sections (Activación 1-2, Bloques 1-4)
- **Exercises**: Exercise library
- **Junction Tables**: Relationships between entities

## Entity Relationship Diagram

```
users (1) ──── (N) programs
                    │
                    └─── (N) program_workouts ──── (1) workouts
                                                        │
                                                        └─── (N) workout_blocks ──── (1) blocks
                                                                                         │
                                                                                         └─── (N) block_exercises ──── (1) exercises
```

---

## Tables

### `users`

User profiles and authentication data.

**Columns:**
- `id` (uuid, PK) - References `auth.users(id)`, CASCADE delete
- `username` (varchar(50), UNIQUE, NOT NULL)
- `first_name` (varchar(50))
- `last_name` (varchar(50))
- `email` (varchar)
- `role` (varchar(10), DEFAULT 'user') - CHECK: 'admin' or 'user'
- `is_active` (boolean, DEFAULT true)
- `is_premium` (boolean, DEFAULT false)
- `image_url` (text)
- `goals` (user_goal[], DEFAULT '{}') - Array of user goals
- `gender` (user_gender enum)
- `height` (numeric(5,2)) - In centimeters
- `weight` (numeric(5,2)) - In kilograms
- `weight_goal` (numeric(5,2)) - Target weight in kilograms
- `fitness_level` (user_fitness_level enum)
- `phone_country_code` (varchar(10)) - Country dial code (e.g., '+54' for Argentina)
- `phone_number` (varchar(20)) - Phone number (8-15 digits)
- `sport` (user_sport enum) - Primary sport
- `sport_other` (varchar(50)) - Custom sport name if `sport = 'other'`
- `sport_level` (user_sport_level enum) - Sport skill level (required for most sports)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

**Indexes:**
- `idx_users_username` (btree on username)
- `idx_users_is_premium` (btree on is_premium)
- `idx_users_fitness_level` (btree on fitness_level)
- `idx_users_gender` (btree on gender)

**Triggers:**
- `set_updated_at` - Updates `updated_at` on row update

**Foreign Keys:**
- `id` → `auth.users(id)` ON DELETE CASCADE

---

### `programs`

Training programs (typically 4 weeks).

**Columns:**
- `program_id` (serial, PK)
- `name` (varchar(100), NOT NULL)
- `description` (text)
- `duration_weeks` (integer, NOT NULL) - CHECK: > 0
- `difficulty_level` (program_difficulty enum)
- `program_type` (varchar(30)) - e.g., 'strength', 'power', 'speed', 'hybrid'
- `created_by` (uuid, NOT NULL) - References users
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

**Indexes:**
- `idx_programs_created_by` (btree on created_by)

**Triggers:**
- `trg_programs_updated_at` - Updates `updated_at` on row update

**Foreign Keys:**
- `created_by` → `users(id)` ON DELETE SET NULL

**Constraints:**
- `programs_duration_weeks_check`: duration_weeks > 0

---

### `workouts`

Individual workout sessions.

**Columns:**
- `workout_id` (serial, PK)
- `name` (varchar(100), NOT NULL)
- `description` (text)
- `estimated_duration_minutes` (integer) - CHECK: > 0 or NULL
- `difficulty_level` (program_difficulty enum)
- `workout_type` (varchar(30)) - e.g., 'strength', 'power', 'speed', 'hybrid'
- `created_by` (uuid, NOT NULL) - References users
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

**Indexes:**
- `idx_workouts_created_by` (btree on created_by)

**Triggers:**
- `trg_workouts_updated_at` - Updates `updated_at` on row update

**Foreign Keys:**
- `created_by` → `users(id)` ON DELETE SET NULL

**Constraints:**
- `workouts_duration_check`: estimated_duration_minutes IS NULL OR > 0

---

### `blocks`

Workout sections (e.g., Activación 1, Bloque 1, etc.).

**Columns:**
- `block_id` (serial, PK)
- `name` (varchar(100), NOT NULL)
- `block_type` (block_type enum, DEFAULT 'standard')
- `sets` (integer) - CHECK: > 0
- `rest_between_exercises` (integer, DEFAULT 60) - Seconds, CHECK: >= 0 or NULL
- `created_by` (uuid, NOT NULL) - References users
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

**Indexes:**
- `idx_blocks_created_by` (btree on created_by)

**Triggers:**
- `trg_blocks_updated_at` - Updates `updated_at` on row update

**Foreign Keys:**
- `created_by` → `users(id)` ON DELETE SET NULL

**Constraints:**
- `blocks_sets_check`: sets > 0
- `blocks_rest_check`: rest_between_exercises IS NULL OR >= 0

---

### `exercises`

Exercise library.

**Columns:**
- `exercise_id` (serial, PK)
- `name` (varchar(100), NOT NULL)
- `description` (text) - Execution steps
- `video_url` (varchar(255))
- `image_url` (varchar(255))
- `category` (exercise_category enum)
- `muscle_groups` (text[]) - Array of muscle groups
- `equipment_needed` (text[]) - Array of equipment
- `difficulty_level` (program_difficulty enum)
- `created_by` (uuid, NOT NULL) - References users
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

**Indexes:**
- `idx_exercises_created_by` (btree on created_by)
- `idx_exercises_category` (btree on category)
- `idx_exercises_muscle_groups` (GIN on muscle_groups)
- `idx_exercises_equipment_needed` (GIN on equipment_needed)

**Triggers:**
- `trg_exercises_updated_at` - Updates `updated_at` on row update

**Foreign Keys:**
- `created_by` → `users(id)` ON DELETE SET NULL

---

### `program_workouts` (Junction Table)

Links programs to workouts with scheduling information.

**Columns:**
- `program_id` (integer, PK, NOT NULL)
- `workout_id` (integer, PK, NOT NULL)
- `week_number` (integer) - CHECK: >= 1
- `day_of_week` (integer) - CHECK: 1-7 (1=Monday, 7=Sunday)
- `workout_order` (integer, DEFAULT 1, NOT NULL) - CHECK: >= 1

**Indexes:**
- `idx_program_workouts_program_id` (btree on program_id)
- `idx_program_workouts_workout_id` (btree on workout_id)
- `idx_program_workouts_schedule` (btree on program_id, week_number, day_of_week)

**Foreign Keys:**
- `program_id` → `programs(program_id)` ON DELETE CASCADE
- `workout_id` → `workouts(workout_id)` ON DELETE CASCADE

**Constraints:**
- `unique_workout_order_per_day`: UNIQUE (program_id, week_number, day_of_week, workout_order)
- `program_workouts_week_number_check`: week_number >= 1
- `program_workouts_day_of_week_check`: day_of_week BETWEEN 1 AND 7
- `program_workouts_workout_order_check`: workout_order >= 1

---

### `workout_blocks` (Junction Table)

Links workouts to blocks with ordering.

**Columns:**
- `workout_id` (integer, PK, NOT NULL)
- `block_id` (integer, PK, NOT NULL)
- `block_order` (integer, DEFAULT 1, NOT NULL) - CHECK: >= 1

**Indexes:**
- `idx_workout_blocks_workout_id` (btree on workout_id)
- `idx_workout_blocks_block_id` (btree on block_id)

**Foreign Keys:**
- `workout_id` → `workouts(workout_id)` ON DELETE CASCADE
- `block_id` → `blocks(block_id)` ON DELETE CASCADE

**Constraints:**
- `unique_block_order_per_workout`: UNIQUE (workout_id, block_order)
- `workout_blocks_block_order_check`: block_order >= 1

---

### `block_exercises` (Junction Table)

Links blocks to exercises with exercise-specific parameters.

**Columns:**
- `block_id` (integer, PK, NOT NULL)
- `exercise_id` (integer, PK, NOT NULL)
- `exercise_order` (integer, PK, DEFAULT 1, NOT NULL) - CHECK: >= 1
- `reps` (integer) - CHECK: > 0
- `weight_level` (weight_level enum)

**Indexes:**
- `idx_block_exercises_block_id` (btree on block_id)
- `idx_block_exercises_exercise_id` (btree on exercise_id)

**Foreign Keys:**
- `block_id` → `blocks(block_id)` ON DELETE CASCADE
- `exercise_id` → `exercises(exercise_id)` ON DELETE CASCADE

**Constraints:**
- `unique_exercise_order_per_block`: UNIQUE (block_id, exercise_order)
- `block_exercises_exercise_order_check`: exercise_order >= 1
- `block_exercises_reps_check`: reps > 0

---

## Enums

### `user_goal`
User fitness goals.
- `gain_muscle` - Hypertrophy
- `maintain` - Maintenance
- `improve_speed` - Speed/Power
- `improve_endurance` - Endurance
- `lose_weight` - Weight loss
- `increase_flexibility` - Flexibility

### `user_gender`
- `male`
- `female`
- `other`

### `user_fitness_level` / `program_difficulty`
- `beginner`
- `intermediate`
- `advanced`

### `exercise_category`
Exercise categories aligned with Resilience Pro methodology.
- `accessories` - Accessory work
- `accelerations` - Acceleration drills
- `agility` - Agility drills
- `ballistics and plyometrics` - Explosive movements
- `core` - Core exercises
- `olympic-derivatives` - Olympic lift variations
- `hip-dominant` - Hip hinge patterns (deadlifts, RDLs)
- `knee-dominant` - Knee dominant patterns (squats, lunges)
- `ankle-dominant` - Ankle dominant patterns (calf raises)
- `pushes` - Pushing movements (bench, overhead press)
- `isometrics` - Isometric holds
- `mobility and flexibility` - Mobility work
- `running technique` - Running drills
- `pulls` - Pulling movements (rows, pull-ups)

### `block_type`
Block categories within a workout.
- `warmup` - Warm-up blocks (Activación 1-2)
- `main` - Main work blocks (Bloques 1-4)
- `cooldown` - Cool-down
- `superset` - Superset format
- `circuit` - Circuit format
- `standard` - Standard format

### `weight_level`
Weight/load levels for exercises.
- `no_weight` - Bodyweight only
- `light` - Light load
- `medium` - Medium load
- `heavy` - Heavy load

### `user_sport`
User's primary sport.
- `futbol` - Fútbol/Soccer
- `hockey` - Hockey
- `rugby` - Rugby
- `none` - No specific sport
- `other` - Other sport (requires `sport_other` field)

### `user_sport_level`
Sport skill/competition level.
- `recreational` - Recreational/Amateur
- `competitive` - Competitive
- `professional` - Professional/Elite

**Note:** Required for sports except `none`. When `sport = 'other'`, `sport_other` must be provided.

---

## Triggers & Functions

### `set_updated_at()` / `handle_updated_at()`
Automatically updates the `updated_at` timestamp when a row is modified.

**Applied to:**
- `users`
- `programs`
- `workouts`
- `blocks`
- `exercises`

---

## Typical Program Structure

A typical 4-week Resilience Pro program follows this hierarchy:

```
Program (4 weeks)
├── Week 1
│   ├── Workout 1 (Día 1)
│   │   ├── Activación 1 (warmup) - mobility and flexibility
│   │   ├── Activación 2 (warmup) - core/isometrics
│   │   ├── Bloque 1 (main) - ballistics/plyometrics/agility
│   │   ├── Bloque 2 (main) - bilateral strength (hip/knee-dominant, pushes/pulls)
│   │   ├── Bloque 3 (main) - unilateral strength
│   │   └── Bloque 4 (main) - accessories/ankle-dominant
│   ├── Workout 2 (Día 2)
│   └── Workout 3 (Día 3)
├── Week 2 (Workouts 4-6)
├── Week 3 (Workouts 7-9)
└── Week 4 (Workouts 10-12)
```

Each workout contains exactly **6 blocks** following the Resilience Pro methodology.

---

---

## TypeScript Type Mappings

### Exercise Types
Located in `src/lib/types/exercise.ts`:

```typescript
interface Exercise {
  exercise_id: number
  name: string
  description: string | null
  video_url: string | null
  image_url: string | null
  category: string | null
  muscle_groups: string[] | null
  equipment_needed: string[] | null
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null
  created_by: string
  created_at: string
  updated_at: string
}
```

### Program Types
Located in `src/lib/types/program.ts`:

```typescript
interface LLMProgramResponse {
  program: {
    name: string
    description?: string
    duration_weeks: number
    difficulty_level?: string
    program_type?: string
  }
  workouts: Array<{
    name: string
    description?: string
    estimated_duration_minutes?: number
    difficulty_level?: string
    workout_type?: string
    week_number?: number
    day_of_week?: number
    workout_order: number
    blocks: Array<{
      name: string
      block_type?: string
      sets?: number
      rest_between_exercises?: number
      exercises: Array<{
        exercise_id: number
        reps: number
        weight_level?: string
        exercise_order: number
      }>
    }>
  }>
}
```

---

## Validation Schemas

### Exercise Creation Schema
Located in `src/lib/validation/schemas.ts`:

- `name`: Required, 1-100 characters
- `description`: Optional text
- `video_url`: Optional valid URL
- `image_url`: Optional valid URL
- `category`: Optional string (exercise_category enum)
- `muscle_groups`: Optional string array
- `equipment_needed`: Optional string array
- `difficulty_level`: Optional enum ('beginner', 'intermediate', 'advanced')

### Program Generation Schema

- `userData.fitness_level`: Required enum ('beginner', 'intermediate', 'advanced')
- `userData.goals`: Required array of strings (min 1)
- `userData.gender`: Optional string
- `userData.height`: Optional positive number
- `userData.weight`: Optional positive number
- `userData.weight_goal`: Optional positive number
- `userData.preferences.available_equipment`: Optional string array
- `userData.preferences.workout_days_per_week`: Optional integer (1-7)
- `userData.preferences.preferred_duration_minutes`: Optional integer (15-180)
- `programRequirements.duration_weeks`: Optional positive integer
- `programRequirements.focus`: Optional string

---

## Constants & Configuration

### Exercise Categories
Located in `src/lib/constants/exercise-categories.ts`:

- `accessories` → "Accesorios"
- `accelerations` → "Aceleraciones"
- `agility` → "Agilidad"
- `ballistics and plyometrics` → "Balísticos y Plyo"
- `core` → "Core"
- `olympic-derivatives` → "Derivados de Olímpicos"
- `hip-dominant` → "Dominante de Cadera"
- `knee-dominant` → "Dominante de Rodilla"
- `ankle-dominant` → "Dominante de Tobillo"
- `pushes` → "Empujes"
- `isometrics` → "Isos"
- `mobility and flexibility` → "Movilidad y Flexibilidad"
- `running technique` → "Técnicas de Carrera"
- `pulls` → "Tracciones"

### Difficulty Levels
- `beginner` → "Principiante"
- `intermediate` → "Intermedio"
- `advanced` → "Avanzado"

### Program Configuration
- `DURATION_WEEKS`: 4
- `WORKOUTS_PER_WEEK`: 3
- `TOTAL_WORKOUTS`: 12 (4 weeks × 3 workouts/week)

---

## Notes

- All timestamps use `timestamptz` (timestamp with time zone)
- Cascade deletes are used for junction tables to maintain referential integrity
- Array columns (`goals`, `muscle_groups`, `equipment_needed`) use PostgreSQL array types with GIN indexes for efficient searching
- The schema enforces data integrity through CHECK constraints and foreign keys
- User authentication is handled by Supabase Auth (`auth.users`)
- Phone numbers are stored separately as `phone_country_code` and `phone_number` for international support
- Sport information is optional but when provided, `sport_level` is required for most sports (except `none`)
- When `sport = 'other'`, the `sport_other` field must contain the custom sport name
