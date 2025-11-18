# Google Calendar API Scopes Documentation

This document explains the Google OAuth scopes used in the BetterMindCare app for calendar integration, how they are utilized in the codebase, and guidelines for handling them when displaying to users.

## Requested Scopes

The following scopes are requested during Google OAuth authentication in `backend/auth/OIDC.js`:

- `openid`: OIDC for single sign-on Google Auth Login
- `profile`: Personal info for calendar meeting metadata (e.g., appointment with Mr X)
- `email`: Primary email for metadata in appointments
- `https://www.googleapis.com/auth/calendar.events`: View and Edit events
- `https://www.googleapis.com/auth/calendar.readonly`: Patient/user facing read-only access
- `https://www.googleapis.com/auth/calendar.freebusy`: Availability synchronization

## Scope Usage in Codebase

### `https://www.googleapis.com/auth/calendar.events`
- **Purpose**: Allows doctors to view their events and make changes/reschedules.
- **Code Usage**:
  - `backend/routes/googleCalendarRoutes.js`: Used in `/create-meeting`, `/events`, `/events/:id` (PATCH), `/events/:id` (DELETE) endpoints.
  - Requires system OAuth for paid users.
  - Enables full CRUD operations on calendar events.

### `https://www.googleapis.com/auth/calendar.readonly`
- **Purpose**: Patient/user facing - allows viewing meetings without edit/delete permissions.
- **Code Usage**:
  - `backend/routes/googleCalendarRoutes.js`: Used in `/pending-events` to list tentative events.
  - Frontend: `frontend/src/pages/calendarpg/PatientMeetingRequestsPending.jsx` fetches pending events for read-only display.
  - Ensures patients can see their appointments but not modify them.

### `https://www.googleapis.com/auth/calendar.freebusy`
- **Purpose**: Sync availability against calendars to prevent double-bookings.
- **Code Usage**:
  - `backend/routes/googleCalendarRoutes.js`: Used in `/availability`, `/availability-range`, and `/create-meeting` for freebusy queries.
  - Checks busy times before scheduling new events.

### `openid`, `profile`, `email`
- **Purpose**: Authentication and metadata for appointments.
- **Code Usage**:
  - `backend/auth/OIDC.js`: Requested during OAuth flow.
  - Used for user identification and populating event metadata (e.g., attendee names/emails).

## What to Do When Showing Them

When displaying these permissions to users (e.g., in OAuth consent screen or app settings):

1. **Be Transparent**: Clearly explain what each permission allows in plain language.
2. **Contextualize**: Tie permissions to specific app features (e.g., "View your calendar to schedule appointments").
3. **Minimize Scope**: Only request necessary permissions; avoid over-asking.
4. **Handle Denials**: If a user denies a scope, gracefully degrade functionality (e.g., show read-only mode).
5. **Educate Users**: Inform users why permissions are needed (e.g., "We need calendar access to check availability and create meetings").
6. **Compliance**: Ensure compliance with privacy laws; provide opt-out options.
7. **UI Best Practices**:
   - Use clear, non-technical language.
   - Group related permissions.
   - Show before/after states if possible.
   - Link to privacy policy explaining data usage.

## Notes
- The app does not use a `/calendar` route; all calendar functionality is under `/api/google-calendar/`.
- System OAuth (for app-wide operations) uses these scopes in `backend/routes/googleCalendarRoutes.js`.
- Frontend interacts via `frontend/src/calendarApi/calendarApi.js`.