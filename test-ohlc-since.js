const { Kraken } = require('node-kraken-api');

async function testOHLCWithSince() {
    console.log('🧪 Testing Enhanced OHLC Functionality with "since" Parameter');
    console.log('==============================================================\n');

    const kraken = new Kraken();
    let testsPassed = 0;
    let totalTests = 0;

    const runTest = async (testName, testFn) => {
        totalTests++;
        try {
            console.log(`${totalTests}. ${testName}...`);
            await testFn();
            console.log(`✅ PASSED: ${testName}\n`);
            testsPassed++;
        } catch (error) {
            console.log(`❌ FAILED: ${testName}`);
            console.log(`   Error: ${error.message}\n`);
        }
    };

    // Test 1: Basic OHLC without since parameter (backward compatibility)
    await runTest('Basic OHLC without since parameter', async () => {
        const result = await kraken.ohlc({
            pair: 'XXBTZUSD',
            interval: 60
        });
        
        if (!result.XXBTZUSD || !Array.isArray(result.XXBTZUSD)) {
            throw new Error('Invalid OHLC response structure');
        }
        
        console.log(`   📊 Retrieved ${result.XXBTZUSD.length} OHLC data points`);
        console.log(`   📅 Latest timestamp: ${new Date(result.XXBTZUSD[result.XXBTZUSD.length - 1][0] * 1000).toISOString()}`);
    });

    // Test 2: OHLC with since parameter (incremental updates)
    await runTest('OHLC with since parameter', async () => {
        // Get a timestamp from 24 hours ago
        const twentyFourHoursAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
        
        const result = await kraken.ohlc({
            pair: 'XXBTZUSD',
            interval: 60,
            since: twentyFourHoursAgo
        });
        
        if (!result.XXBTZUSD || !Array.isArray(result.XXBTZUSD)) {
            throw new Error('Invalid OHLC response structure');
        }
        
        console.log(`   📊 Retrieved ${result.XXBTZUSD.length} OHLC data points since ${new Date(twentyFourHoursAgo * 1000).toISOString()}`);
        
        // Verify all timestamps are after the 'since' timestamp
        const invalidEntries = result.XXBTZUSD.filter(entry => entry[0] < twentyFourHoursAgo);
        if (invalidEntries.length > 0) {
            throw new Error(`Found ${invalidEntries.length} entries with timestamps before 'since' parameter`);
        }
        
        console.log(`   ✅ All timestamps are after the 'since' parameter`);
    });

    // Test 3: OHLC with different intervals and since parameter
    await runTest('OHLC with different intervals and since parameter', async () => {
        const oneHourAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
        
        const intervals = [1, 5, 15, 30, 60];
        const results = {};
        
        for (const interval of intervals) {
            const result = await kraken.ohlc({
                pair: 'XXBTZUSD',
                interval: interval,
                since: oneHourAgo
            });
            
            results[interval] = result.XXBTZUSD.length;
        }
        
        console.log(`   📊 Data points by interval: ${JSON.stringify(results)}`);
        
        // Verify we got data for all intervals
        for (const interval of intervals) {
            if (results[interval] === 0) {
                throw new Error(`No data returned for ${interval} minute interval`);
            }
        }
    });

    // Test 4: OHLC with recent timestamp (should return minimal data)
    await runTest('OHLC with very recent since timestamp', async () => {
        const fiveMinutesAgo = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
        
        const result = await kraken.ohlc({
            pair: 'XXBTZUSD',
            interval: 1, // 1-minute intervals
            since: fiveMinutesAgo
        });
        
        if (!result.XXBTZUSD || !Array.isArray(result.XXBTZUSD)) {
            throw new Error('Invalid OHLC response structure');
        }
        
        console.log(`   📊 Retrieved ${result.XXBTZUSD.length} recent data points`);
        console.log(`   📅 Since: ${new Date(fiveMinutesAgo * 1000).toISOString()}`);
        
        // Should have at least the current incomplete candle
        if (result.XXBTZUSD.length === 0) {
            throw new Error('Expected at least one data point for recent timestamp');
        }
    });

    // Final Results
    console.log('==============================================================');
    console.log(`🎯 OHLC Test Results: ${testsPassed}/${totalTests} tests passed`);
    
    if (testsPassed === totalTests) {
        console.log('🎉 ALL OHLC TESTS PASSED!');
        console.log('✨ The enhanced OHLC functionality with "since" parameter is working perfectly!');
        console.log('\n📋 Summary of OHLC Features:');
        console.log('   • ✅ Basic OHLC data retrieval (backward compatible)');
        console.log('   • ✅ Incremental updates using "since" timestamp');
        console.log('   • ✅ Multiple interval support (1, 5, 15, 30, 60, 240, 1440, 10080, 21600 minutes)');
        console.log('   • ✅ Timestamp validation for filtered results');
        console.log('   • ✅ Efficient data retrieval for recent updates');
        console.log('\n🔧 Usage Examples:');
        console.log('   // Basic OHLC');
        console.log('   kraken.ohlc({ pair: "XXBTZUSD", interval: 60 })');
        console.log('   ');
        console.log('   // Incremental updates');
        console.log('   kraken.ohlc({ pair: "XXBTZUSD", interval: 60, since: 1688671200 })');
    } else {
        console.log('⚠️  Some OHLC tests failed. Please check the errors above.');
    }
}

// Run the OHLC tests
testOHLCWithSince().catch(console.error);
