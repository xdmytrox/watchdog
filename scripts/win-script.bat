@echo off
set /a waitTime=%RANDOM% %% 5 + 1
set /a exitCode=%RANDOM% %% 2

echo Sleeping for %waitTime% seconds...
ping 127.0.0.1 -n %waitTime% >nul

echo Exiting with code %exitCode%
exit /b %exitCode%
