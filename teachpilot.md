# TeachPilot - Study & Exam Management App

## Overview
A study management application for a 15-year-old student to track revision sessions, exams, and custom tasks. Similar architecture to Hudson Virtual Dashboard but adapted for educational purposes.

## Core Features

### 1. Bespoke Login
- **Implementation**: Similar to current `app/api/auth/route.ts`
- **Environment Variables**: 
  - `TEACHPILOT_USERNAME` - Student's username
  - `TEACHPILOT_PASSWORD` - Student's password
- **Storage**: Use `localStorage.setItem('teachpilot_authenticated', 'true')`
- **Component**: Create `components/LoginForm.tsx` (can reuse with modifications)

### 2. Tasks System
- **Task Types** (instead of client_id):
  - `revision_session` - Study/revision tasks
  - `exam` - Exam dates and preparation
  - `custom` - Other tasks (homework, projects, etc.)
- **Task Fields**:
  - `id` (SERIAL PRIMARY KEY)
  - `task_type` (VARCHAR) - 'revision_session', 'exam', 'custom'
  - `topic_id` (INTEGER) - References topics table (instead of client_id)
  - `subtopic_id` (INTEGER, nullable) - References subtopics table
  - `title` (VARCHAR)
  - `description` (TEXT)
  - `start_date` (DATE)
  - `deadline` (DATE)
  - `status` (VARCHAR) - 'pending', 'in_progress', 'completed'
  - `importance` (INTEGER) - 1-5 scale
  - `notes` (TEXT)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

