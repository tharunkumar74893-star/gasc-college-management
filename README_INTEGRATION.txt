GASC College Management System - Integration Candidate

Project source:
- Original files came from the user's supplied GitHub backup ZIP.
- Existing page structure, images, login/register pages and Supabase config are retained.

Updated frontend:
- assets/app.js
- assets/style.css
- Timetable UI includes Section.
- Admin can review leave requests but does not submit an applicant request.

Database files:
- database/GASC_Three_Management_Migration.sql: reference copy of the earlier base migration. Do not rerun if already applied.
- database/GASC_Three_Management_Roster_RPC.sql: reference copy of the roster RPC already installed per prior progress.
- database/GASC_Combined_Integrity_Fix.sql: new additive trigger/section add-on.

Before live deployment:
1. Export/backup the current Supabase database.
2. Review the add-on against the actual live schema and current triggers/policies.
3. Apply only the add-on after confirming the base tables/columns exist.
4. Test Student, Faculty, HOD and Admin logins and each workflow in a staging copy.
5. Only then deploy the frontend files to GitHub Pages.

Limitations:
- No live Supabase/browser end-to-end tests were possible here.
- Attendance is manual; facial recognition is not implemented.
