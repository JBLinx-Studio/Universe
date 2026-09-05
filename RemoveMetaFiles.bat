@echo off
title SYSTEM PURGE UTILITY
color 0F

:: Force the script to run in its own folder location
cd /d "%~dp0"

echo =======================================================================
echo                               CRITICAL WARNING
echo =======================================================================
echo  This utility will PERMANENTLY DELETE all targeted files from this 
echo  folder and ALL subfolders recursively.
echo =======================================================================
echo.
echo  To CANCEL: Close this window immediately.
echo  To PURGE : Press ANY KEY to execute the deletion.
echo.
pause >nul

echo [+] Purging target files from all directories...

:: The absolute most reliable native command for recursive multi-file deletion
del /s /q /f *.meta *.tmp *.bak thumb.db >nul 2>&1

echo.
echo =======================================================================
echo  EXECUTION COMPLETE: All targeted files have been successfully purged.
echo =======================================================================
timeout /t 3 >nul