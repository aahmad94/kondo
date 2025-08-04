# <img src="public/icon.png" alt="Kondo Icon" width="32" height="32" style="display: inline; vertical-align: middle;"> Kondo

A language learning application that generates AI-powered content to help organize study material into bookmarks, with features for breakdown analysis, flashcards, and daily summaries.

<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px;">
  <img src="public/assets/light-mode_08042025.png" width="547" height="500">
</div>

## ✨ Key Features

- **🎯 AI-Generated Study Material** - Generate contextualized language learning content using OpenAI and organize it into personalized bookmarks
- **📊 Smart Ranking System** - Rank and organize your bookmarked responses to prioritize study material based on difficulty and mastery
- **🥋 Daily Dojo Sessions** - Automatically compile lower-ranked responses from all bookmarks into focused daily study sessions
- **🔍 Content Breakdown & Analysis** - Dissect and analyze generated material with detailed explanations and context
- **🃏 Interactive Flashcard Mode** - Study with interactive flashcards that hide and reveal content for effective memorization
- **🌍 Multi-Language Support** - Learn Japanese, Korean, Spanish, Arabic, and Chinese with language-specific features
- **🎧 Text-to-Speech Integration** - Listen to pronunciations with ElevenLabs voice synthesis
- **📱 Responsive Design** - Seamless experience across desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google OAuth credentials
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kondo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   
   Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE kondo_db;
   ```

4. **Environment Configuration**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables in `.env`:
   
   **Required Variables:**
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: [Get from Google Console](https://console.developers.google.com/)
   - `OPENAI_API_KEY`: [Get from OpenAI](https://platform.openai.com/api-keys)

   **Optional Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: For enhanced search
   - `ELEVENLABS_API_KEY`: For text-to-speech functionality
   - `NEXT_PUBLIC_AMPLITUDE_API_KEY`: For analytics

5. **Set up Google OAuth**
   
   In [Google Console](https://console.developers.google.com/):
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

6. **Database Setup**
   
   Run Prisma migrations and seed the database:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Additional Setup Notes

- **Languages**: The app supports Japanese, Korean, Spanish, and Arabic. The seed script creates these languages in the database.
- **Authentication**: Users sign in with Google OAuth and get default bookmarks created automatically.
- **Database**: Uses Prisma ORM with PostgreSQL for data management.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Troubleshooting

- **Database connection issues**: Verify your `DATABASE_URL` is correct and PostgreSQL is running
- **OAuth errors**: Check your Google Console setup and redirect URIs
- **Missing languages**: Run `npx prisma db seed` to populate initial language data

