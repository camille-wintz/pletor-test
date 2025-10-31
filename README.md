# Fullstack FastAPI + Vite React Project

This project is a template for a modern fullstack app using:
- **Backend:** FastAPI (Python) with `uv` for dependency management and hot-reload
- **Frontend:** Vite + React (JavaScript/TypeScript)
- **Development:** Docker Compose for orchestration, with live reload for both frontend and backend

---

## Exercise: Production-Ready Image Gallery (~1 hour)

**Goal:** Improve the existing image gallery to make it production-ready. The backend is complete - focus on creating an excellent user experience.

### The Challenge

Currently, users can only add images by pasting URLs. This is a poor user experience. 

**Your task:** Replace the URL input with proper file uploads and make the app feel professional and polished.

### What We're Looking For

We want to see how you approach building production-ready user interfaces. Consider:

- **User Experience:** How do you make uploads intuitive and provide good feedback?
- **Error Handling:** What happens when things go wrong?
- **Code Quality:** How do you structure and organize your code?
- **Performance:** How do you keep the UI responsive?

### Hints

- The backend accepts file uploads via multipart/form-data
- API documentation is available at http://localhost:8000/docs
- Consider what happens when things go wrong
- The existing code is a starting point - feel free to refactor

---

## Getting Started

1. Start the backend and frontend:
```bash
docker compose up --build
```

Both services have hot-reload enabled - changes to your code will automatically update.

---

## Project Structure

```
backend/    # FastAPI app (Python)
frontend/   # Vite + React app (JS/TS)
docker-compose.yml
```

---

## Accessing the Apps

- **Backend (FastAPI):** [http://localhost:8000](http://localhost:8000)
- **Frontend (Vite React):** [http://localhost:5173](http://localhost:5173)

---

## Development Notes

- **Backend:**
  - Hot reload enabled via `uvicorn --reload` and Docker volume mount.
  - Edit code in `backend/` and changes will reflect automatically.
- **Frontend:**
  - Hot reload enabled via Vite dev server and Docker volume mount.
  - Edit code in `frontend/` and changes will reflect automatically.

---
