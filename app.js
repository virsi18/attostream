import { usdToAttoPi, attoPiToUsd, formatFriendlyPi, UNITS } from './sdk/gcv-units.js';
import { AttoStreamClient } from './sdk/atto-pi.js';

// Application State
const state = {
  walletBalancePi: 4.25000000,
  merchantRevenueAtto: 0n,
  selectedItem: null,
  activeSimulator: null,
  streamClient: new AttoStreamClient(),
  currencyRates: {
    1: { symbol: '$', rate: 1 },
    16000: { symbol: 'Rp', rate: 16000 },
    0.92: { symbol: '€', rate: 0.92 },
    155: { symbol: '¥', rate: 155 }
  }
};

// Contract Code Mock Repository for tab
const CONTRACT_SNIPPETS = {
  oracle: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PiGCVOracle {
    uint256 public constant GCV_FIXED_VALUE = 314_159_00000000; // $314,159.00 USD
    uint8 public constant DECIMALS = 8;
    
    function usdToAttoPi(uint256 usdWith8Decimals) external pure returns (uint256) {
        return (usdWith8Decimals * 1e18) / GCV_FIXED_VALUE;
    }
}`,
  stream: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AttoStreamCore {
    struct Stream {
        address sender;
        address recipient;
        uint256 depositAtto;      // 10^-18 precision
        uint256 ratePerSecond;
        uint256 remainingBalance;
    }

    function createStream(address recipient, uint256 depositAtto, uint256 startTime, uint256 stopTime)
        external payable returns (uint256);
}`,
  pos: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GCVMerchantPOS {
    function createInvoice(uint256 fiatAmountUsd8, string calldata metadata) external returns (uint256);
    function payInvoice(uint256 invoiceId) external payable returns (bool);
}`
};

// POS Catalog Items
const CATALOG = [
  { id: 1, name: "Espresso Italiano", fiatUsd: 3.50, icon: "☕", category: "Café" },
  { id: 2, name: "Artisan Burger Meal", fiatUsd: 12.00, icon: "🍔", category: "Dining" },
  { id: 3, name: "10L Premium Gasoline", fiatUsd: 16.50, icon: "⛽", category: "Fuel" },
  { id: 4, name: "Gigabit Fiber (1 Mo)", fiatUsd: 45.00, icon: "🌐", category: "Telecom" },
  { id: 5, name: "Pro Smartphone 512GB", fiatUsd: 999.00, icon: "📱", category: "Tech" },
  { id: 6, name: "Tesla Model 3 Long Range", fiatUsd: 38990.00, icon: "🚗", category: "Auto" }
];

// Oracle Node Locations
const ORACLE_NODES = [
  { city: "Frankfurt, Germany", ip: "185.12.84.21", latency: "14ms", status: "SYNCED" },
  { city: "Singapore", ip: "103.28.14.90", latency: "22ms", status: "SYNCED" },
  { city: "Tokyo, Japan", ip: "133.14.99.11", latency: "18ms", status: "SYNCED" },
  { city: "Silicon Valley, USA", ip: "198.51.100.4", latency: "26ms", status: "SYNCED" },
  { city: "Jakarta, Indonesia", ip: "103.55.32.19", latency: "28ms", status: "SYNCED" },
  { city: "Zurich, Switzerland", ip: "194.209.11.8", latency: "16ms", status: "SYNCED" }
];

// Document Initialization
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupCalculator();
  setupStreamEngine();
  setupPOS();
  setupOracleGrid();
  setupContractsViewer();
  updateCalculator(3.50);
});

// Toast Helper
function showToast(msg) {
  const toast = document.getElementById("toastMessage");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// Tab Switching
function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.add("active");
    });
  });
}

// 1. Calculator & Unit Matrix
function setupCalculator() {
  const inputUsd = document.getElementById("inputUsd");
  const presetChips = document.querySelectorAll(".chip-btn");
  const currSelect = document.getElementById("currencySelect");

  inputUsd.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value) || 0;
    updateCalculator(val);
  });

  presetChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const val = parseFloat(chip.getAttribute("data-usd"));
      inputUsd.value = val;
      updateCalculator(val);
    });
  });

  currSelect.addEventListener("change", () => {
    updateCalculator(parseFloat(inputUsd.value) || 0);
  });
}

function updateCalculator(usd) {
  const atto = usdToAttoPi(usd);
  const fullPi = Number(atto) / Number(UNITS.PI);
  const milliPi = Number(atto) / Number(UNITS.MILLI);
  const microPi = Number(atto) / Number(UNITS.MICRO);
  const nanoPi = Number(atto) / Number(UNITS.NANO);
  const picoPi = Number(atto) / Number(UNITS.PICO);

  document.getElementById("rowFullPi").textContent = `${fullPi.toFixed(8)} π`;
  document.getElementById("rowMilliPi").textContent = `${milliPi.toFixed(4)} mπ`;
  document.getElementById("rowMicroPi").textContent = `${microPi.toFixed(2)} µπ`;
  document.getElementById("rowNanoPi").textContent = `${nanoPi.toLocaleString(undefined, { maximumFractionDigits: 2 })} nπ`;
  document.getElementById("rowPicoPi").textContent = `${picoPi.toLocaleString(undefined, { maximumFractionDigits: 0 })} pπ`;
  document.getElementById("rowAttoPi").textContent = `${atto.toLocaleString()} aπ`;
}

// 2. Live Stream Engine
function setupStreamEngine() {
  const btnStart = document.getElementById("btnStartStream");
  const btnClaim = document.getElementById("btnClaimStream");
  const btnStop = document.getElementById("btnStopStream");
  const titleDisplay = document.getElementById("streamTitleDisplay");
  const activeDot = document.getElementById("streamActiveDot");

  btnStart.addEventListener("click", () => {
    const budget = parseFloat(document.getElementById("streamBudget").value) || 10;
    const duration = parseInt(document.getElementById("streamDuration").value) || 60;
    const purposeEl = document.getElementById("streamPurpose");
    const purposeText = purposeEl.options[purposeEl.selectedIndex].text;

    titleDisplay.textContent = purposeText.split('(')[0].trim();

    if (state.activeSimulator) {
      state.streamClient.stopStream(state.activeSimulator.streamId);
    }

    activeDot.style.backgroundColor = "var(--green-accent)";
    activeDot.style.boxShadow = "0 0 10px var(--green-accent)";

    state.activeSimulator = state.streamClient.startStreamSimulator({
      usdBudget: budget,
      durationSeconds: duration,
      sender: "Pioneer Main",
      recipient: document.getElementById("streamRecipient").value,
      onTick: (data) => {
        document.getElementById("liveTickerAtto").textContent = `${data.streamedAtto.toLocaleString()} aπ`;
        document.getElementById("liveTickerUsd").textContent = `+$${data.streamedUsd} USD`;
        document.getElementById("streamProgressBar").style.width = `${data.progressPercent}%`;
        document.getElementById("streamProgressLabel").textContent = `${data.progressPercent}% (${data.elapsedSeconds}s)`;

        if (data.isCompleted) {
          showToast(`Stream Complete! Total ${data.formattedStreamed} transferred.`);
        }
      }
    });

    showToast(`Started Atto-Stream for ${budget} USD over ${duration}s!`);
  });

  btnClaim.addEventListener("click", () => {
    if (!state.activeSimulator) {
      showToast("No active stream currently running.");
      return;
    }
    const accumulated = state.activeSimulator.accumulatedAtto;
    showToast(`Claimed ${formatFriendlyPi(accumulated)} to recipient wallet!`);
  });

  btnStop.addEventListener("click", () => {
    if (state.activeSimulator) {
      state.streamClient.stopStream(state.activeSimulator.streamId);
      state.activeSimulator = null;
      document.getElementById("streamActiveDot").style.backgroundColor = "var(--text-dim)";
      document.getElementById("streamProgressBar").style.width = "0%";
      document.getElementById("streamProgressLabel").textContent = "Stopped";
      showToast("Stream cancelled. Unspent balance refunded to sender.");
    }
  });
}

// 3. Merchant POS Terminal
function setupPOS() {
  const catalogContainer = document.getElementById("posCatalog");
  const posSelectedName = document.getElementById("posSelectedName");
  const posSelectedPi = document.getElementById("posSelectedPi");
  const posSelectedFiat = document.getElementById("posSelectedFiat");
  const qrInvoiceId = document.getElementById("qrInvoiceId");
  const btnPay = document.getElementById("btnSimulatePay");

  catalogContainer.innerHTML = "";
  CATALOG.forEach((item, idx) => {
    const itemCard = document.createElement("div");
    itemCard.className = `pos-item ${idx === 0 ? 'selected' : ''}`;
    const atto = usdToAttoPi(item.fiatUsd);
    const friendly = formatFriendlyPi(atto);

    itemCard.innerHTML = `
      <div class="pos-item-icon">${item.icon}</div>
      <div class="pos-item-title">${item.name}</div>
      <div class="pos-item-fiat">$${item.fiatUsd.toFixed(2)} USD</div>
      <div class="pos-item-pi">${friendly}</div>
    `;

    itemCard.addEventListener("click", () => {
      document.querySelectorAll(".pos-item").forEach(c => c.classList.remove("selected"));
      itemCard.classList.add("selected");
      selectPOSItem(item);
    });

    catalogContainer.appendChild(itemCard);
  });

  selectPOSItem(CATALOG[0]);

  btnPay.addEventListener("click", () => {
    if (!state.selectedItem) return;
    const item = state.selectedItem;
    const atto = usdToAttoPi(item.fiatUsd);
    const fullPiCost = Number(atto) / Number(UNITS.PI);

    if (state.walletBalancePi < fullPiCost) {
      showToast("Insufficient Pi balance!");
      return;
    }

    state.walletBalancePi -= fullPiCost;
    state.merchantRevenueAtto += atto;

    const walletBalEl = document.getElementById("walletBalance");
    if (walletBalEl) {
      walletBalEl.textContent = `${state.walletBalancePi.toFixed(6)} π`;
    }
    
    // Play celebratory sound or visual confirmation
    showToast(`✅ Paid ${formatFriendlyPi(atto)} for ${item.name}! Instant Settlement confirmed.`);

    // Refresh invoice ID
    const newInv = Math.floor(Math.random() * 9000 + 5000);
    qrInvoiceId.textContent = `INVOICE #${newInv} • SETTLED`;
  });
}

