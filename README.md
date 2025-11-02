# Mentivio

Mentivio combines mentoring, vision, and interaction to deliver AI guidance, adaptive learning, and chat-based assistance in one integrated platform.

---

## Overview

Mentivio is an AI-powered e-learning solution focused on making learning interactive and personalized.  
It integrates AI tutoring, flashcard-based revision, auto-generated quizzes, and progress tracking into a unified experience.

The system consists of:
- **Frontend:** React and TailwindCSS
- **Backend:** Node.js, Express, and MongoDB
- **AI Service:** Python Flask microservice for document processing and quiz generation

---

## Features Implemented

### 1. AI Tutor Module

The AI Tutor provides interactive learning via:
- AI-driven question answering and concept explanations
- Socratic-style tutoring for deeper understanding
- Automated flashcard generation from uploaded materials
- AI-generated quizzes for self-assessment and practice

Key frontend components:
- `Chat.js` — AI chat interface and Q&A logic
- `Flashcards.js` — Displays flashcards generated from materials
- `Quiz.js` — Quiz generation and scoring

---

### 2. Learning and Progress Tracking (Dashboard)

The Dashboard presents a user-focused view of learning progress and analytics:

- Quizzes taken: Total quizzes completed
- Questions answered: Total attempted questions
- Overall accuracy: Percentage of correct answers
- Day streak: Consecutive learning days
- Strong topics: High accuracy subjects
- Topics to review: Areas needing improvement
- Topic performance: Detailed statistics per topic

Dashboard implementation:
- Frontend: `Dashboard.js`
- Backend: `progress.js` route, using the `Progress` model in MongoDB

---

### 3. Document Upload & AI Material Processing

Users can upload study materials (PDFs, documents) which are:
- Sent to the Flask microservice for text extraction (`document_processor.py`)
- Processed into structured content for flashcards and quizzes and AI chat
- Stored as `Material` entries in the backend for later retrieval

Workflow:
- Frontend: `Upload.js`
- Backend: `upload.js` route
- Flask service via API calls

---

## Project Structure

### Frontend (React + TailwindCSS)

**Components:**
- `AuthContext.jsx` — Manages global authentication state
- `AuthPage.jsx` — Login and registration
- `Chat.js` — AI Tutor chat interface
- `CTA.jsx` — Landing page call-to-action banner
- `Dashboard.js` — Learning and progress tracking
- `Features.jsx` — Displays platform features
- `Flashcards.js` — Flashcard generation and display
- `Footer.jsx` — Page footer
- `Header.jsx` — Navigation bar
- `Hero.jsx` — Homepage introduction
- `HowItWorks.jsx` — Platform usage steps
- `Quiz.js` — Quiz interface
- `ScrollToTop.jsx` — Route navigation handling
- `Stats.jsx` — Learning statistics
- `Upload.js` — File upload UI

**Pages:**
- `App.css` — Global styles
- `Home.jsx` — Main landing page composition
- `Layout.jsx` — Common layout (header, footer, content)
- `Login.jsx` — Integrated login page
- `NotFound.jsx` — 404 error page
- `Tutor.js` — AI Tutor interface (chat, flashcards, quizzes)

**Services:**
- `api.js` — Centralized backend and Flask API calls

---

### Backend (Node.js + Express + MongoDB)

**Core File:**
- `server.js` — Main backend entry point, middleware setup, route connections, MongoDB initialization

**Models:**
- `Material.js` — Uploaded materials schema
- `Progress.js` — User progress metrics schema
- `Quiz.js` — Quiz questions, answers, and scoring schema

**Routes:**
- `progress.js` — User statistics and dashboard data
- `tutor.js` — AI Tutor logic (flashcards, quizzes, chat)
- `upload.js` — Document upload and Flask service integration

---

### Flask Microservice (Python + Flask)

**Core Application:**
- `app.py` — Main Flask app, API routes, NLP integration

**Services:**
- `document_processor.py` — Document extraction and structuring
- `qa_service.py` — AI Tutor question-answer generation
- `quiz_generator.py` — Quiz creation from materials
- `socratic_tutor.py` — Socratic tutoring logic

---

## Technologies Used

- **Frontend:** React, TailwindCSS, Framer Motion
- **Backend:** Node.js, Express.js, MongoDB
- **AI/ML Service:** Flask, Python, LangChain, NLP, OpenAI API
- **Version Control:** Git, GitHub

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Raheelkhan-05/Mentivio.git
cd Mentivio
```

### 2. Install Dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
npm install
```

**Flask Service:**
```bash
cd flask-service
pip install -r requirements.txt
```

### 3. Add Environment Variables

Create `.env` files in `backend` and `flask-service` for sensitive keys (OpenAI API, MongoDB URI, etc.).  

### 4. Run Project

Start services in separate terminals:

**Frontend:**
```bash
cd frontend
npm start
```

**Backend:**
```bash
cd backend
node server.js
```

**Flask Service:**
```bash
cd flask-service
python app.py
```

---

## Current Status

- Frontend: Home, Login, Tutor, Dashboard interfaces implemented
- Tutor Module: AI chat, flashcards, quizzes functional
- Dashboard: Learning progress and performance tracking available
- Backend APIs: Connected for file upload, quiz generation, progress tracking
- Flask Microservice: Document processing and AI interaction operational

---
