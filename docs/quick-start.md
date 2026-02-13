# ReefLab Quick Start Guide

## Getting Started

### First Time Setup

1. **Access the Application**
   ```
   http://localhost        # Frontend
   http://localhost:8000   # Backend API
   http://localhost:8086   # InfluxDB UI
   ```

2. **Create an Account**
   - Click "Register" on the login page
   - Enter email, username, and password
   - Click "Create Account"
   - You're automatically logged in

3. **Create Your First Tank**
   - Navigate to Dashboard
   - Click "Add Tank" or go to Tanks page
   - Enter tank name, volume, and setup date
   - Save

## Common Tasks

### Uploading Photos

1. **Navigate to Photos Page**
   - Click "Photos" in the navigation menu

2. **Upload a Photo**
   - Click "Upload Photo" button
   - Drag and drop a photo or click to browse
   - Supported: JPG, PNG, GIF, **HEIC** (iPhone photos!)
   - Select tank from dropdown
   - Set date taken (defaults to today)
   - Add optional description
   - Click "Upload Photo"

3. **Pin a Photo as Tank Display**
   - Click any photo to open lightbox
   - Click the bookmark icon in the header
   - Photo is now marked as your tank's display image
   - Only one photo can be pinned per tank

4. **View and Manage Photos**
   - Grid view shows all your photos
   - Pinned photos have a yellow bookmark badge
   - Click any photo to view full size
   - Edit description and date in lightbox
   - Delete unwanted photos

### Logging Water Parameters

1. **Navigate to Parameters Page**
   - Click "Parameters" in the navigation

2. **Enter Test Results**
   - Fill in any measured parameters
   - Common tests: Calcium, Magnesium, Alkalinity (KH), Nitrate, Phosphate
   - Also track: Salinity, Temperature, pH
   - Select tank if you have multiple
   - Date defaults to now (adjust if needed)
   - Click "Log Parameters"

3. **View in Grafana** (if configured)
   - Click "View in Grafana" link
   - See historical trends and charts

### Creating Notes

1. **Navigate to Notes Page**
2. **Click "New Note"**
3. **Write your note**
   - Select tank
   - Enter content (observations, changes, maintenance)
   - Automatically dated
4. **Save**

### Setting Up Maintenance Reminders

1. **Navigate to Maintenance Page**
2. **Click "New Reminder"**
3. **Configure Reminder**
   - Title (e.g., "Water Change")
   - Type (water_change, pump_cleaning, etc.)
   - Frequency in days (e.g., 7 for weekly)
   - Optional description
4. **Mark as Complete**
   - Click "Complete" when done
   - Next due date automatically calculated

### Managing Livestock

1. **Navigate to Livestock Page**
2. **Click "Add Livestock"**
3. **Enter Details**
   - Species name (common or scientific)
   - Type (fish, coral, invertebrate)
   - Date added
   - Optional notes
4. **Optional: Search FishBase**
   - Click "Search FishBase" for fish species info

## Admin Features (Admin Users Only)

### Managing Users

1. **Navigate to Admin Page**
2. **Click "User Management" tab**
3. **Edit Users**
   - Change username
   - Update email address
   - Reset password
   - Toggle admin status
4. **Delete Users**
   - Click delete icon (cannot delete yourself)

### Database Export/Import

**Export Database:**
1. Go to Admin > Overview
2. Scroll to "Database Management"
3. Click "Export Database"
4. JSON file downloads with all data

**Import Database:**
1. Go to Admin > Overview
2. Scroll to "Database Management"
3. Choose import mode:
   - **Add to Database**: Safely adds data (recommended)
   - **Replace Database**: Deletes all existing data (dangerous!)
4. Select JSON file
5. Click "Import Database"
6. Wait for completion confirmation

**Important Notes:**
- Photo files are NOT included in export/import (only file paths)
- Manually transfer uploads/ directory when migrating servers
- Imported users get default password "changeme123" (change immediately)
- Take backups before importing in Replace mode

## Tips and Tricks

### Photo Management
- **HEIC Support**: iPhone users can upload photos directly without conversion
- **Pin Best Photos**: Use the pin feature to highlight your tank's current state
- **Organize by Date**: Update the "taken at" date for accurate chronology
- **Add Descriptions**: Note equipment changes, coral placements, or observations

### Parameters
- **Consistency**: Log at the same time each week
- **Complete Data**: More parameters = better trends in Grafana
- **Historical View**: Use Grafana to spot trends over time

### Maintenance
- **Regular Tasks**: Set up reminders for routine maintenance
- **Complete Promptly**: Mark tasks complete to keep schedule accurate
- **Review Overdue**: Check dashboard for overdue items

### Notes
- **Document Changes**: Log equipment changes, dosing adjustments, additions/removals
- **Track Problems**: Note algae blooms, pests, or issues
- **Reference Later**: Search notes when troubleshooting

## Keyboard Shortcuts (Photo Lightbox)

- **←/→ Arrow Keys**: Navigate between photos
- **Escape**: Close lightbox
- **Click outside**: Close lightbox

## File Size Limits

- **Photos**: 10MB maximum per file
- **Database Export**: No limit (but large exports may take time)

## Browser Support

ReefLab works best on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Mobile responsive design included!

## Getting Help

- Check logs: `docker compose logs backend`
- API documentation: http://localhost:8000/docs
- GitHub Issues: Report bugs or request features

## Default Credentials

First user created gets admin privileges automatically.

## Data Backup Recommendations

1. **Regular Exports**: Weekly admin exports to JSON
2. **Photo Backup**: Copy `uploads/` directory regularly
3. **Database Dumps**: PostgreSQL backup for extra safety
4. **InfluxDB Backup**: Export InfluxDB data separately

## Next Steps

After setup, you might want to:
1. Configure Grafana dashboards for parameter visualization
2. Set up regular maintenance reminders
3. Upload progress photos monthly
4. Log parameters weekly
5. Invite other users if needed (create accounts via register page)

Enjoy tracking your reef with ReefLab! 🐠🪸
