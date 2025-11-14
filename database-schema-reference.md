# ResiliencePro Database Schema Reference

This document serves as a reference for the database structure and will be used to create models and services.

---

## Enums

### block_type
- `warmup`
- `main`
- `cooldown`
- `superset`
- `circuit`
- `standard`

### exercise_category
- `strength`
- `cardio`
- `flexibility`
- `plyometrics`
- `balance`
- `power`
- `endurance`
- `mobility`

### program_difficulty
- `beginner`
- `intermediate`
- `advanced`

### user_fitness_level
- `beginner`
- `intermediate`
- `advanced`

### user_gender
- `male`
- `female`
- `other`
- `prefer_not_to_say`

### user_goal
- `lose_weight`
- `gain_muscle`
- `maintain`
- `improve_endurance`
- `increase_flexibility`

### weight_level
- `no_weight`
- `light`
- `medium`
- `heavy`

---

## Tables

### users
**Primary Key:** `id`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `uuid` | NOT NULL, PRIMARY KEY | - | Foreign key to `auth.users(id)` |
| `email` | `varchar` | NOT NULL, UNIQUE | - | |
| `username` | `varchar` | NOT NULL, UNIQUE | - | |
| `first_name` | `varchar` | - | - | |
| `last_name` | `varchar` | - | - | |
| `role` | `varchar` | NOT NULL, CHECK (IN 'admin', 'user') | `'user'` | |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `is_premium` | `boolean` | NOT NULL | `false` | |
| `image_url` | `text` | - | - | |
| `goals` | `user_goal[]` | ARRAY | `'{}'` | Array of user goals |
| `gender` | `user_gender` | - | - | Enum |
| `height` | `numeric` | - | - | |
| `weight` | `numeric` | - | - | |
| `weight_goal` | `numeric` | - | - | |
| `fitness_level` | `user_fitness_level` | - | - | Enum |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | |

**Foreign Keys:**
- `id` → `auth.users(id)`

---

### exercises
**Primary Key:** `exercise_id`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `exercise_id` | `integer` | NOT NULL, PRIMARY KEY | `nextval('exercises_exercise_id_seq')` | Auto-incrementing |
| `name` | `varchar` | NOT NULL | - | |
| `description` | `text` | - | - | |
| `video_url` | `varchar` | - | - | |
| `image_url` | `varchar` | - | - | |
| `category` | `exercise_category` | - | - | Enum |
| `muscle_groups` | `text[]` | ARRAY | - | Array of muscle groups |
| `equipment_needed` | `text[]` | ARRAY | - | Array of equipment |
| `difficulty_level` | `program_difficulty` | - | - | Enum |
| `created_by` | `uuid` | NOT NULL | - | |
| `created_at` | `timestamp with time zone` | - | `now()` | |
| `updated_at` | `timestamp with time zone` | - | `now()` | |

**Foreign Keys:**
- `created_by` → `users(id)`

---

### blocks
**Primary Key:** `block_id`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `block_id` | `integer` | NOT NULL, PRIMARY KEY | `nextval('blocks_block_id_seq')` | Auto-incrementing |
| `name` | `varchar` | NOT NULL | - | |
| `block_type` | `block_type` | - | `'standard'` | Enum |
| `rest_between_exercises` | `integer` | CHECK (NULL OR >= 0) | `60` | In seconds |
| `created_by` | `uuid` | NOT NULL | - | |
| `created_at` | `timestamp with time zone` | - | `now()` | |
| `updated_at` | `timestamp with time zone` | - | `now()` | |
| `sets` | `integer` | CHECK (> 0) | - | |

**Foreign Keys:**
- `created_by` → `users(id)`

---

### block_exercises
**Primary Key:** `(block_id, exercise_id, exercise_order)`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `block_id` | `integer` | NOT NULL, PRIMARY KEY | - | |
| `exercise_id` | `integer` | NOT NULL, PRIMARY KEY | - | |
| `reps` | `integer` | CHECK (> 0) | - | |
| `weight_level` | `weight_level` | - | - | Enum |
| `exercise_order` | `integer` | NOT NULL, PRIMARY KEY, CHECK (>= 1) | `1` | Order within block |

