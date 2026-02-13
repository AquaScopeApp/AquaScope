# ReefLab API Guide

Complete guide to using the ReefLab API with practical examples.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

ReefLab uses JWT (JSON Web Token) authentication. Include the token in the `Authorization` header for all protected endpoints.

```
Authorization: Bearer <your_token_here>
```

### Register a New User

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reef@example.com",
    "username": "Reef Keeper",
    "password": "securepass123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=reef@example.com&password=securepass123"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Note:** OAuth2 standard uses `username` field for email.

### Get Current User

```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "id": "abc-123-def-456",
  "email": "reef@example.com",
  "username": "Reef Keeper",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

---

## Tanks

Manage your reef aquariums.

### Create a Tank

```bash
curl -X POST "http://localhost:8000/api/v1/tanks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Display Reef Tank",
    "volume_liters": 200,
    "setup_date": "2024-01-01"
  }'
```

**Response:**
```json
{
  "id": "tank-uuid-here",
  "user_id": "user-uuid-here",
  "name": "Display Reef Tank",
  "volume_liters": 200.0,
  "setup_date": "2024-01-01",
  "created_at": "2024-02-07T10:30:00",
  "updated_at": "2024-02-07T10:30:00"
}
```

### List All Tanks

```bash
curl -X GET "http://localhost:8000/api/v1/tanks" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Tank Details

```bash
curl -X GET "http://localhost:8000/api/v1/tanks/{tank_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Tank

```bash
curl -X PUT "http://localhost:8000/api/v1/tanks/{tank_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Tank Name",
    "volume_liters": 250
  }'
```

### Delete Tank

```bash
curl -X DELETE "http://localhost:8000/api/v1/tanks/{tank_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Note:** Cascade deletes all associated notes, photos, reminders, and livestock.

---

## Parameters

Track water chemistry over time.

### Submit Water Test Results

Submit all parameters at once (recommended for full ICP tests):

```bash
curl -X POST "http://localhost:8000/api/v1/parameters" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tank_id": "tank-uuid-here",
    "timestamp": "2024-02-07T10:30:00Z",
    "calcium": 420.0,
    "magnesium": 1350.0,
    "alkalinity_kh": 8.5,
    "nitrate": 5.0,
    "phosphate": 0.05,
    "salinity": 1.025,
    "temperature": 25.5,
    "ph": 8.2
  }'
```

**Response:**
```json
{
  "message": "Parameters submitted successfully",
  "count": 8,
  "parameters": ["calcium", "magnesium", "alkalinity_kh", "nitrate", "phosphate", "salinity", "temperature", "ph"]
}
```

**Note:** All parameter fields are optional - submit only what you tested.

### Query Parameter History

Get calcium readings for the last 7 days:

```bash
curl -X GET "http://localhost:8000/api/v1/parameters?tank_id=tank-uuid&parameter_type=calcium&start=-7d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "time": "2024-02-07T10:30:00Z",
    "tank_id": "tank-uuid",
    "parameter_type": "calcium",
    "value": 420.0
  },
  {
    "time": "2024-02-01T10:30:00Z",
    "tank_id": "tank-uuid",
    "parameter_type": "calcium",
    "value": 425.0
  }
]
```

**Time Range Formats:**
- Relative: `-7d`, `-30d`, `-1h`, `-90d`
- Absolute: `2024-01-01T00:00:00Z`

### Get Latest Parameters

Get the most recent reading for each parameter:

```bash
curl -X GET "http://localhost:8000/api/v1/parameters/latest?tank_id=tank-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "calcium": {
    "value": 420.0,
    "time": "2024-02-07T10:30:00Z"
  },
  "alkalinity_kh": {
    "value": 8.5,
    "time": "2024-02-07T10:30:00Z"
  }
}
```

---

## Notes

Keep observations and journal entries.

### Create a Note

```bash
curl -X POST "http://localhost:8000/api/v1/notes" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tank_id": "tank-uuid",
    "content": "Noticed increased coral polyp extension after adjusting flow. Water clarity excellent."
  }'
```

### List Notes

```bash
# All notes
curl -X GET "http://localhost:8000/api/v1/notes" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by tank
curl -X GET "http://localhost:8000/api/v1/notes?tank_id=tank-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Note

```bash
curl -X PUT "http://localhost:8000/api/v1/notes/{note_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated note content"
  }'
