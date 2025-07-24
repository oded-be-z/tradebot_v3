# Fix for Port 3001 Button Issues

## Issue Identified
The server is configured to run on PORT=3000 in the .env file, but it's actually running on port 3001. This mismatch might cause issues.

## Immediate Solutions

### Option 1: Update .env file (Recommended)
```bash
# Edit .env file and change:
PORT=3001
```

### Option 2: Use absolute URLs in frontend
Already implemented - the frontend now uses `window.location.origin` for API calls, which should work regardless of port.

## Debug Steps

1. **Clear Browser Cache**
   - Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh
   - This ensures you get the latest JavaScript with debug logging

2. **Open Browser Console (F12)**
   - Look for these messages when page loads:
   ```
   Current URL: http://localhost:3001/
   Button elements found: {sendBtn: true, uploadBtn: true, ...}
   ```

3. **Test Send Button**
   - Type "test" in the chat input
   - Click send button or press Enter
   - Check console for:
   ```
   Send button clicked!
   sendMessage called
   Sending request to: http://localhost:3001/api/chat
   ```

4. **Check Network Tab**
   - Go to Network tab in DevTools
   - Click send button
   - Look for "chat" request
   - Check if Status is 200 OK

## If Buttons Still Don't Work

### Check for JavaScript Errors
In console, look for any red error messages like:
- "Uncaught TypeError"
- "Cannot read property"
- "is not a function"

### Test API Directly
Open a new terminal and run:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","sessionId":"test123"}'
```

### Common Fixes

1. **Restart Server with Correct Port**
   ```bash
   PORT=3001 npm start
   ```

2. **Check if Another Service Uses Port 3001**
   ```bash
   lsof -i :3001
   ```

3. **Try Different Browser**
   Sometimes browser extensions block functionality

## The debug logging I added will help identify:
- If DOM elements are found
- If event listeners attach properly  
- If API calls are made to correct endpoints
- Any JavaScript errors preventing functionality

Please check the browser console and report what you see!