# TESTYOURSELF AI — Setup Guide
# Stack: React + Vite + React Router | NestJS backend | Firebase Auth | Tailwind CSS

## Files

### Frontend (drop into your React project)
```
src/pages/AI/AI.jsx   →  your AI page
```

### Backend (drop into your NestJS project)
```
ai.controller.ts   →  your AI controller
ai.module.ts       →  your AI module
```

---

## Step 1 — Install Anthropic SDK (in your NestJS backend)
```bash
npm install @anthropic-ai/sdk
```

## Step 2 — Add your API key to your backend .env
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## Step 3 — Register AiModule in your AppModule
In your `app.module.ts`, import and add AiModule:
```typescript
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // ...your existing modules
    AiModule,
  ],
})
export class AppModule {}
```

## Step 4 — Add the AI route in your React Router
In your router file (likely `App.jsx` or `main.jsx`), add:
```jsx
import AI from "./pages/AI/AI";

// inside your <Routes>
<Route path="/ai" element={<AI />} />
```

## Step 5 — Done!
Visit `/ai` in your app. The page uses your existing:
- Firebase auth (same token pattern as StudyMaterial)
- Dark mode context
- Tailwind styling
- Navigation tabs

---

## Backend endpoints created
- POST /ai/quiz      → generates quiz questions
- POST /ai/ask       → answers study questions  
- POST /ai/summarize → summarizes notes

All endpoints are protected by FirebaseAuthGuard (same as your other routes).
