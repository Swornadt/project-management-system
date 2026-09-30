# User Management Feature

## Overview
Complete admin panel for managing users with full CRUD operations, role management, and status control.

## Access
Route: `/users`
Requires: Admin role authentication

## Features

### Statistics Dashboard
- Real-time user metrics
- Total, active, inactive, suspended counts
- Verified/unverified status tracking
- Visual stat cards with color coding

### User Table
- Paginated user list (20 per page)
- Search by name or email
- Filter by role (Admin/Manager/Employee)
- Filter by status (active/inactive/suspended)
- Sort and refresh capabilities

### User Operations

#### Create User
- Form with validation
- Required: first name, last name, email, password, role
- Email format validation
- Password minimum 8 characters
- Select role from dropdown
- Set initial status

#### Edit User
- Update name and email
- Change password (optional)
- Form validation
- Duplicate email check

#### Status Management
- Activate/deactivate users
- Change status to active/inactive/suspended
- Automatic token revocation on deactivation
- Cannot modify own status

#### Delete User
- Soft delete with confirmation
- Can be restored later
- Revokes all user tokens
- Cannot delete own account

### Design

Following Notion design system:
- Purple primary actions (#5645d4)
- Color-coded status badges:
  - Active: Green
  - Inactive: Gray
  - Suspended: Red
- Color-coded role badges:
  - Admin: Purple
  - Manager: Blue
  - Employee: Orange
- Smooth transitions and hover states
- Responsive table layout
- Modal dialogs for forms

## API Integration

Connected to backend endpoints:
- GET /users - List all users
- GET /users/search - Search with filters
- GET /users/stats - Statistics
- GET /users/:id - Single user
- POST /users - Create user
- PATCH /users/:id - Update user
- PATCH /users/:id/status - Change status
- PATCH /users/:id/activate - Activate
- PATCH /users/:id/deactivate - Deactivate
- DELETE /users/:id - Delete user

## Testing

1. Login as admin (test2@example.com / Test123!@#)
2. Navigate to Users page
3. View statistics
4. Search and filter users
5. Create new user
6. Edit existing user
7. Change user status
8. Delete user

## Files Created

### API Layer
- `src/api/userApi.ts` - API client functions

### Pages
- `src/pages/UserManagement.tsx` - Main page

### Components
- `src/features/users/UserStats.tsx` - Statistics cards
- `src/features/users/UserFilters.tsx` - Search and filters
- `src/features/users/UserTable.tsx` - User list table
- `src/features/users/CreateUserModal.tsx` - Create user form
- `src/features/users/EditUserModal.tsx` - Edit user form
- `src/components/layout/AppNav.tsx` - Navigation bar

## Notes

- All operations require admin authentication
- Form validation on client and server
- Error messages displayed inline
- Success messages with auto-dismiss
- Cannot modify own role or status
- Pagination for large user lists
- Responsive design for desktop and tablet
