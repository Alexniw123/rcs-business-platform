# RCS Business Platform

Production-ready starter for a business RCS messaging platform.

Features:
- Admin / manager / agent roles
- User management
- CPaaS provider config (Sinch-ready)
- Bulk CSV upload
- Message template support
- Campaign sending
- Logs
- Invoice management
- React frontend
- Docker support
- Render deployment ready

## Quick start

### Local (Docker)
1. Copy `.env.example` to `.env` in project root if you want custom values.
2. Run:
   docker-compose up --build
3. Open:
   - Frontend: http://localhost:5173
   - API docs: http://localhost:8000/docs

### Default login
- admin / admin123

### Production notes
- Use a real PostgreSQL instance
- Use HTTPS in deployment
- Add rate limiting and audit logs
- Ensure legal consent for RCS messaging
- Use a valid Sinch sender and RCS registration

### Render deploy
1. Push repo to GitHub
2. Create a new Web Service on Render
3. Connect repo
4. Use `render.yaml`
5. Set DATABASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
6. Deploy

## Sinch note
This app is configured to call the Sinch Conversation API at:
https://conversation.api.sinch.com/v1/batches

You must use a real Sinch API token and sender ID / RCS agent.
