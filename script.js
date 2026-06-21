// ======================================
// STATE MANAGEMENT
// ======================================
let cards = [];
let activeCardId = null;
let searchQuery = '';
let draggedCardId = null;

const DOM = {
    container: document.getElementById('card-container'),
    plusBtn: document.querySelector('.plus-circle'),
    searchInput: document.getElementById('searchInput'),
    
    // Editor Elements
    editor: document.getElementById('editor'),
    editorTitle: document.getElementById('editor-title'),
    editorContent: document.getElementById('editor-content'),
    closeEditorBtn: document.getElementById('close-editor'),
    
    // AI Elements
    aiInput: document.getElementById('ai-prompt-input'),
    aiBtn: document.getElementById('ai-generate-btn')
};

// ======================================
// INITIALIZATION & CORE LOGIC
// ======================================
function init() {
    const saved = localStorage.getItem('zettel_cards');
    cards = saved ? JSON.parse(saved) : [];
    renderCards();
}

function saveCards() {
    localStorage.setItem('zettel_cards', JSON.stringify(cards));
}

function renderCards() {
    DOM.container.innerHTML = cards
        .filter(card => card.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(card => `
            <div class="card" draggable="true" data-id="${card.id}">
                <span class="card-title">${card.title || 'Untitled Note'}</span>
                <div class="card-actions">
                    <button class="action-btn edit-btn" title="Edit Inline">✏️</button>
                    <button class="action-btn delete-btn" title="Delete Note">🗑️</button>
                </div>
            </div>
        `).join('');
}

function createCard() {
    const newCard = { id: Date.now().toString(), title: 'New Note', details: '' };
    cards.unshift(newCard);
    saveCards();
    renderCards();
}

function deleteCard(id) {
    cards = cards.filter(c => c.id !== id);
    if (activeCardId === id) closeEditor();
    saveCards();
    renderCards();
}

// ======================================
// EDITOR LOGIC
// ======================================
function openEditor(id) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    
    activeCardId = id;
    DOM.editorTitle.textContent = card.title;
    DOM.editorContent.value = card.details;
    DOM.aiInput.value = ''; // Reset AI prompt on open
    DOM.editor.classList.remove('hidden');
    
    setTimeout(() => DOM.editorContent.focus(), 50);
}

function closeEditor() {
    DOM.editor.classList.add('hidden');
    activeCardId = null;
}

// Auto-Save Content
DOM.editorContent.addEventListener('input', (e) => {
    if (!activeCardId) return;
    cards.find(c => c.id === activeCardId).details = e.target.value;
    saveCards();
});

// Auto-Save Modal Title
DOM.editorTitle.addEventListener('input', (e) => {
    if (!activeCardId) return;
    cards.find(c => c.id === activeCardId).title = e.target.innerText;
    saveCards();
    renderCards();
});

// ======================================
// INLINE OUTER TITLE EDITING
// ======================================
function enableOuterTitleEdit(cardElement, id) {
    const titleSpan = cardElement.querySelector('.card-title');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = titleSpan.textContent;
    input.className = 'card-title-input';
    
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    
    function saveTitle() {
        const newTitle = input.value.trim() || 'Untitled Note';
        cards.find(c => c.id === id).title = newTitle;
        saveCards();
        
        const newSpan = document.createElement('span');
        newSpan.className = 'card-title';
        newSpan.textContent = newTitle;
        input.replaceWith(newSpan);
        
        if (activeCardId === id) DOM.editorTitle.textContent = newTitle;
    }
    
    input.addEventListener('blur', saveTitle);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
}

// ======================================
// EVENT DELEGATION
// ======================================
DOM.container.addEventListener('click', (e) => {
    const cardElement = e.target.closest('.card');
    if (!cardElement) return;

    const id = cardElement.dataset.id;

    if (e.target.closest('.delete-btn')) return deleteCard(id);
    if (e.target.closest('.edit-btn')) return enableOuterTitleEdit(cardElement, id);
    
    if (!e.target.classList.contains('card-title-input')) {
        openEditor(id);
    }
});

DOM.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCards();
});

DOM.plusBtn.addEventListener('click', createCard);
DOM.closeEditorBtn.addEventListener('click', closeEditor);

// Drag and Drop (Preserved from original)
DOM.container.addEventListener('dragstart', (e) => {
    if (!e.target.classList.contains('card')) return;
    draggedCardId = e.target.dataset.id;
    setTimeout(() => e.target.classList.add('dragging'), 0);
});

DOM.container.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
    draggedCardId = null;
});

DOM.container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(DOM.container, e.clientY);
    const draggingCard = document.querySelector('.dragging');
    if (!draggingCard) return;

    if (afterElement == null) {
        DOM.container.appendChild(draggingCard);
    } else {
        DOM.container.insertBefore(draggingCard, afterElement);
    }
});

