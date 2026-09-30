# Authentication Setup

## Routes

- `/login` - Login and registration page
- `/dashboard` - Protected content dashboard
- `/` - Redirects to login

## Components

### AuthPage
Main authentication component with login/register toggle. Handles form validation and API calls.

### ProtectedRoute
Wrapper component that checks for auth token. Redirects to login if not authenticated.

## API Integration

The axios client automatically:
- Adds Bearer token to all requests
- Redirects to login on 401 responses
- Stores token in localStorage

## Testing

Login with existing user:
- Email: test2@example.com
- Password: Test123!@#

Register new user and verify email.

## Design

Follows Notion design system:
- Purple primary color (#5645d4)
- Rounded inputs and buttons
- Clean minimal layout
- Proper focus states
