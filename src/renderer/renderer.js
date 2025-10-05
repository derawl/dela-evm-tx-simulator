/**
 * TX Simulator Renderer Process
 * Handles the frontend UI and communicates with the main process
 */

// Global state
let currentSimulation = null;
let isSimulationRunning = false;

// UI elements
const elements = {
    // Form inputs
    rpcUrl: document.getElementById('rpc-url'),
    forkBlock: document.getElementById('fork-block'),
    fromAddress: document.getElementById('from-address'),
    toAddress: document.getElementById('to-address'),
    value: document.getElementById('value'),
    gasLimit: document.getElementById('gas-limit'),
    gasPrice: document.getElementById('gas-price'),
    enableTrace: document.getElementById('enable-trace'),
    debugMode: document.getElementById('debug-mode'),
    
    // Contract interaction
    enableContractCall: document.getElementById('enable-contract-call'),
    contractFields: document.getElementById('contract-fields'),
    functionSignature: document.getElementById('function-signature'),
    functionParams: document.getElementById('function-params'),
    rawCalldata: document.getElementById('raw-calldata'),

    // Buttons
    newSimulation: document.getElementById('new-simulation'),
    runSimulation: document.getElementById('run-simulation'),
    validateConfig: document.getElementById('validate-config'),
    clearResults: document.getElementById('clear-results'),
    clearLogs: document.getElementById('clear-logs'),

    // Tabs
    tabButtons: document.querySelectorAll('.tab-button'),
    tabPanels: document.querySelectorAll('.tab-panel'),

    // Results
    noResults: document.getElementById('no-results'),
    simulationResults: document.getElementById('simulation-results'),
    resultStatusBadge: document.getElementById('result-status-badge'),
    txHash: document.getElementById('tx-hash'),
    gasUsed: document.getElementById('gas-used'),
    gasLimitResult: document.getElementById('gas-limit-result'),
    gasPriceResult: document.getElementById('gas-price-result'),
    blockNumber: document.getElementById('block-number'),
    blockHash: document.getElementById('block-hash'),

    // Trace
    noTrace: document.getElementById('no-trace'),
    traceResults: document.getElementById('trace-results'),
    traceContent: document.getElementById('trace-content'),
    expandAllTrace: document.getElementById('expand-all-trace'),
    collapseAllTrace: document.getElementById('collapse-all-trace'),

    // Logs
    logsContent: document.getElementById('logs-content'),

    // Status
    connectionStatus: document.getElementById('connection-status'),
    version: document.getElementById('version'),

    // Loading
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingMessage: document.getElementById('loading-message')
};

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing TX Simulator...');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize tabs
    initializeTabs();
    
    // Update UI state
    updateUIState();
    
    // Log startup
    addLog('info', 'TX Simulator initialized successfully');
    
    console.log('TX Simulator initialization complete');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Button handlers
    elements.newSimulation.addEventListener('click', handleNewSimulation);
    elements.runSimulation.addEventListener('click', handleRunSimulation);
    elements.validateConfig.addEventListener('click', handleValidateConfig);
    elements.clearResults.addEventListener('click', handleClearResults);
    elements.clearLogs.addEventListener('click', handleClearLogs);

    // Tab handlers
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Trace control handlers
    elements.expandAllTrace.addEventListener('click', expandAllTraceSteps);
    elements.collapseAllTrace.addEventListener('click', collapseAllTraceSteps);

    // Contract interaction handlers
    elements.enableContractCall.addEventListener('change', toggleContractFields);

    // Form validation
    const formInputs = [
        elements.rpcUrl,
        elements.fromAddress,
        elements.toAddress,
        elements.value,
        elements.functionSignature,
        elements.functionParams,
        elements.rawCalldata
    ];

    formInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', validateForm);
            input.addEventListener('blur', validateForm);
        }
    });

    // IPC event listeners
    if (window.electronAPI) {
        // Simulation progress updates
        window.electronAPI.onSimulationProgress((data) => {
            handleSimulationProgress(data);
        });

        // Menu events
        window.electronAPI.onMenuNewSimulation(handleNewSimulation);
        window.electronAPI.onMenuOpenSimulation(handleOpenSimulation);
        window.electronAPI.onMenuSaveSimulation(handleSaveSimulation);
        window.electronAPI.onMenuRunSimulation(handleRunSimulation);
        window.electronAPI.onMenuStopSimulation(handleStopSimulation);
        window.electronAPI.onMenuClearResults(handleClearResults);
        window.electronAPI.onDeepLink(handleDeepLink);
    }
}

