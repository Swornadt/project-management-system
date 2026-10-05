# User Management Features Overview

## Access the Page
1. Start servers: Backend on port 5001, Frontend on port 3000
2. Login at http://localhost:3000/login
3. Use admin credentials: test2@example.com / Test123!@#
4. Navigate to Users page via top navigation

## Statistics Dashboard
Located at the top of the page, shows 6 cards:
- **Total Users** (purple) - All users in system
- **Active** (green) - Users with active status
- **Inactive** (gray) - Users with inactive status
- **Suspended** (red) - Users with suspended status
- **Verified** (teal) - Users who verified their email
- **Unverified** (orange) - Users pending email verification

Updates in real-time when users are created, updated, or deleted.

## Search and Filter Bar
Located above the user table:

### Search Input (left, 2 columns wide)
- Type to search by name or email
- Case-insensitive
- Real-time filtering

### Role Filter (dropdown)
Options:
- All Roles (default)
- Admin
- Manager
- Employee

### Status Filter (dropdown)
Options:
- All Status (default)
- active
- inactive
- suspended

### Refresh Button (right)
Manually reload user data from backend

## User Table
Displays paginated list of users with columns:

1. **Name** - First and last name combined
2. **Email** - User email address
3. **Role** - Colored badge:
   - Purple for Admin
   - Blue for Manager
   - Orange for Employee
4. **Status** - Colored badge:
   - Green for active
   - Gray for inactive
   - Red for suspended
5. **Verified** - Checkmark or X
6. **Created** - Date user was created
7. **Actions** - Three buttons:
   - **Edit** (blue) - Update user details
   - **Activate/Deactivate** (green/orange) - Toggle status
   - **Delete** (red) - Soft delete user

### Hover Effects
- Rows highlight on hover
- Buttons change background on hover

## Pagination Controls
Located below the table:

**Left Side:**
"Showing X to Y of Z users"

**Right Side:**
- **Previous** button (disabled on first page)
- **Page X of Y** indicator
- **Next** button (disabled on last page)

Default: 20 users per page

## Create User Modal
Triggered by "Create User" button (top right, purple)

### Form Fields:
1. **First Name** - Required, text input
2. **Last Name** - Required, text input
3. **Email** - Required, must be valid email format
4. **Password** - Required, minimum 8 characters
5. **Role** - Required, dropdown (loads from backend)
6. **Status** - Dropdown (active/inactive)

### Buttons:
- **Create User** (purple) - Submit form
- **Cancel** (white) - Close modal

### Validation:
- Shows red border on invalid fields
- Error messages below each field
- General error at bottom if API fails
- Success message on create

## Edit User Modal
Triggered by clicking "Edit" on any user

### Form Fields:
1. **First Name** - Update first name
2. **Last Name** - Update last name
3. **Email** - Update email (checks for duplicates)
4. **New Password** - Optional, leave blank to keep current

### Buttons:
- **Update User** (purple) - Submit changes
- **Cancel** (white) - Close modal

### Validation:
Same as create modal

## Status Management
Click **Activate** or **Deactivate** button on any user:
- Shows confirmation dialog
- Changes status in database
- Revokes all tokens on deactivation
- Updates table and stats immediately

## Delete User
Click **Delete** button on any user:
- Shows confirmation: "Delete this user? This action can be undone."
- Performs soft delete (can be restored)
- Revokes all user tokens
- Updates table and stats immediately

## Security Features
- Cannot edit own user
- Cannot change own role
- Cannot change own status
- Cannot delete own account
- All operations require admin role
- JWT token in every request
- Auto-logout on 401 response

## Navigation
Top bar shows:
- **Project Management** logo (left)
- **Dashboard** button
- **Users** button (highlighted when active)
- **Log out** button (right)

## Design Details

### Colors Used:
- Primary: #5645d4 (purple)
- Active: #1aae39 (green)
- Inactive: #787671 (gray)
- Suspended: #e03131 (red)
- Background: #f6f5f4 (soft gray)
- Cards: #ffffff (white)
- Borders: #e5e3df (light gray)

### Typography:
- Headings: 48px, 600 weight
- Subtitle: 18px, 400 weight
- Body: 14-16px, 400 weight
- Buttons: 14px, 500 weight

### Spacing:
- Card padding: 24px
- Button padding: 10px 18px
- Grid gaps: 16px
- Border radius: 8px (buttons), 12px (cards)

## Keyboard Shortcuts
- **Enter** in search: Applies filter
- **Escape** in modal: Closes modal
- **Tab**: Navigate through form fields

## Loading States
- "Loading users..." shown while fetching
- Button shows "Please wait..." or "Creating..." during operations
- Disabled buttons during loading

## Error Handling
- Network errors: Red banner at top
- Validation errors: Red text below fields
- Success messages: Green banner at top
- Auto-dismiss after 3 seconds

## Empty States
- No users: "No users found" message
- No search results: Shows empty table with message

## Responsive Design
- Desktop: 5-column filter bar
- Tablet: 3-column filter bar
- Mobile: Single column layout
- Table scrolls horizontally on small screens
