# 🚀 FinanceBot Pro v4.0 - Secure Production Ready

## 🔐 **SECURITY FIRST - NO HARDCODED API KEYS**

This version implements **enterprise-grade security** with proper environment variable management. All API keys are now loaded securely from environment variables with **no hardcoded fallbacks**.

---

## ⚡ **Quick Start Guide**

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys (REQUIRED)
Copy the example environment file and add your API keys:
```bash
cp .env.example .env
```

### 3. Edit Your Environment File
Open `.env` in your text editor and add your API keys:

```bash
# REQUIRED - Get from https://www.perplexity.ai/
PERPLEXITY_API_KEY=your_actual_perplexity_key_here

# OPTIONAL - Get from https://www.alphavantage.co/
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# OPTIONAL - Get from https://polygon.io/
POLYGON_API_KEY=your_polygon_key_here
```

### 4. Start the Server
```bash
npm start
```

The server will start on **http://localhost:3000**

---

## 🔑 **API Key Setup Instructions**

### **PERPLEXITY API KEY** (Required)
1. Visit [Perplexity AI](https://www.perplexity.ai/)
2. Sign up for an account
3. Navigate to API settings
4. Generate your API key
5. Add it to your `.env` file

**Free Tier:** Available with limitations  
**Paid Plans:** Higher rate limits and priority access

### **ALPHA VANTAGE API KEY** (Optional)
1. Visit [Alpha Vantage](https://www.alphavantage.co/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file

**Free Tier:** 5 requests/minute, 500 requests/day  
**Paid Plans:** Higher rate limits available

### **POLYGON API KEY** (Optional)
1. Visit [Polygon.io](https://polygon.io/)
2. Sign up for an account
3. Choose your plan (free tier available)
4. Get your API key
5. Add it to your `.env` file

**Free Tier:** Limited requests  
**Paid Plans:** Real-time data and higher limits

---

## 🛡️ **Security Features**

✅ **No Hardcoded API Keys** - All keys loaded from environment variables  
✅ **Startup Validation** - Server refuses to start without required keys  
✅ **Rate Limiting** - Built-in protection against API abuse  
✅ **CORS Protection** - Configurable for production environments  
✅ **Security Headers** - Helmet.js for enhanced security  
✅ **Input Validation** - All user inputs properly validated  
✅ **Error Handling** - User-friendly error messages, no sensitive data exposed  

---

## 🔧 **Configuration Options**

### **Environment Variables**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PERPLEXITY_API_KEY` | ✅ Yes | None | Perplexity AI API key |
| `ALPHA_VANTAGE_API_KEY` | ❌ No | None | Alpha Vantage API key |
| `POLYGON_API_KEY` | ❌ No | None | Polygon.io API key |
| `PORT` | ❌ No | 3000 | Server port |
| `NODE_ENV` | ❌ No | development | Environment mode |
| `ALLOWED_ORIGINS` | ❌ No | localhost | CORS origins (production) |

### **Production Deployment**

For production deployment, ensure you:

1. Set `NODE_ENV=production`
2. Configure `ALLOWED_ORIGINS` for your domain
3. Use HTTPS for all API endpoints
4. Implement proper logging and monitoring
5. Regular security updates

---

## 🚀 **Features**

### ✅ **AI-Powered Analysis**
- Real-time financial analysis using Perplexity AI
- Conversational interface with friendly responses
- Educational focus (no trading advice)
- Context-aware responses

### ✅ **Market Data Integration**
- Live market data from multiple sources
- Historical price charts
- Portfolio analysis with CSV upload
- Real-time ticker updates

### ✅ **Enterprise Security**
- Secure API key management
- Rate limiting and DDoS protection
- Input validation and sanitization
- Error handling without data exposure

### ✅ **User Experience**
- Mobile-responsive design
- Fast load times with caching
- Intuitive chat interface
- File upload for portfolio analysis

---

## 🔍 **Health Check**

Check if your server is properly configured:

```bash
curl http://localhost:3000/api/health
```

This will return:
- ✅ Service status
- 🔐 Security configuration status
- 🤖 AI capabilities status
- 📊 Market data status

---

## 🛠️ **Development**

### **Project Structure**
```
financebot-pro/
├── server.js              # Main server file (SECURE)
├── public/                 # Frontend files
│   ├── index.html         # Main interface
│   └── assets/            # CSS, JS, images
├── .env.example           # Environment template
├── .env                   # Your actual config (DO NOT COMMIT)
├── package.json           # Dependencies
└── README.md              # This file
```

### **Scripts**
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run lint       # Check code quality
```

---

## ⚠️ **Important Security Notes**

1. **NEVER commit your `.env` file** to version control
2. **Keep API keys secure** and don't share them
3. **Rotate API keys regularly** for enhanced security
4. **Monitor API usage** to avoid unexpected charges
5. **Use HTTPS in production** for all connections

---

## 🔄 **Migration from v3.x**

If upgrading from FinanceBot Pro v3.x:

1. **Backup your current setup**
2. **Create `.env` file** with your API keys
3. **Update server.js** to the new secure version
4. **Test thoroughly** before deploying to production
5. **Remove any hardcoded keys** from old files

---

## 🆘 **Troubleshooting**

### **Server won't start**
- ✅ Check if `.env` file exists
- ✅ Verify `PERPLEXITY_API_KEY` is set
- ✅ Check for syntax errors in `.env`

### **API key errors**
- ✅ Verify keys are valid and active
- ✅ Check rate limits haven't been exceeded
- ✅ Ensure keys have proper permissions

### **CORS errors**
- ✅ Check `ALLOWED_ORIGINS` in production
- ✅ Verify domain matches configuration
- ✅ Test with localhost for development

---

## 📞 **Support**

For issues or questions:
1. Check the troubleshooting section above
2. Verify your API keys are properly configured
3. Review the server logs for specific error messages
4. Ensure all dependencies are installed correctly

---

## 📋 **Phase 1 Task 1.2 Status: ✅ COMPLETED**

### **✅ Success Criteria Met:**
- ❌ **Removed all hardcoded API keys** from source code
- ✅ **Server validation** refuses to start without required keys
- ✅ **Clear error messages** guide proper setup
- ✅ **Complete setup instructions** provided in README
- ✅ **Environment template** created (.env.example)
- ✅ **Security best practices** implemented

**Next:** Phase 1 - Task 1.3: Implement Scalable Session Storage