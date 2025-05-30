# Travel Planner App

[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://travel-planner-three-pi.vercel.app/)

A full-featured travel planning application that allows users to create, manage, and share detailed travel itineraries.

## Features

### Plan Management
- Create new travel plans
- generate new travel plans with AI
- View and manage all plans in a dashboard
- Edit plan details and activities
- Delete plans and activities

### Activity Details
- Add activities with:
  - Title and destination
  - Start/end dates and times
  - Additional remarks
- Edit activities inline
  
### AI generated travel plan
- Generate plans with Deepseek
- Tailor made with users' request(Destination, Date and Time)

### Google Maps Integration
- Interactive map view for each plan
- Location markers for activity destinations
- Geocoding for address lookup

### Export Functionality
- Export plans to CSV for offline use
- Downloadable itinerary data

### User Authentication
- Secure login with NextAuth
- Permission-based actions
- Session management

## Technologies Used

### Frontend
- Next.js (App Router)
- React (with Hooks)
- TypeScript
- Tailwind CSS
- ShadCN UI Components
- Lucide React Icons

### State Management
- Redux (Global state)
- React State (Local component state)

### Backend
- Next.js Server Actions
- NextAuth (Authentication)

### APIs
- Google Maps API
- Geocoding API
- Deepseek API

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Google Maps API key

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/travel-planner.git
