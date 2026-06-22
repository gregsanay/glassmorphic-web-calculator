document.addEventListener("DOMContentLoaded", () => {
    // Left navigation drawer selectors
    const menuBtn = document.getElementById("menu-btn");
    const navDrawer = document.getElementById("nav-drawer");
    const navCloseBtn = document.getElementById("nav-close-btn");
    const navOverlay = document.getElementById("nav-overlay");
    const navDate = document.getElementById("nav-date");
    const dateCalculatorPanel = document.getElementById("date-calculator-panel");
    const displayArea = document.getElementById("display-area");

    // Screen display selectors
    const expressionDisplay = document.getElementById("expression-display");
    const inputDisplay = document.getElementById("input-display");

    // Sidebar panel selectors
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const tabHistory = document.getElementById("tab-history");
    const tabMemory = document.getElementById("tab-memory");
    const historyContainer = document.getElementById("history-container");
    const memoryContainer = document.getElementById("memory-container");
    const historyList = document.getElementById("history-list");
    const memoryList = document.getElementById("memory-list");
    const historyEmpty = document.getElementById("history-empty");
    const memoryEmpty = document.getElementById("memory-empty");
    const clearHistoryBtn = document.getElementById("clear-history");

    // Memory bar button selectors
    const memMC = document.getElementById("mem-mc");
    const memMR = document.getElementById("mem-mr");
    const memMPlus = document.getElementById("mem-mplus");
    const memMMinus = document.getElementById("mem-mminus");
    const memMS = document.getElementById("mem-ms");
    const memMShow = document.getElementById("mem-mshow");

    // Calculator State Variables
    let currentInput = "0";
    let isEvaluated = false;
    let serverMemory = "0";

    // Programmer Calculator State Variables
    let currentMode = "standard";
    let currentBase = "DEC"; // "HEX", "DEC", "OCT", "BIN"
    let currentWordSize = "QWORD"; // "QWORD", "DWORD", "WORD", "BYTE"
    let showBitKeyboard = false;
    let programmerVal = 0n;
    let backendExpression = "";

    // ----------------------------------------------------
    // Display Management Helpers
    // ----------------------------------------------------
    function updateDisplay() {
        // Adjust display font size based on input length for elegance
        if (currentInput.length > 16) {
            inputDisplay.style.fontSize = "22px";
        } else if (currentInput.length > 10) {
            inputDisplay.style.fontSize = "30px";
        } else {
            inputDisplay.style.fontSize = "40px";
        }
        inputDisplay.textContent = currentInput;
    }

    function appendNumber(num) {
        if (isEvaluated) {
            currentInput = num;
            isEvaluated = false;
        } else {
            if (currentInput === "0") {
                if (num === ".") {
                    currentInput = "0.";
                } else {
                    currentInput = num;
                }
            } else {
                if (num === "." && currentInput.includes(".")) {
                    return; // Prevent multiple decimal points
                }
                currentInput += num;
            }
        }
        updateDisplay();
    }

    function backspace() {
        if (isEvaluated) {
            expressionDisplay.textContent = "";
            isEvaluated = false;
            return;
        }
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = "0";
        }
        updateDisplay();
    }

    function clearEntry() {
        currentInput = "0";
        updateDisplay();
    }

    function clearAll() {
        currentInput = "0";
        expressionDisplay.textContent = "";
        isEvaluated = false;
        updateDisplay();
    }

    // ----------------------------------------------------
    // Calculator Operations & API Integration
    // ----------------------------------------------------
    function appendOperator(op) {
        if (isEvaluated) {
            expressionDisplay.textContent = currentInput + " " + op + " ";
            currentInput = "0";
            isEvaluated = false;
        } else {
            const currentExp = expressionDisplay.textContent;
            // If previous operation exists, check if ends in operator and swap it
            const operatorRegex = /[\+\-\×\÷]$/;
            if (currentExp && currentInput === "0") {
                const trimmed = currentExp.trim();
                if (operatorRegex.test(trimmed.slice(-1))) {
                    expressionDisplay.textContent = trimmed.slice(0, -1) + op + " ";
                    return;
                }
            }
            expressionDisplay.textContent += currentInput + " " + op + " ";
            currentInput = "0";
        }
        updateDisplay();
    }

    async function evaluate() {
        const expText = expressionDisplay.textContent;
        if (!expText && !isEvaluated) {
            // Allow direct evaluation of single constants
            if (currentInput === "pi" || currentInput === "e") {
                // proceed
            } else {
                return;
            }
        }

        // Build the formula to send cleanly
        let formula = expText + currentInput;
        if (!expText) {
            formula = currentInput;
        } else if (currentInput === "0") {
            const trimmed = expText.trim();
            if (trimmed.endsWith(")")) {
                formula = trimmed;
            }
        }
        
        try {
            const response = await fetch("/api/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expression: formula })
            });
            const data = await response.json();
            
            if (data.status === "success") {
                expressionDisplay.textContent = formula + " =";
                currentInput = data.result;
                isEvaluated = true;
                updateDisplay();
                loadHistory(); // Reload history sidebar
            } else {
                currentInput = data.error || "Error";
                isEvaluated = true;
                updateDisplay();
            }
        } catch (err) {
            currentInput = "Server Error";
            isEvaluated = true;
            updateDisplay();
        }
    }

    async function applyInstantFunction(fn) {
        let formula = "";
        if (fn === "1/x") {
            formula = `1 / (${currentInput})`;
        } else if (fn === "x^2") {
            formula = `(${currentInput}) ^ 2`;
        } else if (fn === "sqrt") {
            formula = `(${currentInput}) ^ 0.5`;
        }

        try {
            const response = await fetch("/api/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expression: formula })
            });
            const data = await response.json();
            
            if (data.status === "success") {
                expressionDisplay.textContent = `${fn}(${currentInput}) =`;
                currentInput = data.result;
                isEvaluated = true;
                updateDisplay();
                loadHistory();
            } else {
                currentInput = data.error || "Error";
                isEvaluated = true;
                updateDisplay();
            }
        } catch (err) {
            currentInput = "Server Error";
            isEvaluated = true;
            updateDisplay();
        }
    }

    function applyNegate() {
        if (currentInput === "0") return;
        if (currentInput.startsWith("-")) {
            currentInput = currentInput.slice(1);
        } else {
            currentInput = "-" + currentInput;
        }
        updateDisplay();
    }

    // Percentage logic Windows style: If part of multi-op, e.g. "A + B %", is (A * B / 100)
    function applyPercent() {
        const expText = expressionDisplay.textContent;
        if (!expText) {
            // Unary percent just divides by 100
            currentInput = (parseFloat(currentInput) / 100).toString();
            updateDisplay();
            return;
        }

        // Parse previous value (e.g. 50 from "50 + ")
        const parts = expText.trim().split(" ");
        if (parts.length >= 2) {
            const baseValue = parseFloat(parts[0]);
            if (!isNaN(baseValue)) {
                const percentVal = (baseValue * parseFloat(currentInput) / 100).toString();
                currentInput = percentVal;
                updateDisplay();
            }
        }
    }

    // ----------------------------------------------------
    // SQLite History Manager
    // ----------------------------------------------------
    async function loadHistory() {
        try {
            const response = await fetch("/api/history");
            const data = await response.json();
            
            if (data.status === "success" && data.history.length > 0) {
                historyEmpty.style.display = "none";
                clearHistoryBtn.style.display = "flex";
                historyList.innerHTML = "";
                
                data.history.forEach(item => {
                    const li = document.createElement("li");
                    li.className = "history-item";
                    li.innerHTML = `
                        <span class="history-item-exp">${item.expression}</span>
                        <span class="history-item-res">${item.result}</span>
                    `;
                    // Click a history item to restore state
                    li.addEventListener("click", () => {
                        expressionDisplay.textContent = item.expression + " =";
                        currentInput = item.result;
                        isEvaluated = true;
                        updateDisplay();
                    });
                    historyList.appendChild(li);
                });
            } else {
                historyEmpty.style.display = "block";
                clearHistoryBtn.style.display = "none";
                historyList.innerHTML = "";
            }
        } catch (err) {
            console.error("Failed to load history:", err);
        }
    }

    async function clearHistory() {
        try {
            const response = await fetch("/api/history", { method: "DELETE" });
            const data = await response.json();
            if (data.status === "success") {
                loadHistory();
            }
        } catch (err) {
            console.error("Failed to clear history:", err);
        }
    }

    // ----------------------------------------------------
    // State Memory Manager
    // ----------------------------------------------------
    async function handleMemory(action) {
        try {
            const response = await fetch("/api/memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: action, value: currentInput })
            });
            const data = await response.json();
            
            if (data.status === "success") {
                serverMemory = data.memory;
                updateMemoryUI();
            }
        } catch (err) {
            console.error("Memory operation failed:", err);
        }
    }

    async function checkMemoryOnLoad() {
        try {
            const response = await fetch("/api/memory");
            const data = await response.json();
            if (data.status === "success") {
                serverMemory = data.memory;
                updateMemoryUI();
            }
        } catch (err) {
            console.error("Failed to get initial memory:", err);
        }
    }

    function updateMemoryUI() {
        const hasMemory = serverMemory !== "0";
        memMC.disabled = !hasMemory;
        memMR.disabled = !hasMemory;
        memMShow.disabled = !hasMemory;

        // Render Memory list items in sidebar
        if (hasMemory) {
            memoryEmpty.style.display = "none";
            memoryList.innerHTML = `
                <li class="memory-item">
                    <span class="memory-item-val">${serverMemory}</span>
                    <div class="memory-item-actions">
                        <button id="mem-item-mc">MC</button>
                        <button id="mem-item-mplus">M+</button>
                        <button id="mem-item-mminus">M-</button>
                    </div>
                </li>
            `;
            
            // Attach item-level listeners
            document.getElementById("mem-item-mc").addEventListener("click", () => handleMemory("MC"));
            document.getElementById("mem-item-mplus").addEventListener("click", () => handleMemory("M+"));
            document.getElementById("mem-item-mminus").addEventListener("click", () => handleMemory("M-"));
        } else {
            memoryEmpty.style.display = "block";
            memoryList.innerHTML = "";
        }
    }

    // ----------------------------------------------------
    // Interactive Grid Listeners
    // ----------------------------------------------------
    document.querySelectorAll(".keypad-grid").forEach(grid => {
        grid.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            // Trigger visual click ripple
            animateButton(btn);

            if (currentMode === "programmer") {
                handleProgrammerKeyPress(btn);
                return;
            }

            // Click Logic routing
            if (btn.classList.contains("num-btn")) {
                const val = btn.getAttribute("data-val");
                const action = btn.getAttribute("data-action");
                if (val) {
                    appendNumber(val);
                } else if (action === "negate") {
                    applyNegate();
                }
            } else if (btn.classList.contains("math-op")) {
                const op = btn.getAttribute("data-op");
                appendOperator(op);
            } else if (btn.classList.contains("num-constant-btn")) {
                const val = btn.getAttribute("data-val");
                if (isEvaluated) {
                    currentInput = val;
                    isEvaluated = false;
                } else {
                    if (currentInput === "0") {
                        currentInput = val;
                    } else {
                        currentInput += val;
                    }
                }
                updateDisplay();
            } else if (btn.classList.contains("math-func-btn")) {
                const fn = btn.getAttribute("data-fn");
                const op = btn.getAttribute("data-op");
                
                if (op === "^") {
                    appendOperator("^");
                } else if (fn === "x^2" || fn === "x^3" || fn === "1/x" || fn === "sqrt") {
                    applyInstantFunction(fn);
                } else if (fn) {
                    if (isEvaluated) {
                        expressionDisplay.textContent = "";
                        isEvaluated = false;
                    }
                    if (fn === "factorial") {
                        expressionDisplay.textContent += `factorial(${currentInput}) `;
                        currentInput = "0";
                    } else {
                        expressionDisplay.textContent += `${fn}(${currentInput}) `;
                        currentInput = "0";
                    }
                    updateDisplay();
                }
            } else if (btn.classList.contains("op-btn")) {
                const action = btn.getAttribute("data-action");
                const fn = btn.getAttribute("data-fn");
                const val = btn.getAttribute("data-val");

                if (val === "%") {
                    applyPercent();
                } else if (action === "C") {
                     clearAll();
                } else if (action === "CE") {
                     clearEntry();
                } else if (action === "backspace") {
                     backspace();
                } else if (fn) {
                     applyInstantFunction(fn);
                }
            } else if (btn.classList.contains("action-btn")) {
                evaluate();
            }
        });
    });

    // Attach memory button bar click listeners
    memMC.addEventListener("click", () => handleMemory("MC"));
    memMR.addEventListener("click", () => {
        currentInput = serverMemory;
        isEvaluated = true;
        updateDisplay();
    });
    memMPlus.addEventListener("click", () => handleMemory("M+"));
    memMMinus.addEventListener("click", () => handleMemory("M-"));
    memMS.addEventListener("click", () => handleMemory("MS"));
    memMShow.addEventListener("click", () => {
        // Switch to memory tab in sidebar
        tabMemory.click();
        sidebar.classList.remove("collapsed");
    });

    // ----------------------------------------------------
    // Visual Micro-animations
    // ----------------------------------------------------
    function animateButton(btn) {
        btn.style.transform = "scale(0.94)";
        setTimeout(() => {
            btn.style.transform = "";
        }, 80);
    }

    // ----------------------------------------------------
    // Physical Keyboard Routing
    // ----------------------------------------------------
    window.addEventListener("keydown", (e) => {
        let key = e.key;
        let activeGridSelector = ".standard-grid";
        if (currentMode === "scientific") activeGridSelector = ".scientific-grid";
        if (currentMode === "programmer") activeGridSelector = ".programmer-grid";

        let allowedDigits = "0123456789.";
        if (currentMode === "programmer") {
            allowedDigits = "0123456789abcdefABCDEF";
        }

        if (allowedDigits.includes(key)) {
            let lookupKey = key.toUpperCase();
            const btn = document.querySelector(`${activeGridSelector} .num-btn[data-val="${lookupKey}"]`) ||
                        document.querySelector(`${activeGridSelector} [data-val="${lookupKey}"]`) ||
                        document.querySelector(`${activeGridSelector} .num-btn[data-val="${key}"]`);
            if (btn && !btn.disabled) {
                e.preventDefault();
                btn.focus();
                btn.click();
            }
        } else if (key === "+" || key === "-" || key === "*" || key === "/" || key === "%" || key === "&" || key === "|" || key === "^" || key === "~") {
            let opMap = { "+": "+", "-": "-", "*": "×", "/": "÷", "%": "%", "&": "&", "|": "|", "^": "^", "~": "~" };
            let mappedOp = opMap[key];
            const btn = document.querySelector(`${activeGridSelector} [data-op="${mappedOp}"]`) ||
                        document.querySelector(`${activeGridSelector} [data-action="${key}"]`);
            if (btn && !btn.disabled) {
                e.preventDefault();
                btn.focus();
                btn.click();
            }
        } else if (key === "Enter" || key === "=") {
            e.preventDefault();
            const btn = document.querySelector(`${activeGridSelector} [data-action="equals"]`) ||
                        document.getElementById("key-equals") ||
                        document.getElementById("key-sci-equals") ||
                        document.getElementById("key-prog-equals");
            if (btn && !btn.disabled) {
                btn.focus();
                btn.click();
            }
        } else if (key === "Backspace") {
            const btn = document.querySelector(`${activeGridSelector} [data-action="backspace"]`);
            if (btn) {
                e.preventDefault();
                btn.focus();
                btn.click();
            }
        } else if (key === "Escape") {
            const btn = document.querySelector(`${activeGridSelector} [data-action="C"]`);
            if (btn) {
                e.preventDefault();
                btn.focus();
                btn.click();
            }
        } else if (key === "Delete") {
            const btn = document.querySelector(`${activeGridSelector} [data-action="CE"]`);
            if (btn) {
                e.preventDefault();
                btn.focus();
                btn.click();
            }
        }
    });

    // ----------------------------------------------------
    // Left navigation drawer controllers
    // ----------------------------------------------------
    menuBtn.addEventListener("click", () => {
        navDrawer.classList.remove("collapsed");
        navOverlay.classList.remove("hidden");
    });

    const closeNav = () => {
        navDrawer.classList.add("collapsed");
        navOverlay.classList.add("hidden");
    };

    navCloseBtn.addEventListener("click", closeNav);
    navOverlay.addEventListener("click", closeNav);

    // ----------------------------------------------------
    // Sidebar drawer controllers
    // ----------------------------------------------------
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
    });

    const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener("click", () => {
            sidebar.classList.add("collapsed");
        });
    }

    tabHistory.addEventListener("click", () => {
        tabHistory.classList.add("active");
        tabMemory.classList.remove("active");
        historyContainer.classList.add("active-content");
        memoryContainer.classList.remove("active-content");
    });

    tabMemory.addEventListener("click", () => {
        tabMemory.classList.add("active");
        tabHistory.classList.remove("active");
        memoryContainer.classList.add("active-content");
        historyContainer.classList.remove("active-content");
    });

    clearHistoryBtn.addEventListener("click", clearHistory);

    // ----------------------------------------------------
    // Float-Centered Custom Tooltip Controller
    // ----------------------------------------------------
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    document.body.appendChild(tooltip);

    // Delegate hover listeners to body to support dynamic layout items
    document.body.addEventListener("mouseenter", (e) => {
        const el = e.target.closest("[data-tooltip]");
        if (!el) return;
        
        const text = el.getAttribute("data-tooltip");
        tooltip.textContent = text;
        tooltip.classList.add("visible");
        
        const rect = el.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        const top = rect.top - tooltipRect.height - 6 + window.scrollY;
        const left = rect.left + (rect.width - tooltipRect.width) / 2 + window.scrollX;
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }, true);

    document.body.addEventListener("mouseleave", (e) => {
        const el = e.target.closest("[data-tooltip]");
        if (!el) return;
        tooltip.classList.remove("visible");
    }, true);

    // ----------------------------------------------------
    // Fully Functional Settings Modal & Theme Toggle
    // ----------------------------------------------------
    const settingsModal = document.getElementById("settings-modal");
    const settingsCloseBtn = document.getElementById("settings-close-btn");
    const settingsSaveBtn = document.getElementById("settings-save-btn");
    const navSettings = document.getElementById("nav-settings");

    // Load active settings from the backend API on startup
    async function loadSettings() {
        try {
            const response = await fetch("/api/settings");
            const data = await response.json();
            if (data.status === "success") {
                const config = data.settings;
                
                // Bind radios to visual settings on screen
                const trigRadio = document.querySelector(`input[name="trig-radio"][value="${config.trig_mode}"]`);
                if (trigRadio) trigRadio.checked = true;
                
                const precRadio = document.querySelector(`input[name="prec-radio"][value="${config.precision}"]`);
                if (precRadio) precRadio.checked = true;
            }
        } catch (err) {
            console.error("Failed to load settings from server:", err);
        }

        // Restore Theme
        const savedTheme = localStorage.getItem('calculatorTheme') || 'dark';
        const themeRadio = document.querySelector(`input[name="theme-radio"][value="${savedTheme}"]`);
        if (themeRadio) themeRadio.checked = true;
        
        const container = document.querySelector(".calculator-container");
        if (savedTheme === "light") {
            document.body.classList.add("light-theme");
            if (container) container.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
            if (container) container.classList.remove("light-theme");
        }
    }

    // Save active settings to the backend API and apply styles locally
    async function saveSettings() {
        const theme = document.querySelector('input[name="theme-radio"]:checked').value;
        const trig = document.querySelector('input[name="trig-radio"]:checked').value;
        const precision = document.querySelector('input[name="prec-radio"]:checked').value;
        
        // Apply theme immediately
        localStorage.setItem('calculatorTheme', theme);
        const container = document.querySelector(".calculator-container");
        if (theme === "light") {
            document.body.classList.add("light-theme");
            if (container) container.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
            if (container) container.classList.remove("light-theme");
        }
        
        // POST to backend api
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trig_mode: trig, precision: precision })
            });
        } catch (err) {
            console.error("Failed to save settings on server:", err);
        }
        
        settingsModal.classList.add("hidden");
    }

    navSettings.addEventListener("click", () => {
        closeNav();
        settingsModal.classList.remove("hidden");
    });
    settingsCloseBtn.addEventListener("click", () => {
        settingsModal.classList.add("hidden");
    });
    settingsSaveBtn.addEventListener("click", saveSettings);

    // ----------------------------------------------------
    // Programmer Mode Specific Controller Logic
    // ----------------------------------------------------
    const baseHex = document.getElementById("base-hex");
    const baseDec = document.getElementById("base-dec");
    const baseOct = document.getElementById("base-oct");
    const baseBin = document.getElementById("base-bin");
    const wordSizeToggle = document.getElementById("word-size-toggle");
    const bitKeyboardToggle = document.getElementById("bit-keyboard-toggle");
    const navProgrammer = document.getElementById("nav-programmer");
    const programmerGrid = document.getElementById("programmer-grid");
    const programmerBasePanel = document.getElementById("programmer-base-panel");
    const programmerHeaderBar = document.getElementById("programmer-header-bar");
    const bitKeyboardGrid = document.getElementById("bit-keyboard-grid");

    function getRadix(base) {
        if (base === "HEX") return 16;
        if (base === "OCT") return 8;
        if (base === "BIN") return 2;
        return 10;
    }

    function getBits(val, wordSize) {
        let bits = 64n;
        if (wordSize === "DWORD") bits = 32n;
        if (wordSize === "WORD") bits = 16n;
        if (wordSize === "BYTE") bits = 8n;
        
        let mask = (1n << bits) - 1n;
        return BigInt(val) & mask;
    }

    function toSigned(unsignedVal, wordSize) {
        let bits = 64n;
        if (wordSize === "DWORD") bits = 32n;
        if (wordSize === "WORD") bits = 16n;
        if (wordSize === "BYTE") bits = 8n;
        
        let limit = 1n << (bits - 1n);
        if (unsignedVal >= limit) {
            unsignedVal -= (1n << bits);
        }
        return unsignedVal;
    }

    function updateKeypadAvailability() {
        const activeBase = currentBase;
        const hexKeys = document.querySelectorAll(".programmer-grid .hex-btn");
        const numKeys = document.querySelectorAll(".programmer-grid .num-btn:not(.hex-btn)");
        
        hexKeys.forEach(btn => {
            btn.disabled = (activeBase !== "HEX");
        });
        
        numKeys.forEach(btn => {
            const val = btn.getAttribute("data-val");
            if (activeBase === "HEX") {
                btn.disabled = false;
            } else if (activeBase === "DEC") {
                btn.disabled = (val === "A" || val === "B" || val === "C" || val === "D" || val === "E" || val === "F");
            } else if (activeBase === "OCT") {
                btn.disabled = (val === "8" || val === "9" || val === "A" || val === "B" || val === "C" || val === "D" || val === "E" || val === "F");
            } else if (activeBase === "BIN") {
                btn.disabled = (val !== "0" && val !== "1");
            }
        });
    }

    function updateProgrammerBases() {
        const bits = getBits(programmerVal, currentWordSize);
        
        if (baseHex) document.getElementById("val-hex").textContent = bits.toString(16).toUpperCase();
        if (baseDec) document.getElementById("val-dec").textContent = programmerVal.toString(10);
        if (baseOct) document.getElementById("val-oct").textContent = bits.toString(8);
        
        if (baseBin) {
            let binStr = bits.toString(2);
            let padLen = 64;
            if (currentWordSize === "DWORD") padLen = 32;
            if (currentWordSize === "WORD") padLen = 16;
            if (currentWordSize === "BYTE") padLen = 8;
            binStr = binStr.padStart(padLen, '0');
            let binGrouped = "";
            for (let i = 0; i < binStr.length; i++) {
                if (i > 0 && i % 4 === 0) binGrouped += " ";
                binGrouped += binStr[i];
            }
            document.getElementById("val-bin").textContent = binGrouped;
        }
        
        if (currentBase === "HEX") {
            inputDisplay.textContent = bits.toString(16).toUpperCase();
        } else if (currentBase === "DEC") {
            inputDisplay.textContent = programmerVal.toString(10);
        } else if (currentBase === "OCT") {
            inputDisplay.textContent = bits.toString(8);
        } else if (currentBase === "BIN") {
            inputDisplay.textContent = bits.toString(2);
        }
        
        if (showBitKeyboard) {
            renderBitKeyboard();
        }
    }

    function renderBitKeyboard() {
        if (!bitKeyboardGrid) return;
        bitKeyboardGrid.innerHTML = "";
        
        let totalBits = 64;
        if (currentWordSize === "DWORD") totalBits = 32;
        if (currentWordSize === "WORD") totalBits = 16;
        if (currentWordSize === "BYTE") totalBits = 8;
        
        const bitsVal = getBits(programmerVal, currentWordSize);
        
        for (let octet = (totalBits / 8) - 1; octet >= 0; octet--) {
            const octetDiv = document.createElement("div");
            octetDiv.className = "bit-octet";
            
            for (let i = 7; i >= 0; i--) {
                const bitIdx = octet * 8 + i;
                const bitCell = document.createElement("div");
                bitCell.className = "bit-cell";
                bitCell.setAttribute("data-bit", bitIdx);
                
                const bitActive = (bitsVal & (1n << BigInt(bitIdx))) !== 0n;
                
                const valSpan = document.createElement("span");
                valSpan.className = "bit-value" + (bitActive ? " active-bit" : "");
                valSpan.textContent = bitActive ? "1" : "0";
                
                const idxSpan = document.createElement("span");
                idxSpan.className = "bit-index";
                idxSpan.textContent = bitIdx;
                
                bitCell.appendChild(valSpan);
                bitCell.appendChild(idxSpan);
                
                bitCell.addEventListener("click", () => {
                    toggleBit(bitIdx);
                });
                
                octetDiv.appendChild(bitCell);
            }
            bitKeyboardGrid.appendChild(octetDiv);
        }
    }

    function toggleBit(bitIdx) {
        let bitsVal = getBits(programmerVal, currentWordSize);
        bitsVal ^= (1n << BigInt(bitIdx));
        programmerVal = toSigned(bitsVal, currentWordSize);
        updateProgrammerBases();
    }

    function changeBase(newBase) {
        currentBase = newBase;
        
        document.querySelectorAll(".base-row").forEach(row => {
            row.classList.toggle("active", row.getAttribute("data-base") === newBase);
        });
        
        let bits = getBits(programmerVal, currentWordSize);
        currentInput = bits.toString(getRadix(newBase));
        if (newBase === "HEX") currentInput = currentInput.toUpperCase();
        
        updateKeypadAvailability();
        updateProgrammerBases();
    }

    if (baseHex) baseHex.addEventListener("click", () => changeBase("HEX"));
    if (baseDec) baseDec.addEventListener("click", () => changeBase("DEC"));
    if (baseOct) baseOct.addEventListener("click", () => changeBase("OCT"));
    if (baseBin) baseBin.addEventListener("click", () => changeBase("BIN"));

    if (wordSizeToggle) {
        wordSizeToggle.addEventListener("click", () => {
            if (currentWordSize === "QWORD") {
                currentWordSize = "DWORD";
            } else if (currentWordSize === "DWORD") {
                currentWordSize = "WORD";
            } else if (currentWordSize === "WORD") {
                currentWordSize = "BYTE";
            } else {
                currentWordSize = "QWORD";
            }
            wordSizeToggle.textContent = currentWordSize;
            
            programmerVal = toSigned(getBits(programmerVal, currentWordSize), currentWordSize);
            updateProgrammerBases();
        });
    }

    if (bitKeyboardToggle) {
        bitKeyboardToggle.addEventListener("click", () => {
            showBitKeyboard = !showBitKeyboard;
            bitKeyboardGrid.classList.toggle("hidden", !showBitKeyboard);
            const container = document.querySelector(".calculator-container");
            if (container) {
                container.classList.toggle("bit-keyboard-open", showBitKeyboard);
            }
            if (showBitKeyboard) {
                renderBitKeyboard();
            }
        });
    }

    function programmerAppendNumber(num) {
        if (isEvaluated) {
            currentInput = num;
            isEvaluated = false;
        } else {
            if (currentInput === "0") {
                currentInput = num;
            } else {
                currentInput += num;
            }
        }
        
        try {
            let parsedVal;
            if (currentBase === "HEX") {
                parsedVal = BigInt("0x" + currentInput);
            } else if (currentBase === "BIN") {
                parsedVal = BigInt("0b" + currentInput);
            } else if (currentBase === "OCT") {
                parsedVal = BigInt("0o" + currentInput);
            } else {
                parsedVal = BigInt(currentInput);
            }
            programmerVal = toSigned(getBits(parsedVal, currentWordSize), currentWordSize);
        } catch (err) {
            // Ignore incomplete parses
        }
        updateProgrammerBases();
    }

    function programmerBackspace() {
        if (isEvaluated) {
            expressionDisplay.textContent = "";
            isEvaluated = false;
            return;
        }
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = "0";
        }
        
        try {
            let parsedVal;
            if (currentInput === "") {
                parsedVal = 0n;
            } else if (currentBase === "HEX") {
                parsedVal = BigInt("0x" + currentInput);
            } else if (currentBase === "BIN") {
                parsedVal = BigInt("0b" + currentInput);
            } else if (currentBase === "OCT") {
                parsedVal = BigInt("0o" + currentInput);
            } else {
                parsedVal = BigInt(currentInput);
            }
            programmerVal = toSigned(getBits(parsedVal, currentWordSize), currentWordSize);
        } catch (err) {
            programmerVal = 0n;
        }
        updateProgrammerBases();
    }

    function programmerClearEntry() {
        currentInput = "0";
        programmerVal = 0n;
        updateProgrammerBases();
    }

    function programmerClearAll() {
        currentInput = "0";
        programmerVal = 0n;
        expressionDisplay.textContent = "";
        backendExpression = "";
        isEvaluated = false;
        updateProgrammerBases();
    }

    function programmerNegate() {
        programmerVal = toSigned(getBits(-programmerVal, currentWordSize), currentWordSize);
        currentInput = getBits(programmerVal, currentWordSize).toString(getRadix(currentBase));
        if (currentBase === "HEX") currentInput = currentInput.toUpperCase();
        updateProgrammerBases();
    }

    function programmerAppendOperator(op) {
        let literalVal = "";
        const bits = getBits(programmerVal, currentWordSize);
        if (currentBase === "HEX") {
            literalVal = "0x" + bits.toString(16);
        } else if (currentBase === "BIN") {
            literalVal = "0b" + bits.toString(2);
        } else if (currentBase === "OCT") {
            literalVal = "0o" + bits.toString(8);
        } else {
            literalVal = programmerVal.toString(10);
        }
        
        let visualVal = "";
        if (currentBase === "HEX") {
            visualVal = bits.toString(16).toUpperCase();
        } else if (currentBase === "BIN") {
            visualVal = bits.toString(2);
        } else if (currentBase === "OCT") {
            visualVal = bits.toString(8);
        } else {
            visualVal = programmerVal.toString(10);
        }
        
        if (isEvaluated) {
            expressionDisplay.textContent = visualVal + " " + op + " ";
            backendExpression = literalVal + " " + op + " ";
            currentInput = "0";
            isEvaluated = false;
        } else {
            expressionDisplay.textContent += visualVal + " " + op + " ";
            backendExpression += literalVal + " " + op + " ";
            currentInput = "0";
        }
        programmerVal = 0n;
        updateProgrammerBases();
    }

    async function programmerEvaluate() {
        let literalVal = "";
        const bits = getBits(programmerVal, currentWordSize);
        if (currentBase === "HEX") {
            literalVal = "0x" + bits.toString(16);
        } else if (currentBase === "BIN") {
            literalVal = "0b" + bits.toString(2);
        } else if (currentBase === "OCT") {
            literalVal = "0o" + bits.toString(8);
        } else {
            literalVal = programmerVal.toString(10);
        }
        
        const formula = backendExpression + literalVal;
        if (!formula) return;
        
        try {
            const response = await fetch("/api/calculate/programmer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expression: formula, word_size: currentWordSize })
            });
            
            const result = await response.json();
            if (result.status === "success") {
                programmerVal = BigInt(result.result);
                currentInput = getBits(programmerVal, currentWordSize).toString(getRadix(currentBase));
                if (currentBase === "HEX") currentInput = currentInput.toUpperCase();
                
                expressionDisplay.textContent = "";
                backendExpression = "";
                isEvaluated = true;
                updateProgrammerBases();
                loadHistory();
            } else {
                inputDisplay.textContent = "Error";
                setTimeout(programmerClearAll, 2000);
            }
        } catch (err) {
            inputDisplay.textContent = "Error";
            setTimeout(programmerClearAll, 2000);
        }
    }

    function handleProgrammerKeyPress(btn) {
        if (btn.classList.contains("num-btn")) {
            const val = btn.getAttribute("data-val");
            const action = btn.getAttribute("data-action");
            if (val) {
                programmerAppendNumber(val);
            } else if (action === "negate") {
                programmerNegate();
            }
        } else if (btn.classList.contains("math-op") || btn.classList.contains("bitwise-btn")) {
            const op = btn.getAttribute("data-op");
            const action = btn.getAttribute("data-action");
            if (op) {
                programmerAppendOperator(op);
            } else if (action === "~") {
                programmerVal = toSigned(getBits(~programmerVal, currentWordSize), currentWordSize);
                currentInput = getBits(programmerVal, currentWordSize).toString(getRadix(currentBase));
                if (currentBase === "HEX") currentInput = currentInput.toUpperCase();
                updateProgrammerBases();
            }
        } else if (btn.classList.contains("op-btn")) {
            const action = btn.getAttribute("data-action");
            const val = btn.getAttribute("data-val");
            if (val === "(" || val === ")") {
                if (isEvaluated) {
                    expressionDisplay.textContent = val + " ";
                    backendExpression = val + " ";
                    isEvaluated = false;
                } else {
                    expressionDisplay.textContent += val + " ";
                    backendExpression += val + " ";
                }
                currentInput = "0";
                programmerVal = 0n;
                updateProgrammerBases();
            } else if (action === "C") {
                programmerClearAll();
            } else if (action === "CE") {
                programmerClearEntry();
            } else if (action === "backspace") {
                programmerBackspace();
            }
        } else if (btn.classList.contains("action-btn")) {
            programmerEvaluate();
        }
    }

    // ----------------------------------------------------
    // Mode Switching (Standard vs. Scientific)
    // ----------------------------------------------------
    const navStandard = document.getElementById("nav-standard");
    const navScientific = document.getElementById("nav-scientific");
    const standardGrid = document.getElementById("standard-grid");
    const scientificGrid = document.getElementById("scientific-grid");
    const headerTitle = document.querySelector(".app-header .app-title");

    function switchMode(mode) {
        const container = document.querySelector(".calculator-container");
        currentMode = mode;
        localStorage.setItem('calculatorMode', mode);
        if (container) {
            container.classList.remove("bit-keyboard-open");
            container.classList.remove("scientific-mode");
            container.classList.remove("programmer-mode");
            container.classList.remove("date-mode");
            container.style.maxWidth = "";
        }
        
        navStandard.classList.toggle("active", mode === "standard");
        navScientific.classList.toggle("active", mode === "scientific");
        if (navProgrammer) navProgrammer.classList.toggle("active", mode === "programmer");
        if (navDate) navDate.classList.toggle("active", mode === "date");
        
        standardGrid.classList.toggle("hidden", mode !== "standard");
        scientificGrid.classList.toggle("hidden", mode !== "scientific");
        if (programmerGrid) programmerGrid.classList.toggle("hidden", mode !== "programmer");
        if (dateCalculatorPanel) dateCalculatorPanel.classList.toggle("hidden", mode !== "date");
        
        if (displayArea) displayArea.classList.toggle("hidden", mode === "date");
        
        if (programmerBasePanel) programmerBasePanel.classList.toggle("hidden", mode !== "programmer");
        if (programmerHeaderBar) programmerHeaderBar.classList.toggle("hidden", mode !== "programmer");
        if (bitKeyboardGrid) {
            bitKeyboardGrid.classList.add("hidden");
            showBitKeyboard = false;
        }
        
        const memoryBar = document.querySelector(".memory-bar");
        if (memoryBar) {
            memoryBar.classList.toggle("hidden", mode === "programmer" || mode === "date");
        }
        
        if (mode === "standard") {
            headerTitle.textContent = "Standard";
        } else if (mode === "scientific") {
            headerTitle.textContent = "Scientific";
            if (container) {
                container.classList.add("scientific-mode");
            }
        } else if (mode === "programmer") {
            headerTitle.textContent = "Programmer";
            if (container) {
                container.classList.add("programmer-mode");
            }
            currentBase = "DEC";
            currentWordSize = "QWORD";
            if (wordSizeToggle) wordSizeToggle.textContent = "QWORD";
            changeBase("DEC");
        } else if (mode === "date") {
            headerTitle.textContent = "Date Calculation";
            if (container) {
                container.classList.add("date-mode");
            }
            initDateCalculator();
        }
        
        if (mode === "programmer") {
            programmerClearAll();
        } else {
            clearAll();
        }
        closeNav();
    }

    navStandard.addEventListener("click", () => switchMode("standard"));
    navScientific.addEventListener("click", () => switchMode("scientific"));
    if (navProgrammer) navProgrammer.addEventListener("click", () => switchMode("programmer"));
    if (navDate) navDate.addEventListener("click", () => switchMode("date"));

    // ----------------------------------------------------
    // Date Calculation Controller Logic
    // ----------------------------------------------------
    const dateCalcType = document.getElementById("date-calc-type");
    const dateDiffPanel = document.getElementById("date-diff-panel");
    const dateAddSubPanel = document.getElementById("date-add-sub-panel");
    
    const dateDiffFrom = document.getElementById("date-diff-from");
    const dateDiffTo = document.getElementById("date-diff-to");
    const dateDiffResultPrimary = document.getElementById("date-diff-result-primary");
    const dateDiffResultSecondary = document.getElementById("date-diff-result-secondary");
    
    const dateAddSubFrom = document.getElementById("date-add-sub-from");
    const dateYears = document.getElementById("date-years");
    const dateMonths = document.getElementById("date-months");
    const dateDays = document.getElementById("date-days");
    const dateAddSubResult = document.getElementById("date-add-sub-result");
    
    let isDateInitialized = false;

    function initDateCalculator() {
        if (isDateInitialized) return;
        isDateInitialized = true;
        
        // Initialize inputs to today
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateDiffFrom) dateDiffFrom.value = todayStr;
        if (dateDiffTo) dateDiffTo.value = todayStr;
        if (dateAddSubFrom) dateAddSubFrom.value = todayStr;
        
        // Setup change listeners
        if (dateCalcType) {
            dateCalcType.addEventListener("change", () => {
                const subMode = dateCalcType.value;
                dateDiffPanel.classList.toggle("hidden", subMode !== "difference");
                dateAddSubPanel.classList.toggle("hidden", subMode !== "add-subtract");
                runDateCalculation();
            });
        }
        
        [dateDiffFrom, dateDiffTo].forEach(el => {
            if (el) el.addEventListener("change", runDateCalculation);
        });
        
        [dateAddSubFrom, dateYears, dateMonths, dateDays].forEach(el => {
            if (el) el.addEventListener("input", runDateCalculation);
            if (el) el.addEventListener("change", runDateCalculation);
        });
        
        document.querySelectorAll('input[name="date-op-type"]').forEach(radio => {
            radio.addEventListener("change", runDateCalculation);
        });
        
        runDateCalculation();
    }

    function runDateCalculation() {
        const subMode = dateCalcType.value;
        if (subMode === "difference") {
            const fromDateVal = dateDiffFrom.value;
            const toDateVal = dateDiffTo.value;
            if (!fromDateVal || !toDateVal) return;
            
            const d1 = new Date(fromDateVal + "T00:00:00");
            const d2 = new Date(toDateVal + "T00:00:00");
            
            const res = calculateDateDiff(d1, d2);
            dateDiffResultPrimary.textContent = res.primary;
            dateDiffResultSecondary.textContent = res.secondary;
        } else {
            const fromDateVal = dateAddSubFrom.value;
            if (!fromDateVal) return;
            
            const baseDate = new Date(fromDateVal + "T00:00:00");
            const op = document.querySelector('input[name="date-op-type"]:checked').value;
            const years = parseInt(dateYears.value) || 0;
            const months = parseInt(dateMonths.value) || 0;
            const days = parseInt(dateDays.value) || 0;
            
            const resDate = calculateDateAddSub(baseDate, op, years, months, days);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateAddSubResult.textContent = resDate.toLocaleDateString('en-US', options);
        }
    }

    function calculateDateDiff(d1, d2) {
        if (d1.getTime() === d2.getTime()) {
            return { primary: "Same date", secondary: "0 days" };
        }
        
        let start = new Date(d1);
        let end = new Date(d2);
        
        if (start > end) {
            start = new Date(d2);
            end = new Date(d1);
        }
        
        const diffTime = Math.abs(d2 - d1);
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();
        
        if (days < 0) {
            months--;
            // get days in previous month
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        
        let parts = [];
        if (years > 0) parts.push(years === 1 ? "1 year" : `${years} years`);
        if (months > 0) parts.push(months === 1 ? "1 month" : `${months} months`);
        if (weeks > 0) parts.push(weeks === 1 ? "1 week" : `${weeks} weeks`);
        if (remainingDays > 0) parts.push(remainingDays === 1 ? "1 day" : `${remainingDays} days`);
        
        return {
            primary: parts.join(", ") || "Same date",
            secondary: totalDays === 1 ? "1 day" : `${totalDays} days`
        };
    }

    function calculateDateAddSub(baseDate, op, years, months, days) {
        let result = new Date(baseDate);
        const mult = (op === "subtract") ? -1 : 1;
        
        result.setFullYear(result.getFullYear() + (years * mult));
        result.setMonth(result.getMonth() + (months * mult));
        result.setDate(result.getDate() + (days * mult));
        
        return result;
    }

    // Initial Load Sequence
    loadHistory();
    checkMemoryOnLoad();
    loadSettings();
    updateDisplay();
    
    // Restore Mode
    const savedMode = localStorage.getItem('calculatorMode') || 'standard';
    switchMode(savedMode);
});
