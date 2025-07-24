# Debug Instructions for Port 3001 Button Issues

## Summary of Changes Made

I've added comprehensive debug logging to help identify why buttons aren't working on port 3001. Here's what was added:

### 1. **Enhanced Console Logging**
- URL and port information on page load
- Button element detection status
- Click event confirmations
- API endpoint URLs being used

### 2. **Key Debug Points**

When you load the page, you should see in the console:
```
DOM Content Loaded - Setting up event listeners
Current URL: http://localhost:3001/
Host: localhost:3001
Port: 3001
Button elements found: {sendBtn: true, uploadBtn: true, chatInput: true, fileInput: true}
Send button event listener added
Upload button event listener added
Chat input event listeners added
```

### 3. **When Clicking Buttons**

When you click the send button, you should see:
```
Send button clicked!
sendMessage called
Current API endpoint: http://localhost:3001/api/chat
Sending request to: http://localhost:3001/api/chat
```

## What to Check in Browser Console (F12)

1. **On Page Load**:
   - Are all buttons found? (Check "Button elements found" log)
   - Is the WebSocket connecting? (Look for "WebSocket URL: ws://localhost:3001/ws")
   - Any JavaScript errors in red?

2. **When Clicking Send Button**:
   - Do you see "Send button clicked!"?
   - If not, the event listener isn't attached
   - Check for any errors after clicking

3. **Network Tab**:
   - Switch to Network tab
   - Click send button
   - Look for `/api/chat` request
   - Check if it's going to port 3001

## Common Issues and Fixes

### Issue 1: Buttons Don't Respond to Clicks
**Possible Causes**:
- JavaScript error preventing event listeners from attaching
- Elements not found in DOM

**Check**: Look for "Send button not found!" or similar errors

### Issue 2: API Calls Fail
**Possible Causes**:
- Server not running on expected port
- CORS issues
- Wrong API endpoint

**Check**: Network tab for failed requests, console for fetch errors

### Issue 3: WebSocket Connection Failed
**Possible Causes**:
- Server WebSocket not configured for port 3001
- Firewall blocking WebSocket

**Check**: Console for WebSocket errors, Network tab WS section

## Quick Test Commands

1. **Test if server is responding**:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Check server logs**:
   ```bash
   tail -f server.log
   ```

3. **Verify port is correct**:
   ```bash
   lsof -i :3001
   ```

## What to Report Back

Please provide:
1. All console log output when page loads
2. What happens when you click the send button
3. Any red error messages
4. Network tab screenshot showing the /api/chat request (if any)
5. The exact URL you're accessing (http://localhost:3001 or something else?)

This will help identify if it's:
- A JavaScript error
- An API endpoint issue  
- A WebSocket problem
- A server configuration issue