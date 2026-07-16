@echo off
:: Force the command prompt to use UTF-8 so the heart renders properly
chcp 65001 >nul

cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    npm install
    echo Starting the application! Your widget will update every 24h
    npm run start
)
echo ----- Spotify Profile Stats Widget ----- ❤️ made by blank with ❤️  -----
echo:
echo:
echo Starting the application! Your widget will update every 24h
npm run start

exit