function selectPOSItem(item) {
  state.selectedItem = item;
  const atto = usdToAttoPi(item.fiatUsd);
  document.getElementById("posSelectedName").textContent = item.name;
  document.getElementById("posSelectedPi").textContent = formatFriendlyPi(atto);
  document.getElementById("posSelectedFiat").textContent = `$${item.fiatUsd.toFixed(2)} USD (Peg: $314,159)`;
  const newInv = Math.floor(Math.random() * 9000 + 5000);
  document.getElementById("qrInvoiceId").textContent = `INVOICE #${newInv} • READY`;
}

// 4. Oracle Grid
function setupOracleGrid() {
  const container = document.getElementById("oracleNodesGrid");
  container.innerHTML = "";

  ORACLE_NODES.forEach((node) => {
    const card = document.createElement("div");
    card.className = "node-card";
    const mockHash = "0x" + Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join("");

    card.innerHTML = `
      <div class="node-header">
        <span class="node-region">📍 ${node.city}</span>
        <span class="node-status"><span class="pulsing-dot" style="width:6px; height:6px;"></span> ${node.status}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); display:flex; justify-content:space-between;">
        <span>IP: ${node.ip}</span>
        <span>Ping: ${node.latency}</span>
      </div>
      <div style="font-size: 12px; color: var(--gold-light); font-weight:600;">Consensus Vote: $314,159.00 USD</div>
      <div class="node-sig">ECDSA: ${mockHash}...</div>
    `;

    container.appendChild(card);
  });
}

// 5. Smart Contracts Viewer
function setupContractsViewer() {
  const display = document.getElementById("codeDisplay");
  const btnOracle = document.getElementById("btnContractOracle");
  const btnStream = document.getElementById("btnContractStream");
  const btnPOS = document.getElementById("btnContractPOS");

  btnOracle.addEventListener("click", () => {
    display.textContent = CONTRACT_SNIPPETS.oracle;
  });
  btnStream.addEventListener("click", () => {
    display.textContent = CONTRACT_SNIPPETS.stream;
  });
  btnPOS.addEventListener("click", () => {
    display.textContent = CONTRACT_SNIPPETS.pos;
  });

  // Default display
  display.textContent = CONTRACT_SNIPPETS.oracle;
}