```

### Delete Note

```bash
curl -X DELETE "http://localhost:8000/api/v1/notes/{note_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Photos

Upload and manage aquarium photos.

### Upload Photo

```bash
curl -X POST "http://localhost:8000/api/v1/photos" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/photo.jpg" \
  -F "tank_id=tank-uuid" \
  -F "description=Beautiful coral growth" \
  -F "taken_at=2024-02-07T10:30:00Z"
```

**Response:**
```json
{
  "id": "photo-uuid",
  "tank_id": "tank-uuid",
  "user_id": "user-uuid",
  "filename": "abc-123.jpg",
  "file_path": "/app/uploads/user-uuid/tank-uuid/abc-123.jpg",
  "thumbnail_path": "/app/uploads/user-uuid/tank-uuid/thumb_abc-123.jpg",
  "description": "Beautiful coral growth",
  "taken_at": "2024-02-07T10:30:00Z",
  "created_at": "2024-02-07T10:35:00Z"
}
```

**Constraints:**
- Max file size: 10MB
- Allowed types: jpg, jpeg, png, gif
- Thumbnail automatically generated (300x300)

### List Photos

```bash
# All photos
curl -X GET "http://localhost:8000/api/v1/photos" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by tank
curl -X GET "http://localhost:8000/api/v1/photos?tank_id=tank-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Photo File

```bash
# Full size
curl -X GET "http://localhost:8000/api/v1/photos/{photo_id}/file" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output photo.jpg

# Thumbnail
curl -X GET "http://localhost:8000/api/v1/photos/{photo_id}/file?thumbnail=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output thumb.jpg
```

### Update Photo Metadata

```bash
curl -X PUT "http://localhost:8000/api/v1/photos/{photo_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "taken_at": "2024-02-07T11:00:00Z"
  }'
```

### Delete Photo

```bash
curl -X DELETE "http://localhost:8000/api/v1/photos/{photo_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Note:** Removes both file and thumbnail from disk.

---

## Maintenance

Schedule recurring maintenance tasks.

### Create Reminder

```bash
curl -X POST "http://localhost:8000/api/v1/maintenance/reminders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tank_id": "tank-uuid",
    "title": "10% Water Change",
    "description": "Weekly water change with RODI water",
    "reminder_type": "water_change",
    "frequency_days": 7,
    "next_due": "2024-02-14"
  }'
```

**Common Reminder Types:**
- `water_change`
- `pump_cleaning`
- `skimmer_cleaning`
- `filter_media_change`
- `glass_cleaning`
- `dosing_refill`
- `test_kit_calibration`

### List Reminders

```bash
# All active reminders
curl -X GET "http://localhost:8000/api/v1/maintenance/reminders" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Only overdue
curl -X GET "http://localhost:8000/api/v1/maintenance/reminders?overdue_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by tank
curl -X GET "http://localhost:8000/api/v1/maintenance/reminders?tank_id=tank-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mark as Complete

```bash
curl -X POST "http://localhost:8000/api/v1/maintenance/reminders/{reminder_id}/complete" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**What Happens:**
- `last_completed` set to today
- `next_due` calculated as today + `frequency_days`
- Example: If completed on 2024-02-07 and frequency is 7 days, next_due = 2024-02-14

### Update Reminder

```bash
curl -X PUT "http://localhost:8000/api/v1/maintenance/reminders/{reminder_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "frequency_days": 14,
    "is_active": true
  }'
```

### Delete Reminder

```bash
curl -X DELETE "http://localhost:8000/api/v1/maintenance/reminders/{reminder_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Livestock

Track fish, corals, and invertebrates.

### Add Livestock

```bash
curl -X POST "http://localhost:8000/api/v1/livestock" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tank_id": "tank-uuid",
    "species_name": "Amphiprion ocellaris",
    "common_name": "Clownfish",
    "type": "fish",
    "fishbase_species_id": "5606",
    "added_date": "2024-01-15",
    "notes": "Paired with anemone. Very active feeder."
  }'
```

**Types:**
- `fish`
- `coral`
- `invertebrate`

### List Livestock

```bash
# All livestock
curl -X GET "http://localhost:8000/api/v1/livestock" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by tank
curl -X GET "http://localhost:8000/api/v1/livestock?tank_id=tank-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by type
curl -X GET "http://localhost:8000/api/v1/livestock?type=fish" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Search FishBase

