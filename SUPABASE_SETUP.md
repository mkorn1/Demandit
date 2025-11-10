# Supabase Setup Instructions

This guide will walk you through setting up Supabase for the DemandIt! application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in (or create an account)
2. Click "New Project"
3. Fill in your project details:
   - **Name**: DemandIt (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose the region closest to you
4. Click "Create new project"
5. Wait for the project to be provisioned (this takes a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase project dashboard, go to **Settings** (gear icon in the sidebar)
2. Click on **API** in the settings menu
3. You'll need two values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 3: Set Up Environment Variables

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following variables:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

Replace:
- `your_project_url_here` with your Project URL from Step 2
- `your_anon_key_here` with your anon public key from Step 2
- `your_openai_api_key_here` with your OpenAI API key (if you haven't set this up yet)

## Step 4: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor** (in the sidebar)
2. Click "New query"
3. Copy and paste the following SQL script:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contact_info JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create case_messages table
CREATE TABLE case_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_case_messages_case_id ON case_messages(case_id);
CREATE INDEX idx_case_messages_created_at ON case_messages(case_id, created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for cases table
-- Users can only see their own cases
CREATE POLICY "Users can view their own cases"
  ON cases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own cases
CREATE POLICY "Users can insert their own cases"
  ON cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cases
CREATE POLICY "Users can update their own cases"
  ON cases FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own cases
CREATE POLICY "Users can delete their own cases"
  ON cases FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for case_messages table
-- Users can view messages for their own cases
CREATE POLICY "Users can view messages for their own cases"
  ON case_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_messages.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Users can insert messages for their own cases
CREATE POLICY "Users can insert messages for their own cases"
  ON case_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_messages.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Users can update messages for their own cases
CREATE POLICY "Users can update messages for their own cases"
  ON case_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_messages.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Users can delete messages for their own cases
CREATE POLICY "Users can delete messages for their own cases"
  ON case_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_messages.case_id
      AND cases.user_id = auth.uid()
    )
  );
```

4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned" if everything worked correctly

## Step 5: Verify Tables Were Created

1. Go to **Table Editor** in the Supabase dashboard
2. You should see two tables:
   - `cases`
   - `case_messages`

## Step 6: Test the Application

1. Make sure your `.env` file is set up correctly
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Navigate to the application in your browser
4. You should see the authentication page
5. Create a new account or sign in
6. Try creating a new case

## Troubleshooting

### "Missing Supabase environment variables" error

- Make sure your `.env` file exists in the root directory
- Verify that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- Restart your development server after adding/changing environment variables

### "User not authenticated" error

- Make sure you're signed in
- Check that Row Level Security policies are correctly set up
- Verify that the `auth.users` table exists (it's created automatically by Supabase)

### "Case not found or access denied" error

- Verify that Row Level Security policies are correctly set up
- Make sure the case belongs to the authenticated user
- Check the browser console for more detailed error messages

### Database connection issues

- Verify your Project URL is correct
- Check that your Supabase project is active (not paused)
- Ensure your internet connection is working

## Database Schema Overview

### `cases` Table

Stores case information for each user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | Foreign key to `auth.users(id)` |
| `title` | TEXT | Case title |
| `contact_info` | JSONB | Contact information (your info and recipient info) |
| `metadata` | JSONB | Additional metadata (e.g., selected chat type) |
| `created_at` | TIMESTAMP | When the case was created |
| `updated_at` | TIMESTAMP | When the case was last updated |

### `case_messages` Table

Stores chat messages for each case.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `case_id` | UUID | Foreign key to `cases(id)` |
| `text` | TEXT | Message content |
| `sender` | TEXT | Either 'user' or 'bot' |
| `metadata` | JSONB | Additional message metadata |
| `created_at` | TIMESTAMP | When the message was created |

## Security

The database uses Row Level Security (RLS) to ensure:
- Users can only access their own cases
- Users can only view/modify messages for their own cases
- All operations are authenticated through Supabase Auth

## Next Steps

- Customize the database schema if needed
- Add additional tables or columns as your application grows
- Set up database backups in Supabase dashboard
- Consider adding indexes for any custom queries you add

