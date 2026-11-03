# Madrid Art History

Production website foundation for Madrid Art History at Saint Louis University Madrid.

## Current stage
- Compact hero treatment
- SLU-inspired visual system
- SLU symbol in footer
- No Apply button
- Community label in navigation/footer
- Supabase-ready architecture
- Placeholder content pages
- Admin area scaffold

Next: connect Supabase authentication/content and build the Exhibition editor.


Navigation is standardized across public pages: Home, Events (Exhibitions, Conferences, Activities at SLU), Community, Courses, and Faculty. Exhibition and conference cards open dedicated detail pages. Keep js/supabase.js configured with your existing project credentials.


## Expanded faculty profiles
The admin Faculty editor now includes:
- Full profile / research interests
- Recent publications (one publication per line)

The public faculty directory links to `public/faculty-profile.html` for each published profile.
Before using these new fields, run `supabase-faculty-profile-migration.sql` once in the Supabase SQL Editor to add `long_description` and `recent_publications` to `public.faculty`.


## Temporary Netlify preview

Upload the complete `madridarthistory` folder to Netlify. The root URL serves
`public/index.html`, and the admin dashboard is at `/admin/`.

Before inviting editors, add the deployed Netlify URL to Supabase Authentication
URL Configuration and verify Supabase Row Level Security policies. Never put a
Supabase service-role key or other privileged secret in public website files.

## Admin deletion controls

The admin dashboard includes a Delete button for exhibitions, conferences,
activities, community news, courses, and faculty records. Homepage image settings
are intentionally excluded. Deletion requires confirmation and depends on the
Supabase user's database permissions.