/**
 * Initialize tabs
 */
function initializeTabs() {
    switchTab('results');
}

/**
 * Switch to a specific tab
 */
function switchTab(tabName) {
    // Update tab buttons
    elements.tabButtons.forEach(button => {
        const isActive = button.getAttribute('data-tab') === tabName;
        button.classList.toggle('active', isActive);
    });

    // Update tab panels
    elements.tabPanels.forEach(panel => {
        const isActive = panel.id === `${tabName}-tab`;
        panel.classList.toggle('active', isActive);
    });

    addLog('info', `Switched to ${tabName} tab`);
}

/**
 * Toggle contract fields visibility
 */
function toggleContractFields() {
    const isEnabled = elements.enableContractCall.checked;
    elements.contractFields.classList.toggle('hidden', !isEnabled);
    
    if (isEnabled) {
        // Clear value when enabling contract call (usually no ETH value for contract calls)
        if (elements.value.value === '0.01') {
            elements.value.value = '0';
        }
        
        // Provide example values if fields are empty to help users get started
        if (!elements.functionSignature.value.trim()) {
            elements.functionSignature.placeholder = "e.g. transfer(address,uint256)";
        }
        if (!elements.functionParams.value.trim()) {
            elements.functionParams.placeholder = '["0x742d35cc6601C02B6C7C5a8a66B57c8b8D7E3B78", "1000000"]';
        }
    } else {
        // When disabling contract calls, set default ETH value if it's 0
        if (elements.value.value === '0' || elements.value.value === '') {
            elements.value.value = '0.01';
        }
    }
    
    // Validate form after toggling to update button state
    setTimeout(validateForm, 100); // Small delay to ensure DOM is updated
    updateUIState();
    addLog('info', `Contract interaction ${isEnabled ? 'enabled' : 'disabled'}`);
}

/**
 * Update UI state based on current conditions
 */
function updateUIState() {
    const isConfigValid = validateForm();
    
    elements.runSimulation.disabled = !isConfigValid || isSimulationRunning;
    elements.validateConfig.disabled = isSimulationRunning;
    
    // Update connection status (mock for now)
    updateConnectionStatus(elements.rpcUrl.value ? 'connected' : 'disconnected');
}

/**
 * Validate the current form configuration
 */
