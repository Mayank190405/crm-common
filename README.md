# Real Estate CRM

A full-stack CRM for Real Estate management including Web, Mobile, and Backend API.

## Project Structure
- `/backend`: FastAPI (Python) backend with PostgreSQL and Redis.
- `/web`: Next.js frontend application.
- `/mobile`: React Native (Expo) mobile application.
- `docker-compose.yml`: Orchestration for local development.

## Tech Stack
- **Backend**: FastAPI, SQLModel, PostgreSQL, Redis
- **Web**: Next.js, Tailwind CSS, TypeScript
- **Mobile**: React Native, Expo, TypeScript

## Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js (for local npm commands)
- Python 3.11+ (for local backend development)

### Running with Docker (Recommended)
You can start the entire system with a single command:
```bash
docker-compose up --build
```

### Manual Setup

#### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python -m uvicorn app.main:app --reload`

#### Web
1. `cd web`
2. `npm install`
3. `npm run dev`

#### Mobile
1. `cd mobile`
2. `npm install`
3. `npx expo start`

## API Documentation
Once the backend is running, you can access the Swagger UI at:
`http://localhost:8000/docs`

## Initial Modules
- **Authentication**: JWT-based auth with role-management.
- **Lead Management**: Lead capture and status tracking.
- **Project & Inventory**: Real estate projects and unit inventory.
- **Booking Workflow**: (Scaffolded) Lifecycle for unit bookings.

## Deployment Notes (AWS)
**WARNING**: These credentials should be kept secret. Remove them from this file before committing to a public repository.

**Access Key ID**: `AKIAS5BZPGVTDEF7BWQ6`
**Secret Access Key**: `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`
**Region**: `eu-north-1`
