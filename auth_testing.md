# Auth-Gated App Testing Playbook (Emergent Google Auth)

## Image Handling Rules
- Always use base64-encoded images for tests
- Accepted formats: JPEG, PNG, WEBP only

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend via curl
```bash
curl -X GET "$API/api/auth/me" -H "Authorization: Bearer $SESSION_TOKEN"
curl -X GET "$API/api/profile" -H "Authorization: Bearer $SESSION_TOKEN"
```

## Step 3: Browser Testing
Set cookie `session_token` with path=/, httpOnly=true, secure=true, sameSite=None.

## Checklist
- users collection has `user_id` field (UUID)
- user_sessions session_token points to existing user_id
- All queries use `{"_id": 0}` projection
- `/api/auth/me` returns 200 with user payload
