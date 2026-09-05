@echo off
setlocal enabledelayedexpansion
title File Extension Converter
color 0F

:: Ensure script runs from the script's directory
cd /d "%~dp0"

echo =======================================================================
echo                       FILE EXTENSION CONVERTER
echo =======================================================================
echo  Target Directory: %CD%
echo =======================================================================
echo.
echo  Press ANY KEY to begin the conversion process.
echo  Or close this window to cancel.
echo.
pause >nul

echo [+] Initialising conversion utility...
set "total_count=0"

:: =======================================================================
:: CONFIGURATION BLOCK: Define your extension mappings here
:: Syntax: call :ProcessConversion ".oldExtension" ".newExtension"
:: =======================================================================
call :ProcessConversion ".cs"     ".ts"
call :ProcessConversion ".shader" ".ts"
:: Add more lines below as needed following the exact same format:
:: call :ProcessConversion ".txt"    ".md"
:: =======================================================================

echo.
echo =======================================================================
echo  EXECUTION COMPLETE
echo  Total files successfully converted: !total_count!
echo =======================================================================
timeout /t 4 >nul
exit /b

:: -----------------------------------------------------------------------
:: Core Processing Function
:: -----------------------------------------------------------------------
:ProcessConversion
set "from_ext=%~1"
set "to_ext=%~2"

echo.
echo [-] Searching for %from_ext% files...

for /r %%F in (*%from_ext%) do (
    if exist "%%F" (
        echo  [X] Converting: %%~nxF --^> %%~nF%to_ext%
        ren "%%F" "%%~nF%to_ext%"
        set /a total_count+=1
    )
)
goto :eof