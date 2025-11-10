# Database Schema Design: Multi-User Cases & Company Templates

## Overview

This document describes the database schema changes to support:
1. **Companies**: Every user belongs to exactly one company
2. **Company Templates**: Templates are shared across all users in a company
3. **Template Instances**: When templates are added to cases, snapshots are created
4. **Multi-User Cases**: Cases can have multiple users with individual chat histories

## Schema Design

### Core Tables

#### `companies`
- Stores company information
- Each user belongs to exactly one company
- Created manually in Supabase or via signup flow

#### `user_profiles`
- Extends `auth.users` with `company_id`
- Required for every user (created during signup)
- Links users to their company

#### `templates`
- Company-wide templates
- All users in a company can view/edit
- Edits are company-wide (affect all users)

#### `case_templates`
- Template instances (snapshots) for cases
- Created when a template is added to a case
- Independent of original template (snapshots)
- Allows editing company templates without affecting existing cases

### Case & User Relationships

#### `cases`
- Modified to include `company_id`
- `user_id` remains as the case creator
- Belongs to a company

#### `case_users`
- Many-to-many relationship
- Tracks which users have access to which cases
- All users on a case can add/remove other users
- Users must be in the same company

#### `case_messages`
- Modified to include `user_id`
- Each message is associated with a specific user
- Users only see their own messages
- Each user has their own chat history per case

## Key Features

### 1. Company Isolation
- Users can only see users, templates, and cases in their company
- RLS policies enforce company boundaries

### 2. Template Management
- **Company Templates**: Shared, editable by all company users
- **Case Templates**: Snapshots created when added to a case
- Editing a company template doesn't affect existing case templates

### 3. Multi-User Case Access
- Cases can have multiple users from the same company
- All users can:
  - View case details
  - See all case documents
  - See all case templates
  - Add/remove other users
- Each user has:
  - Their own chat history (only sees their own messages)

### 4. Security Model

#### Row Level Security (RLS) Policies

**Companies:**
- Users can view their own company

**User Profiles:**
- Users can view profiles in their company
- Users can update their own profile

**Templates:**
- Users can view/create/update/delete templates in their company

**Cases:**
- Users can view cases they're part of (via `case_users`)
- Users can create cases in their company
- Users can update/delete cases they're part of

**Case Users:**
- Users can view/add/remove users from cases they're part of
- Added users must be in the same company

**Case Templates:**
- Users can view/add/update/delete template instances for cases they're part of

**Case Messages:**
- Users can only view their own messages
- Users can only create/update/delete their own messages

## Migration Notes

### For Existing Databases

1. Run `database_migration.sql` in Supabase SQL Editor
2. The migration is idempotent (safe to run multiple times)
3. Existing `case_messages` will be assigned to the case creator
4. You'll need to:
   - Create companies manually
   - Assign existing users to companies
   - Update signup flow to require `company_id`

### Data Migration Steps

1. **Create Companies:**
   ```sql
   INSERT INTO companies (name) VALUES ('Company Name') RETURNING id;
   ```

2. **Assign Users to Companies:**
   ```sql
   INSERT INTO user_profiles (id, company_id)
   SELECT id, 'company-uuid-here' FROM auth.users;
   ```

3. **Update Existing Cases:**
   ```sql
   UPDATE cases 
   SET company_id = (SELECT company_id FROM user_profiles WHERE id = cases.user_id)
   WHERE company_id IS NULL;
   ```

4. **Migrate Existing Messages:**
   - The migration script automatically assigns existing messages to case creators
   - No manual action needed

5. **Create Case Users Entries:**
   ```sql
   INSERT INTO case_users (case_id, user_id, added_by)
   SELECT id, user_id, user_id FROM cases
   ON CONFLICT (case_id, user_id) DO NOTHING;
   ```

## Application Code Changes Required

### 1. Signup Flow
- Require `company_id` during signup
- Create `user_profiles` entry after user creation
- Example:
  ```javascript
  const { data: { user } } = await supabase.auth.signUp({ email, password });
  await supabase.from('user_profiles').insert({
    id: user.id,
    company_id: selectedCompanyId
  });
  ```

### 2. Case Service Updates
- Update `getCases()` to use `case_users` instead of `user_id`
- Update `createCase()` to:
  - Set `company_id` from user's profile
  - Automatically add creator to `case_users` (handled by trigger)
- Add functions:
  - `addUserToCase(caseId, userId)`
  - `removeUserFromCase(caseId, userId)`
  - `getCaseUsers(caseId)`

### 3. Message Service Updates
- Update `getCaseMessages()` to filter by `user_id = auth.uid()`
- Update `addCaseMessage()` to set `user_id = auth.uid()`
- Each user only sees their own messages

### 4. Template Service (New)
- Create `templateService.js` with:
  - `getCompanyTemplates()` - get all templates for user's company
  - `createTemplate(template)` - create company template
  - `updateTemplate(templateId, updates)` - update company template
  - `deleteTemplate(templateId)` - delete company template
  - `getCaseTemplates(caseId)` - get template instances for a case
  - `addTemplateToCase(caseId, templateId)` - create template instance
  - `updateCaseTemplate(caseTemplateId, updates)` - update template instance
  - `deleteCaseTemplate(caseTemplateId)` - delete template instance

### 5. User Management UI
- Add UI to show users on a case
- Add UI to add/remove users from cases
- Filter users by company (only show users in same company)

## Database Triggers

### Auto-Add Case Creator
- Trigger: `trigger_auto_add_case_creator`
- Automatically adds case creator to `case_users` when case is created
- Ensures creator always has access to their cases

## Indexes

All tables have appropriate indexes for:
- Foreign key lookups
- Common query patterns
- Performance optimization

## Testing Checklist

After migration, test:
- [ ] User signup with company assignment
- [ ] Creating cases (should auto-add creator to case_users)
- [ ] Viewing cases (only cases user is part of)
- [ ] Adding users to cases
- [ ] Removing users from cases
- [ ] Chat messages (only user's own messages)
- [ ] Company templates (view/edit)
- [ ] Adding templates to cases (creates snapshot)
- [ ] Editing company templates (doesn't affect case templates)
- [ ] RLS policies (users can't access other companies' data)

## Questions or Issues?

If you encounter any issues during migration:
1. Check RLS policies are enabled
2. Verify user has `user_profiles` entry with `company_id`
3. Ensure cases have `company_id` set
4. Check that users are in `case_users` for cases they should access

