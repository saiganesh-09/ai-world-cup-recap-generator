' Hidden launcher for the public demo — runs start-public.bat with no
' console window, so it can't be killed by console close/Ctrl events.
Set sh = CreateObject("WScript.Shell")
sh.Run """C:\Users\saiga\OneDrive\Desktop\AI World Cup Recap Generator\start-public.bat""", 0, False