DOM.container.addEventListener('drop', () => {
    const updatedIds = Array.from(DOM.container.querySelectorAll('.card')).map(card => card.dataset.id);
    cards = updatedIds.map(id => cards.find(c => c.id === id));
    saveCards();
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ======================================
// AI INTEGRATION API
// ======================================
DOM.aiBtn.addEventListener('click', async () => {
    if (!activeCardId) return;

    const currentText = DOM.editorContent.value;
    const customInstruction = DOM.aiInput.value.trim() || "study notes";

    // UI Loading State
    DOM.aiBtn.disabled = true;
    DOM.aiBtn.textContent = '⏳ Processing...';
    DOM.editorContent.disabled = true;

    try {
        const newText = await fetchAIModification(currentText, customInstruction);
        
        // Update UI
        DOM.editorContent.value = newText;
        
        // Sync State
        cards.find(c => c.id === activeCardId).details = newText;
        saveCards();
    } catch (error) {
        console.error("AI Generation Failed:", error);
        alert("Failed to modify text.");
    } finally {
        DOM.aiBtn.disabled = false;
        DOM.aiBtn.textContent = '✨ Magic Edit';
        DOM.editorContent.disabled = false;
    }
});

// Mock AI Fetch (Replace with real backend call)
async function fetchAIModification(text, instruction) {

    return new Promise((resolve) => {

        setTimeout(() => {

            if (!text.trim()) {
                resolve("Please enter some notes first.");
                return;
            }

            const cmd = instruction.toLowerCase();

            if (cmd.includes("summary")) {
                resolve(generateSummary(text));
                return;
            }

            if (cmd.includes("keyword")) {
                resolve(generateKeywords(text));
                return;
            }

            if (cmd.includes("flash")) {
                resolve(generateFlashcards(text));
                return;
            }

            if (cmd.includes("bullet")) {
                resolve(generateBulletNotes(text));
                return;
            }

            if (cmd.includes("concept")) {
                resolve(generateKeyConcepts(text));
                return;
            }
            
            if (cmd.includes("example")) {
                resolve(generateExamples(text));
                return;
            }

            if (
                cmd.includes("study") ||
                cmd.includes("exam") ||
                cmd.includes("notes")
            ) {
                resolve(generateStudyNotes(text));
                return;
            }

            resolve(generateStudyNotes(text));

        }, 500);

    });

}

function generateSummary(text) {

    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(Boolean);

    return (
`SUMMARY

${sentences.slice(0, 3).join(". ")}.`
    );
}

function generateKeywords(text) {

    const stopWords = [
        "the","is","are","was","were",
        "and","or","for","with",
        "from","that","this","have",
        "has","had","into","about",
        "they","their","them","which",
        "what","when","where"
    ];

    const words =
        text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];

    const keywords =
        [...new Set(
            words.filter(
                word => !stopWords.includes(word)
            )
        )].slice(0, 15);

    return (
`KEYWORDS

• ${keywords.join("\n• ")}`
    );
}

function generateBulletNotes(text) {

    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(Boolean);

    return (
`KEY POINTS

${sentences.map(s => "• " + s).join("\n")}`
    );
}

function generateFlashcards(text) {

    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(Boolean);

    const cards = [];

    sentences.forEach(sentence => {

        if (sentence.includes(" is ")) {

            const parts = sentence.split(" is ");

            if (
                parts[0].trim().length > 2 &&
                parts[1].trim().length > 5
            ) {

                cards.push(
                    `Q: What is ${parts[0].trim()}?\nA: ${parts[1].trim()}`
                );

            }
        }

        if (sentence.includes(":")) {

            const parts = sentence.split(":");
        
            cards.push(
                `Q: Explain ${parts[0].trim()}.\nA: ${parts[1].trim()}`
            );
        
        }

    });

    if (!cards.length) {

        cards.push(
            "No flashcards could be generated from the text."
        );

    }

    return (
`FLASHCARDS

${cards.join("\n\n")}`
    );
}

function generateStudyNotes(text) {

    return `
========================
STUDY NOTES
========================

${generateSummary(text)}

========================

${generateKeywords(text)}

========================

${generateBulletNotes(text)}

========================

${generateFlashcards(text)}
`;
}

function generateKeyConcepts(text) {

    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(Boolean);

    return `
KEY CONCEPTS

${sentences
    .slice(0, 8)
    .map(s => "• " + s)
    .join("\n")}
`;

}

function generateExamples(text) {

    const words =
        text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];

    const keywords =
        [...new Set(words)].slice(0, 5);

    let output = "PRACTICAL EXAMPLES\n\n";

    keywords.forEach(keyword => {

        output +=
`• ${keyword}
Example: Real-world use of ${keyword}

`;

    });

    return output;

}



// Start Application
init();