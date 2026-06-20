// ======================================
// SAVE CARDS TO LOCAL STORAGE
// ======================================

function saveCards() {
    localStorage.setItem('cards', JSON.stringify(cards));
}

//KEYBOARD FUNCTIONS
document.addEventListener('keydown', (e) => {

    // =========================
    // ESC → Close editor
    // =========================
    if (e.key === 'Escape') {
        editor.classList.add('hidden');
        activeCard = null;
    }

    // =========================
    // CTRL + S → Save (prevent browser save popup)
    // =========================
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();

        if (activeCard) {
            activeCard.details = editorContent.value;
            saveCards();
        }
    }
});

// ======================================
// DOM ELEMENTS
// ======================================

const plusCircle = document.querySelector('.plus-circle');
const cardContainer = document.querySelector('.card-container');

const editor = document.querySelector('.editor');
const editorTitle = document.querySelector('#editor-title');
const editorContent = document.querySelector('#editor-content');
const closeEditor = document.querySelector('#close-editor');

const searchInput = document.querySelector('#searchInput');

// Global variables
let searchQuery = '';
let draggedCardId = null;

//Make container accept drops
cardContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
});

//Calculate drop position
cardContainer.addEventListener('drop', (e) => {
    e.preventDefault();

    const draggedIndex = cards.findIndex(c => c.id === draggedCardId);

    if (draggedIndex === -1) return;

    const draggedCard = cards[draggedIndex];

    // remove from old position
    cards.splice(draggedIndex, 1);

    // find closest card to drop position
    const afterElement = getDragAfterElement(cardContainer, e.clientY);

    if (!afterElement) {
        cards.push(draggedCard);
    } else {
        const index = cards.findIndex(
            c => c.id === afterElement.cardData.id
        );

        cards.splice(index, 0, draggedCard);
    }

    saveCards();
    renderCards();
});

//Helper function
function getDragAfterElement(container, y) {

    const draggableElements = [
        ...container.querySelectorAll('.card:not(.dragging)')
    ];

    return draggableElements.reduce((closest, child) => {

        const box = child.getBoundingClientRect();

        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return {
                offset,
                element: child
            };
        }

        return closest;

    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ======================================
// APPLICATION DATA
// ======================================

const cards = [];
let activeCard = null;


// ======================================
// CLOSE EDITOR
// ======================================

closeEditor.addEventListener('click', () => {
    editor.classList.add('hidden');
    activeCard = null;
});


// ======================================
// AUTO-SAVE EDITOR CONTENT
// ======================================

editorContent.addEventListener('input', () => {

    if (!activeCard) return;

    activeCard.details = editorContent.value;

    saveCards();

});

//Create a render system
function renderCards() {

    // clear UI
    cardContainer.innerHTML = '';

    // rebuild everything from cards[]
    cards
        .filter(card => {
            return card.title.toLowerCase().includes(searchQuery);
        })
        .forEach(createCard);
}

// ======================================
// CREATE CARD FUNCTION
// ======================================

// ======================================
// CREATE SINGLE CARD (UI ONLY)
// ======================================

function createCard(cardData) {

    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
        <span class="card-title">${cardData.title}</span>

        <div class="card-actions">
            <button class="edit-btn">✏️</button>
            <button class="delete-btn">🗑️</button>
        </div>
    `;

    card.cardData = cardData;

    card.setAttribute('draggable', true);

    //When drag starts
    card.addEventListener('dragstart', () => {
        draggedCardId = cardData.id;
    
        card.classList.add('dragging');
    });

    //When drag ends
    card.addEventListener('dragend', () => {
        draggedCardId = null;
    
        card.classList.remove('dragging');
    });

    // ======================================
    // OPEN EDITOR
    // ======================================
    card.addEventListener('click', () => {

        activeCard = cardData;
    
        editorTitle.textContent = cardData.title;
        editorContent.value = cardData.details;
    
        editor.classList.remove('hidden');
    
        // auto-focus (important UX improvement)
        setTimeout(() => {
            editorContent.focus();
        }, 0);
    });

    // ======================================
    // DELETE CARD
    // ======================================

    const deleteBtn = card.querySelector('.delete-btn');

    deleteBtn.addEventListener('click', (e) => {

        e.stopPropagation();

        // remove from state ONLY
        const index = cards.findIndex(c => c.id === cardData.id);

        if (index > -1) {
            cards.splice(index, 1);
        }

        saveCards();
        renderCards();

        // close editor if this card is open
        if (activeCard && activeCard.id === cardData.id) {
            editor.classList.add('hidden');
            activeCard = null;
        }
    });

    // ======================================
    // EDIT TITLE
    // ======================================

    const editBtn = card.querySelector('.edit-btn');

    editBtn.addEventListener('click', (e) => {

        e.stopPropagation();

        const title = card.querySelector('.card-title');

        const input = document.createElement('input');
        input.type = 'text';
        input.value = title.textContent;
        input.className = 'card-input';

        title.replaceWith(input);

        input.focus();
        input.select();

        function saveTitle() {

            const newTitle = document.createElement('span');
            newTitle.className = 'card-title';

            const value = input.value.trim();
            newTitle.textContent = value || 'Untitled';

            cardData.title = newTitle.textContent;

            saveCards();

            // update editor header if open
            if (activeCard && activeCard.id === cardData.id) {
                editorTitle.textContent = cardData.title;
            }

            input.replaceWith(newTitle);
        }

        input.addEventListener('blur', saveTitle);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur(); // cleaner than calling saveTitle directly
            }
        });
    });

    // ======================================
    // ADD TO DOM
    // (ONLY USED BY renderCards)
    // ======================================

    cardContainer.appendChild(card);
}

//Listen to typing
searchInput.addEventListener('input', (e) => {

    searchQuery = e.target.value.toLowerCase();

    renderCards();

});

// ======================================
// CREATE NEW CARD BUTTON
// ======================================

plusCircle.addEventListener('click', () => {

    const cardData = {
        id: Date.now(),
        title: 'New Card',
        details: ''
    };

    cards.push(cardData);

    saveCards();
    renderCards();
});


// ======================================
// LOAD CARDS FROM LOCAL STORAGE
// ======================================

// ======================================
// LOAD CARDS FROM LOCAL STORAGE
// ======================================

function loadCards() {

    // ------------------------------
    // 1. Read from localStorage
    // ------------------------------
    const savedCards = JSON.parse(localStorage.getItem('cards')) || [];

    // ------------------------------
    // 2. Reset in-memory state
    // ------------------------------
    cards.length = 0;

    // ------------------------------
    // 3. Normalize / repair data
    // ------------------------------
    savedCards.forEach(card => {

        // Ensure ID exists (data safety layer)
        if (!card.id) {
            card.id = Date.now() + Math.random();
        }

        // Ensure required fields exist (future-proofing)
        if (!card.title) {
            card.title = 'Untitled';
        }

        if (!card.details) {
            card.details = '';
        }

        // Push into single source of truth
        cards.push(card);
    });

    // ------------------------------
    // 4. Render UI from state
    // ------------------------------
    renderCards();
}


// ======================================
// INIT APP
// ======================================

loadCards();