# ⚒️ FORGE — Goal Tracking Dashboard

> *"Consistency over ambition."*

A dark, industrial-aesthetic goal tracking dashboard built with React + TypeScript + Vite + Tailwind CSS + Framer Motion.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS + custom design system |
| State management | Zustand (with localStorage persistence) |
| Animations | Framer Motion |
| Icons | Lucide React |
| UI primitives | Radix UI (via shadcn/ui pattern) |
| Fonts | Bebas Neue, Barlow, DM Mono |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Project Structure

```
src/
├── components/
│   ├── AddGoalModal.tsx      # New goal dialog
│   ├── EmailNudges.tsx       # 3-tier email preview system
│   ├── GoalCard.tsx          # Individual goal with progress
│   ├── HeroBanner.tsx        # Hero with rotating motivational quotes
│   ├── JSONTemplate.tsx      # LLM template with syntax highlighting
│   ├── NudgePanel.tsx        # Duolingo-style angry nudge
│   ├── Sidebar.tsx           # Navigation + streak widget
│   ├── StreakCelebration.tsx # Confetti + banner on full week
│   └── WeekTracker.tsx       # 7-day completion tracker
│
├── hooks/
│   └── useQuote.ts           # Auto-rotating quote hook
│
├── lib/
│   ├── data.ts               # Quotes, email templates, JSON template
│   └── utils.ts              # cn(), generateId(), date utils
│
├── pages/
│   ├── AuthPage.tsx          # Login + Signup
│   └── DashboardPage.tsx     # Main dashboard view
│
├── store/
│   └── useAppStore.ts        # Zustand store (persisted)
│
└── types/
    └── index.ts              # TypeScript interfaces
```

---

## Features

### 🎯 Goal Tracking
- Create goals with type (Learn / Build / Habit / Fitness)
- Sub-topic chips — click to toggle completion
- Auto-calculated progress %
- Status tracking: On Track / At Risk / Behind
- Delete goals

### 🔥 Streak System
- 7-day weekly tracker
- Tap any past day to mark complete/incomplete
- Streak counter synced in sidebar
- Confetti + celebration banner when full week complete

### 😤 Duolingo-Style Nudge System
- Intelligent nudge panel detects lagging goals
- Escalates severity based on days since last log:
  - Day 1: Gentle reminder
  - Day 3: Stern warning
  - Day 7+: Nuclear disappointment
- "Log Progress" action marks today complete

### 📧 Email Preview System
- 3-tier email templates (Gentle → Stern → Nuclear)
- Goggins/Marcus Aurelius quote integration
- Designed to connect to FastAPI + Celery backend

### 🤖 LLM Learning Template
- Structured JSON template with:
  - Major topic + goal statement
  - Sub-topics with chapters/sections
  - Resources (books, courses, docs, community)
  - Projects (beginner → capstone)
  - Knowledge tests (quiz, teach-back, code challenge)
  - Milestone checkpoints
- One-click copy to clipboard
- Syntax highlighted code viewer

### 💬 Motivational Quotes
- 14+ quotes from Goggins, Marcus Aurelius, James Clear, Tim Ferriss
- Auto-rotates every 30 seconds
- Animated transitions

---

## FastAPI Backend Integration

### Install Fastapi boilerplate and add these endpoints:

```python
# POST /api/auth/register
# POST /api/auth/login
# GET  /api/goals
# POST /api/goals
# PUT  /api/goals/{id}
# DELETE /api/goals/{id}
# POST /api/goals/{id}/log
# GET  /api/streak
# POST /api/streak/reset
```

### Email Nudge Cron (Celery):

```python
# tasks/nudge_emails.py
from celery import Celery
from datetime import datetime, timedelta

@celery.task
def send_nudge_emails():
    users = db.query(User).all()
    for user in users:
        if user.nudge_preference == 'off':
            continue
        
        lagging_goals = [
            g for g in user.goals
            if (datetime.now() - g.last_logged_at).days >= 1
            and g.status != 'on_track'
        ]
        
        for goal in lagging_goals:
            days_behind = (datetime.now() - goal.last_logged_at).days
            
            if days_behind >= 7:
                send_nuclear_email(user, goal)
            elif days_behind >= 3:
                send_stern_email(user, goal)
            else:
                send_gentle_email(user, goal)

# Schedule: 
# Celery beat: run every day at 8pm user local time
```

### Environment Variables:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=FORGE
```

---

## Design System

The design uses a custom industrial/utilitarian aesthetic:

- **Background**: `#0a0a0a` (near black)
- **Surface**: `#111111` / `#1a1a1a`
- **Accent**: `#f59e0b` (amber/fire)
- **Fire**: `#ff6b00` (streak color)
- **Fonts**: Bebas Neue (display), Barlow Condensed (headings), Barlow (body), DM Mono (labels/code)

---

## Connecting to shadcn/ui

The project uses Radix UI primitives directly. To add full shadcn/ui:

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button dialog input label select tabs toast
```

Then replace custom inputs/buttons with shadcn variants while keeping the Tailwind design tokens.

---

*"You do not rise to the level of your goals. You fall to the level of your systems."*  
— James Clear
