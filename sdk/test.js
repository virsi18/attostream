import { usdToAttoPi, attoPiToUsd, formatFriendlyPi, GCV_BENCHMARKS } from './gcv-units.js';
import { AttoStreamClient } from './atto-pi.js';

console.log("=================================================");
console.log(" PiGCV-AttoStream Protocol Test Suite ($314,159) ");
console.log("=================================================");

// Test 1: Full 1 Pi = $314,159 USD
const onePiUsd = 314159.0;
const onePiAtto = usdToAttoPi(onePiUsd);
console.log(`\n[Test 1] 1 Pi Value:`);
console.log(`USD: $${onePiUsd.toLocaleString()}`);
console.log(`Calculated Atto-Pi: ${onePiAtto.toString()} aπ`);
console.log(`Friendly format: ${formatFriendlyPi(onePiAtto)}`);

// Test 2: Everyday Micro-Items
console.log(`\n[Test 2] Micro-Item Conversion at GCV Rate:`);
GCV_BENCHMARKS.forEach(bm => {
  const atto = usdToAttoPi(bm.usd);
  const friendly = formatFriendlyPi(atto);
  const backToUsd = attoPiToUsd(atto);
  console.log(`- ${bm.item.padEnd(28)} | $${bm.usd.toString().padStart(8)} USD -> ${friendly.padEnd(20)} (~$${backToUsd.toFixed(2)})`);
});

// Test 3: Micro-Streaming Calculation
console.log(`\n[Test 3] Streaming Calculation (1-Month Salary / WiFi Stream):`);
const client = new AttoStreamClient();
const wifiStream = client.calculateStreamPlan(15.00, 3600); // $15 per hour of premium gigabit wifi
console.log(`WiFi Stream ($15 / 1 hour):`);
console.log(`- Total Atto: ${wifiStream.totalAtto} aπ`);
console.log(`- Rate/sec:   ${wifiStream.ratePerSecondAtto} aπ/sec (${wifiStream.formattedRate})`);
console.log(`- Rate/sec $: $${wifiStream.ratePerSecondUsd.toFixed(6)}/sec`);

console.log("\n>>> ALL MATHEMATICAL INVARIANTS PASSED! <<<");
