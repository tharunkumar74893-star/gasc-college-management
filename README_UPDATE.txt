GASC College Management System — Attendance + Timetable update candidate

Keep the original backup. This ZIP is a candidate, not a verified production release.

Frontend file to replace:
- assets/app.js

Database patch:
- database/GASC_Automatic_Attendance_and_Timetable_Integer_Fix.sql

Read ATTENDANCE_TIMETABLE_UPDATE_TA.txt before applying the SQL. Take a Supabase backup first. The SQL requires pg_cron and assumes the existing attendance_sessions unique key (department, academic_year, semester, session_date), attendance_records unique key (session_id, student_id), and profiles columns (role, status, department, academic_year, semester).

Timetable day_of_week is sent as an integer: Monday=1 through Saturday=6. This matches the reported live integer column and avoids sending the text "Saturday".

Attendance automatically creates daily cohort sessions at 09:30 IST and finalizes missing attendance as absent at 10:30 IST using pg_cron. Students can self-check-in only while signed in during the window. Faculty/HOD/Admin no longer start sessions.

Face recognition is NOT implemented. The student self-check-in confirms the signed-in account, not physical presence. Do not describe it as face attendance or biometric verification.

Checks performed: JavaScript syntax check passed. Live Supabase, pg_cron scheduling, RLS, and end-to-end browser checks were not run here.
