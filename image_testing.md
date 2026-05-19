# Image Integration Testing Playbook

## Image Handling Rules
- Always use base64-encoded images for tests
- Accepted formats: JPEG, PNG, WEBP
- Never upload blank/solid-color images
- Every image must contain real visual features
- Re-detect MIME type after transformations
