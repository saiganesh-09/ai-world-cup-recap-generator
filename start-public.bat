@echo off
rem Auto-started at logon by Task Scheduler (task name: WCRecapPublicDemo).
rem Brings up DB + tunnel + production app and re-publishes the demo URL.
cd /d "%~dp0"
npm run public >> "%USERPROFILE%\wc-recap-public.log" 2>&1
