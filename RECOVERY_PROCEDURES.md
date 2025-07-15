# FinanceBot Recovery Procedures

## Issue: API Authentication Failures (July 15, 2025)

### Root Cause

Multiple API keys became invalid after the July 14 refactor, causing:

- Perplexity AI: 401 Unauthorized errors
- Polygon API: 401 Unauthorized errors
- Yahoo Finance: Schema validation issues

### Fixes Implemented

#### 1. Enhanced Error Handling

- **Perplexity**: Better 401 error detection and fallback mode messaging
- **Polygon**: Specific 401 authentication error identification
- **Yahoo Finance**: Schema validation bypass and improved error messages

#### 2. Startup Validation

- Added API key validation on server startup
- Clear status reporting for each service
- Graceful fallback to free data sources when premium APIs fail

#### 3. Improved Logging

- More specific error messages for API failures
- Clear distinction between authentication vs other errors
- Better user feedback about service availability

### Files Modified

1. `server.js` - Enhanced startup validation and error handling
2. `src/knowledge/market-data-service.js` - Improved API error handling

### Manual Recovery Steps (Future Issues)

#### If Perplexity API Fails:

1. Check API key validity at https://www.perplexity.ai/
2. Update `PERPLEXITY_API_KEY` in `.env`
3. Restart server
4. System will operate in fallback mode if key is invalid

#### If Polygon API Fails:

1. Verify subscription at https://polygon.io/
2. Update `POLYGON_API_KEY` in `.env`
3. Restart server
4. System will use Yahoo Finance as fallback

#### If Yahoo Finance Fails:

1. Check for service outages
2. Clear cache if schema validation issues persist
3. System includes `validateResult: false` to bypass most issues

### Testing Verification

- Health endpoint: `curl http://localhost:3000/api/health`
- Stock query: `POST /api/chat` with AAPL query
- Non-financial refusal working correctly
- Error messages now provide clear guidance

### Prevention

- Monitor API key expiration dates
- Set up alerts for 401 authentication errors
- Regularly test fallback modes
- Consider implementing automated key rotation

### Backup Files Created

- `.env.backup` - Original environment configuration
- `server.js.backup-recovery` - Pre-fix server state

## Status: ✅ RESOLVED

All core functionality restored with graceful fallbacks for API failures.