### 3. Topics Page (Replaces Clients)
- **Database Table**: `topics`
  ```sql
  CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100), -- e.g., 'Math', 'Science', 'English'
    description TEXT,
    color VARCHAR(7), -- Hex color for UI
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- **Features**:
  - Create, edit, delete topics
  - View all tasks associated with a topic
  - Filter by subject
  - Visual color coding

### 4. Subtopic Creation
- **Database Table**: `subtopics`
  ```sql
  CREATE TABLE IF NOT EXISTS subtopics (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- **Features**:
  - Create subtopics within topics
  - Link tasks to specific subtopics
  - View tasks grouped by subtopic
  - Example: Topic "Math" → Subtopic "Algebra", "Geometry", "Calculus"

### 5. AI-Generated Daily Greetings
- **Purpose**: Provide daily encouragement, study tips, and emotional support
- **Content Types**:
  1. **Revision Tips** - Practical study techniques and revision strategies
  2. **Motivational Study Tips** - Encouragement about studying and being enough
  3. **Anxiety/Mood Tips** - Supportive advice for managing stress and emotions
  4. **Bible Quotes** - Relevant scripture that promotes feeling good and positive mindset

#### Implementation Details

**API Route**: `app/api/daily-greeting/route.ts`
- **Method**: GET
- **Functionality**: 
  - Randomly selects one of the 4 content types
  - Calls OpenAI API (gpt-4o-mini) to generate content
  - Returns formatted response with emoji and title

**Content Type Prompts**:
```typescript
const prompts: Record<string, string> = {
  revision_tip: 'Provide a practical, helpful revision tip for a 15-year-old student (2-3 sentences max). Focus on effective study techniques, memory strategies, or time management. Make it actionable and encouraging.',
  motivational_study: 'Write a motivational message about studying and being enough for a 15-year-old student (2-3 sentences max). Emphasize that they are doing their best and that is enough. Be warm, supportive, and validating.',
  anxiety_mood_tip: 'Provide a supportive tip for managing anxiety, stress, or mood for a 15-year-old student (2-3 sentences max). Focus on practical coping strategies, self-care, or emotional regulation. Be gentle and understanding.',
  bible_quote: 'Share a relevant Bible verse or quote that promotes feeling good, peace, strength, or encouragement (2-3 sentences max). Include the verse reference. Make it uplifting and relevant to a student\'s daily life.'
}
```

**Content Type Metadata**:
```typescript
const typeInfo: Record<string, { emoji: string; title: string }> = {
  revision_tip: { emoji: '📖', title: 'Revision Tip' },
  motivational_study: { emoji: '💝', title: 'You Are Enough' },
  anxiety_mood_tip: { emoji: '🌱', title: 'Wellness Tip' },
  bible_quote: { emoji: '✝️', title: 'Daily Verse' }
}
```

**Client-Side Implementation** (in `app/home/page.tsx`):
- Uses `useEffect` to load greeting on page mount
- **Caching Strategy**: 
  - Checks `localStorage` for `teachpilot_daily_greeting` and `teachpilot_daily_greeting_date`
  - If content exists for today's date, uses cached version
  - Otherwise, fetches new content from `/api/daily-greeting`
  - Stores new content in localStorage with today's date
- **Display**: 
  - Shows greeting card at top of home page
  - Includes emoji, title, and generated content
  - Mobile-optimized with responsive sizing
  - Loading state while fetching
  - Fallback message if fetch fails

**Example API Response**:
```json
{
  "success": true,
  "data": {
    "content": "Remember to take breaks every 25-30 minutes during revision. Your brain needs time to process information, and short breaks actually improve retention!",
    "type": "revision_tip",
    "emoji": "📖",
    "title": "Revision Tip"
  }
}
```

**localStorage Keys**:
- `teachpilot_daily_greeting` - Stores the greeting content object
- `teachpilot_daily_greeting_date` - Stores the date string (e.g., "Mon Jan 15 2024")

**OpenAI Configuration**:
- Model: `gpt-4o-mini`
- Max tokens: 150
- Temperature: 0.8 (for variety)
- System prompt: "You are a supportive assistant providing encouraging, helpful, and positive content for a 15-year-old student. Keep responses concise (2-3 sentences maximum). Be warm, understanding, and age-appropriate."

**Error Handling**:
- If OpenAI API fails, show fallback message
- If localStorage is unavailable, still fetch but don't cache
- Gracefully handle network errors

**UI Styling**:
- Prominent card at top of home page
- Color scheme: Study-friendly gradient (consider soft blues, greens, or purples)
- Responsive design for mobile
- Smooth loading transitions

## Database Schema Changes

### New Tables
1. **topics** - Main subjects/topics
2. **subtopics** - Subcategories within topics
3. **tasks** - Modified to use `topic_id` and `subtopic_id` instead of `client_id`

### Modified Tables
- **tasks**: 
  - Remove `client_id` foreign key
  - Add `topic_id` foreign key
  - Add `subtopic_id` foreign key (nullable)
  - Add `task_type` field

## API Routes Needed

### Topics
- `GET /api/topics` - List all topics
- `POST /api/topics` - Create topic
- `GET /api/topics/[id]` - Get topic details
- `PUT /api/topics/[id]` - Update topic
- `DELETE /api/topics/[id]` - Delete topic

### Subtopics
- `GET /api/topics/[topicId]/subtopics` - List subtopics for a topic
- `POST /api/topics/[topicId]/subtopics` - Create subtopic
- `PUT /api/subtopics/[id]` - Update subtopic
- `DELETE /api/subtopics/[id]` - Delete subtopic

### Tasks (Modified)
- `GET /api/tasks` - List tasks (filter by topic, subtopic, type)
- `POST /api/tasks` - Create task (requires topic_id, optional subtopic_id, task_type)
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Daily Greetings
- `GET /api/daily-greeting` - Generate or retrieve daily greeting (cached client-side)

## UI Components Needed

### Pages
- `app/page.tsx` - Login page (rebranded)
- `app/home/page.tsx` - Dashboard/home page (includes daily greeting)
- `app/topics/page.tsx` - Topics management page
- `app/tasks/page.tsx` - Tasks list page (modified)
- `app/calendar/page.tsx` - Calendar view (modified to show tasks by type)

### Components
- `components/TopicsContent.tsx` - Topics management (similar to ClientsContent)
- `components/TaskListContent.tsx` - Modified to use topics/subtopics
- `components/CalendarContent.tsx` - Modified to show task types
- `components/Header.tsx` - Updated navigation
- Daily greeting card (integrated into home page)

## Key Differences from Hudson Virtual

| Feature | Hudson Virtual | TeachPilot |
|---------|---------------|------------|
| Main Entity | Clients | Topics |
| Task Association | client_id | topic_id + subtopic_id |
| Task Types | None | revision_session, exam, custom |
| Subject Organization | N/A | Topics → Subtopics hierarchy |
| Color Coding | N/A | Topics have colors |
| Daily Content | Motivational (work-focused) | Study-focused (revision, motivation, wellness, Bible) |
| Branding | "Hudson Virtual" | "TeachPilot" |

## Implementation Steps

1. **Database Setup**
   - Create new database or use separate schema
   - Run migrations for topics, subtopics, modified tasks tables

2. **Authentication**
   - Copy and modify `app/api/auth/route.ts`
   - Update environment variables
   - Modify login component branding

3. **Daily Greetings System**
   - Create `app/api/daily-greeting/route.ts` (based on motivational-content route)
   - Update prompts for study-focused content types
   - Implement client-side caching in home page
   - Style greeting card with study-friendly colors

4. **Topics System**
   - Create `components/TopicsContent.tsx` (based on ClientsContent)
   - Create API routes for topics CRUD
   - Add topics page route

5. **Subtopics System**
   - Create subtopics API routes
   - Add subtopic creation UI within topics
   - Update task creation to include subtopic selection

6. **Tasks Modification**
   - Update tasks table schema
   - Modify `components/TaskListContent.tsx` to use topics
   - Add task type selector (revision/exam/custom)
   - Update task API routes

7. **UI/UX Updates**
   - Rebrand all "Hudson Virtual" references to "TeachPilot"
   - Update color scheme (consider study-friendly colors: soft blues, greens, purples)
   - Add visual indicators for task types (icons/colors)
   - Mobile optimization (reuse existing patterns)
   - Style daily greeting card prominently

8. **Calendar Integration**
   - Update calendar to show tasks by type
   - Color code by topic
   - Filter by task type

## Mobile Optimization
- Reuse existing mobile CSS patterns from `app/globals.css`
- Ensure all new components are responsive
- Touch-friendly buttons and inputs
- Stack layouts on small screens
- Daily greeting card optimized for mobile viewing

## Future Enhancements
- Study timer integration
- Progress tracking per topic
- Exam countdown timers
- Study streak tracking
- Revision session notes/reflections
- Performance analytics per topic
- Mood tracking integration with daily greetings
- Customizable greeting preferences (allow student to choose favorite content types)

