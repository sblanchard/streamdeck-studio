// @ts-check

(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    // State
    let state = {
        devices: [],
        selectedDevice: null,
        buttons: {},
        brightness: 100,
        editingKeyIndex: null,
        languages: [],
        commandSearchTimeout: null,
        pendingFolderField: null,
        selectedSuggestionIndex: -1,
        currentCommands: [],
        isLoading: false,
        isConnected: false,
    };

    // DOM Elements
    const elements = {
        deviceSelect: document.getElementById('device-select'),
        buttonGrid: document.getElementById('button-grid'),
        brightnessSlider: document.getElementById('brightness-slider'),
        brightnessValue: document.getElementById('brightness-value'),
        editModal: document.getElementById('edit-modal'),
        modalClose: document.getElementById('modal-close'),
        modalTitle: document.getElementById('modal-title'),
        buttonForm: document.getElementById('button-form'),
        actionType: document.getElementById('action-type'),
        buttonLabel: document.getElementById('button-label'),
        buttonIcon: document.getElementById('button-icon'),
        browseIcon: document.getElementById('browse-icon'),
        iconPreview: document.getElementById('icon-preview'),
        commandInput: document.getElementById('command-input'),
        commandSuggestions: document.getElementById('command-suggestions'),
        commandArgs: document.getElementById('command-args'),
        terminalCommand: document.getElementById('terminal-command'),
        terminalName: document.getElementById('terminal-name'),
        shellPath: document.getElementById('shell-path'),
        shellArgs: document.getElementById('shell-args'),
        workingDir: document.getElementById('working-dir'),
        browseWorkingDir: document.getElementById('browse-working-dir'),
        preserveFocus: document.getElementById('preserve-focus'),
        snippetName: document.getElementById('snippet-name'),
        languageSelect: document.getElementById('language-select'),
        folderPath: document.getElementById('folder-path'),
        browseFolderBtn: document.getElementById('browse-folder'),
        newWindow: document.getElementById('new-window'),
        removeButton: document.getElementById('remove-button'),
        cancelButton: document.getElementById('cancel-button'),
        copyButton: document.getElementById('copy-button'),
        saveButton: document.querySelector('#button-form button[type="submit"]'),
        connectionStatus: document.getElementById('connection-status'),
        reconnectBtn: document.getElementById('reconnect-btn'),
        clearAllBtn: document.getElementById('clear-all-btn'),
        copyModal: document.getElementById('copy-modal'),
        copyModalClose: document.getElementById('copy-modal-close'),
        copyTargetGrid: document.getElementById('copy-target-grid'),
        // Error elements
        commandError: document.getElementById('command-error'),
        argsError: document.getElementById('args-error'),
        terminalError: document.getElementById('terminal-error'),
        snippetError: document.getElementById('snippet-error'),
        languageError: document.getElementById('language-error'),
        folderError: document.getElementById('folder-error'),
    };

    // Action field containers
    const actionFields = {
        command: document.getElementById('command-fields'),
        terminal: document.getElementById('terminal-fields'),
        createTerminal: document.getElementById('create-terminal-fields'),
        snippet: document.getElementById('snippet-fields'),
        language: document.getElementById('language-fields'),
        openFolder: document.getElementById('folder-fields'),
    };

    // Initialize
    function init() {
        setupEventListeners();
        postMessage({ type: 'ready' });
    }

    // Event Listeners
    function setupEventListeners() {
        // Device selection
        elements.deviceSelect.addEventListener('change', (e) => {
            const serial = e.target.value;
            state.selectedDevice = state.devices.find(d => d.serial === serial) || null;
            renderButtonGrid();
        });

        // Brightness slider
        elements.brightnessSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value, 10);
            elements.brightnessValue.textContent = value + '%';
        });

        elements.brightnessSlider.addEventListener('change', (e) => {
            const value = parseInt(e.target.value, 10);
            postMessage({ type: 'setBrightness', value });
        });

        // Modal close
        elements.modalClose.addEventListener('click', closeModal);
        elements.cancelButton.addEventListener('click', closeModal);
        elements.editModal.addEventListener('click', (e) => {
            if (e.target === elements.editModal) {
                closeModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleGlobalKeydown);

        // Action type change
        elements.actionType.addEventListener('change', (e) => {
            showActionFields(e.target.value);
            clearValidationErrors();
        });

        // Icon picker
        elements.browseIcon.addEventListener('click', () => {
            postMessage({ type: 'pickIcon' });
        });

        // Icon input change - update preview
        elements.buttonIcon.addEventListener('input', () => {
            updateIconPreview(elements.buttonIcon.value);
        });

        // Folder pickers
        elements.browseWorkingDir.addEventListener('click', () => {
            postMessage({ type: 'pickFolder' });
            state.pendingFolderField = 'workingDir';
        });

        elements.browseFolderBtn.addEventListener('click', () => {
            postMessage({ type: 'pickFolder' });
            state.pendingFolderField = 'folderPath';
        });

        // Command autocomplete with keyboard navigation
        elements.commandInput.addEventListener('input', (e) => {
            const term = e.target.value;
            state.selectedSuggestionIndex = -1;
            clearTimeout(state.commandSearchTimeout);
            state.commandSearchTimeout = setTimeout(() => {
                if (term.length >= 1) {
                    postMessage({ type: 'requestCommands', searchTerm: term });
                } else {
                    hideSuggestions();
                }
            }, 300);
            // Clear error on input
            hideError(elements.commandError);
        });

        elements.commandInput.addEventListener('focus', () => {
            if (elements.commandInput.value.length >= 1) {
                postMessage({ type: 'requestCommands', searchTerm: elements.commandInput.value });
            }
        });

        elements.commandInput.addEventListener('blur', () => {
            setTimeout(hideSuggestions, 200);
        });

        elements.commandInput.addEventListener('keydown', handleCommandInputKeydown);

        // JSON validation on blur
        elements.commandArgs.addEventListener('blur', () => {
            validateJson(elements.commandArgs.value, elements.argsError);
        });

        // Form submission
        elements.buttonForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateForm()) {
                saveButton();
            }
        });

        // Remove button with confirmation
        elements.removeButton.addEventListener('click', () => {
            if (state.editingKeyIndex !== null) {
                showConfirmDialog(
                    'Remove Button',
                    `Are you sure you want to remove the configuration for Button ${state.editingKeyIndex}?`,
                    () => {
                        postMessage({ type: 'removeButton', keyIndex: state.editingKeyIndex });
                        closeModal();
                    }
                );
            }
        });

        // Copy button
        elements.copyButton.addEventListener('click', () => {
            if (state.editingKeyIndex !== null && state.buttons[state.editingKeyIndex.toString()]) {
                openCopyModal();
            }
        });

        // Copy modal close
        elements.copyModalClose.addEventListener('click', closeCopyModal);
        elements.copyModal.addEventListener('click', (e) => {
            if (e.target === elements.copyModal) {
                closeCopyModal();
            }
        });

        // Reconnect button
        elements.reconnectBtn.addEventListener('click', () => {
            postMessage({ type: 'reconnect' });
        });

        // Clear all button
        elements.clearAllBtn.addEventListener('click', () => {
            const buttonCount = Object.keys(state.buttons).length;
            if (buttonCount === 0) {
                showError('No buttons to clear');
                return;
            }
            showConfirmDialog(
                'Clear All Buttons',
                `Are you sure you want to remove all ${buttonCount} button configuration(s)? This cannot be undone.`,
                () => {
                    postMessage({ type: 'clearAllButtons' });
                }
            );
        });

        // Request languages on first load
        postMessage({ type: 'requestLanguages' });
    }

    // Handle global keyboard events
    function handleGlobalKeydown(e) {
        if (e.key === 'Escape') {
            if (!elements.copyModal.classList.contains('hidden')) {
                closeCopyModal();
                e.preventDefault();
            } else if (!elements.editModal.classList.contains('hidden')) {
                closeModal();
                e.preventDefault();
            }
            const confirmDialog = document.querySelector('.confirm-dialog');
            if (confirmDialog) {
                confirmDialog.remove();
            }
        }
    }

    // Handle command input keyboard navigation
    function handleCommandInputKeydown(e) {
        const suggestions = elements.commandSuggestions;
        if (suggestions.classList.contains('hidden')) return;

        const items = suggestions.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                state.selectedSuggestionIndex = Math.min(state.selectedSuggestionIndex + 1, items.length - 1);
                updateSuggestionHighlight(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                state.selectedSuggestionIndex = Math.max(state.selectedSuggestionIndex - 1, 0);
                updateSuggestionHighlight(items);
                break;
            case 'Enter':
                if (state.selectedSuggestionIndex >= 0 && state.selectedSuggestionIndex < items.length) {
                    e.preventDefault();
                    const selectedCmd = state.currentCommands[state.selectedSuggestionIndex];
                    if (selectedCmd) {
                        elements.commandInput.value = selectedCmd.id;
                        hideSuggestions();
                    }
                }
                break;
            case 'Escape':
                hideSuggestions();
                break;
        }
    }

    // Update suggestion highlight
    function updateSuggestionHighlight(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === state.selectedSuggestionIndex);
            if (index === state.selectedSuggestionIndex) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    // Form validation
    function validateForm() {
        clearValidationErrors();
        const actionType = elements.actionType.value;
        let isValid = true;

        switch (actionType) {
            case 'command':
                if (!elements.commandInput.value.trim()) {
                    showFieldError(elements.commandError);
                    isValid = false;
                }
                if (elements.commandArgs.value.trim() && !validateJson(elements.commandArgs.value, elements.argsError)) {
                    isValid = false;
                }
                break;
            case 'terminal':
                if (!elements.terminalCommand.value.trim()) {
                    showFieldError(elements.terminalError);
                    isValid = false;
                }
                break;
            case 'snippet':
                if (!elements.snippetName.value.trim()) {
                    showFieldError(elements.snippetError);
                    isValid = false;
                }
                break;
            case 'language':
                if (!elements.languageSelect.value) {
                    showFieldError(elements.languageError);
                    isValid = false;
                }
                break;
            case 'openFolder':
                if (!elements.folderPath.value.trim()) {
                    showFieldError(elements.folderError);
                    isValid = false;
                }
                break;
        }

        return isValid;
    }

    function validateJson(value, errorElement) {
        if (!value.trim()) return true;
        try {
            JSON.parse(value);
            hideError(errorElement);
            return true;
        } catch (e) {
            showFieldError(errorElement);
            return false;
        }
    }

    function showFieldError(element) {
        if (element) {
            element.classList.remove('hidden');
        }
    }

    function hideError(element) {
        if (element) {
            element.classList.add('hidden');
        }
    }

    function clearValidationErrors() {
        [elements.commandError, elements.argsError, elements.terminalError,
         elements.snippetError, elements.languageError, elements.folderError].forEach(hideError);
    }

    // Show confirmation dialog
    function showConfirmDialog(title, message, onConfirm) {
        const existing = document.querySelector('.confirm-dialog');
        if (existing) existing.remove();

        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-dialog-content">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(message)}</p>
                <div class="confirm-dialog-actions">
                    <button type="button" class="btn-secondary confirm-cancel">Cancel</button>
                    <button type="button" class="btn-danger confirm-ok">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const cancelBtn = dialog.querySelector('.confirm-cancel');
        const okBtn = dialog.querySelector('.confirm-ok');

        cancelBtn.addEventListener('click', () => dialog.remove());
        okBtn.addEventListener('click', () => {
            dialog.remove();
            onConfirm();
        });

        cancelBtn.focus();
    }

    // Copy modal
    function openCopyModal() {
        if (!state.selectedDevice) return;

        elements.copyTargetGrid.innerHTML = '';
        const { keyCount } = state.selectedDevice;

        for (let i = 0; i < keyCount; i++) {
            if (i === state.editingKeyIndex) continue;

            const button = document.createElement('button');
            button.className = 'copy-target-btn';
            button.textContent = i.toString();

            if (state.buttons[i.toString()]) {
                button.classList.add('has-config');
                button.title = `Button ${i} (will overwrite)`;
            } else {
                button.title = `Button ${i}`;
            }

            button.addEventListener('click', () => {
                postMessage({
                    type: 'copyButton',
                    fromIndex: state.editingKeyIndex,
                    toIndex: i
                });
                closeCopyModal();
                closeModal();
            });

            elements.copyTargetGrid.appendChild(button);
        }

        elements.copyModal.classList.remove('hidden');
    }

    function closeCopyModal() {
        elements.copyModal.classList.add('hidden');
    }

    // Update icon preview
    function updateIconPreview(iconPath) {
        if (!iconPath) {
            elements.iconPreview.classList.add('hidden');
            elements.iconPreview.innerHTML = '';
            return;
        }

        elements.iconPreview.classList.remove('hidden');
        elements.iconPreview.innerHTML = `
            <div class="icon-preview-content">
                <div class="icon-preview-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                </div>
                <span class="icon-preview-path" title="${escapeHtml(iconPath)}">${escapeHtml(truncate(iconPath, 40))}</span>
            </div>
        `;
    }

    // Update connection status
    function updateConnectionStatus(connected, deviceCount) {
        state.isConnected = connected;
        const statusEl = elements.connectionStatus;
        const statusText = statusEl.querySelector('.status-text');

        statusEl.classList.toggle('connected', connected);
        statusEl.classList.toggle('disconnected', !connected);

        if (connected) {
            statusText.textContent = deviceCount > 1 ? `Connected (${deviceCount} devices)` : 'Connected';
        } else {
            statusText.textContent = 'Disconnected';
        }
    }

    // Set loading state
    function setLoading(loading) {
        state.isLoading = loading;
        if (elements.saveButton) {
            elements.saveButton.disabled = loading;
            elements.saveButton.textContent = loading ? 'Saving...' : 'Save';
        }
        if (elements.removeButton) {
            elements.removeButton.disabled = loading;
        }
        if (elements.copyButton) {
            elements.copyButton.disabled = loading;
        }
    }

    // Show/hide action-specific fields
    function showActionFields(actionType) {
        Object.keys(actionFields).forEach(key => {
            if (actionFields[key]) {
                actionFields[key].classList.toggle('hidden', key !== actionType);
            }
        });
    }

    // Render button grid
    function renderButtonGrid() {
        elements.buttonGrid.innerHTML = '';

        if (!state.selectedDevice) {
            elements.buttonGrid.innerHTML = `
                <div class="no-device-message">
                    <h2>No Device Selected</h2>
                    <p>Connect a Stream Deck device to configure buttons.</p>
                    <p>The extension will automatically detect connected devices.</p>
                </div>
            `;
            elements.buttonGrid.className = 'button-grid';
            return;
        }

        const { columns, rows, keyCount } = state.selectedDevice;
        elements.buttonGrid.className = `button-grid cols-${columns}`;

        for (let i = 0; i < keyCount; i++) {
            const button = document.createElement('button');
            button.className = 'grid-button';
            button.dataset.index = i.toString();

            const config = state.buttons[i.toString()];
            if (config) {
                button.classList.add('configured');

                let content = '';
                if (config.icon) {
                    content += `<div class="button-icon-wrapper">${getIconHtml(config.icon)}</div>`;
                }
                if (config.label) {
                    content += `<span class="button-label">${escapeHtml(config.label)}</span>`;
                } else {
                    content += `<span class="button-label">${getActionLabel(config)}</span>`;
                }
                button.innerHTML = content;
            } else {
                button.classList.add('empty');
                button.innerHTML = '<span class="plus-icon">+</span>';
            }

            button.addEventListener('click', () => openEditModal(i));
            elements.buttonGrid.appendChild(button);
        }
    }

    // Get display label for action type
    function getActionLabel(config) {
        if (config.command) return truncate(config.command.split('.').pop(), 12);
        if (config.terminalCommand) return 'Terminal';
        if (config.createTerminal) return 'New Term';
        if (config.snippet) return 'Snippet';
        if (config.languageId) return config.languageId;
        if (config.openFolder) return 'Folder';
        return 'Button';
    }

    // Get icon HTML
    function getIconHtml(iconPath) {
        return '<div class="button-icon" style="background-color: var(--vscode-button-background); width: 32px; height: 32px; border-radius: 4px;"></div>';
    }

    // Open edit modal
    function openEditModal(keyIndex) {
        state.editingKeyIndex = keyIndex;
        const config = state.buttons[keyIndex.toString()] || {};

        elements.modalTitle.textContent = `Configure Button ${keyIndex}`;

        elements.buttonForm.reset();
        setLoading(false);
        clearValidationErrors();

        elements.buttonLabel.value = config.label || '';
        elements.buttonIcon.value = config.icon || '';
        updateIconPreview(config.icon || '');

        let actionType = 'command';
        if (config.terminalCommand) actionType = 'terminal';
        else if (config.createTerminal) actionType = 'createTerminal';
        else if (config.snippet) actionType = 'snippet';
        else if (config.languageId) actionType = 'language';
        else if (config.openFolder) actionType = 'openFolder';

        elements.actionType.value = actionType;
        showActionFields(actionType);

        elements.commandInput.value = config.command || '';
        elements.commandArgs.value = config.arguments || '';
        elements.terminalCommand.value = config.terminalCommand || '';
        elements.terminalName.value = config.createTerminal?.name || '';
        elements.shellPath.value = config.createTerminal?.shellPath || '';
        elements.shellArgs.value = config.createTerminal?.shellArgs || '';
        elements.workingDir.value = config.createTerminal?.workingDirectory || '';
        elements.preserveFocus.checked = config.createTerminal?.preserveFocus || false;
        elements.snippetName.value = config.snippet || '';
        elements.languageSelect.value = config.languageId || '';
        elements.folderPath.value = config.openFolder?.path || '';
        elements.newWindow.checked = config.openFolder?.newWindow || false;

        const hasConfig = !!state.buttons[keyIndex.toString()];
        elements.removeButton.style.display = hasConfig ? 'block' : 'none';
        elements.copyButton.style.display = hasConfig ? 'block' : 'none';

        elements.editModal.classList.remove('hidden');
        setTimeout(() => elements.buttonLabel.focus(), 100);
    }

    // Close edit modal
    function closeModal() {
        elements.editModal.classList.add('hidden');
        state.editingKeyIndex = null;
        state.selectedSuggestionIndex = -1;
        hideSuggestions();
        clearValidationErrors();
    }

    // Save button configuration
    function saveButton() {
        if (state.editingKeyIndex === null || state.isLoading) return;

        setLoading(true);

        const actionType = elements.actionType.value;
        const config = {
            label: elements.buttonLabel.value || undefined,
            icon: elements.buttonIcon.value || undefined,
        };

        switch (actionType) {
            case 'command':
                config.command = elements.commandInput.value || undefined;
                config.arguments = elements.commandArgs.value || undefined;
                break;
            case 'terminal':
                config.terminalCommand = elements.terminalCommand.value || undefined;
                break;
            case 'createTerminal':
                const terminalConfig = {};
                if (elements.terminalName.value) terminalConfig.name = elements.terminalName.value;
                if (elements.shellPath.value) terminalConfig.shellPath = elements.shellPath.value;
                if (elements.shellArgs.value) terminalConfig.shellArgs = elements.shellArgs.value;
                if (elements.workingDir.value) terminalConfig.workingDirectory = elements.workingDir.value;
                if (elements.preserveFocus.checked) terminalConfig.preserveFocus = true;
                if (Object.keys(terminalConfig).length > 0) {
                    config.createTerminal = terminalConfig;
                }
                break;
            case 'snippet':
                config.snippet = elements.snippetName.value || undefined;
                break;
            case 'language':
                config.languageId = elements.languageSelect.value || undefined;
                break;
            case 'openFolder':
                if (elements.folderPath.value) {
                    config.openFolder = {
                        path: elements.folderPath.value,
                        newWindow: elements.newWindow.checked || undefined,
                    };
                }
                break;
        }

        Object.keys(config).forEach(key => {
            if (config[key] === undefined) {
                delete config[key];
            }
        });

        postMessage({ type: 'saveButton', keyIndex: state.editingKeyIndex, config });
    }

    // Show command suggestions
    function showSuggestions(commands) {
        elements.commandSuggestions.innerHTML = '';
        state.currentCommands = commands;
        state.selectedSuggestionIndex = -1;

        if (commands.length === 0) {
            hideSuggestions();
            return;
        }

        commands.forEach((cmd, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.dataset.index = index.toString();

            const category = cmd.category || '';
            const title = cmd.title || cmd.id.split('.').pop();

            item.innerHTML = `
                <span class="command-id">${escapeHtml(cmd.id)}</span>
                <span class="command-title">${escapeHtml(category ? `${category}: ${title}` : title)}</span>
            `;

            item.addEventListener('click', () => {
                elements.commandInput.value = cmd.id;
                hideSuggestions();
            });

            item.addEventListener('mouseenter', () => {
                state.selectedSuggestionIndex = index;
                updateSuggestionHighlight(elements.commandSuggestions.querySelectorAll('.suggestion-item'));
            });

            elements.commandSuggestions.appendChild(item);
        });

        elements.commandSuggestions.classList.remove('hidden');
    }

    // Hide command suggestions
    function hideSuggestions() {
        elements.commandSuggestions.classList.add('hidden');
        state.selectedSuggestionIndex = -1;
        state.currentCommands = [];
    }

    // Update language dropdown
    function updateLanguages(languages) {
        state.languages = languages;
        elements.languageSelect.innerHTML = '<option value="">Select language...</option>';
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.id;
            option.textContent = lang.name;
            elements.languageSelect.appendChild(option);
        });
    }

    // Update devices dropdown
    function updateDevices(devices) {
        state.devices = devices;
        elements.deviceSelect.innerHTML = '';

        if (devices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No device connected';
            elements.deviceSelect.appendChild(option);
            state.selectedDevice = null;
        } else {
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.serial;
                option.textContent = `${device.model} (${device.columns}x${device.rows})`;
                elements.deviceSelect.appendChild(option);
            });
            if (!state.selectedDevice) {
                state.selectedDevice = devices[0];
                elements.deviceSelect.value = devices[0].serial;
            }
        }

        renderButtonGrid();
    }

    // Update configuration
    function updateConfiguration(buttons, brightness) {
        state.buttons = buttons;
        state.brightness = brightness;
        elements.brightnessSlider.value = brightness.toString();
        elements.brightnessValue.textContent = brightness + '%';
        setLoading(false);
        renderButtonGrid();

        if (!elements.editModal.classList.contains('hidden') && state.editingKeyIndex !== null) {
            closeModal();
        }
    }

    // Show error toast
    function showError(message) {
        const existing = document.querySelector('.error-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <span>${escapeHtml(message)}</span>
            <button type="button" class="toast-close">&times;</button>
        `;

        document.body.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => toast.remove());

        setTimeout(() => toast.remove(), 5000);

        setLoading(false);
    }

    // Message handler
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
            case 'devices':
                updateDevices(message.devices);
                break;
            case 'configuration':
            case 'configurationUpdated':
                updateConfiguration(message.buttons, message.brightness);
                break;
            case 'connectionStatus':
                updateConnectionStatus(message.connected, message.deviceCount);
                break;
            case 'commands':
                showSuggestions(message.commands);
                break;
            case 'languages':
                updateLanguages(message.languages);
                break;
            case 'iconPicked':
                elements.buttonIcon.value = message.path;
                updateIconPreview(message.path);
                break;
            case 'folderPicked':
                if (state.pendingFolderField === 'workingDir') {
                    elements.workingDir.value = message.path;
                } else if (state.pendingFolderField === 'folderPath') {
                    elements.folderPath.value = message.path;
                }
                state.pendingFolderField = null;
                break;
            case 'brightnessUpdated':
                state.brightness = message.value;
                elements.brightnessSlider.value = message.value.toString();
                elements.brightnessValue.textContent = message.value + '%';
                break;
            case 'error':
                showError(message.message);
                break;
        }
    });

    // Post message to extension
    function postMessage(message) {
        vscode.postMessage(message);
    }

    // Utility functions
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function truncate(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength - 1) + '...' : text;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
