# AI Code Reviewer — Project Details

## 1. Overview
A GenAI web app that reviews source code, detects bugs, suggests improvements, and auto-generates documentation. **Goal:** improve code quality and save developers' review time.

## 2. Problem Statement
Manual code reviews are slow, inconsistent, and depend on reviewer availability. Beginners rarely get feedback at all. Documentation is often skipped.

## 3. Solution
Paste code into the web UI. A serverless backend sends it to an LLM (Google Gemini free tier, or optionally Claude) with a structured prompt. The model returns JSON that the UI renders as: quality score, bugs (with severity + fix), improvement suggestions, generated docs, and a refactored version.

## 4. Features
- Quality score (0–100) and summary
- Bug detection with severity, line reference, explanation, and fix
- Improvement suggestions (performance, readability, security, style, design, testing)
- Auto-generated Markdown documentation
- Refactored code with copy button
- Multi-language support, dark mode, responsive UI

## 5. Tech Stack
| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Vercel Serverless Function (Node.js) |
| AI | Google Gemini API (free tier); optional Anthropic Claude |
| Hosting | Vercel |

## 6. Architecture
```
Browser (public/index.html)
   │  POST /api/review {code, language}
   ▼
Vercel Serverless Function (api/review.js)
   │  validates input → builds prompt → calls LLM
   ▼
Gemini API  →  structured JSON  →  UI renders tabs
```
The API key stays on the server (environment variable) and is never exposed to the browser.

## 7. Folder Structure
```
ai-code-reviewer/
├── api/review.js        # backend endpoint
├── public/index.html    # frontend UI
├── package.json
├── .env.example
├── .gitignore
└── PROJECT_DETAILS.md
```

## 8. Run Locally
```bash
npm i -g vercel
cd ai-code-reviewer
cp .env.example .env.local     # add your GEMINI_API_KEY
vercel dev                      # open http://localhost:3000
```

## 9. Deploy on Vercel
1. Push the folder to a GitHub repo.
2. Go to vercel.com → **Add New → Project** → import the repo.
3. Framework preset: **Other**. Leave build settings empty.
4. Add environment variable `GEMINI_API_KEY` (optional: `MODEL`).
5. Click **Deploy**. Your live URL is ready.

Note: Hobby plan functions time out at ~10s by default. If reviews time out, add a `vercel.json` with `{"functions":{"api/review.js":{"maxDuration":60}}}` (check your plan's limit), or reduce `max_tokens`.

## 10. Security & Limits
- Input capped at 15,000 characters
- API key only in server env vars
- User content is HTML-escaped before rendering (prevents XSS)
- Add rate limiting (e.g., Upstash Redis) before public launch to control API cost

## 11. Future Enhancements
- GitHub PR integration via webhook (auto-comment on pull requests)
- File/folder upload and multi-file review
- Syntax-highlighted editor (Monaco)
- Streaming responses
- Review history with login (Supabase/Firebase)
- Custom rule sets (team coding standards)
