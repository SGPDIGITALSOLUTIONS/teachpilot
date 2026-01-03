# TeachPilot - The Catherine Hudson Bespoke Revision Platform

A comprehensive study management application for tracking revision sessions, exams, and academic progress. Built as a Progressive Web App (PWA) for optimal use on mobile devices and iPads.

## Features

- 📚 **Organized Study Management** - Topics, subtopics, and task tracking
- ⏰ **Revision Timer** - Focus mode with session tracking
- 🤖 **AI-Powered Exam Generation** - Generate practice exams from uploaded materials
- 📊 **Performance Tracking** - Score tables and improvement analytics
- 💪 **Confidence Building** - Track confidence levels over time
- 🎯 **Rewards System** - Achievements and milestones
- 👨‍👩‍👧 **Parental Controls** - Optional parent support and boundary setting
- 🌟 **Daily Greetings** - Motivational messages and study tips

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **PWA**: next-pwa
- **AI**: OpenAI API
- **Styling**: CSS with custom theme (baby-blue + daisy accents)

## Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your:
   - `DATABASE_URL` - PostgreSQL connection string
   - `TEACHPILOT_USERNAME` - Student username
   - `TEACHPILOT_PASSWORD` - Student password
   - `OPENAI_API_KEY` - OpenAI API key

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
teachpilot/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── home/             # Home dashboard
│   ├── topics/           # Topics management
│   ├── tasks/             # Tasks management
│   ├── exams/             # Exam system
│   └── ...
├── lib/                    # Utility functions
│   └── db.ts              # Database connection
├── components/             # React components
├── scripts/                # Database scripts
│   └── migrate.ts          # Database migrations
└── public/                 # Static assets
    └── manifest.json       # PWA manifest
```

## Development

- Run migrations: `npm run db:migrate`
- Development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`

## PWA Features

The app is configured as a Progressive Web App and can be installed on:
- iOS devices (via Safari)
- Android devices (via Chrome)
- Desktop browsers

Installation prompts will appear when the app is accessed on supported devices.

## License

Private project for educational use.

