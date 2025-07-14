class NLPProcessor {
    constructor() {
        this.companyToSymbol = {
            'apple': 'AAPL',
            'apple inc': 'AAPL',
            'apple stock': 'AAPL',
            'microsoft': 'MSFT',
            'microsoft corp': 'MSFT',
            'msft': 'MSFT',
            'google': 'GOOGL',
            'alphabet': 'GOOGL',
            'alphabet inc': 'GOOGL',
            'amazon': 'AMZN',
            'amazon.com': 'AMZN',
            'meta': 'META',
            'meta platforms': 'META',
            'facebook': 'META',
            'fb': 'META',
            'tesla': 'TSLA',
            'tesla inc': 'TSLA',
            'tesla motors': 'TSLA',
            'nvidia': 'NVDA',
            'nvidia corp': 'NVDA',
            'intel': 'INTC',
            'intel corp': 'INTC',
            'amd': 'AMD',
            'advanced micro devices': 'AMD',
            'netflix': 'NFLX',
            'netflix inc': 'NFLX',
            'paypal': 'PYPL',
            'paypal holdings': 'PYPL',
            'visa': 'V',
            'visa inc': 'V',
            'mastercard': 'MA',
            'mastercard inc': 'MA',
            'walmart': 'WMT',
            'walmart inc': 'WMT',
            'johnson & johnson': 'JNJ',
            'j&j': 'JNJ',
            'procter & gamble': 'PG',
            'p&g': 'PG',
            'coca cola': 'KO',
            'coke': 'KO',
            'pepsi': 'PEP',
            'pepsico': 'PEP',
            'disney': 'DIS',
            'walt disney': 'DIS',
            'boeing': 'BA',
            'boeing company': 'BA',
            'caterpillar': 'CAT',
            'caterpillar inc': 'CAT',
            'goldman sachs': 'GS',
            'goldman': 'GS',
            'jpmorgan': 'JPM',
            'jp morgan': 'JPM',
            'jpm': 'JPM',
            'bank of america': 'BAC',
            'bofa': 'BAC',
            'wells fargo': 'WFC',
            'berkshire hathaway': 'BRK.B',
            'berkshire': 'BRK.B',
            'exxon': 'XOM',
            'exxon mobil': 'XOM',
            'chevron': 'CVX',
            'chevron corp': 'CVX',
            'home depot': 'HD',
            'homedepot': 'HD',
            'salesforce': 'CRM',
            'salesforce.com': 'CRM',
            'abbvie': 'ABBV',
            'abbvie inc': 'ABBV',
            'pfizer': 'PFE',
            'pfizer inc': 'PFE',
            'eli lilly': 'LLY',
            'lilly': 'LLY',
            'broadcom': 'AVGO',
            'broadcom inc': 'AVGO',
            'oracle': 'ORCL',
            'oracle corp': 'ORCL',
            'cisco': 'CSCO',
            'cisco systems': 'CSCO',
            'adobe': 'ADBE',
            'adobe systems': 'ADBE',
            'ibm': 'IBM',
            'international business machines': 'IBM',
            'qualcomm': 'QCOM',
            'qualcomm inc': 'QCOM',
            'starbucks': 'SBUX',
            'starbucks corp': 'SBUX',
            'mcdonalds': 'MCD',
            'mcdonald\'s': 'MCD',
            'nike': 'NKE',
            'nike inc': 'NKE',
            'fedex': 'FDX',
            'fedex corp': 'FDX',
            'ups': 'UPS',
            'united parcel service': 'UPS',
            'shopify': 'SHOP',
            'shopify inc': 'SHOP',
            'zoom': 'ZM',
            'zoom video': 'ZM',
            'slack': 'WORK',
            'slack technologies': 'WORK',
            'twitter': 'TWTR',
            'twitter inc': 'TWTR',
            'x': 'X',
            'spacex': 'SPACE',
            'uber': 'UBER',
            'uber technologies': 'UBER',
            'lyft': 'LYFT',
            'lyft inc': 'LYFT',
            'airbnb': 'ABNB',
            'airbnb inc': 'ABNB',
            'palantir': 'PLTR',
            'palantir technologies': 'PLTR',
            'snowflake': 'SNOW',
            'snowflake inc': 'SNOW',
            'crowdstrike': 'CRWD',
            'crowdstrike holdings': 'CRWD',
            'datadog': 'DDOG',
            'datadog inc': 'DDOG',
            'mongodb': 'MDB',
            'mongodb inc': 'MDB',
            'coinbase': 'COIN',
            'coinbase global': 'COIN',
            'robinhood': 'HOOD',
            'robinhood markets': 'HOOD',
            'square': 'SQ',
            'block': 'SQ',
            'block inc': 'SQ',
            'doordash': 'DASH',
            'doordash inc': 'DASH',
            'peloton': 'PTON',
            'peloton interactive': 'PTON',
            'roblox': 'RBLX',
            'roblox corp': 'RBLX',
            'rivian': 'RIVN',
            'rivian automotive': 'RIVN',
            'lucid': 'LCID',
            'lucid motors': 'LCID',
            'ford': 'F',
            'ford motor': 'F',
            'general motors': 'GM',
            'gm': 'GM',
            'general electric': 'GE',
            'ge': 'GE',
            'at&t': 'T',
            'att': 'T',
            'verizon': 'VZ',
            'verizon communications': 'VZ',
            'comcast': 'CMCSA',
            'comcast corp': 'CMCSA',
            'spotify': 'SPOT',
            'spotify technology': 'SPOT',
            'tiktok': 'TIKTOK',
            'bytedance': 'BYTEDANCE',
            'snapchat': 'SNAP',
            'snap inc': 'SNAP',
            'pinterest': 'PINS',
            'pinterest inc': 'PINS',
            'reddit': 'RDDT',
            'reddit inc': 'RDDT',
            'unity': 'U',
            'unity software': 'U',
            'gameStop': 'GME',
            'gamestop corp': 'GME',
            'amc': 'AMC',
            'amc entertainment': 'AMC',
            'blackberry': 'BB',
            'blackberry ltd': 'BB',
            'pltr': 'PLTR'
        };

        this.cryptoNames = {
            'bitcoin': 'BTC',
            'btc': 'BTC',
            'ethereum': 'ETH',
            'eth': 'ETH',
            'cardano': 'ADA',
            'ada': 'ADA',
            'polkadot': 'DOT',
            'dot': 'DOT',
            'solana': 'SOL',
            'sol': 'SOL',
            'polygon': 'MATIC',
            'matic': 'MATIC',
            'avalanche': 'AVAX',
            'avax': 'AVAX',
            'chainlink': 'LINK',
            'link': 'LINK',
            'uniswap': 'UNI',
            'uni': 'UNI',
            'aave': 'AAVE',
            'binance coin': 'BNB',
            'bnb': 'BNB',
            'xrp': 'XRP',
            'ripple': 'XRP',
            'dogecoin': 'DOGE',
            'doge': 'DOGE',
            'shiba inu': 'SHIB',
            'shib': 'SHIB',
            'litecoin': 'LTC',
            'ltc': 'LTC',
            'bitcoin cash': 'BCH',
            'bch': 'BCH',
            'stellar': 'XLM',
            'xlm': 'XLM',
            'monero': 'XMR',
            'xmr': 'XMR',
            'dash': 'DASH',
            'zcash': 'ZEC',
            'zec': 'ZEC',
            'ethereum classic': 'ETC',
            'etc': 'ETC',
            'tether': 'USDT',
            'usdt': 'USDT',
            'usdc': 'USDC',
            'usd coin': 'USDC',
            'dai': 'DAI',
            'maker': 'MKR',
            'mkr': 'MKR',
            'compound': 'COMP',
            'comp': 'COMP',
            'yearn': 'YFI',
            'yfi': 'YFI',
            'sushi': 'SUSHI',
            'sushiswap': 'SUSHI',
            'curve': 'CRV',
            'crv': 'CRV',
            'synthetix': 'SNX',
            'snx': 'SNX',
            'the graph': 'GRT',
            'grt': 'GRT',
            'filecoin': 'FIL',
            'fil': 'FIL',
            'vechain': 'VET',
            'vet': 'VET',
            'theta': 'THETA',
            'tron': 'TRX',
            'trx': 'TRX',
            'cosmos': 'ATOM',
            'atom': 'ATOM',
            'algorand': 'ALGO',
            'algo': 'ALGO',
            'iota': 'IOTA',
            'neo': 'NEO',
            'waves': 'WAVES',
            'eos': 'EOS',
            'zilliqa': 'ZIL',
            'zil': 'ZIL',
            'ren': 'REN',
            'bitcoin sv': 'BSV',
            'bsv': 'BSV',
            'tezos': 'XTZ',
            'xtz': 'XTZ',
            'decred': 'DCR',
            'dcr': 'DCR',
            'ontology': 'ONT',
            'ont': 'ONT',
            'qtum': 'QTUM',
            'lisk': 'LSK',
            'lsk': 'LSK',
            'nano': 'NANO',
            'basic attention token': 'BAT',
            'bat': 'BAT',
            'zilliqa': 'ZIL',
            'omisego': 'OMG',
            'omg': 'OMG',
            'bancor': 'BNT',
            'bnt': 'BNT',
            'kyber': 'KNC',
            'knc': 'KNC',
            'loopring': 'LRC',
            'lrc': 'LRC',
            'augur': 'REP',
            'rep': 'REP',
            'status': 'SNT',
            'snt': 'SNT',
            '0x': 'ZRX',
            'zrx': 'ZRX',
            'golem': 'GLM',
            'glm': 'GLM',
            'storj': 'STORJ',
            'civic': 'CVC',
            'cvc': 'CVC',
            'aragon': 'ANT',
            'ant': 'ANT',
            'district0x': 'DNT',
            'dnt': 'DNT',
            'numeraire': 'NMR',
            'nmr': 'NMR',
            'metal': 'MTL',
            'mtl': 'MTL',
            'tenx': 'PAY',
            'pay': 'PAY',
            'funfair': 'FUN',
            'fun': 'FUN',
            'adtoken': 'ADT',
            'adt': 'ADT',
            'salt': 'SALT',
            'gnosis': 'GNO',
            'gno': 'GNO',
            'wings': 'WINGS',
            'edgeless': 'EDG',
            'edg': 'EDG',
            'melon': 'MLN',
            'mln': 'MLN',
            'matchpool': 'GUP',
            'gup': 'GUP',
            'singulardtv': 'SNGLS',
            'sngls': 'SNGLS',
            'humaniq': 'HMQ',
            'hmq': 'HMQ',
            'taas': 'TAAS',
            'round': 'ROUND',
            'iconomi': 'ICN',
            'icn': 'ICN',
            'firstblood': 'FIRSTBLOOD',
            'pluton': 'PLU',
            'plu': 'PLU',
            'wings dao': 'WINGS',
            'crypto': 'CRYPTO',
            'cryptocurrency': 'CRYPTO',
            'digital currency': 'CRYPTO',
            'altcoin': 'ALTCOIN',
            'altcoins': 'ALTCOIN',
            'defi': 'DEFI',
            'decentralized finance': 'DEFI',
            'nft': 'NFT',
            'non-fungible token': 'NFT',
            'web3': 'WEB3',
            'blockchain': 'BLOCKCHAIN',
            'smart contract': 'SMARTCONTRACT',
            'smart contracts': 'SMARTCONTRACT'
        };

        this.commonMisspellings = {
            'appl': 'AAPL',
            'microsft': 'MSFT',
            'googl': 'GOOGL',
            'amazn': 'AMZN',
            'teslla': 'TSLA',
            'nvdia': 'NVDA',
            'intell': 'INTC',
            'netflx': 'NFLX',
            'bitcon': 'BTC',
            'etherum': 'ETH',
            'etherem': 'ETH'
        };
    }

    extractSymbols(text) {
        const symbols = [];
        const normalizedText = text.toLowerCase();

        // Extract symbols with $ prefix
        const dollarSymbols = text.match(/\$([A-Z]{1,5})/g);
        if (dollarSymbols) {
            symbols.push(...dollarSymbols.map(s => s.substring(1)));
        }

        // Extract standalone symbols (2-5 uppercase letters)
        const standaloneSymbols = text.match(/\b[A-Z]{2,5}\b/g);
        if (standaloneSymbols) {
            symbols.push(...standaloneSymbols);
        }

        // Extract company names
        for (const [company, symbol] of Object.entries(this.companyToSymbol)) {
            if (normalizedText.includes(company)) {
                symbols.push(symbol);
            }
        }

        // Extract crypto names
        for (const [cryptoName, symbol] of Object.entries(this.cryptoNames)) {
            if (normalizedText.includes(cryptoName)) {
                symbols.push(symbol);
            }
        }

        // Handle misspellings
        for (const [misspelling, correct] of Object.entries(this.commonMisspellings)) {
            if (normalizedText.includes(misspelling)) {
                symbols.push(correct);
            }
        }

        return [...new Set(symbols)]; // Remove duplicates
    }

    normalizeSymbol(input) {
        const normalized = input.toUpperCase().replace(/^\$/, '');
        
        // Check if it's a misspelling
        const corrected = this.commonMisspellings[normalized.toLowerCase()];
        if (corrected) {
            return corrected;
        }

        // Check if it's a company name
        const symbol = this.companyToSymbol[input.toLowerCase()];
        if (symbol) {
            return symbol;
        }

        // Check if it's a crypto name
        const crypto = this.cryptoNames[input.toLowerCase()];
        if (crypto) {
            return crypto;
        }

        return normalized;
    }

    detectFinancialTerms(text) {
        const financialTerms = [
            'stock', 'stocks', 'share', 'shares', 'price', 'prices',
            'trading', 'trade', 'buy', 'sell', 'market', 'portfolio',
            'investment', 'invest', 'dividend', 'earnings', 'revenue',
            'profit', 'loss', 'bull', 'bear', 'volatility', 'volume',
            'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain',
            'rally', 'dip', 'correction', 'resistance', 'support',
            'analysis', 'technical', 'fundamental', 'valuation', 'pe ratio',
            'market cap', 'ipo', 'etf', 'mutual fund', 'options', 'futures'
        ];

        const normalizedText = text.toLowerCase();
        const foundTerms = financialTerms.filter(term => 
            normalizedText.includes(term)
        );

        return foundTerms;
    }

    identifyQueryType(text) {
        const normalizedText = text.toLowerCase();
        
        if (normalizedText.includes('price') || normalizedText.includes('cost') || normalizedText.includes('worth')) {
            return 'price_query';
        }
        
        if (normalizedText.includes('buy') || normalizedText.includes('purchase')) {
            return 'buy_intent';
        }
        
        if (normalizedText.includes('sell')) {
            return 'sell_intent';
        }
        
        if (normalizedText.includes('analysis') || normalizedText.includes('analyze')) {
            return 'analysis_request';
        }
        
        if (normalizedText.includes('news') || normalizedText.includes('update')) {
            return 'news_request';
        }
        
        if (normalizedText.includes('compare') || normalizedText.includes('vs')) {
            return 'comparison';
        }

        return 'general_inquiry';
    }

    extractPriceTargets(text) {
        // Extract price mentions like "$150", "150 dollars", etc.
        const priceRegex = /\$?(\d+(?:\.\d{2})?)\s?(?:dollars?|usd|$)/gi;
        const matches = text.match(priceRegex);
        
        if (matches) {
            return matches.map(match => {
                const price = parseFloat(match.replace(/[^\d.]/g, ''));
                return price;
            });
        }
        
        return [];
    }

    cleanText(text) {
        return text
            .replace(/[^\w\s$.-]/g, ' ') // Keep alphanumeric, spaces, $, ., -
            .replace(/\s+/g, ' ')        // Normalize whitespace
            .trim();
    }

    processQuery(text) {
        const cleanedText = this.cleanText(text);
        
        return {
            originalText: text,
            cleanedText: cleanedText,
            symbols: this.extractSymbols(cleanedText),
            financialTerms: this.detectFinancialTerms(cleanedText),
            queryType: this.identifyQueryType(cleanedText),
            priceTargets: this.extractPriceTargets(cleanedText),
            isFinancial: this.detectFinancialTerms(cleanedText).length > 0 || this.extractSymbols(cleanedText).length > 0
        };
    }
}

module.exports = NLPProcessor;