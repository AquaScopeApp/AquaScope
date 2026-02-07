# ReefLab API Documentation

Complete REST API documentation for ReefLab backend.

Base URL: `http://localhost:8000/api/v1`

## Authentication

ReefLab uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Register

**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Login

**POST** `/auth/login`

Authenticate and receive access token.

**Request Body (form-data):**
```
username: user@example.com
password: securepassword123
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

---

## Tanks

### List Tanks

**GET** `/tanks`

Get all tanks for the authenticated user.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Main Reef",
    "display_volume_liters": 200,
    "sump_volume_liters": 50,
    "total_volume_liters": 250,
    "description": "Mixed reef with SPS and LPS corals",
    "image_url": "https://example.com/tank.jpg",
    "setup_date": "2023-01-01",
    "events": [
      {
        "id": "uuid",
        "title": "Tank Cycled",
        "description": "Completed nitrogen cycle",
        "event_date": "2023-02-01"
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### Create Tank

**POST** `/tanks`

Create a new tank.

**Request Body:**
```json
{
  "name": "Main Reef",
  "display_volume_liters": 200,
  "sump_volume_liters": 50,
  "description": "Mixed reef tank",
  "image_url": "https://example.com/tank.jpg",
  "setup_date": "2023-01-01"
}
```

**Response:** `201 Created`

### Update Tank

**PUT** `/tanks/{tank_id}`

Update tank information.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`

### Delete Tank

**DELETE** `/tanks/{tank_id}`

Delete a tank and all associated data.

**Response:** `204 No Content`

### Tank Events

**POST** `/tanks/{tank_id}/events`

Create a tank event (milestone).

**Request Body:**
```json
{
  "title": "Added Protein Skimmer",
  "description": "Installed Reef Octopus 150",
  "event_date": "2024-01-15"
}
```

**GET** `/tanks/{tank_id}/events`

List all events for a tank.

**PUT** `/tanks/{tank_id}/events/{event_id}`

Update an event.

**DELETE** `/tanks/{tank_id}/events/{event_id}`

Delete an event.

---

## Parameters

### Submit Parameters

**POST** `/parameters`

Submit water test results to InfluxDB.

**Request Body:**
```json
{
  "tank_id": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",  // Optional, defaults to now
  "parameters": {
    "calcium": 420,
    "magnesium": 1350,
    "alkalinity_kh": 8.5,
    "nitrate": 5,
    "phosphate": 0.03,
    "salinity": 35,
    "temperature": 25.5,
    "ph": 8.2
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "Parameters logged successfully",
  "timestamp": "2024-01-01T12:00:00Z",
  "count": 8
}
```

### Query Parameters

**GET** `/parameters`

Query parameter history from InfluxDB.

**Query Parameters:**
- `tank_id` (required): Tank UUID
- `start_date` (optional): ISO date, defaults to 30 days ago
- `end_date` (optional): ISO date, defaults to now
- `parameter_type` (optional): Filter by specific parameter

**Response:** `200 OK`
```json
{
  "calcium": [
    {"timestamp": "2024-01-01T12:00:00Z", "value": 420},
    {"timestamp": "2024-01-08T12:00:00Z", "value": 425}
  ],
  "magnesium": [
    {"timestamp": "2024-01-01T12:00:00Z", "value": 1350}
  ]
}
```

### Latest Parameters

**GET** `/parameters/latest`

Get the most recent reading for each parameter.

**Query Parameters:**
- `tank_id` (required): Tank UUID

**Response:** `200 OK`
```json
{
  "calcium": {"timestamp": "2024-01-08T12:00:00Z", "value": 425},
  "magnesium": {"timestamp": "2024-01-08T12:00:00Z", "value": 1350},
  "alkalinity_kh": {"timestamp": "2024-01-08T12:00:00Z", "value": 8.5}
}
```

---

## Maintenance Reminders

### Create Reminder

**POST** `/maintenance/reminders`

Create a maintenance reminder.

**Request Body:**
```json
{
  "tank_id": "uuid",
  "title": "Weekly Water Change",
  "description": "Change 10% of water (25L)",
  "reminder_type": "water_change",
  "frequency_days": 7,
  "next_due": "2024-01-08"
}
```

**Reminder Types:**
- `water_change`
- `pump_cleaning`
- `skimmer_cleaning`
- `filter_media_change`
- `glass_cleaning`
- `dosing_refill`
- `test_kit_calibration`
- `equipment_check`
- `other`

**Response:** `201 Created`

### List Reminders

**GET** `/maintenance/reminders`

List maintenance reminders.

