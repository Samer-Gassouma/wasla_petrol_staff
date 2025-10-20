# Wasla Staff Portal

A modern web application for petrol station staff to manage vehicle queues in real-time. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **🔐 Authentication**: CIN-based login system matching the desktop app
- **📱 Mobile-First Design**: Optimized for mobile devices with responsive layout
- **🔄 Real-time Updates**: WebSocket integration for live queue management
- **🎯 Drag & Drop**: Intuitive queue reordering with @dnd-kit
- **⚡ Low Latency**: Optimized for fast performance and real-time updates
- **🎨 Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **State Management**: React Context API

## Backend Integration

The application integrates with the existing Go microservices:

- **Auth Service** (Port 8001): Staff authentication
- **Queue Service** (Port 8002): Queue management operations
- **Booking Service** (Port 8003): Booking operations
- **WebSocket Hub** (Port 8004): Real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend services running (station-backend)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd petrol-staff-web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup

Make sure the backend services are running:

```bash
cd ../station-backend
make run-all
```

## Usage

### Login
- Staff members log in using their CIN (Carte d'Identité Nationale)
- Authentication tokens are stored in localStorage for persistence

### Queue Management
- Select a station from the dashboard
- View real-time queue updates via WebSocket
- Drag and drop vehicles to reorder the queue
- Use arrow buttons for precise position changes
- Add new vehicles to the queue
- Remove vehicles from the queue

### Mobile Experience
- Fully responsive design optimized for mobile devices
- Touch-friendly drag and drop interactions
- Compact UI elements for small screens
- Swipe gestures supported

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Staff login with CIN
- `POST /api/v1/auth/logout` - Staff logout

### Queue Management
- `GET /api/v1/queue/:stationId` - Get vehicle queue
- `POST /api/v1/queue/:stationId` - Add vehicle to queue
- `PUT /api/v1/queue/:stationId/reorder` - Reorder vehicles
- `DELETE /api/v1/queue/:stationId/entry/:id` - Remove vehicle

### WebSocket
- `ws://localhost:8004/ws/queue/:stationId` - Real-time queue updates

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── LoginScreen.tsx    # Authentication screen
│   └── QueueManagement.tsx # Main queue management interface
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── config/                # Configuration files
│   └── api.ts            # API endpoints configuration
└── lib/                   # Utility libraries
    ├── api.ts            # API client functions
    └── websocket.ts      # WebSocket client
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Tailwind CSS for styling

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_AUTH_URL=http://localhost:8001
NEXT_PUBLIC_API_QUEUE_URL=http://localhost:8002
NEXT_PUBLIC_API_BOOKING_URL=http://localhost:8003
NEXT_PUBLIC_WS_URL=ws://localhost:8004
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software for STE Dhraiff Services Transport.

## Support

For support and questions, contact the development team.