function validateForm() {
    const config = getFormConfig();
    console.log('Validating form with config:', config);
    
    // Basic validation - these are always required
    let isValid = config.rpcUrl && 
                  config.fromAddress && 
                  config.toAddress;
    
    console.log('Basic validation passed:', isValid);

    addLog('info', `Validating configuration: RPC URL, From, To addresses are ${isValid ? 'valid' : 'invalid'}`);
    
    // Contract call validation
    if (elements.enableContractCall && elements.enableContractCall.checked) {
        console.log('Contract call is enabled, validating contract parameters');
        addLog('info', 'Contract interaction enabled, validating contract parameters.');
        
        const hasFunction = config.functionSignature && config.functionSignature.trim();
        const hasRawData = config.rawData && config.rawData.trim();
        
        console.log('Has function:', hasFunction, 'Has raw data:', hasRawData);
        addLog('info', `Function signature provided: ${!!hasFunction}, Raw calldata provided: ${!!hasRawData}`);
        
        // Check for invalid JSON parameters
        if (config.hasInvalidParams) {
            console.log('Contract validation failed: invalid JSON parameters');
            addLog('error', 'Function parameters must be valid JSON array format.');
            isValid = false;
        } else if (!hasFunction && !hasRawData) {
            // For contract calls, we need EITHER function signature OR raw data
            console.log('Contract validation failed: no function or raw data provided');
            addLog('error', 'For contract calls, provide either a function signature or raw calldata.');
            isValid = false;
        } else {
            // If we have function signature, that's sufficient (params are optional)
            // If we have raw data, that's also sufficient
            console.log('Contract validation passed - have function signature or raw data');
            addLog('success', 'Contract parameters are valid.');
        }
        
    } else {
        console.log('Contract call is disabled, checking ETH value for transfer');
        addLog('info', 'Contract interaction disabled, validating ETH transfer parameters.');
        // For ETH transfers, require a value > 0
        isValid = isValid && config.value > 0;
        console.log('ETH transfer validation, value > 0:', config.value > 0, 'Value:', config.value);
    }
    
    console.log('Final validation result:', isValid);
    addLog('info', `Configuration validation ${isValid ? 'passed' : 'failed'}`);
    // Visual feedback could be added here
    
    return isValid;
}

/**
 * Get configuration from form
 */
function getFormConfig() {
    console.log('getFormConfig called');
    const config = {
        rpcUrl: elements.rpcUrl.value.trim(),
        forkBlock: elements.forkBlock.value ? parseInt(elements.forkBlock.value) : undefined,
        fromAddress: elements.fromAddress.value.trim(),
        toAddress: elements.toAddress.value.trim(),
        value: parseFloat(elements.value.value) || 0,
        gasLimit: elements.gasLimit.value ? parseInt(elements.gasLimit.value) : undefined,
        gasPrice: elements.gasPrice.value ? parseFloat(elements.gasPrice.value) : undefined,
        enableTrace: elements.enableTrace.checked,
        debugMode: elements.debugMode.checked
    };

    // Add contract interaction parameters if enabled
    if (elements.enableContractCall && elements.enableContractCall.checked) {
        console.log('Contract call is enabled in getFormConfig');
        const functionSignature = elements.functionSignature.value.trim();
        const functionParams = elements.functionParams.value.trim();
        const rawCalldata = elements.rawCalldata.value.trim();

        console.log('Raw values from form:');
        console.log('- functionSignature:', functionSignature);
        console.log('- functionParams:', functionParams);
        console.log('- rawCalldata:', rawCalldata);

        if (functionSignature) {
            config.functionSignature = functionSignature;
            console.log('Added functionSignature to config:', functionSignature);
            
            if (functionParams) {
                console.log('Attempting to parse function parameters JSON:', functionParams);
                try {
                    const parsedParams = JSON.parse(functionParams);
                    config.functionParams = parsedParams;
                    console.log('Successfully parsed function parameters:', parsedParams);
                } catch (error) {
                    console.warn('Invalid function parameters JSON:', error);
                    console.warn('Raw string that failed to parse:', JSON.stringify(functionParams));
                    // Don't store invalid JSON - validation will catch this
                    // But store a flag so we know there was an attempt
                    config.hasInvalidParams = true;
                }
            } else {
                console.log('No function parameters provided (this is valid for functions with no params)');
            }
        }

        if (rawCalldata) {
            config.rawData = rawCalldata;
            console.log('Added rawCalldata to config:', rawCalldata);
        }
    } else {
        console.log('Contract call is NOT enabled in getFormConfig');
    }

    return config;
}

/**
 * Handle new simulation
 */
function handleNewSimulation() {
    addLog('info', 'Starting new simulation...');
    
    // Reset form to defaults
    elements.rpcUrl.value = 'https://ethereum-rpc.publicnode.com';
    elements.forkBlock.value = '';
    elements.fromAddress.value = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    elements.toAddress.value = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    elements.value.value = '0.01';
    elements.gasLimit.value = '';
    elements.gasPrice.value = '';
    elements.enableTrace.checked = true;
    elements.debugMode.checked = false;
    
    // Clear results
    handleClearResults();
    
    // Update UI
    updateUIState();
    
    addLog('info', 'New simulation created');
}

