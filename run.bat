@echo off
echo Starting ShareDrop Application...
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm packages are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install dependencies!
        pause
        exit /b 1
    )
)

:: Start the development server
echo Starting development server...
echo The application will be available at http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
npm run dev 