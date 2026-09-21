# A/L MCQ — Premium Cloud Build

This version keeps the premium dashboard design and connects the main workflow to Supabase.

### Included
- Supabase email/password authentication
- Google OAuth hook
- Student profiles
- Published Physics/Chemistry papers
- Exact 50-question paper enforcement
- Server-side secure scoring through PostgreSQL RPC
- Student attempts and analytics
- Public leaderboard without exposing emails
- Admin paper creation
- Admin question manager
- Question screenshot uploads to Supabase Storage
- Review screenshot uploads
- Advertisement records
- RLS policies

### Browser-only deployment
No npm or Node.js is required.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Copy `config.example.js` to `config.js` and add the Supabase URL + publishable/anon key.
4. Create an account.
5. Promote it to admin in SQL:
   `update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL');`
6. Configure Google provider and Site URL in Supabase Auth.
7. Upload the folder to Vercel using its browser-based deployment flow.

Never put a Supabase service-role key in `config.js`.