/**
 * Handle run simulation
 */
async function handleRunSimulation() {
    if (isSimulationRunning) {
        addLog('warning', 'Simulation already running');
        return;
    }

    const config = getFormConfig();
    addLog('info', 'Running simulation with config:');
    if (!validateForm()) {
        addLog('error', 'Invalid configuration. Please check your inputs.');
        return;
    }

    addLog('info', 'Starting transaction simulation...');
    
    // Update UI state
    isSimulationRunning = true;
    updateUIState();
    showLoadingOverlay('Running simulation...');

    try {
        // Call the main process to run simulation
        const simulationConfig = {
            rpcUrl: config.rpcUrl,
            forkBlockNumber: config.forkBlock,
            from: config.fromAddress,
            to: config.toAddress,
            value: config.value.toString(),
            gasLimit: config.gasLimit,
            gasPrice: config.gasPrice,
            traceEnabled: config.enableTrace,
        };

        // Add contract interaction parameters if present
        if (config.functionSignature) {
            addLog('info', `Using function signature: ${config.functionSignature}`);
            simulationConfig.functionSignature = config.functionSignature;
        }
        if (config.functionParams) {
            simulationConfig.functionParams = config.functionParams;
        }
        if (config.rawData) {
            simulationConfig.rawData = config.rawData;
        }

        console.log('Sending simulation config to main process:', simulationConfig);
        const result = await window.electronAPI.runSimulation(simulationConfig);

        if (result.success) {
            currentSimulation = result.result;
            displaySimulationResult(result.result);
            addLog('success', 'Simulation completed successfully');
        } else {
            addLog('error', `Simulation failed: ${JSON.stringify(result)}`);
            displaySimulationResult(result.result || {});
        }
    } catch (error) {
        console.error('Simulation error:', error);
        addLog('error', `Simulation error: ${error.message}`);
    } finally {
        isSimulationRunning = false;
        updateUIState();
        hideLoadingOverlay();
    }
}

/**
 * Display simulation results
 */
function displaySimulationResult(result) {
    // Hide empty state, show results
    elements.noResults.classList.add('hidden');
    elements.simulationResults.classList.remove('hidden');

    // Update status badge
    const isSuccess = result.success !== false;
    elements.resultStatusBadge.textContent = isSuccess ? 'Success' : 'Failed';
    elements.resultStatusBadge.className = `badge ${isSuccess ? 'success' : 'error'}`;

    // Update result details
    elements.txHash.textContent = result.hash || 'N/A';
    elements.gasUsed.textContent = result.gasUsed || 'N/A';
    elements.gasLimitResult.textContent = result.gasLimit || 'N/A';
    elements.gasPriceResult.textContent = result.gasPrice ? `${result.gasPrice} gwei` : 'N/A';
    elements.blockNumber.textContent = result.blockNumber || 'N/A';
    elements.blockHash.textContent = result.blockHash || 'N/A';

    // Update trace if available
    if (result.trace && result.trace.length > 0) {
        displayTraceResults(result.trace);
    } else if (result.rawOutput && result.rawOutput.includes('Traces:')) {
        displayRawTrace(result.rawOutput);
    }

    // Switch to results tab
    switchTab('results');
}

/**
 * Display trace results
 */
function displayTraceResults(trace) {
    elements.noTrace.classList.add('hidden');
    elements.traceResults.classList.remove('hidden');

    // Clear previous trace content
    elements.traceContent.innerHTML = '';

    // Display trace steps
    trace.forEach((step, index) => {
        const stepElement = createTraceStepElement(step, index);
        elements.traceContent.appendChild(stepElement);
    });
}

/**
 * Display raw trace output with syntax highlighting
 */
