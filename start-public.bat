@echo off
rem Auto-started at logon (installed in the Windows Startup folder).
rem Brings up DB + tunnel + production app and re-publishes the demo URL.
cd /d "C:\Users\saiga\OneDrive\Desktop\AI World Cup Recap Generator"
npm run public >> "%USERPROFILE%\wc-recap-public.log" 2>&1
