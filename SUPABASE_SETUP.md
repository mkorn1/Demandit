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

### Option A: Initial Setup (New Projects)

If you're setting up a new project, use the migration script in `database_migration.sql` which includes all tables and relationships.

### Option B: Migrating Existing Projects

If you already have an existing database with the old schema, run the migration script:

1. In your Supabase dashboard, go to **SQL Editor** (in the sidebar)
2. Click "New query"
3. Open the `database_migration.sql` file in this project
4. Copy and paste the entire contents into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" if everything worked correctly

**Important Notes for Migration:**
- The migration script is idempotent (safe to run multiple times)
- Existing `case_messages` will be assigned to the case creator
- You'll need to manually create companies and assign users to them
- Update your signup flow to require `company_id`

## Step 5: Create Initial Company

After running the migration, you need to create at least one company:

1. In your Supabase dashboard, go to **SQL Editor**
2. Run this query to create a test company:

```sql
INSERT INTO companies (name) 
VALUES ('Your Company Name')
RETURNING id;
```

3. Save the returned `id` - you'll need it for user signup

## Step 6: Verify Tables Were Created

1. Go to **Table Editor** in the Supabase dashboard
2. You should see the following tables:
   - `companies`
   - `user_profiles`
   - `templates`
   - `cases` (with new `company_id` column)
   - `case_users`
   - `case_templates`
   - `case_messages` (with new `user_id` column)

## Step 7: Test the Application

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

### `companies` Table

Stores company information. Each user belongs to exactly one company.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `name` | TEXT | Company name |
| `created_at` | TIMESTAMP | When the company was created |
| `updated_at` | TIMESTAMP | When the company was last updated |

### `user_profiles` Table

Extends `auth.users` with company association. Each user must have a profile with a `company_id`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references `auth.users(id)` |
| `company_id` | UUID | Foreign key to `companies(id)` |
| `created_at` | TIMESTAMP | When the profile was created |
| `updated_at` | TIMESTAMP | When the profile was last updated |

### `templates` Table

Stores company-wide templates. All users in a company can view and edit these templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `company_id` | UUID | Foreign key to `companies(id)` |
| `name` | TEXT | Template name |
| `type` | TEXT | Template type (default: 'demand-letter') |
| `content` | TEXT | Template content |
| `created_by` | UUID | Foreign key to `auth.users(id)` - who created it |
| `created_at` | TIMESTAMP | When the template was created |
| `updated_at` | TIMESTAMP | When the template was last updated |

### `cases` Table

Stores case information. Cases belong to a company and can have multiple users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | Foreign key to `auth.users(id)` - case creator |
| `company_id` | UUID | Foreign key to `companies(id)` |
| `title` | TEXT | Case title |
| `contact_info` | JSONB | Contact information (your info and recipient info) |
| `metadata` | JSONB | Additional metadata (e.g., selected chat type) |
| `created_at` | TIMESTAMP | When the case was created |
| `updated_at` | TIMESTAMP | When the case was last updated |

### `case_users` Table

Many-to-many relationship between cases and users. Tracks which users have access to which cases.

| Column | Type | Description |
|--------|------|-------------|
| `case_id` | UUID | Foreign key to `cases(id)` |
| `user_id` | UUID | Foreign key to `auth.users(id)` |
| `added_at` | TIMESTAMP | When the user was added to the case |
| `added_by` | UUID | Foreign key to `auth.users(id)` - who added them |

### `case_templates` Table

Stores template instances (snapshots) for each case. When a template is added to a case, a snapshot is created so future edits to the company template don't affect existing cases.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `case_id` | UUID | Foreign key to `cases(id)` |
| `template_id` | UUID | Foreign key to `templates(id)` - original template (nullable) |
| `name` | TEXT | Template name (snapshot) |
| `type` | TEXT | Template type (snapshot) |
| `content` | TEXT | Template content (snapshot) |
| `added_at` | TIMESTAMP | When the template was added to the case |
| `added_by` | UUID | Foreign key to `auth.users(id)` - who added it |

### `case_messages` Table

Stores chat messages for each case. Each message is associated with a specific user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `case_id` | UUID | Foreign key to `cases(id)` |
| `user_id` | UUID | Foreign key to `auth.users(id)` - who sent the message |
| `text` | TEXT | Message content |
| `sender` | TEXT | Either 'user' or 'bot' |
| `metadata` | JSONB | Additional message metadata |
| `created_at` | TIMESTAMP | When the message was created |

## Security

The database uses Row Level Security (RLS) to ensure:

### Company-Level Security
- Users can only view companies they belong to
- Users can view profiles of other users in their company

### Template Security
- Users can view, create, update, and delete templates in their company
- Template edits are company-wide (all users see changes)

### Case Security
- Users can view cases they're part of (via `case_users`)
- Users can create cases in their company
- Users can update/delete cases they're part of
- All users on a case can add/remove other users (must be in same company)

### Message Security
- Users can only view their own messages for cases they're part of
- Users can only create/update/delete their own messages
- Each user has their own chat history per case

### Template Instance Security
- When a template is added to a case, a snapshot is created in `case_templates`
- Users on a case can view, add, update, and delete template instances for that case
- Template instances are independent of the original template (snapshots)

## Key Features

### Multi-User Cases
- Cases can have multiple users from the same company
- Each user has their own chat history (only sees their own messages)
- All users on a case can see all case documents and templates
- All users on a case can add/remove other users

### Company Templates
- Templates are company-wide (all users in a company see the same templates)
- Users can edit company templates (changes affect all users)
- When a template is added to a case, a snapshot is created
- Template snapshots are independent (editing the company template doesn't affect existing case templates)

### User-Company Relationship
- Each user belongs to exactly one company
- Company is set at signup or created manually in Supabase
- Users can see other users in their company

## Next Steps

1. **Update Signup Flow**: Modify your signup process to require `company_id` and create a `user_profiles` entry
2. **Update Case Service**: Modify `caseService.js` to work with the new multi-user model
3. **Update Template Service**: Create a service to manage company templates and case template instances
4. **Add User Management**: Implement UI for adding/removing users from cases
5. **Update Chat**: Ensure chat messages are filtered by `user_id` for each user
6. **Set up database backups** in Supabase dashboard