function displayRawTrace(rawOutput) {
    elements.noTrace.classList.add('hidden');
    elements.traceResults.classList.remove('hidden');

    // Enhanced trace display with syntax highlighting
    const colorizedTrace = colorizeTrace(rawOutput);
    elements.traceContent.innerHTML = `<pre class="trace-output">${colorizedTrace}</pre>`;
}

/**
 * Colorize trace output for better readability
 */
function colorizeTrace(rawOutput) {
    return rawOutput
        // Color addresses (0x followed by 40 hex characters)
        .replace(/(0x[a-fA-F0-9]{40})/g, '<span class="trace-address">$1</span>')
        
        // Color function names and signatures
        .replace(/::([a-zA-Z_][a-zA-Z0-9_]*)/g, '::<span class="trace-function">$1</span>')
        
        // Color gas amounts in brackets [number]
        .replace(/\[(\d+)\]/g, '[<span class="trace-gas">$1</span>]')
        
        // Color values with ETH amounts
        .replace(/{value: (\d+)}/g, '{value: <span class="trace-value">$1</span>}')
        
        // Color success indicators
        .replace(/← \[Stop\]/g, '← <span class="trace-success">[Stop]</span>')
        .replace(/← \[Return\]/g, '← <span class="trace-success">[Return]</span>')
        
        // Color revert/error indicators
        .replace(/← \[Revert\]/g, '← <span class="trace-revert">[Revert]</span>')
        .replace(/← \[OutOfGas\]/g, '← <span class="trace-revert">[OutOfGas]</span>')
        .replace(/← \[Invalid\]/g, '← <span class="trace-revert">[Invalid]</span>')
        
        // Color call types
        .replace(/\[CALL\]/g, '<span class="trace-call">[CALL]</span>')
        .replace(/\[STATICCALL\]/g, '<span class="trace-staticcall">[STATICCALL]</span>')
        .replace(/\[DELEGATECALL\]/g, '<span class="trace-delegatecall">[DELEGATECALL]</span>')
        .replace(/\[CREATE\]/g, '<span class="trace-create">[CREATE]</span>')
        .replace(/\[CREATE2\]/g, '<span class="trace-create">[CREATE2]</span>')
        
        // Color tree symbols
        .replace(/├─/g, '<span class="trace-tree">├─</span>')
        .replace(/└─/g, '<span class="trace-tree">└─</span>')
        .replace(/│/g, '<span class="trace-tree">│</span>')
        
        // Color "Traces:" header
        .replace(/^(Traces:)/gm, '<span class="trace-title">$1</span>')
        
        // Color transaction success message
        .replace(/(Transaction successfully executed\.)/g, '<span class="trace-success-msg">$1</span>')
        
        // Color gas usage summary
        .replace(/(Gas used: \d+)/g, '<span class="trace-gas-summary">$1</span>')
        
        // Color input data (0x followed by hex)
        .replace(/(0x[a-fA-F0-9]{8,})/g, '<span class="trace-data">$1</span>');
}

/**
 * Create trace step element
 */
function createTraceStepElement(step, index) {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'trace-step';
    stepDiv.innerHTML = `
        <div class="trace-step-header">
            <span>${index + 1}. ${step.operation || 'Unknown'}</span>
            <small>${step.gas || 'N/A'} gas</small>
        </div>
        <div class="trace-step-details">
            <div>Address: ${step.address || 'N/A'}</div>
            <div>Value: ${step.value || '0'} ETH</div>
            ${step.data ? `<div>Data: ${step.data}</div>` : ''}
            ${step.output ? `<div>Output: ${step.output}</div>` : ''}
        </div>
    `;

    // Add click handler to expand/collapse
    stepDiv.addEventListener('click', () => {
        stepDiv.classList.toggle('expanded');
    });

    return stepDiv;
}

/**
 * Handle simulation progress updates
 */
function handleSimulationProgress(data) {
    const { type, message } = data;
    
    switch (type) {
        case 'log':
            addLog('info', message);
            break;
        case 'error':
            addLog('error', message);
            break;
        case 'progress':
            updateLoadingMessage(message);
            break;
    }
}

