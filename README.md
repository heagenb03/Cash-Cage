# Cash Cage

A poker buyin/cashout tracker that calculates optimal settlements between players.

## Overview

Cash Cage helps manage poker game sessions by tracking player buyins and cashouts, then calculating the minimum number of transactions needed to settle all debts. The application uses a client-server architecture with a React Native frontend and a C++ backend service powered by Mixed Integer Linear Programming (MILP).

## Components

### Frontend
Mobile application built with React Native and Expo.

**Technology Stack:**
- React Native 0.81.4
- Expo ~54.0
- TypeScript 5.9
- Expo Router for navigation

**Key Features:**
- Create and manage poker game sessions
- Track player buyins and cashouts
- Real-time balance calculations
- Automatic settlement generation

**Core Services:**
- GameService: Manages game lifecycle and player transactions
- SettlementService: Server-first settlement calculation with local fallback
- StorageService: In-memory data persistence

### Backend
High-performance C++ service for optimal settlement calculations.

**Technology Stack:**
- C++17
- Google OR-Tools (MILP solver)
- Crow HTTP framework
- AWS Lambda (serverless deployment)
- Docker

**API Endpoints:**
- POST /settlements/optimal - Calculate minimal settlements
- GET /health - Health check

## Setup

### Frontend

```bash
cd frontend
npx expo start
```

**Environment Configuration:**
Create `frontend/.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://your-api-url.com
```

### Backend

**Docker**
```bash
cd backend
docker-compose up --build
```

**AWS Lambda Deployment:**
```bash
cd backend
sam build --use-container
sam deploy --config-env prod
```

## License

See license for details
