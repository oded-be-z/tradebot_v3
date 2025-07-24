const colors = require('colors');

class DebugLogger {
    static logContext(method, phase, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            method,
            phase,
            sessionId: data.sessionId,
            symbol: data.symbol,
            contextTopic: data.context?.topic,
            lastDiscussedSymbol: data.conversationState?.conversationFlow?.lastDiscussedSymbol,
            intent: data.intent,
            query: data.query?.substring(0, 50)
        };
        
        // Color code based on phase
        let coloredPhase;
        switch(phase) {
            case 'START':
                coloredPhase = phase.green;
                break;
            case 'END':
                coloredPhase = phase.blue;
                break;
            case 'ERROR':
                coloredPhase = phase.red;
                break;
            case 'UPDATE':
                coloredPhase = phase.yellow;
                break;
            default:
                coloredPhase = phase.white;
        }
        
        console.log(`[DEBUG ${timestamp}] ${method.cyan} - ${coloredPhase}:`, logEntry);
    }
    
    static logSymbolUpdate(sessionId, oldSymbol, newSymbol, source) {
        console.log(`[SYMBOL UPDATE] Session: ${sessionId}`.yellow);
        console.log(`  Old Symbol: ${oldSymbol || 'none'}`.dim);
        console.log(`  New Symbol: ${newSymbol}`.green);
        console.log(`  Source: ${source}`.dim);
    }
    
    static logChartGeneration(symbol, sessionId, source) {
        console.log(`[CHART GEN] Symbol: ${symbol}`.magenta + ` | Session: ${sessionId} | Source: ${source}`);
    }
    
    static logResponseFlow(step, data) {
        console.log(`[RESPONSE FLOW] ${step}:`.cyan, {
            symbol: data.symbol,
            hasChart: data.hasChart,
            responseType: data.responseType,
            sessionId: data.sessionId
        });
    }
    
    static logError(method, error, context) {
        console.error(`[ERROR in ${method}]`.red, {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3),
            context
        });
    }
    
    static logWarning(message, data) {
        console.warn(`[WARNING] ${message}`.yellow, data);
    }
}

module.exports = DebugLogger;