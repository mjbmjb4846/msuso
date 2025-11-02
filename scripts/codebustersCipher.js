/**
 * Codebusters Cipher Game
 * Multi-cipher practice tool for Science Olympiad Codebusters
 * Supports: Aristocrat, Patristocrat, and Baconian ciphers
 */

class CodebustersCipherGame {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.quotes = [];
        this.currentQuote = null;
        this.currentCipher = null;
        this.userSolution = new Map();
        this.usedQuotes = new Set();
        this.timerInterval = null;
        this.isPaused = false;
        this.elapsedSeconds = 0;
        this.validationState = null;
        this.autoHighlightEnabled = false;
        
        // Load cipher type from localStorage or default to aristocrat
        this.cipherType = localStorage.getItem('codebustersCipherType') || 'aristocrat';
        
        this.init();
    }

    async init() {
        try {
            const response = await fetch('../scripts/codebustersQuotes.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.allQuotes = data.quotes;
            
            this.filterQuotesByCipherType();
            this.generateNewCipher();
        } catch (error) {
            console.error('Failed to load quotes:', error);
            this.container.innerHTML = '<p style="color: red;">Error loading quotes: ' + error.message + '</p>';
        }
    }

    filterQuotesByCipherType() {
        const typeKey = this.cipherType.toLowerCase();
        this.quotes = this.allQuotes.filter(q => 
            q.cipherTypes && q.cipherTypes.includes(typeKey)
        );
        
        if (this.quotes.length === 0) {
            console.warn(`No quotes found for ${this.cipherType} cipher type`);
            this.quotes = this.allQuotes;
        }
    }

    changeCipherType(newType) {
        this.cipherType = newType;
        localStorage.setItem('codebustersCipherType', newType);
        this.usedQuotes.clear();
        this.filterQuotesByCipherType();
        this.generateNewCipher();
    }

    generateNewCipher() {
        let quote = this.getRandomUnusedQuote();
        let cipher = null;
        
        // Keep trying to generate a cipher with no identity mappings
        let attempts = 0;
        do {
            cipher = this.createCipher(quote.quote, this.cipherType);
            attempts++;
        } while (this.hasCipherIdentityMappings(cipher) && attempts < 100);

        // Add to used set and remove oldest if over limit
        this.usedQuotes.add(JSON.stringify(quote));
        if (this.usedQuotes.size > Math.max(5, this.quotes.length - 3)) {
            const oldestUsed = Array.from(this.usedQuotes)[0];
            this.usedQuotes.delete(oldestUsed);
        }

        this.currentQuote = quote;
        this.currentCipher = cipher;
        this.userSolution = new Map();
        this.validationState = null;
        this.elapsedSeconds = 0;
        this.isPaused = false;

        this.render();
        this.startTimer();
    }

    getRandomUnusedQuote() {
        let attempts = 0;
        let quote;
        
        do {
            quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
            attempts++;
        } while (this.usedQuotes.has(JSON.stringify(quote)) && attempts < 50);

        return quote;
    }

    hasCipherIdentityMappings(cipher) {
        if (!cipher.mapping) return false;
        
        for (const [plainLetter, cipherLetter] of Object.entries(cipher.mapping)) {
            if (plainLetter === cipherLetter) {
                return true;
            }
        }
        return false;
    }

    createCipher(plaintext, type) {
        switch(type.toLowerCase()) {
            case 'aristocrat':
                return this.createAristocratCipher(plaintext);
            case 'patristocrat':
                return this.createPatristocratCipher(plaintext);
            case 'baconian':
                return this.createBaconianCipher(plaintext);
            default:
                return this.createAristocratCipher(plaintext);
        }
    }

    createAristocratCipher(plaintext) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const shuffled = this.fisherYatesShuffle([...alphabet.split('')]);
        
        const mapping = {};
        for (let i = 0; i < alphabet.length; i++) {
            mapping[alphabet[i]] = shuffled[i];
        }

        const ciphertext = plaintext.toUpperCase().split('').map(char => {
            if (mapping[char]) return mapping[char];
            return char;
        }).join('');

        return {
            type: 'aristocrat',
            plaintext: plaintext.toUpperCase(),
            ciphertext: ciphertext,
            mapping: mapping,
            reverseMapping: this.createReverseMapping(mapping)
        };
    }

    createPatristocratCipher(plaintext) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const shuffled = this.fisherYatesShuffle([...alphabet.split('')]);
        
        const mapping = {};
        for (let i = 0; i < alphabet.length; i++) {
            mapping[alphabet[i]] = shuffled[i];
        }

        // Remove spaces but keep punctuation
        const ciphertext = plaintext.toUpperCase().split('').map(char => {
            if (mapping[char]) return mapping[char];
            if (char === ' ') return ''; // Remove spaces
            return char; // Keep punctuation
        }).join('');

        return {
            type: 'patristocrat',
            plaintext: plaintext.toUpperCase(),
            ciphertext: ciphertext,
            mapping: mapping,
            reverseMapping: this.createReverseMapping(mapping),
            originalWithSpaces: plaintext.toUpperCase() // Keep for validation
        };
    }

    createBaconianCipher(plaintext) {
        // 26-letter Baconian cipher mapping
        const baconianMap = {
            'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
            'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAB',
            'K': 'ABABA', 'L': 'ABABB', 'M': 'ABBAA', 'N': 'ABBAB', 'O': 'ABBBA',
            'P': 'ABBBB', 'Q': 'BAAAA', 'R': 'BAAAB', 'S': 'BAABA', 'T': 'BAABB',
            'U': 'BABAA', 'V': 'BABAB', 'W': 'BABBA', 'X': 'BABBB', 'Y': 'BBAAA',
            'Z': 'BBAAB'
        };

        // Create reverse mapping
        const reverseBaconianMap = {};
        for (const [letter, code] of Object.entries(baconianMap)) {
            reverseBaconianMap[code] = letter;
        }

        const plain = plaintext.toUpperCase();
        const ciphertext = [];
        
        for (let char of plain) {
            if (baconianMap[char]) {
                ciphertext.push(baconianMap[char]);
            } else {
                // Non-letters stay as-is (spaces, punctuation)
                ciphertext.push(char);
            }
        }

        return {
            type: 'baconian',
            plaintext: plain,
            ciphertext: ciphertext, // Array of codes or punctuation
            baconianMap: baconianMap,
            reverseBaconianMap: reverseBaconianMap
        };
    }

    fisherYatesShuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    createReverseMapping(mapping) {
        const reverse = {};
        for (const [plain, cipher] of Object.entries(mapping)) {
            reverse[cipher] = plain;
        }
        return reverse;
    }

    setupEventListeners() {
        const checkBtn = this.container.querySelector('#checkBtn');
        const generateBtn = this.container.querySelector('#generateBtn');
        const pauseBtn = this.container.querySelector('#pauseBtn');
        const autoHighlightToggle = this.container.querySelector('#autoHighlightToggle');
        const cipherTypeSelect = this.container.querySelector('#cipherTypeSelect');

        checkBtn?.addEventListener('click', () => this.checkSolution());
        generateBtn?.addEventListener('click', () => this.generateNewCipher());
        pauseBtn?.addEventListener('click', () => this.togglePause());
        autoHighlightToggle?.addEventListener('click', () => this.toggleAutoHighlight());
        cipherTypeSelect?.addEventListener('change', (e) => this.changeCipherType(e.target.value));
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.elapsedSeconds++;
                this.updateTimerDisplay();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const timerEl = this.container.querySelector('#timer');
        if (timerEl) {
            const mins = Math.floor(this.elapsedSeconds / 60);
            const secs = this.elapsedSeconds % 60;
            timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = this.container.querySelector('#pauseBtn');
        const cipherArea = this.container.querySelector('.cipher-area');
        const pauseOverlay = this.container.querySelector('.pause-overlay');

        if (this.isPaused) {
            pauseBtn.textContent = 'Resume';
            cipherArea.classList.add('paused');
            pauseOverlay.style.display = 'flex';
        } else {
            pauseBtn.textContent = 'Pause';
            cipherArea.classList.remove('paused');
            pauseOverlay.style.display = 'none';
        }
    }

    toggleAutoHighlight() {
        this.autoHighlightEnabled = !this.autoHighlightEnabled;
        const toggle = this.container.querySelector('#autoHighlightToggle');
        const status = this.container.querySelector('#highlightStatus');
        
        status.textContent = this.autoHighlightEnabled ? 'ON' : 'OFF';
        toggle.classList.toggle('active', this.autoHighlightEnabled);
    }

    validateAnswers() {
        if (this.cipherType === 'baconian') {
            this.validateBaconianAnswers();
        } else {
            this.validateSubstitutionAnswers();
        }
    }

    validateSubstitutionAnswers() {
        const boxes = this.container.querySelectorAll('.letter-box');

        boxes.forEach((box) => {
            const cipherLetter = box.dataset.cipherLetter;
            const userLetter = box.value.toUpperCase();
            const correctLetter = this.currentCipher.reverseMapping[cipherLetter];

            if (userLetter === '') {
                box.classList.remove('correct', 'incorrect');
            } else if (userLetter === correctLetter) {
                box.classList.add('correct');
                box.classList.remove('incorrect');
            } else {
                box.classList.add('incorrect');
                box.classList.remove('correct');
            }
        });
    }

    validateBaconianAnswers() {
        const boxes = this.container.querySelectorAll('.letter-box');
        const plaintext = this.currentCipher.plaintext;
        let plainIndex = 0;

        boxes.forEach((box) => {
            // Skip non-letter positions in plaintext
            while (plainIndex < plaintext.length && !/[A-Z]/.test(plaintext[plainIndex])) {
                plainIndex++;
            }

            if (plainIndex >= plaintext.length) return;

            const userLetter = box.value.toUpperCase();
            const correctLetter = plaintext[plainIndex];

            if (userLetter === '') {
                box.classList.remove('correct', 'incorrect');
            } else if (userLetter === correctLetter) {
                box.classList.add('correct');
                box.classList.remove('incorrect');
            } else {
                box.classList.add('incorrect');
                box.classList.remove('correct');
            }

            plainIndex++;
        });
    }

    checkSolution() {
        if (this.cipherType === 'baconian') {
            this.checkBaconianSolution();
        } else {
            this.checkSubstitutionSolution();
        }
    }

    checkSubstitutionSolution() {
        let allCorrect = true;
        let anyEmpty = false;
        const boxes = this.container.querySelectorAll('.letter-box');

        boxes.forEach((box) => {
            const cipherLetter = box.dataset.cipherLetter;
            const userLetter = box.value.toUpperCase();
            const correctLetter = this.currentCipher.reverseMapping[cipherLetter];

            if (userLetter === '') {
                anyEmpty = true;
                box.classList.remove('correct', 'incorrect');
            } else if (userLetter === correctLetter) {
                box.classList.add('correct');
                box.classList.remove('incorrect');
            } else {
                box.classList.add('incorrect');
                box.classList.remove('correct');
                allCorrect = false;
            }
        });

        if (allCorrect && !anyEmpty && boxes.length > 0) {
            this.validationState = 'solved';
            this.renderSolvedMessage();
        }
    }

    checkBaconianSolution() {
        let allCorrect = true;
        let anyEmpty = false;
        const boxes = this.container.querySelectorAll('.letter-box');
        const plaintext = this.currentCipher.plaintext;
        let plainIndex = 0;

        boxes.forEach((box) => {
            // Skip non-letter positions in plaintext
            while (plainIndex < plaintext.length && !/[A-Z]/.test(plaintext[plainIndex])) {
                plainIndex++;
            }

            if (plainIndex >= plaintext.length) return;

            const userLetter = box.value.toUpperCase();
            const correctLetter = plaintext[plainIndex];

            if (userLetter === '') {
                anyEmpty = true;
                box.classList.remove('correct', 'incorrect');
            } else if (userLetter === correctLetter) {
                box.classList.add('correct');
                box.classList.remove('incorrect');
            } else {
                box.classList.add('incorrect');
                box.classList.remove('correct');
                allCorrect = false;
            }

            plainIndex++;
        });

        if (allCorrect && !anyEmpty && boxes.length > 0) {
            this.validationState = 'solved';
            this.renderSolvedMessage();
        }
    }

    renderSolvedMessage() {
        const feedbackEl = this.container.querySelector('#feedback');
        feedbackEl.innerHTML = `
            <div style="background: var(--color-success, #10b981); color: white; padding: var(--space-4); border-radius: var(--border-radius-lg); text-align: center;">
                <strong>Correct!</strong> You solved it in ${Math.floor(this.elapsedSeconds / 60)}:${(this.elapsedSeconds % 60).toString().padStart(2, '0')}
            </div>
        `;
        feedbackEl.style.display = 'block';
    }

    getCipherTypeName() {
        return this.cipherType.charAt(0).toUpperCase() + this.cipherType.slice(1);
    }

    render() {
        this.container.innerHTML = `
            <div class="cipher-container">
                <!-- Header -->
                <div class="cipher-header">
                    <div class="cipher-info">
                        <div class="cipher-type-selector">
                            <label for="cipherTypeSelect">Cipher Type:</label>
                            <select id="cipherTypeSelect">
                                <option value="aristocrat" ${this.cipherType === 'aristocrat' ? 'selected' : ''}>Aristocrat</option>
                                <option value="patristocrat" ${this.cipherType === 'patristocrat' ? 'selected' : ''}>Patristocrat</option>
                                <option value="baconian" ${this.cipherType === 'baconian' ? 'selected' : ''}>Baconian</option>
                            </select>
                        </div>
                        <h2>${this.getCipherTypeName()} Cipher</h2>
                        <p class="difficulty" data-difficulty="${this.currentQuote.difficulty}">
                            Difficulty: ${'★'.repeat(this.currentQuote.difficulty)}${'☆'.repeat(5 - this.currentQuote.difficulty)}
                        </p>
                        <p class="hint"><strong>Hint:</strong> ${this.currentQuote.hint}</p>
                    </div>
                    
                    <div class="cipher-controls">
                        <div class="timer-display">
                            <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Time:</span>
                            <div id="timer" style="font-size: var(--font-size-2xl); font-weight: bold; font-family: monospace;">0:00</div>
                        </div>
                        <button id="pauseBtn" class="btn btn-secondary">Pause</button>
                    </div>
                </div>

                <!-- Cipher Area -->
                <div class="cipher-area">
                    <!-- Pause Overlay -->
                    <div class="pause-overlay" style="display: none;">
                        <div style="text-align: center; color: white;">
                            <h3>Paused</h3>
                            <p>Click Resume to continue</p>
                        </div>
                    </div>

                    <!-- Cipher Text -->
                    <div class="cipher-text-section">
                        <label style="display: block; margin-bottom: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-secondary);">Encrypted Message:</label>
                        <div class="cipher-display">
                            ${this.renderCipherDisplay()}
                        </div>
                    </div>

                    <!-- Solution Boxes -->
                    <div class="solution-section">
                        <label style="display: block; margin-bottom: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-secondary);">Your Solution:</label>
                        <div class="solution-display">
                            ${this.renderSolutionBoxes()}
                        </div>
                    </div>
                </div>

                <!-- Feedback -->
                <div id="feedback" style="display: none; margin: var(--space-4) 0;"></div>

                <!-- Buttons -->
                <div class="cipher-buttons">
                    <button id="autoHighlightToggle" class="btn btn-outline ${this.autoHighlightEnabled ? 'active' : ''}" title="Toggle automatic checking of answers">
                        Auto Check: <span id="highlightStatus">${this.autoHighlightEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                    <button id="checkBtn" class="btn btn-primary">Check Answer</button>
                    <button id="generateBtn" class="btn btn-secondary">Generate New</button>
                </div>

                <!-- Attribution -->
                <div class="cipher-attribution">
                    <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                        Quote by <strong>${this.currentQuote.author}</strong>
                    </p>
                </div>
            </div>
        `;

        this.attachInputListeners();
        this.setupEventListeners();
    }

    renderCipherDisplay() {
        if (this.cipherType === 'baconian') {
            return this.renderBaconianCipherDisplay();
        } else if (this.cipherType === 'patristocrat') {
            return this.renderPatristocratCipherDisplay();
        } else {
            return this.renderAristocratCipherDisplay();
        }
    }

    // Parse text into words (sequences of non-space characters)
    parseIntoWords(text) {
        const words = [];
        let currentWord = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            if (char === ' ') {
                if (currentWord) {
                    words.push({ text: currentWord });
                    currentWord = '';
                }
            } else {
                currentWord += char;
            }
        }
        
        if (currentWord) {
            words.push({ text: currentWord });
        }
        
        return words;
    }

    // Parse Baconian ciphertext into words
    parseBaconianIntoWords(ciphertext) {
        const words = [];
        let currentWord = { items: [] };
        let i = 0;
        
        while (i < ciphertext.length) {
            const item = ciphertext[i];
            
            if (typeof item === 'string' && item.length === 5 && /^[AB]+$/.test(item)) {
                currentWord.items.push(item);
                i++;
            } else if (item === ' ') {
                // Check for word boundary (double space)
                if (i + 1 < ciphertext.length && ciphertext[i + 1] === ' ') {
                    // Word boundary - save current word and start new one
                    if (currentWord.items.length > 0) {
                        words.push(currentWord);
                        currentWord = { items: [] };
                    }
                    i += 2; // Skip both spaces
                } else {
                    // Single space within a word - skip it (handled by rendering)
                    i++;
                }
            } else {
                // Punctuation or other character
                currentWord.items.push(item);
                i++;
            }
        }
        
        if (currentWord.items.length > 0) {
            words.push(currentWord);
        }
        
        return words;
    }

    renderAristocratCipherDisplay() {
        const text = this.currentCipher.ciphertext;
        const words = this.parseIntoWords(text);
        
        let html = '';
        for (const word of words) {
            html += `<div class="word-group">`;
            
            // Render each character in the word
            for (const char of word.text) {
                if (/[A-Z]/.test(char)) {
                    html += `<div class="cipher-block"><span class="cipher-letter">${char}</span></div>`;
                } else {
                    html += `<div class="cipher-block"><span class="cipher-non-letter">${this.escapeHtml(char)}</span></div>`;
                }
            }
            
            html += `</div>`;
        }
        
        return html;
    }

    renderPatristocratCipherDisplay() {
        const text = this.currentCipher.ciphertext;
        
        let html = '';
        // Patristocrat: continuous text, just render all characters in order
        for (const char of text) {
            if (/[A-Z]/.test(char)) {
                html += `<div class="cipher-block"><span class="cipher-letter">${char}</span></div>`;
            } else {
                html += `<div class="cipher-block"><span class="cipher-non-letter">${this.escapeHtml(char)}</span></div>`;
            }
        }
        
        return html;
    }

    renderBaconianCipherDisplay() {
        const ciphertext = this.currentCipher.ciphertext;
        let html = '';
        
        for (let i = 0; i < ciphertext.length; i++) {
            const item = ciphertext[i];
            
            if (typeof item === 'string' && item.length === 5 && /^[AB]+$/.test(item)) {
                // Baconian 5-letter group - 132px wide block with 44px margin
                const letters = item.split('').map(letter => 
                    `<span class="baconian-letter ${letter.toLowerCase()}">${letter}</span>`
                ).join('');
                html += `<div class="cipher-block baconian-block"><span class="baconian-group"><div class="baconian-letters">${letters}</div></span></div>`;
                
                // Check what comes next for spacing
                if (i + 1 < ciphertext.length) {
                    const nextItem = ciphertext[i + 1];
                    // If next is a space, check if it's double space (word boundary)
                    if (nextItem === ' ') {
                        if (i + 2 < ciphertext.length && ciphertext[i + 2] === ' ') {
                            // Double space - add extra spacing block
                            html += `<div class="baconian-word-boundary"></div>`;
                            i += 2; // Skip both spaces
                        } else {
                            // Single space - margin on block handles it
                            i += 1; // Skip the space
                        }
                    }
                }
            } else if (item !== ' ') {
                // Punctuation
                html += `<div class="cipher-block"><span class="cipher-non-letter">${this.escapeHtml(item)}</span></div>`;
            }
        }
        
        return html;
    }

    renderSolutionBoxes() {
        if (this.cipherType === 'baconian') {
            return this.renderBaconianSolutionBoxes();
        } else if (this.cipherType === 'patristocrat') {
            return this.renderPatristocratSolutionBoxes();
        } else {
            return this.renderAristocratSolutionBoxes();
        }
    }

    renderAristocratSolutionBoxes() {
        const text = this.currentCipher.ciphertext;
        const words = this.parseIntoWords(text);
        
        let html = '';
        for (const word of words) {
            html += `<div class="word-group">`;
            
            // Render each character in the word
            for (const char of word.text) {
                if (/[A-Z]/.test(char)) {
                    const value = this.userSolution.get(char) || '';
                    html += `
                        <div class="letter-box-wrapper" data-cipher-letter="${char}">
                            <div class="letter-label">${char}</div>
                            <input 
                                type="text" 
                                class="letter-box" 
                                maxlength="1" 
                                placeholder="_"
                                value="${value}"
                                data-cipher-letter="${char}"
                            >
                        </div>
                    `;
                } else {
                    html += `
                        <div class="letter-box-wrapper">
                            <div class="letter-label"></div>
                            <div class="solution-non-letter">${this.escapeHtml(char)}</div>
                        </div>
                    `;
                }
            }
            
            html += `</div>`;
        }
        
        return html;
    }

    renderPatristocratSolutionBoxes() {
        const text = this.currentCipher.ciphertext;
        
        let html = '';
        // Patristocrat: continuous text, just render all characters in order
        for (const char of text) {
            if (/[A-Z]/.test(char)) {
                const value = this.userSolution.get(char) || '';
                html += `
                    <div class="letter-box-wrapper" data-cipher-letter="${char}">
                        <div class="letter-label">${char}</div>
                        <input 
                            type="text" 
                            class="letter-box" 
                            maxlength="1" 
                            placeholder="_"
                            value="${value}"
                            data-cipher-letter="${char}"
                        >
                    </div>
                `;
            } else {
                html += `
                    <div class="letter-box-wrapper">
                        <div class="letter-label"></div>
                        <div class="solution-non-letter">${this.escapeHtml(char)}</div>
                    </div>
                `;
            }
        }
        
        return html;
    }

    renderBaconianSolutionBoxes() {
        const ciphertext = this.currentCipher.ciphertext;
        let html = '';
        let boxIndex = 0;
        
        for (let i = 0; i < ciphertext.length; i++) {
            const item = ciphertext[i];
            
            if (typeof item === 'string' && item.length === 5 && /^[AB]+$/.test(item)) {
                // Baconian code - render input box with 44px margin
                const value = this.userSolution.get(`baconian_${boxIndex}`) || '';
                html += `
                    <div class="letter-box-wrapper baconian-input" data-cipher-letter="${boxIndex}">
                        <input 
                            type="text" 
                            class="letter-box" 
                            maxlength="1" 
                            placeholder="_"
                            value="${value}"
                            data-baconian-index="${boxIndex}"
                        >
                    </div>
                `;
                boxIndex++;
                
                // Check what comes next for spacing
                if (i + 1 < ciphertext.length) {
                    const nextItem = ciphertext[i + 1];
                    // If next is a space, check if it's double space (word boundary)
                    if (nextItem === ' ') {
                        if (i + 2 < ciphertext.length && ciphertext[i + 2] === ' ') {
                            // Double space - add extra spacing block
                            html += `<div class="baconian-word-boundary"></div>`;
                            i += 2; // Skip both spaces
                        } else {
                            // Single space - margin on block handles it
                            i += 1; // Skip the space
                        }
                    }
                }
            } else if (item !== ' ') {
                // Punctuation
                html += `<div class="cipher-block"><span class="solution-non-letter">${this.escapeHtml(item)}</span></div>`;
            }
        }
        
        return html;
    }

    splitByWords(text) {
        const result = [];
        let current = '';
        let currentType = null;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const isLetter = /[A-Z]/.test(char);
            const isSpace = char === ' ';
            
            if (isSpace) {
                if (current) {
                    result.push({ type: currentType, text: current });
                    current = '';
                }
                result.push({ type: 'space', text: ' ' });
                currentType = null;
            } else if (isLetter) {
                if (currentType === 'word' || currentType === null) {
                    current += char;
                    currentType = 'word';
                } else {
                    if (current) result.push({ type: currentType, text: current });
                    current = char;
                    currentType = 'word';
                }
            } else {
                if (currentType === 'punctuation' || currentType === null) {
                    current += char;
                    currentType = 'punctuation';
                } else {
                    if (current) result.push({ type: currentType, text: current });
                    current = char;
                    currentType = 'punctuation';
                }
            }
        }
        
        if (current) {
            result.push({ type: currentType, text: current });
        }
        
        return result;
    }

    attachInputListeners() {
        if (this.cipherType === 'baconian') {
            this.attachBaconianInputListeners();
        } else {
            this.attachSubstitutionInputListeners();
        }
    }

    attachSubstitutionInputListeners() {
        const boxes = this.container.querySelectorAll('.letter-box');

        boxes.forEach(box => {
            box.addEventListener('keydown', (e) => {
                const letter = e.key.toUpperCase();
                
                // Only accept A-Z letters
                if (/^[A-Z]$/.test(letter)) {
                    e.preventDefault();
                    
                    this.validationState = null;
                    const feedback = this.container.querySelector('#feedback');
                    feedback.style.display = 'none';
                    
                    const allBoxes = this.container.querySelectorAll('.letter-box');
                    allBoxes.forEach(b => {
                        b.classList.remove('correct', 'incorrect', 'selected');
                    });

                    const cipherLetter = e.target.dataset.cipherLetter;
                    
                    // Set the value to the pressed letter
                    e.target.value = letter;
                    this.userSolution.set(cipherLetter, letter);
                    this.fillSameCipherLetters(cipherLetter, letter);

                    if (this.autoHighlightEnabled) {
                        this.validateAnswers();
                    }

                    if (this.areAllBoxesFilled()) {
                        setTimeout(() => this.checkSolution(), 100);
                    }
                    
                    // Move to next box
                    const wrapper = e.target.closest('.letter-box-wrapper');
                    let nextWrapper = wrapper?.nextElementSibling;
                    while (nextWrapper && !nextWrapper.querySelector('.letter-box')) {
                        nextWrapper = nextWrapper.nextElementSibling;
                    }
                    if (nextWrapper?.querySelector('.letter-box')) {
                        nextWrapper.querySelector('.letter-box').focus();
                    }
                } else if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                    e.target.value = '';
                    const cipherLetter = e.target.dataset.cipherLetter;
                    this.userSolution.delete(cipherLetter);
                    this.fillSameCipherLetters(cipherLetter, '');
                    
                    if (this.autoHighlightEnabled) {
                        this.validateAnswers();
                    }
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const wrapper = e.target.closest('.letter-box-wrapper');
                    let nextWrapper = wrapper?.nextElementSibling;
                    while (nextWrapper && !nextWrapper.querySelector('.letter-box')) {
                        nextWrapper = nextWrapper.nextElementSibling;
                    }
                    if (nextWrapper?.querySelector('.letter-box')) {
                        nextWrapper.querySelector('.letter-box').focus();
                    }
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const wrapper = e.target.closest('.letter-box-wrapper');
                    let prevWrapper = wrapper?.previousElementSibling;
                    while (prevWrapper && !prevWrapper.querySelector('.letter-box')) {
                        prevWrapper = prevWrapper.previousElementSibling;
                    }
                    if (prevWrapper?.querySelector('.letter-box')) {
                        prevWrapper.querySelector('.letter-box').focus();
                    }
                }
            });

            box.addEventListener('click', (e) => {
                const cipherLetter = e.target.dataset.cipherLetter;
                this.highlightSameCipherLetters(cipherLetter, e.target);
            });
        });
    }

    attachBaconianInputListeners() {
        const boxes = this.container.querySelectorAll('.letter-box');

        boxes.forEach(box => {
            box.addEventListener('keydown', (e) => {
                const letter = e.key.toUpperCase();
                
                // Only accept A-Z letters
                if (/^[A-Z]$/.test(letter)) {
                    e.preventDefault();
                    
                    this.validationState = null;
                    const feedback = this.container.querySelector('#feedback');
                    feedback.style.display = 'none';
                    
                    const allBoxes = this.container.querySelectorAll('.letter-box');
                    allBoxes.forEach(b => {
                        b.classList.remove('correct', 'incorrect');
                    });

                    const baconianIndex = e.target.dataset.baconianIndex;
                    
                    // Set the value to the pressed letter
                    e.target.value = letter;
                    this.userSolution.set(`baconian_${baconianIndex}`, letter);

                    if (this.autoHighlightEnabled) {
                        this.validateAnswers();
                    }

                    if (this.areAllBoxesFilled()) {
                        setTimeout(() => this.checkSolution(), 100);
                    }
                    
                    // Move to next box
                    const wrapper = e.target.closest('.letter-box-wrapper');
                    let nextWrapper = wrapper?.nextElementSibling;
                    while (nextWrapper && !nextWrapper.querySelector('.letter-box')) {
                        nextWrapper = nextWrapper.nextElementSibling;
                    }
                    if (nextWrapper?.querySelector('.letter-box')) {
                        nextWrapper.querySelector('.letter-box').focus();
                    }
                } else if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                    e.target.value = '';
                    const baconianIndex = e.target.dataset.baconianIndex;
                    this.userSolution.delete(`baconian_${baconianIndex}`);
                    
                    if (this.autoHighlightEnabled) {
                        this.validateAnswers();
                    }
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const wrapper = e.target.closest('.letter-box-wrapper');
                    let nextWrapper = wrapper?.nextElementSibling;
                    while (nextWrapper && !nextWrapper.querySelector('.letter-box')) {
                        nextWrapper = nextWrapper.nextElementSibling;
                    }
                    if (nextWrapper?.querySelector('.letter-box')) {
                        nextWrapper.querySelector('.letter-box').focus();
                    }
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const wrapper = e.target.closest('.letter-box-wrapper');
                    let prevWrapper = wrapper?.previousElementSibling;
                    while (prevWrapper && !prevWrapper.querySelector('.letter-box')) {
                        prevWrapper = prevWrapper.previousElementSibling;
                    }
                    if (prevWrapper?.querySelector('.letter-box')) {
                        prevWrapper.querySelector('.letter-box').focus();
                    }
                }
            });
        });
    }

    fillSameCipherLetters(cipherLetter, value) {
        const boxes = this.container.querySelectorAll(`.letter-box[data-cipher-letter="${cipherLetter}"]`);
        boxes.forEach(box => {
            box.value = value;
        });
    }

    highlightSameCipherLetters(cipherLetter, clickedBox = null) {
        const allBoxes = this.container.querySelectorAll('.letter-box');
        allBoxes.forEach(box => box.classList.remove('selected'));

        const boxes = this.container.querySelectorAll(`.letter-box[data-cipher-letter="${cipherLetter}"]`);
        boxes.forEach(box => {
            box.classList.add('selected');
            // Only select/focus the box that was actually clicked
            if (clickedBox && box === clickedBox) {
                box.select();
            }
        });
    }

    areAllBoxesFilled() {
        const boxes = this.container.querySelectorAll('.letter-box');
        return Array.from(boxes).every(box => box.value.trim() !== '');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('codebustersCipherGame');
    if (container) {
        new CodebustersCipherGame('codebustersCipherGame');
    }
});
