const axios = require('axios');
const fs = require('fs');

class ContextDebugger {
    constructor() {
        this.sessionId = `debug_${Date.now()}`;
        this.baseURL = 'http://localhost:3000';
        this.logs = [];
    }
    
    log(message, data = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            message,
            data
        };
        this.logs.push(entry);
        console.log(`[${entry.timestamp}] ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
    
    async makeRequest(query) {
        this.log(`Sending query: "${query}"`);
        
        try {
            const response = await axios.post(`${this.baseURL}/api/chat`, {
                message: query,
                sessionId: this.sessionId
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = {
                query,
                response: response.data.response,
                fullData: response.data,
                symbol: response.data.symbol,
                symbols: response.data.symbols,
                responseType: response.data.responseType
            };
            
            this.log('Response received', result);
            
            return result;
        } catch (error) {
            this.log('Request failed', { error: error.message });
            return null;
        }
    }
    
    async runDebugSequence() {
        this.log('Starting debug sequence', { sessionId: this.sessionId });
        
        // Step 1: AMD query
        this.log('\n=== STEP 1: AMD Query ===');
        const amd1 = await this.makeRequest('AMD price');
        
        // Step 2: Trend query (should be AMD)
        this.log('\n=== STEP 2: Trend Query (expecting AMD) ===');
        const trend1 = await this.makeRequest("what's the trend?");
        
        // Step 3: NVDA query
        this.log('\n=== STEP 3: NVDA Query ===');
        const nvda1 = await this.makeRequest('NVDA stock');
        
        // Step 4: Trend query (should be NVDA)
        this.log('\n=== STEP 4: Trend Query (expecting NVDA) ===');
        const trend2 = await this.makeRequest("what's the trend?");
        
        // Analysis
        this.log('\n=== ANALYSIS ===');
        const analysis = {
            step2_mentions_AMD: trend1?.response?.includes('AMD'),
            step4_mentions_NVDA: trend2?.response?.includes('NVDA'),
            step4_still_mentions_AMD: trend2?.response?.includes('AMD'),
            context_switching_works: trend1?.response?.includes('AMD') && trend2?.response?.includes('NVDA')
        };
        
        this.log('Analysis results', analysis);
        
        // Save full debug log
        const debugReport = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            analysis,
            fullLogs: this.logs
        };
        
        fs.writeFileSync('debug_context_report.json', JSON.stringify(debugReport, null, 2));
        this.log('\nDebug report saved to debug_context_report.json');
        
        return analysis;
    }
}

// Run the debugger
async function main() {
    console.log('🔍 CONTEXT FLOW DEBUGGER\n');
    
    const contextDebugger = new ContextDebugger();
    const analysis = await contextDebugger.runDebugSequence();
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULT:', analysis.context_switching_works ? 
        '✅ Context switching WORKS' : 
        '❌ Context switching BROKEN'
    );
}

main().catch(console.error);