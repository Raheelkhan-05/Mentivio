---
title: AI Tutor Backend
emoji: 🎓
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
license: mit
---

# AI Tutor Backend

Backend API for AI Tutor application with semantic attention and RAG capabilities.

## Features
- Azure OpenAI integration
- MongoDB vector storage
- Semantic attention mechanism
- Document processing (PDF, TXT)
- Conversation memory

## Environment Variables Required
Set these in Space Settings -> Repository secrets:

```
AZURE_OPENAI_API_BASE=your_endpoint
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_API_VERSION=2023-12-01-preview
AZURE_OPENAI_API_NAME=gpt-4o
AZURE_OPENAI_MODEL=gpt-4o

embedding_AZURE_OPENAI_API_BASE=your_embedding_endpoint
embedding_AZURE_OPENAI_API_KEY=your_embedding_key
embedding_AZURE_OPENAI_API_VERSION=2023-12-01-preview
embedding_AZURE_OPENAI_API_NAME=text-embedding-ada-002

MONGODB_URI=your_mongodb_uri

QA_TEMPERATURE=0.3
```

## API Endpoints
- POST `/ask-question` - Main QA endpoint
- POST `/upload-material` - Upload documents
- GET `/health` - Health check