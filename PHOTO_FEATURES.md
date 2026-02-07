# Photo Features Documentation

## Overview

ReefLab's photo management system allows you to upload, organize, and display photos of your reef tank. Recent updates have significantly enhanced photo handling capabilities.

## Features

### 1. HEIC/HEIF Support

Upload photos directly from your iPhone without conversion! ReefLab now automatically converts HEIC/HEIF images to JPEG format.

**Supported Formats:**
- JPEG/JPG
- PNG
- GIF
- HEIC (iPhone photos)
- HEIF

**How it works:**
- Upload any HEIC file through the photo gallery
- Backend automatically converts to JPEG (95% quality)
- Original HEIC file is processed and removed
- Thumbnails are generated from the converted image

**Technical Details:**
- Uses `pillow-heif` library for conversion
- Maintains image quality with 95% JPEG compression
- Automatic color mode conversion (RGB/L)
- No manual conversion needed

### 2. Pin Photos as Tank Display

Mark your best photos as the tank's display image. Perfect for showcasing your reef's current state!

**Key Features:**
- One pinned photo per tank (automatic unpinning of others)
- Visual bookmark indicator on pinned photos
- Easy pin/unpin from photo lightbox
- Yellow badge on grid thumbnails for pinned photos

**How to Pin a Photo:**
1. Open any photo in the lightbox view
2. Click the bookmark icon in the header
3. Photo is now marked as tank display
4. Any previously pinned photo is automatically unpinned

**Visual Indicators:**
- **Grid View**: Yellow bookmark badge in top-right corner
- **Lightbox**: Filled yellow bookmark button
- **Not Pinned**: Outlined bookmark icon

### 3. Authenticated Photo Display

Photos are now served with proper authentication to ensure security and privacy.

**Technical Implementation:**
- Photos fetched as blob data with auth tokens
- Automatic blob URL creation and cleanup
- Memory-efficient with proper URL revocation
- Works seamlessly in grid and lightbox views

**Benefits:**
- Secure photo access (users can only see their own photos)
- No direct file path exposure
- Works with React state management
- Prevents memory leaks with cleanup

## Photo Upload Workflow

1. **Select Files**
   - Drag and drop or click to browse
   - Multiple format support (including HEIC)
   - 10MB file size limit
   - Immediate preview before upload

2. **Add Metadata**
   - Select tank
   - Set date taken (defaults to today)
   - Add optional description
   - All editable after upload

3. **Processing**
   - HEIC files automatically converted to JPEG
   - Thumbnail generated (300x300px)
   - Files organized by user and tank
   - Database record created

4. **Gallery Display**
   - Grid view with thumbnails
   - Click to open lightbox
   - Edit description and date
   - Pin as tank display
   - Delete option

## Admin Features

### Database Export/Import

Administrators can now export and import the entire database for backups or migrations.

**Export:**
- JSON format with all data
- Includes users, tanks, photos, parameters, notes, livestock, and reminders
- Photo file paths preserved
- Downloadable as JSON file

**Import:**
- Two modes: "Add to Database" (safe) or "Replace Database" (destructive)
- Automatic ID mapping for foreign key relationships
- Default password "changeme123" for imported users
- Imported photos must be manually transferred

**User Management:**
- Edit username, email, password
- Toggle admin status
- Email uniqueness validation
- Password hashing on update
- Cannot delete yourself

## API Endpoints

### Photo Management

```
POST   /api/v1/photos                 # Upload photo
GET    /api/v1/photos                 # List photos (filtered by tank)
GET    /api/v1/photos/{id}/file       # Get photo file (with auth)
GET    /api/v1/photos/{id}/file?thumbnail=true  # Get thumbnail
PUT    /api/v1/photos/{id}            # Update metadata
DELETE /api/v1/photos/{id}            # Delete photo
POST   /api/v1/photos/{id}/pin        # Pin as tank display
POST   /api/v1/photos/{id}/unpin      # Unpin from tank display
```

### Admin Endpoints

```
GET    /api/v1/admin/database/export  # Export database
POST   /api/v1/admin/database/import  # Import database
PUT    /api/v1/admin/users/{id}       # Update user (including email/password)
```

## File Storage

Photos are stored on the filesystem in a structured directory:

```
uploads/
  └── {user_id}/
      └── {tank_id}/
          ├── {uuid}.jpg          # Original photo
          └── thumb_{uuid}.jpg    # Thumbnail
```

**Storage Considerations:**
- User and tank isolation
- UUID-based filenames prevent collisions
- Thumbnails for fast grid loading
- Cascade deletion (remove files when photo deleted)

## Security

- **Authentication Required**: All photo endpoints require valid JWT token
- **User Isolation**: Users can only access their own photos
- **Admin-Only**: Database import/export restricted to admins
- **Email Validation**: Unique email constraints enforced
- **Password Hashing**: bcrypt used for all passwords

## Best Practices

1. **Photo Upload**
   - Use HEIC directly from iPhone (no need to convert)
   - Add descriptions for better organization
   - Set accurate dates for chronological tracking
   - Keep files under 10MB

2. **Photo Management**
   - Pin your best photo as tank display
   - Delete blurry or duplicate photos
   - Update descriptions to track changes
   - Regular backups via admin export

3. **Database Management**
   - Export before major changes
   - Use "Add to Database" mode when testing imports
   - Transfer photo files manually when migrating servers
   - Update imported user passwords immediately

## Troubleshooting

### HEIC Upload Fails
- Ensure backend has `pillow-heif` installed
- Check backend logs for conversion errors
- Try converting to JPEG manually if needed

### Photos Not Displaying
- Check browser console for auth errors
- Verify JWT token is valid
- Ensure photo files exist on server
- Check file permissions in uploads directory

### Pin Not Working
- Only one photo can be pinned per tank
- Refresh page to see updated pin status
- Check you have permission for the tank

### Import Fails
- Validate JSON format
- Check for ID conflicts in Replace mode
- Ensure photos exist if importing with photo references
- Review backend logs for specific errors

## Future Enhancements

Potential future features:
- Batch photo upload
- Photo tagging system
- Before/after comparison view
- Automatic slideshow
- Photo editing capabilities
- Cloud storage integration
- Mobile app support
