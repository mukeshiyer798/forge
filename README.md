# FORGE - AI-Powered Learning Roadmap & Goal Tracker

FORGE is a comprehensive goal-tracking and learning application designed to help users define, structure, and achieve their objectives. It leverages AI to generate customized, actionable learning roadmaps focused on depth, practical projects, and interview preparation. 

With features like Pomodoro tracking, an integrated Spaced Repetition System (SRS), detailed progress analytics, and an intelligent roadmap coach, FORGE transforms abstract goals into manageable, step-by-step journeys.

## Features

### 1. Goal Management & AI Coach
- **AI-Powered Roadmaps:** Define a high-level goal and let the "FORGE Coach" (powered by LLMs) generate a detailed, phased roadmap.
- **Deep & Actionable Topics:** Get 5-7 focused topics per phase, emphasizing depth over breadth.
- **Resources & Build Projects:** Every topic includes recommended learning resources (specific chapters/videos) and a hands-on project to build your portfolio.
- **Goal Customization:** Easily edit, refine, or remove AI-generated tasks and resources before committing to them.
- **Phase Unlocking:** Complete current phase tasks to unlock the next logical steps in your journey.

### 2. Time Management & Consistency
- **Pomodoro Timer:** Keep track of your study sessions with an integrated, customizable Pomodoro timer.
- **Daily Streak Tracking:** Maintain momentum by completing your designated tasks and sessions to build your daily streak.
- **Calendar Heatmap:** Visualize your consistency over time with a GitHub-style activity calendar.

### 3. Active Recall & Interview Prep
- **Spaced Repetition System (SRS):** Built-in mechanics to review key concepts at optimal intervals, ensuring long-term retention.
- **Task-Specific Q&A:** AI-generated interview questions and active recall prompts tied directly to your learning topics.

### 4. Reading & Resource Aggregation
- **Reading List:** Save articles, blogs, and documentation for later reading. 
- **Content Parsing:** Clean, distraction-free reading view integrated directly into the application.

## Tech Stack

### Frontend
- **Framework:** React 18, Vite
- **Styling:** Tailwind CSS, Framer Motion for smooth animations
- **State Management:** Zustand
- **Icons:** Lucide React
- **Routing:** React Router DOM

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (via SQLModel / SQLAlchemy)
- **Authentication:** JWT-based secure authentication mechanism
- **AI Integration:** OpenRouter / Google Gemini API for the FORGE Coach

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL database
- AI API Key (OpenRouter or Google Gemini)

### Backend Setup
1. Navigate to the `backend` directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your `.env` file with your Database URL, Secret Key, and API Keys.
5. Run database migrations:
   ```bash
   alembic upgrade head
   ```
6. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file pointing to your backend:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Security & Privacy
FORGE is built with privacy in mind. User data, including Pomodoro sessions, goal progress, and SRS reviews, are securely stored, and RBAC (Role-Based Access Control) ensures users only have access to their own data.

## License
This project is licensed under the MIT License.
