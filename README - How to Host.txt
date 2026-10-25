================================================================================
 GLOBAL BYPASS V2.1 — WEB CONTROLLER & ONLINE MASTER SWITCH
 Developer: rixxy.so
================================================================================

This web application gives you a cloud-accessible Master Switch to turn the
Global Bypass V2.1 executable ON or OFF for all users worldwide in 1 click!

--------------------------------------------------------------------------------
OPTION 1: RUN LOCALLY (ON YOUR PC / LAPTOP)
--------------------------------------------------------------------------------
1. Open PowerShell or Command Prompt in this folder:
   cd "C:\Users\Ricky\Downloads\NEW UI BP\Global Bypass Web Controller"

2. Start the server:
   node server.js

3. Open your browser to:
   http://localhost:3000

4. Default Admin Key:
   kismis*285667##$##09jhk12K-

--------------------------------------------------------------------------------
OPTION 2: HOST 100% FREE ONLINE (ACCESSIBLE FROM YOUR PHONE 24/7)
--------------------------------------------------------------------------------
You can host this for FREE on Render.com or Vercel in 2 minutes:

USING RENDER (Recommended - Free & 24/7):
1. Create a free account at https://render.com
2. Upload this folder to a GitHub repository.
3. On Render, click 'New +' -> 'Web Service'.
4. Connect your GitHub repository.
5. Settings:
   - Environment: Node
   - Build Command: (leave empty or npm install)
   - Start Command: node server.js
6. Click 'Deploy Web Service'.
7. Render gives you an online URL (e.g. https://my-bypass-server.onrender.com).

USING VERCEL:
1. Install vercel CLI: npm i -g vercel
2. In this folder, type: vercel
3. Follow the 3 prompts. It deploys instantly to a free URL!

--------------------------------------------------------------------------------
HOW TO CONNECT GLOBAL BYPASS V2.EXE TO YOUR WEB CONTROLLER:
--------------------------------------------------------------------------------
1. Once your web controller is online, copy your status endpoint:
   e.g. https://my-bypass-server.onrender.com/api/status

2. Open 'server_url.txt' in the Global Bypass V2.1 Distribution Package.

3. Paste your URL into 'server_url.txt' and save.

4. That's it! Now whenever you click 'TURN OFF' on your website from your phone
   or PC, EVERY user's executable will immediately be locked in maintenance
   mode and blocked from logging in!
================================================================================