**Foreign Keys:**
- `block_id` → `blocks(block_id)`
- `exercise_id` → `exercises(exercise_id)`

**Notes:**
- Junction table between blocks and exercises
- Supports ordering of exercises within a block
- Can have multiple instances of the same exercise in a block (different orders)

---

### workouts
**Primary Key:** `workout_id`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `workout_id` | `integer` | NOT NULL, PRIMARY KEY | `nextval('workouts_workout_id_seq')` | Auto-incrementing |
| `name` | `varchar` | NOT NULL | - | |
| `description` | `text` | - | - | |
| `estimated_duration_minutes` | `integer` | CHECK (NULL OR > 0) | - | |
| `difficulty_level` | `program_difficulty` | - | - | Enum |
| `workout_type` | `varchar` | - | - | |
| `created_by` | `uuid` | NOT NULL | - | |
| `created_at` | `timestamp with time zone` | - | `now()` | |
| `updated_at` | `timestamp with time zone` | - | `now()` | |

**Foreign Keys:**
- `created_by` → `users(id)`

---

### workout_blocks
**Primary Key:** `(workout_id, block_id)`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `workout_id` | `integer` | NOT NULL, PRIMARY KEY | - | |
| `block_id` | `integer` | NOT NULL, PRIMARY KEY | - | |
| `block_order` | `integer` | NOT NULL, CHECK (>= 1) | `1` | Order within workout |

**Foreign Keys:**
- `workout_id` → `workouts(workout_id)`
- `block_id` → `blocks(block_id)`

**Notes:**
- Junction table between workouts and blocks
- Supports ordering of blocks within a workout

---

### programs
**Primary Key:** `program_id`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `program_id` | `integer` | NOT NULL, PRIMARY KEY | `nextval('programs_program_id_seq')` | Auto-incrementing |
| `name` | `varchar` | NOT NULL | - | |
| `description` | `text` | - | - | |
| `duration_weeks` | `integer` | NOT NULL, CHECK (> 0) | - | |
| `difficulty_level` | `program_difficulty` | - | - | Enum |
| `program_type` | `varchar` | - | - | |
| `created_by` | `uuid` | NOT NULL | - | |
| `created_at` | `timestamp with time zone` | - | `now()` | |
| `updated_at` | `timestamp with time zone` | - | `now()` | |

**Foreign Keys:**
- `created_by` → `users(id)`

---

### program_workouts
**Primary Key:** `(program_id, workout_id)`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `program_id` | `integer` | NOT NULL, PRIMARY KEY | - | |
| `workout_id` | `integer` | NOT NULL, PRIMARY KEY | - | |
| `week_number` | `integer` | CHECK (>= 1) | - | |
| `day_of_week` | `integer` | CHECK (>= 1 AND <= 7) | - | 1=Monday, 7=Sunday |
| `workout_order` | `integer` | NOT NULL, CHECK (>= 1) | `1` | Order within program |

**Foreign Keys:**
- `program_id` → `programs(program_id)`
- `workout_id` → `workouts(workout_id)`

**Notes:**
- Junction table between programs and workouts
- Supports scheduling workouts by week and day
- Supports ordering of workouts within a program

---

## Entity Relationships

### Hierarchy
```
Programs
  └── Workouts (via program_workouts)
        └── Blocks (via workout_blocks)
              └── Exercises (via block_exercises)
```

### Key Relationships
- **Users** create Programs, Workouts, Blocks, and Exercises
- **Programs** contain multiple Workouts scheduled across weeks/days
- **Workouts** contain multiple Blocks in a specific order
- **Blocks** contain multiple Exercises with reps, weight level, and order
- All junction tables support ordering for proper sequencing

---

## Notes

### Array Fields
- `users.goals`: Array of user goals (e.g., lose weight, gain muscle)
- `exercises.muscle_groups`: Array of targeted muscle groups
- `exercises.equipment_needed`: Array of required equipment

### Timestamps
All main entity tables include:
- `created_at`: Timestamp when record was created
- `updated_at`: Timestamp when record was last modified

### User Roles
- `admin`: Full access to system
- `user`: Standard user access

### Default Values
- Most foreign key relationships use cascading constraints (not shown in schema)
- Timestamps default to current time
- Order fields default to 1
- Rest periods default to 60 seconds