```bash
curl -X GET "http://localhost:8000/api/v1/livestock/fishbase/search?query=clownfish&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "SpecCode": 5606,
    "Genus": "Amphiprion",
    "Species": "ocellaris",
    "FBname": "Clown anemonefish",
    ...
  }
]
```

### Get Species Details from FishBase

```bash
curl -X GET "http://localhost:8000/api/v1/livestock/fishbase/species/5606" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** Detailed species information including max size, habitat, diet, etc.

### Update Livestock

```bash
curl -X PUT "http://localhost:8000/api/v1/livestock/{livestock_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated behavior notes"
  }'
```

### Remove Livestock

```bash
curl -X DELETE "http://localhost:8000/api/v1/livestock/{livestock_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Complete Workflow Example

### 1. Setup

```bash
# Set base URL
BASE_URL="http://localhost:8000/api/v1"

# Register
TOKEN=$(curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"reef@example.com","username":"Reef Keeper","password":"securepass123"}' \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

### 2. Create Tank

```bash
TANK_ID=$(curl -X POST "$BASE_URL/tanks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Display Reef","volume_liters":200}' \
  | jq -r '.id')

echo "Tank ID: $TANK_ID"
```

### 3. Submit Water Parameters

```bash
curl -X POST "$BASE_URL/parameters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"tank_id\": \"$TANK_ID\",
    \"calcium\": 420.0,
    \"alkalinity_kh\": 8.5,
    \"magnesium\": 1350.0,
    \"nitrate\": 5.0,
    \"phosphate\": 0.05,
    \"temperature\": 25.5,
    \"ph\": 8.2
  }"
```

### 4. Add Maintenance Reminder

```bash
curl -X POST "$BASE_URL/maintenance/reminders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"tank_id\": \"$TANK_ID\",
    \"title\": \"Weekly Water Change\",
    \"reminder_type\": \"water_change\",
    \"frequency_days\": 7,
    \"next_due\": \"2024-02-14\"
  }"
```

### 5. Add Livestock

```bash
curl -X POST "$BASE_URL/livestock" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"tank_id\": \"$TANK_ID\",
    \"species_name\": \"Amphiprion ocellaris\",
    \"common_name\": \"Clownfish\",
    \"type\": \"fish\",
    \"added_date\": \"2024-01-15\"
  }"
```

### 6. Query Recent Parameters

```bash
curl -X GET "$BASE_URL/parameters?tank_id=$TANK_ID&start=-30d" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "detail": "Could not validate credentials"
}
```

**Solution:** Check your token and ensure it hasn't expired (30 min).

### 404 Not Found

```json
{
  "detail": "Tank not found"
}
```

**Solution:** Verify the resource ID and that you own the resource.

### 400 Bad Request

```json
{
  "detail": "Email already registered"
}
```

**Solution:** Address the specific validation error in the detail message.

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Solution:** Check required fields and data types.

---

## Best Practices

### 1. Store Tokens Securely
```javascript
// Browser: Use httpOnly cookies or secure sessionStorage
sessionStorage.setItem('token', token);

// Never expose tokens in URLs or logs
```

### 2. Handle Token Expiration
```javascript
if (response.status === 401) {
  // Token expired - redirect to login
  window.location = '/login';
}
```

### 3. Batch Parameter Submissions
```javascript
// Good: Submit all parameters at once
await submitParameters({
  tank_id,
  calcium: 420,
  alkalinity_kh: 8.5,
  magnesium: 1350,
  // ... all parameters
});

// Avoid: Multiple individual submissions
```

### 4. Use Query Filters
```javascript
// Get only what you need
const overdue = await getReminders({ overdue_only: true });
const fish = await getLivestock({ type: 'fish' });
```

### 5. Handle File Uploads Properly
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('tank_id', tankId);
formData.append('description', description);

await uploadPhoto(formData);
```

---

## Interactive API Documentation

Visit http://localhost:8000/docs for interactive Swagger UI where you can:
- Browse all endpoints
- See request/response schemas
- Try API calls directly
- Authorize with your token

---

## Rate Limiting (Future)

Currently no rate limiting. Future versions will implement:
- 100 requests per minute per user
- 10 requests per minute for auth endpoints
- Burst allowance for file uploads

---

## Support

- **Issues:** https://github.com/eprifti/reeflab/issues
- **Discussions:** https://github.com/eprifti/reeflab/discussions
- **Email:** See repository for contact

---

**Last Updated:** 2024-02-07 | **API Version:** v0.3.0