/**
 * Handle validate configuration
 */
async function handleValidateConfig() {
    const config = getFormConfig();
    
    addLog('info', 'Validating configuration...');
    
    // Basic validation
    if (!validateForm()) {
        addLog('error', 'Configuration validation failed');
        return;
    }
    
    // TODO: Add more sophisticated validation (RPC connectivity, address format, etc.)
    addLog('success', 'Configuration is valid');
}

/**
 * Handle clear results
 */
function handleClearResults() {
    currentSimulation = null;
    
    // Hide results, show empty state
    elements.simulationResults.classList.add('hidden');
    elements.noResults.classList.remove('hidden');
    
    // Clear trace
    elements.traceResults.classList.add('hidden');
    elements.noTrace.classList.remove('hidden');
    elements.traceContent.innerHTML = '';
    
    addLog('info', 'Results cleared');
}

/**
 * Handle clear logs
 */
function handleClearLogs() {
    elements.logsContent.innerHTML = '';
    addLog('info', 'Logs cleared');
}

/**
 * Handle open simulation
 */
function handleOpenSimulation(filePath) {
    addLog('info', `Opening simulation from: ${filePath}`);
    // TODO: Implement file loading
}

/**
 * Handle save simulation
 */
function handleSaveSimulation() {
    if (!currentSimulation) {
        addLog('warning', 'No simulation to save');
        return;
    }
    
    addLog('info', 'Saving simulation...');
    // TODO: Implement file saving
}

/**
 * Handle stop simulation
 */
function handleStopSimulation() {
    if (!isSimulationRunning) {
        addLog('info', 'No simulation running');
        return;
    }
    
    addLog('info', 'Stopping simulation...');
    // TODO: Implement simulation stopping
}

/**
 * Handle deep link
 */
function handleDeepLink(url) {
    addLog('info', `Deep link received: ${url}`);
    // TODO: Parse and handle deep link
}

/**
 * Expand all trace steps
 */
function expandAllTraceSteps() {
    const steps = elements.traceContent.querySelectorAll('.trace-step');
    steps.forEach(step => step.classList.add('expanded'));
    addLog('info', 'Expanded all trace steps');
}

/**
 * Collapse all trace steps
 */
function collapseAllTraceSteps() {
    const steps = elements.traceContent.querySelectorAll('.trace-step');
    steps.forEach(step => step.classList.remove('expanded'));
    addLog('info', 'Collapsed all trace steps');
}

/**
 * Show loading overlay
 */
function showLoadingOverlay(message = 'Loading...') {
    elements.loadingMessage.textContent = message;
    elements.loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    elements.loadingOverlay.classList.add('hidden');
}

/**
 * Update loading message
 */
function updateLoadingMessage(message) {
    elements.loadingMessage.textContent = message;
}

/**
 * Update connection status
 */
function updateConnectionStatus(status) {
    const statusText = document.querySelector('#connection-status');
    const statusDot = statusText.querySelector('.status-dot');
    
    if (status === 'connected') {
        statusText.innerHTML = '<span class="status-dot status-connected"></span> Connected';
    } else {
        statusText.innerHTML = '<span class="status-dot status-disconnected"></span> Disconnected';
    }
}

/**
 * Add log entry
 */
function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-message">${message}</span>
    `;
    
    elements.logsContent.appendChild(logEntry);
    
    // Auto-scroll to bottom
    elements.logsContent.scrollTop = elements.logsContent.scrollHeight;
    
    // Limit log entries (keep last 1000)
    const logEntries = elements.logsContent.querySelectorAll('.log-entry');
    if (logEntries.length > 1000) {
        logEntries[0].remove();
    }
}

/**
 * Format address for display
 */
function formatAddress(address) {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format value for display
 */
function formatValue(value, decimals = 4) {
    if (!value) return 'N/A';
    return parseFloat(value).toFixed(decimals);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        handleRunSimulation,
        displaySimulationResult,
        addLog
    };
}