**Query Parameters:**
- `tank_id` (optional): Filter by tank
- `active_only` (optional, default: true): Show only active reminders
- `overdue_only` (optional, default: false): Show only overdue reminders

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "tank_id": "uuid",
    "title": "Weekly Water Change",
    "description": "Change 10% of water",
    "reminder_type": "water_change",
    "frequency_days": 7,
    "last_completed": "2024-01-01",
    "next_due": "2024-01-08",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Complete Reminder

**POST** `/maintenance/reminders/{reminder_id}/complete`

Mark a reminder as completed. Automatically calculates next due date.

**Request Body:**
```json
{
  "completed_date": "2024-01-08"  // Optional, defaults to today
}
```

**Response:** `200 OK`

### Update Reminder

**PUT** `/maintenance/reminders/{reminder_id}`

Update reminder details.

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "frequency_days": 14,
  "is_active": false
}
```

### Delete Reminder

**DELETE** `/maintenance/reminders/{reminder_id}`

Delete a reminder.

**Response:** `204 No Content`

---

## Photos

### Upload Photo

**POST** `/photos`

Upload a tank photo (multipart/form-data).

**Form Data:**
- `file`: Image file (JPG, PNG, GIF, max 10MB)
- `tank_id`: Tank UUID
- `description` (optional): Photo description
- `taken_at` (optional): ISO datetime, defaults to now

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tank_id": "uuid",
  "filename": "abc123.jpg",
  "description": "Coral growth after 6 months",
  "taken_at": "2024-01-01T12:00:00Z",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### List Photos

**GET** `/photos`

List all photos.

**Query Parameters:**
- `tank_id` (optional): Filter by tank

**Response:** `200 OK`

### Get Photo File

**GET** `/photos/{photo_id}/file`

Retrieve the actual photo file.

**Query Parameters:**
- `thumbnail` (optional, default: false): Return thumbnail instead of full image

**Response:** Image file

### Update Photo

**PUT** `/photos/{photo_id}`

Update photo metadata.

**Request Body:**
```json
{
  "description": "Updated description",
  "taken_at": "2024-01-01T12:00:00Z"
}
```

### Delete Photo

**DELETE** `/photos/{photo_id}`

Delete a photo and its files.

**Response:** `204 No Content`

---

## Notes

### Create Note

**POST** `/notes`

Create a journal note.

**Request Body:**
```json
{
  "tank_id": "uuid",
  "content": "Noticed increased coral coloration today. All fish are eating well."
}
```

**Response:** `201 Created`

### List Notes

**GET** `/notes`

List all notes.

**Query Parameters:**
- `tank_id` (optional): Filter by tank

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "tank_id": "uuid",
    "content": "Noticed increased coral coloration...",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
]
```

### Update Note

**PUT** `/notes/{note_id}`

Update note content.

**Request Body:**
```json
{
  "content": "Updated note content"
}
```

### Delete Note

**DELETE** `/notes/{note_id}`

Delete a note.

**Response:** `204 No Content`

---

## Livestock

### Create Livestock

**POST** `/livestock`

Add fish, coral, or invertebrate to inventory.

**Request Body:**
```json
{
  "tank_id": "uuid",
  "species_name": "Amphiprion ocellaris",
  "common_name": "Ocellaris Clownfish",
  "type": "fish",  // fish, coral, or invertebrate
  "fishbase_species_id": "123",  // Optional, from FishBase
  "added_date": "2024-01-01",
  "notes": "Very active, eats well"
}
```

**Response:** `201 Created`

### List Livestock

**GET** `/livestock`

List all livestock.

**Query Parameters:**
- `tank_id` (optional): Filter by tank
- `type` (optional): Filter by type (fish, coral, invertebrate)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "tank_id": "uuid",
    "species_name": "Amphiprion ocellaris",
    "common_name": "Ocellaris Clownfish",
    "type": "fish",
    "fishbase_species_id": "123",
    "added_date": "2024-01-01",
    "notes": "Very active",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Search FishBase

**GET** `/livestock/fishbase/search`

Search FishBase API for species information.

**Query Parameters:**
- `q` (required): Search query

**Response:** `200 OK`
```json
[
  {
    "species_id": "123",
    "scientific_name": "Amphiprion ocellaris",
    "common_name": "Ocellaris clownfish",
    "family": "Pomacentridae"
  }
]
```

### Update Livestock

**PUT** `/livestock/{livestock_id}`

Update livestock information.

**Request Body:** (all fields optional)
```json
{
  "common_name": "Updated name",
  "notes": "Updated notes"
}
```

### Delete Livestock

**DELETE** `/livestock/{livestock_id}`

Remove from inventory.

**Response:** `204 No Content`

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production deployments, consider implementing rate limiting at the Nginx level or using FastAPI middleware.

## CORS

The API allows CORS requests from the frontend origin. Configure `CORS_ORIGINS` in your environment variables for production deployments.

## Interactive Documentation

For a full interactive API explorer with the ability to test endpoints directly, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
