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
    editor: document.getElementById('editor'),
    editorTitle: document.getElementById('editor-title'),
    editorContent: document.getElementById('editor-content'),
    closeEditorBtn: document.getElementById('close-editor')
};

// ======================================
// INITIALIZATION & STORAGE
// ======================================
function init() {
    const saved = localStorage.getItem('zettel_cards');
    cards = saved ? JSON.parse(saved) : [];
    renderCards();
}

function saveCards() {
    localStorage.setItem('zettel_cards', JSON.stringify(cards));
}

// ======================================
// CORE LOGIC & RENDERING
// ======================================
function renderCards() {
    DOM.container.innerHTML = cards
        .filter(card => card.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(card => `
            <div class="card" draggable="true" data-id="${card.id}">
                <span class="card-title">${card.title}</span>
                <div class="card-actions">
                    <button class="action-btn edit-btn" title="Edit Title">✏️</button>
                    <button class="action-btn delete-btn" title="Delete Note">🗑️</button>
                </div>
            </div>
        `).join('');
}

function createCard() {
    const newCard = { id: Date.now().toString(), title: 'New Note', details: '' };
    cards.push(newCard);
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
    DOM.editor.classList.remove('hidden');
    setTimeout(() => DOM.editorContent.focus(), 50);
}

function closeEditor() {
    DOM.editor.classList.add('hidden');
    activeCardId = null;
}

// Auto-save details from editor
DOM.editorContent.addEventListener('input', (e) => {
    if (!activeCardId) return;
    cards.find(c => c.id === activeCardId).details = e.target.value;
    saveCards();
});

// Auto-save title from editor header
DOM.editorTitle.addEventListener('input', (e) => {
    if (!activeCardId) return;
    cards.find(c => c.id === activeCardId).title = e.target.innerText || 'Untitled';
    saveCards();
    renderCards();
});

// ======================================
// INLINE OUTER TITLE EDITING
// ======================================
function enableOuterTitleEdit(cardElement, id) {
    const titleSpan = cardElement.querySelector('.card-title');
    const currentTitle = titleSpan.textContent;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'card-title-input';
    
    // Swap span for input
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    
    function saveTitle() {
        const newTitle = input.value.trim() || 'Untitled';
        
        cards.find(c => c.id === id).title = newTitle;
        saveCards();
        
        const newSpan = document.createElement('span');
        newSpan.className = 'card-title';
        newSpan.textContent = newTitle;
        input.replaceWith(newSpan);
        
        if (activeCardId === id) {
            DOM.editorTitle.textContent = newTitle;
        }
    }
    
    input.addEventListener('blur', saveTitle);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur(); 
    });
}

// ======================================
// EVENT DELEGATION (UI Interactions)
// ======================================
DOM.container.addEventListener('click', (e) => {
    const cardElement = e.target.closest('.card');
    if (!cardElement) return;

    const id = cardElement.dataset.id;

    if (e.target.closest('.delete-btn')) {
        deleteCard(id);
        return;
    }
    
    if (e.target.closest('.edit-btn')) {
        enableOuterTitleEdit(cardElement, id);
        return;
    }
    
    // Default action: open the full editor
    if (!e.target.classList.contains('card-title-input')) {
        openEditor(id);
    }
});

// Search
DOM.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCards();
});

// Add Note
DOM.plusBtn.addEventListener('click', createCard);
DOM.closeEditorBtn.addEventListener('click', closeEditor);

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditor();
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveCards();
    }
});

// ======================================
// DRAG AND DROP LOGIC
// ======================================
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

// Start Application
init();