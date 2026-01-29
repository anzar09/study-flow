/**
 * Concept Revision Tracker - Main Application Logic
 * 
 * This app helps students track their understanding of concepts across subjects.
 * All data is stored locally in the browser using localStorage.
 * Data Structure:
 * {
 *   subjects: [
 *     {
 *       id: string,
 *       name: string,
 *       concepts: [
 *         {
 *           id: string,
 *           name: string,
 *           status: 'not-started' | 'learning' | 'need-revision' | 'confident',
 *           lastRevised: string | null (ISO date string)
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

// ==================== Constants ====================

const STORAGE_KEY = 'conceptRevisionTrackerData';
const THEME_KEY = 'conceptRevisionTrackerTheme';
const STREAK_KEY = 'studyFlowStreakData';

const STATUS_ORDER = {
    'not-started': 0,
    'learning': 1,
    'need-revision': 2,
    'confident': 3
};

const STATUS_LABELS = {
    'not-started': 'Not Started',
    'learning': 'Learning',
    'need-revision': 'Need Revision',
    'confident': 'Confident'
};

// ==================== State Management ====================

/**
 * Application state - holds all data in memory
 * This is synced with localStorage on every change
 * 
 * Each subject now has a 'completedConcepts' array for finished concepts
 */
let appState = {
    subjects: [],
    selectedSubjectId: null
};

// ==================== DOM Element References ====================

const elements = {
    // Subject elements
    subjectList: document.getElementById('subjectList'),
    noSubjectsMessage: document.getElementById('noSubjectsMessage'),
    addSubjectBtn: document.getElementById('addSubjectBtn'),
    addSubjectForm: document.getElementById('addSubjectForm'),
    newSubjectInput: document.getElementById('newSubjectInput'),
    saveSubjectBtn: document.getElementById('saveSubjectBtn'),
    cancelSubjectBtn: document.getElementById('cancelSubjectBtn'),
    resetDataBtn: document.getElementById('resetDataBtn'),
    
    // Main content elements
    welcomeMessage: document.getElementById('welcomeMessage'),
    subjectDetail: document.getElementById('subjectDetail'),
    selectedSubjectName: document.getElementById('selectedSubjectName'),
    renameSubjectBtn: document.getElementById('renameSubjectBtn'),
    deleteSubjectBtn: document.getElementById('deleteSubjectBtn'),
    renameSubjectForm: document.getElementById('renameSubjectForm'),
    renameSubjectInput: document.getElementById('renameSubjectInput'),
    saveRenameBtn: document.getElementById('saveRenameBtn'),
    cancelRenameBtn: document.getElementById('cancelRenameBtn'),
    
    // Progress elements
    progressOverview: document.getElementById('progressOverview'),
    totalConcepts: document.getElementById('totalConcepts'),
    notStartedCount: document.getElementById('notStartedCount'),
    learningCount: document.getElementById('learningCount'),
    needRevisionCount: document.getElementById('needRevisionCount'),
    confidentCount: document.getElementById('confidentCount'),
    progressBar: document.getElementById('progressBar'),
    progressSummary: document.getElementById('progressSummary'),
    
    // Filter and sort elements
    statusFilter: document.getElementById('statusFilter'),
    sortBy: document.getElementById('sortBy'),
    
    // Concept elements
    newConceptName: document.getElementById('newConceptName'),
    newConceptStatus: document.getElementById('newConceptStatus'),
    addConceptBtn: document.getElementById('addConceptBtn'),
    conceptsList: document.getElementById('conceptsList'),
    noConceptsMessage: document.getElementById('noConceptsMessage'),
    noFilterResults: document.getElementById('noFilterResults'),
    
    // Quick filter buttons
    quickFilters: document.getElementById('quickFilters'),
    
    // Completed section elements
    completedSection: document.getElementById('completedSection'),
    completedHeader: document.getElementById('completedHeader'),
    completedCount: document.getElementById('completedCount'),
    toggleCompletedBtn: document.getElementById('toggleCompletedBtn'),
    completedList: document.getElementById('completedList'),
    noCompletedMessage: document.getElementById('noCompletedMessage'),
    
    // Toast and modal elements
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    confirmModal: document.getElementById('confirmModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    modalConfirmBtn: document.getElementById('modalConfirmBtn'),
    modalCancelBtn: document.getElementById('modalCancelBtn'),
    
    // Theme toggle (removed from UI)
    themeToggle: document.getElementById('themeToggle'),
    // Streak
    streakBtn: document.getElementById('streakBtn'),
    streakCount: document.getElementById('streakCount'),
    streakWarning: document.getElementById('streakWarning'),
    dismissWarningBtn: document.getElementById('dismissWarningBtn')
};

// ==================== Theme Management ====================

/**
 * Get the current theme from localStorage or system preference
 */
function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        return savedTheme;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Apply the theme to the document
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme} mode`, 'success');
}

/**
 * Sync quick filter buttons with the dropdown filter
 */
function syncQuickFiltersWithDropdown() {
    if (!elements.quickFilters) return;
    const currentFilter = elements.statusFilter.value;
    elements.quickFilters.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
}

/**
 * Initialize theme on page load
 */
function initTheme() {
    applyTheme('dark');
}

// ==================== Utility Functions ====================

/**
 * Generate a unique ID for subjects and concepts
 * Uses timestamp + random string for uniqueness
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format a date string for display
 * @param {string|null} dateString - ISO date string or null
 * @returns {string} Formatted date or "Never"
 */
function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get today's date as an ISO string (date only, no time)
 */
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// ==================== localStorage Functions ====================

/**
 * Save the current app state to localStorage with error handling
 */
function saveToStorage() {
    try {
        const dataString = JSON.stringify(appState);
        localStorage.setItem(STORAGE_KEY, dataString);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            showToast('❌ Storage limit exceeded. Please delete some old data.', 'error');
        } else {
            showToast('❌ Failed to save data. Please check your browser settings.', 'error');
        }
        return false;
    }
}

/**
 * Load app state from localStorage
 * Returns default state if no data exists
 */
function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return { subjects: [], selectedSubjectId: null };
        }
        
        const parsed = JSON.parse(data);
        
        // Validate the data structure
        if (!parsed || typeof parsed !== 'object') {
            return { subjects: [], selectedSubjectId: null };
        }
        
        // Ensure subjects array exists and is valid
        if (!Array.isArray(parsed.subjects)) {
            return { subjects: [], selectedSubjectId: null };
        }
        
        // Validate each subject
        parsed.subjects = parsed.subjects.filter(subject => {
            if (!subject || typeof subject !== 'object') return false;
            if (!subject.id || !subject.name) return false;
            if (!Array.isArray(subject.concepts)) subject.concepts = [];
            if (!Array.isArray(subject.completedConcepts)) subject.completedConcepts = [];
            return true;
        });
        
        return parsed;
    } catch (error) {
        showToast('⚠️ Could not load saved data. Starting fresh.', 'warning');
        return { subjects: [], selectedSubjectId: null };
    }
}

/**
 * Clear all data from localStorage (with confirmation)
 */
function resetAllData() {
    appState = { subjects: [], selectedSubjectId: null };
    saveToStorage();
    renderApp();
    showToast('All data has been reset.', 'success');
}

// ==================== Subject Management Functions ====================

/**
 * Get a subject by its ID
 * @param {string} subjectId 
 * @returns {object|undefined}
 */
function getSubjectById(subjectId) {
    return appState.subjects.find(s => s.id === subjectId);
}

/**
 * Add a new subject
 * @param {string} name - Subject name
 * @param {string} color - Subject color
 */
function addSubject(name, color = '#6366f1') {
    const trimmedName = name.trim();
    if (!trimmedName) {
        showToast('Please enter a subject name.', 'warning');
        return false;
    }
    
    // Check for duplicate names
    if (appState.subjects.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
        showToast('A subject with this name already exists.', 'warning');
        return false;
    }
    
    const newSubject = {
        id: generateId(),
        name: trimmedName,
        color: color,
        concepts: []
    };
    
    appState.subjects.push(newSubject);
    saveToStorage();
    renderSubjectList();
    showToast(`Subject "${trimmedName}" added!`, 'success');
    recordActivity();
    return true;
}

/**
 * Rename a subject
 * @param {string} subjectId 
 * @param {string} newName 
 */
function renameSubject(subjectId, newName) {
    const trimmedName = newName.trim();
    if (!trimmedName) {
        showToast('Please enter a subject name.', 'warning');
        return false;
    }
    
    const subject = getSubjectById(subjectId);
    if (!subject) return false;
    
    // Check for duplicate names (excluding current subject)
    if (appState.subjects.some(s => s.id !== subjectId && s.name.toLowerCase() === trimmedName.toLowerCase())) {
        showToast('A subject with this name already exists.', 'warning');
        return false;
    }
    
    subject.name = trimmedName;
    saveToStorage();
    renderApp();
    showToast(`Subject renamed to "${trimmedName}".`, 'success');
    return true;
}

/**
 * Delete a subject
 * @param {string} subjectId 
 */
function deleteSubject(subjectId) {
    const index = appState.subjects.findIndex(s => s.id === subjectId);
    if (index === -1) return;
    
    const subjectName = appState.subjects[index].name;
    appState.subjects.splice(index, 1);
    
    // Clear selection if deleted subject was selected
    if (appState.selectedSubjectId === subjectId) {
        appState.selectedSubjectId = null;
    }
    
    saveToStorage();
    renderApp();
    showToast(`Subject "${subjectName}" deleted.`, 'success');
}

/**
 * Select a subject to view/edit
 * @param {string} subjectId 
 */
function selectSubject(subjectId) {
    appState.selectedSubjectId = subjectId;
    saveToStorage();
    renderApp();
    
    // Close mobile sidebar after selecting a subject
    closeMobileSidebar();
}

// ==================== Concept Management Functions ====================

/**
 * Get the currently selected subject
 */
function getSelectedSubject() {
    if (!appState.selectedSubjectId) return null;
    return getSubjectById(appState.selectedSubjectId);
}

/**
 * Get a concept from the selected subject by ID
 * @param {string} conceptId 
 */
function getConceptById(conceptId) {
    const subject = getSelectedSubject();
    if (!subject) return null;
    return subject.concepts.find(c => c.id === conceptId);
}

/**
 * Add a new concept to the selected subject
 * @param {string} name - Concept name
 * @param {string} status - Initial status
 */
function addConcept(name, status) {
    const subject = getSelectedSubject();
    if (!subject) return false;
    
    const trimmedName = name.trim();
    if (!trimmedName) {
        showToast('Please enter a concept name.', 'warning');
        return false;
    }
    
    // Check for duplicate names within the subject
    if (subject.concepts.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        showToast('This concept already exists in this subject.', 'warning');
        return false;
    }
    
    const newConcept = {
        id: generateId(),
        name: trimmedName,
        status: status || 'not-started',
        lastRevised: null
    };
    
    subject.concepts.push(newConcept);
    saveToStorage();
    renderSubjectDetail();
    renderSubjectList(); // Update concept count
    showToast(`Concept "${trimmedName}" added!`, 'success');
    recordActivity();
    return true;
}

/**
 * Update a concept's name
 * @param {string} conceptId 
 * @param {string} newName 
 */
function updateConceptName(conceptId, newName) {
    const subject = getSelectedSubject();
    if (!subject) return false;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        showToast('Please enter a concept name.', 'warning');
        return false;
    }
    
    const concept = getConceptById(conceptId);
    if (!concept) return false;
    
    // Check for duplicate names (excluding current concept)
    if (subject.concepts.some(c => c.id !== conceptId && c.name.toLowerCase() === trimmedName.toLowerCase())) {
        showToast('This concept already exists in this subject.', 'warning');
        return false;
    }
    
    concept.name = trimmedName;
    saveToStorage();
    renderSubjectDetail();
    showToast('Concept name updated.', 'success');
    return true;
}

/**
 * Update a concept's status
 * @param {string} conceptId 
 * @param {string} newStatus 
 */
function updateConceptStatus(conceptId, newStatus) {
    const concept = getConceptById(conceptId);
    if (!concept) return;
    
    concept.status = newStatus;
    saveToStorage();
    renderSubjectDetail();
    recordActivity();
}

/**
 * Update a concept's last revised date
 * @param {string} conceptId 
 * @param {string} date - ISO date string
 */
function updateConceptDate(conceptId, date) {
    const concept = getConceptById(conceptId);
    if (!concept) return;
    
    // Validate that date is not in the future
    if (date) {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        if (selectedDate > today) {
            showToast('Last revised date cannot be in the future!', 'error');
            renderSubjectDetail(); // Re-render to reset the input
            return;
        }
    }
    
    concept.lastRevised = date || null;
    saveToStorage();
    renderSubjectDetail();
}

/**
 * Set a concept's last revised date to today
 * @param {string} conceptId 
 */
function setConceptRevisedToday(conceptId) {
    updateConceptDate(conceptId, getTodayString());
    showToast('Marked as revised today!', 'success');
    recordActivity();
}

/**
 * Delete a concept
 * @param {string} conceptId 
 */
function deleteConcept(conceptId) {
    const subject = getSelectedSubject();
    if (!subject) return;
    
    const index = subject.concepts.findIndex(c => c.id === conceptId);
    if (index === -1) return;
    
    const conceptName = subject.concepts[index].name;
    subject.concepts.splice(index, 1);
    
    saveToStorage();
    renderSubjectDetail();
    renderSubjectList(); // Update concept count
    showToast(`Concept "${conceptName}" deleted.`, 'success');
}

// ==================== Completed Concepts Functions ====================

/**
 * Mark a concept as completed
 * @param {string} conceptId 
 */
function completeConcept(conceptId) {
    const subject = getSelectedSubject();
    if (!subject) return;
    
    // Initialize completedConcepts array if it doesn't exist
    if (!subject.completedConcepts) {
        subject.completedConcepts = [];
    }
    
    const index = subject.concepts.findIndex(c => c.id === conceptId);
    if (index === -1) return;
    
    const concept = subject.concepts[index];
    
    // Add to completed with completion date
    subject.completedConcepts.push({
        ...concept,
        completedAt: new Date().toISOString()
    });
    
    // Remove from active concepts
    subject.concepts.splice(index, 1);
    
    saveToStorage();
    renderSubjectDetail();
    renderSubjectList();
    showToast(`"${concept.name}" marked as completed! 🎉`, 'success');
}

/**
 * Restore a completed concept back to active
 * @param {string} conceptId 
 */
function restoreConcept(conceptId) {
    const subject = getSelectedSubject();
    if (!subject || !subject.completedConcepts) return;
    
    const index = subject.completedConcepts.findIndex(c => c.id === conceptId);
    if (index === -1) return;
    
    const concept = subject.completedConcepts[index];
    
    // Remove completedAt and add back to active concepts
    const { completedAt, ...restoredConcept } = concept;
    subject.concepts.push(restoredConcept);
    
    // Remove from completed
    subject.completedConcepts.splice(index, 1);
    
    saveToStorage();
    renderSubjectDetail();
    renderSubjectList();
    showToast(`"${concept.name}" restored to active concepts.`, 'success');
}

/**
 * Permanently delete a completed concept
 * @param {string} conceptId 
 */
function deleteCompletedConcept(conceptId) {
    const subject = getSelectedSubject();
    if (!subject || !subject.completedConcepts) return;
    
    const index = subject.completedConcepts.findIndex(c => c.id === conceptId);
    if (index === -1) return;
    
    const conceptName = subject.completedConcepts[index].name;
    subject.completedConcepts.splice(index, 1);
    
    saveToStorage();
    renderSubjectDetail();
    showToast(`"${conceptName}" permanently deleted.`, 'success');
}

/**
 * Get completed concepts for the current subject
 */
function getCompletedConcepts() {
    const subject = getSelectedSubject();
    if (!subject || !subject.completedConcepts) return [];
    return subject.completedConcepts;
}

/**
 * Toggle the completed section visibility
 */
function toggleCompletedSection() {
    const completedList = elements.completedList;
    const toggleBtn = elements.toggleCompletedBtn;
    const noCompletedMsg = elements.noCompletedMessage;
    
    if (completedList.classList.contains('collapsed')) {
        completedList.classList.remove('collapsed');
        noCompletedMsg.classList.remove('collapsed');
        toggleBtn.classList.remove('collapsed');
    } else {
        completedList.classList.add('collapsed');
        noCompletedMsg.classList.add('collapsed');
        toggleBtn.classList.add('collapsed');
    }
}

// ==================== Filter and Sort Functions ====================

/**
 * Get filtered and sorted concepts for the current subject
 */
function getFilteredAndSortedConcepts() {
    const subject = getSelectedSubject();
    if (!subject) return [];
    
    let concepts = [...subject.concepts];
    
    // Apply filter
    const filterValue = elements.statusFilter.value;
    if (filterValue !== 'all') {
        concepts = concepts.filter(c => c.status === filterValue);
    }
    
    // Apply sort
    const sortValue = elements.sortBy.value;
    concepts.sort((a, b) => {
        switch (sortValue) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'status':
                return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
            case 'date-desc':
                // Null dates go to the end
                if (!a.lastRevised && !b.lastRevised) return 0;
                if (!a.lastRevised) return 1;
                if (!b.lastRevised) return -1;
                return new Date(b.lastRevised) - new Date(a.lastRevised);
            case 'date-asc':
                // Null dates go to the end
                if (!a.lastRevised && !b.lastRevised) return 0;
                if (!a.lastRevised) return 1;
                if (!b.lastRevised) return -1;
                return new Date(a.lastRevised) - new Date(b.lastRevised);
            default:
                return 0;
        }
    });
    
    return concepts;
}

// ==================== Progress Calculation Functions ====================

/**
 * Calculate progress statistics for the current subject
 */
function calculateProgress() {
    const subject = getSelectedSubject();
    if (!subject) {
        return {
            total: 0,
            notStarted: 0,
            learning: 0,
            needRevision: 0,
            confident: 0,
            percentage: 0
        };
    }
    
    const concepts = subject.concepts;
    const stats = {
        total: concepts.length,
        notStarted: concepts.filter(c => c.status === 'not-started').length,
        learning: concepts.filter(c => c.status === 'learning').length,
        needRevision: concepts.filter(c => c.status === 'need-revision').length,
        confident: concepts.filter(c => c.status === 'confident').length,
        percentage: 0
    };
    
    if (stats.total > 0) {
        stats.percentage = Math.round((stats.confident / stats.total) * 100);
    }
    
    return stats;
}

/**
 * Generate a progress summary message
 */
function getProgressSummary(stats) {
    if (stats.total === 0) {
        return 'Start adding concepts to track your progress!';
    }
    
    const messages = [];
    
    if (stats.percentage === 100) {
        return '🎉 Amazing! You\'re confident in all concepts!';
    }
    
    if (stats.needRevision > 0) {
        messages.push(`📝 ${stats.needRevision} concept${stats.needRevision > 1 ? 's' : ''} need${stats.needRevision === 1 ? 's' : ''} revision`);
    }
    
    if (stats.notStarted > 0) {
        messages.push(`📚 ${stats.notStarted} concept${stats.notStarted > 1 ? 's' : ''} not started yet`);
    }
    
    if (stats.confident > 0) {
        messages.push(`✅ ${stats.percentage}% mastery achieved`);
    }
    
    return messages.join(' • ') || 'Keep learning! 💪';
}

// ==================== UI Rendering Functions ====================

/**
 * Render the entire application
 */
function renderApp() {
    renderSubjectList();
    renderMainContent();
}

/**
 * Render the subject list in the sidebar
 */
function renderSubjectList() {
    const subjectList = elements.subjectList;
    subjectList.innerHTML = '';
    
    if (appState.subjects.length === 0) {
        elements.noSubjectsMessage.classList.remove('hidden');
        return;
    }
    
    elements.noSubjectsMessage.classList.add('hidden');
    
    appState.subjects.forEach((subject, index) => {
        const li = document.createElement('li');
        li.className = 'subject-item' + (subject.id === appState.selectedSubjectId ? ' active' : '');
        li.style.animationDelay = `${index * 0.05}s`;
        li.style.setProperty('--subject-color', subject.color || '#6366f1');
        li.innerHTML = `
            <span class="subject-name">${escapeHtml(subject.name)}</span>
            <span class="concept-count">${subject.concepts.length}</span>
        `;
        li.addEventListener('click', () => selectSubject(subject.id));
        subjectList.appendChild(li);
    });
}

/**
 * Render the main content area
 */
function renderMainContent() {
    if (!appState.selectedSubjectId) {
        elements.welcomeMessage.classList.remove('hidden');
        elements.subjectDetail.classList.add('hidden');
        return;
    }
    
    elements.welcomeMessage.classList.add('hidden');
    elements.subjectDetail.classList.remove('hidden');
    renderSubjectDetail();
}

/**
 * Render the subject detail view
 */
function renderSubjectDetail() {
    const subject = getSelectedSubject();
    if (!subject) return;
    
    // Update subject name
    elements.selectedSubjectName.textContent = subject.name;
    
    // Hide rename form
    elements.renameSubjectForm.classList.add('hidden');
    
    // Update progress overview
    renderProgressOverview();
    
    // Render concepts list
    renderConceptsList();
    
    // Render completed concepts
    renderCompletedConcepts();
}

/**
 * Render the progress overview section
 */
function renderProgressOverview() {
    const stats = calculateProgress();
    
    elements.totalConcepts.textContent = stats.total;
    elements.notStartedCount.textContent = stats.notStarted;
    elements.learningCount.textContent = stats.learning;
    elements.needRevisionCount.textContent = stats.needRevision;
    elements.confidentCount.textContent = stats.confident;
    
    elements.progressBar.style.width = stats.percentage + '%';
    elements.progressSummary.textContent = getProgressSummary(stats);
}

/**
 * Render the concepts list
 */
function renderConceptsList() {
    const subject = getSelectedSubject();
    if (!subject) return;
    
    const concepts = getFilteredAndSortedConcepts();
    const conceptsList = elements.conceptsList;
    conceptsList.innerHTML = '';
    
    // Handle empty states
    if (subject.concepts.length === 0) {
        elements.noConceptsMessage.classList.remove('hidden');
        elements.noFilterResults.classList.add('hidden');
        return;
    }
    
    elements.noConceptsMessage.classList.add('hidden');
    
    if (concepts.length === 0) {
        elements.noFilterResults.classList.remove('hidden');
        return;
    }
    
    elements.noFilterResults.classList.add('hidden');
    
    // Render each concept
    concepts.forEach((concept, index) => {
        const card = createConceptCard(concept, index);
        conceptsList.appendChild(card);
    });
}

/**
 * Render the completed concepts list
 */
function renderCompletedConcepts() {
    const completedConcepts = getCompletedConcepts();
    const completedList = elements.completedList;
    
    if (!completedList) return;
    
    completedList.innerHTML = '';
    
    // Update count
    elements.completedCount.textContent = completedConcepts.length;
    
    // Handle empty state
    if (completedConcepts.length === 0) {
        elements.noCompletedMessage.classList.remove('hidden');
        elements.completedSection.style.opacity = '0.7';
        return;
    }
    
    elements.noCompletedMessage.classList.add('hidden');
    elements.completedSection.style.opacity = '1';
    
    // Render each completed concept
    completedConcepts.forEach((concept, index) => {
        const card = createCompletedCard(concept, index);
        completedList.appendChild(card);
    });
}

/**
 * Create a completed concept card element
 * @param {object} concept 
 * @param {number} index - Index for staggered animation
 */
function createCompletedCard(concept, index = 0) {
    const card = document.createElement('div');
    card.className = 'completed-card';
    card.dataset.conceptId = concept.id;
    card.style.animationDelay = `${index * 0.05}s`;
    
    const completedDate = concept.completedAt 
        ? formatDate(concept.completedAt.split('T')[0])
        : 'Unknown';
    
    card.innerHTML = `
        <div class="concept-header">
            <span class="concept-name">${escapeHtml(concept.name)}</span>
            <div class="concept-actions">
                <button class="restore-btn" title="Restore to active">↩ Restore</button>
                <button class="delete-completed-btn" title="Delete permanently">🗑️</button>
            </div>
        </div>
        <div class="completed-info">
            <span class="completed-date">📅 Completed: ${completedDate}</span>
        </div>
    `;
    
    // Add event listeners
    const restoreBtn = card.querySelector('.restore-btn');
    restoreBtn.addEventListener('click', () => {
        restoreConcept(concept.id);
    });
    
    const deleteBtn = card.querySelector('.delete-completed-btn');
    deleteBtn.addEventListener('click', () => {
        showConfirmModal(
            'Delete Permanently',
            `Are you sure you want to permanently delete "${concept.name}"?`,
            () => deleteCompletedConcept(concept.id)
        );
    });
    
    return card;
}

/**
 * Create a concept card element
 * @param {object} concept 
 * @param {number} index - Index for staggered animation
 */
function createConceptCard(concept, index = 0) {
    const card = document.createElement('div');
    card.className = `concept-card status-${concept.status}`;
    card.dataset.conceptId = concept.id;
    card.dataset.status = concept.status;
    card.style.animationDelay = `${index * 0.05}s`;
    
    const imageCount = concept.images ? concept.images.length : 0;
    const imageBadge = imageCount > 0 ? `<span class="image-badge">${imageCount}</span>` : '';
    
    card.innerHTML = `
        <div class="concept-header">
            <span class="concept-name">${escapeHtml(concept.name)}</span>
            <div class="concept-actions">
                <button class="btn btn-secondary btn-sm attach-image-btn" title="Attach photos/notes">📷${imageBadge}</button>
                <button class="complete-btn" title="Mark as completed">✓ Mark Complete</button>
                <button class="btn btn-secondary btn-sm edit-name-btn" title="Edit name">✏️</button>
                <button class="btn btn-danger btn-sm delete-concept-btn" title="Delete">🗑️</button>
            </div>
        </div>
        <div class="concept-details">
            <div class="concept-detail">
                <label>Status:</label>
                <select class="status-select">
                    <option value="not-started" ${concept.status === 'not-started' ? 'selected' : ''}>Not Started</option>
                    <option value="learning" ${concept.status === 'learning' ? 'selected' : ''}>Learning</option>
                    <option value="need-revision" ${concept.status === 'need-revision' ? 'selected' : ''}>Need Revision</option>
                    <option value="confident" ${concept.status === 'confident' ? 'selected' : ''}>Confident</option>
                </select>
            </div>
            <div class="concept-detail">
                <label>Last Revised:</label>
                <input type="date" class="date-input" value="${concept.lastRevised || ''}" max="${getTodayString()}">
                <button class="btn btn-success btn-sm set-today-btn">Today</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const attachImageBtn = card.querySelector('.attach-image-btn');
    attachImageBtn.addEventListener('click', () => {
        openImageModal(concept.id, concept.name);
    });
    
    const completeBtn = card.querySelector('.complete-btn');
    completeBtn.addEventListener('click', () => {
        completeConcept(concept.id);
    });
    
    const statusSelect = card.querySelector('.status-select');
    statusSelect.addEventListener('change', (e) => {
        updateConceptStatus(concept.id, e.target.value);
    });
    
    const dateInput = card.querySelector('.date-input');
    dateInput.addEventListener('change', (e) => {
        updateConceptDate(concept.id, e.target.value);
    });
    
    const setTodayBtn = card.querySelector('.set-today-btn');
    setTodayBtn.addEventListener('click', () => {
        setConceptRevisedToday(concept.id);
    });
    
    const editNameBtn = card.querySelector('.edit-name-btn');
    editNameBtn.addEventListener('click', () => {
        showConceptNameEditor(card, concept);
    });
    
    const deleteBtn = card.querySelector('.delete-concept-btn');
    deleteBtn.addEventListener('click', () => {
        showConfirmModal(
            'Delete Concept',
            `Are you sure you want to delete "${concept.name}"?`,
            () => deleteConcept(concept.id)
        );
    });
    
    return card;
}

/**
 * Show inline editor for concept name
 */
function showConceptNameEditor(card, concept) {
    const nameSpan = card.querySelector('.concept-name');
    const currentName = concept.name;
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'concept-name-input';
    input.value = currentName;
    input.maxLength = 100;
    
    // Replace span with input
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
    
    // Handle save on Enter or blur
    const saveName = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            if (updateConceptName(concept.id, newName)) {
                // Success - will re-render
            } else {
                // Failed - restore original
                renderConceptsList();
            }
        } else {
            // No change or empty - restore
            renderConceptsList();
        }
    };
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveName();
        } else if (e.key === 'Escape') {
            renderConceptsList();
        }
    });
    
    input.addEventListener('blur', saveName);
}

// ==================== Toast Notification ====================

/**
 * Show a toast notification
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'warning'
 */
function showToast(message, type = 'success') {
    const toast = elements.toast;
    const toastMessage = elements.toastMessage;
    
    toastMessage.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ==================== Confirmation Modal ====================

let modalCallback = null;

/**
 * Show the confirmation modal
 * @param {string} title 
 * @param {string} message 
 * @param {function} onConfirm - Callback when confirmed
 */
function showConfirmModal(title, message, onConfirm) {
    elements.modalTitle.textContent = title;
    elements.modalMessage.textContent = message;
    modalCallback = onConfirm;
    elements.confirmModal.classList.remove('hidden');
}

/**
 * Hide the confirmation modal
 */
function hideConfirmModal() {
    elements.confirmModal.classList.add('hidden');
    modalCallback = null;
}

// ==================== HTML Escaping ====================

/**
 * Escape HTML to prevent XSS
 * @param {string} text 
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Event Listeners Setup ====================

function setupEventListeners() {
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Add Subject button
    elements.addSubjectBtn.addEventListener('click', () => {
        elements.addSubjectForm.classList.remove('hidden');
        elements.newSubjectInput.value = '';
        elements.newSubjectInput.focus();
    });
    
    // Save Subject button
    elements.saveSubjectBtn.addEventListener('click', () => {
        const selectedColor = document.querySelector('input[name="subjectColor"]:checked')?.value || '#6366f1';
        if (addSubject(elements.newSubjectInput.value, selectedColor)) {
            elements.addSubjectForm.classList.add('hidden');
            elements.newSubjectInput.value = '';
            // Reset color selection to first option
            document.getElementById('color1').checked = true;
        }
    });
    
    // Cancel Add Subject
    elements.cancelSubjectBtn.addEventListener('click', () => {
        elements.addSubjectForm.classList.add('hidden');
        elements.newSubjectInput.value = '';
    });
    
    // Enter key on new subject input
    elements.newSubjectInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            elements.saveSubjectBtn.click();
        } else if (e.key === 'Escape') {
            elements.cancelSubjectBtn.click();
        }
    });
    
    // Reset Data button
    elements.resetDataBtn.addEventListener('click', () => {
        showConfirmModal(
            '⚠️ Reset All Data',
            'This will permanently delete all your subjects and concepts. This action cannot be undone!',
            resetAllData
        );
    });
    
    // Rename Subject button
    elements.renameSubjectBtn.addEventListener('click', () => {
        const subject = getSelectedSubject();
        if (!subject) return;
        
        elements.renameSubjectForm.classList.remove('hidden');
        elements.renameSubjectInput.value = subject.name;
        elements.renameSubjectInput.focus();
        elements.renameSubjectInput.select();
    });
    
    // Save Rename button
    elements.saveRenameBtn.addEventListener('click', () => {
        if (renameSubject(appState.selectedSubjectId, elements.renameSubjectInput.value)) {
            elements.renameSubjectForm.classList.add('hidden');
        }
    });
    
    // Cancel Rename button
    elements.cancelRenameBtn.addEventListener('click', () => {
        elements.renameSubjectForm.classList.add('hidden');
    });
    
    // Enter key on rename input
    elements.renameSubjectInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            elements.saveRenameBtn.click();
        } else if (e.key === 'Escape') {
            elements.cancelRenameBtn.click();
        }
    });
    
    // Delete Subject button
    elements.deleteSubjectBtn.addEventListener('click', () => {
        const subject = getSelectedSubject();
        if (!subject) return;
        
        showConfirmModal(
            'Delete Subject',
            `Are you sure you want to delete "${subject.name}" and all its concepts?`,
            () => deleteSubject(subject.id)
        );
    });
    
    // Add Concept button
    elements.addConceptBtn.addEventListener('click', () => {
        if (addConcept(elements.newConceptName.value, elements.newConceptStatus.value)) {
            elements.newConceptName.value = '';
            elements.newConceptStatus.value = 'not-started';
        }
    });
    
    // Enter key on new concept input
    elements.newConceptName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            elements.addConceptBtn.click();
        }
    });
    
    // Filter change (dropdown)
    elements.statusFilter.addEventListener('change', () => {
        // Sync quick filter buttons with dropdown
        syncQuickFiltersWithDropdown();
        renderConceptsList();
    });
    
    // Quick filter buttons
    if (elements.quickFilters) {
        elements.quickFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-filter-btn');
            if (!btn) return;
            
            const filter = btn.dataset.filter;
            
            // Update active state on buttons
            elements.quickFilters.querySelectorAll('.quick-filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            
            // Sync with dropdown filter
            elements.statusFilter.value = filter;
            
            // Re-render concepts
            renderConceptsList();
        });
    }
    
    // Sort change
    elements.sortBy.addEventListener('change', renderConceptsList);
    
    // Toggle completed section
    if (elements.toggleCompletedBtn) {
        elements.toggleCompletedBtn.addEventListener('click', toggleCompletedSection);
    }
    if (elements.completedHeader) {
        elements.completedHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking on the toggle button itself (it has its own handler)
            if (!e.target.closest('.toggle-completed-btn')) {
                toggleCompletedSection();
            }
        });
    }
    
    // Modal Confirm button
    elements.modalConfirmBtn.addEventListener('click', () => {
        if (modalCallback) {
            modalCallback();
        }
        hideConfirmModal();
    });
    
    // Modal Cancel button
    elements.modalCancelBtn.addEventListener('click', hideConfirmModal);
    
    // Close modal on overlay click
    elements.confirmModal.addEventListener('click', (e) => {
        if (e.target === elements.confirmModal) {
            hideConfirmModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.confirmModal.classList.contains('hidden')) {
            hideConfirmModal();
        }
    });
}

// ==================== Mobile Navigation ====================

/**
 * Toggle mobile sidebar visibility
 */
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent body scroll when sidebar is open
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

/**
 * Close mobile sidebar
 */
function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Go back to home (deselect subject)
 */
function goBackToHome() {
    appState.selectedSubjectId = null;
    saveToStorage();
    renderApp();
}

/**
 * Setup mobile navigation event listeners
 */
function setupMobileNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    
    // Mobile menu button
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }
    
    // Overlay click to close sidebar
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }
    
    // Sidebar close button
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
    }
    
    // Back button
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', goBackToHome);
    }
}

// ==================== Initialization ====================

/**
 * Initialize the application
 */
function init() {
    // Initialize theme first (before content renders)
    initTheme();
    
    // Load data from localStorage
    appState = loadFromStorage();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup mobile navigation
    setupMobileNavigation();
    
    // Initial render
    renderApp();

    // Initialize streak
    initStreak();
}

// ==================== Study Streak ====================

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

function loadStreak() {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastActivity: null, streak: 0, warningDismissed: false };
    try {
        return JSON.parse(raw);
    } catch {
        return { lastActivity: null, streak: 0, warningDismissed: false };
    }
}

function saveStreak(data) {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

function hoursSince(timestamp) {
    const now = Date.now();
    return (now - timestamp) / (1000 * 60 * 60);
}

function updateStreakUI(streak) {
    if (elements.streakCount) {
        elements.streakCount.textContent = String(streak);
    }
}

function checkStreakBreak() {
    const data = loadStreak();
    
    if (!data.lastActivity) {
        return { broken: false, warning: false };
    }
    
    const hours = hoursSince(data.lastActivity);
    
    // Streak breaks after 24 hours of inactivity
    if (hours >= 24) {
        return { broken: true, warning: false };
    }
    
    // Show warning between 20-24 hours of inactivity
    if (hours >= 20 && hours < 24) {
        return { broken: false, warning: true };
    }
    
    return { broken: false, warning: false };
}

function showStreakWarning() {
    if (!elements.streakWarning) return;
    
    const data = loadStreak();
    if (data.warningDismissed) return;
    
    elements.streakWarning.classList.remove('hidden');
    
    // Send browser notification
    sendStreakWarningNotification();
}

function hideStreakWarning() {
    if (!elements.streakWarning) return;
    elements.streakWarning.classList.add('hidden');
}

function dismissStreakWarning() {
    const data = loadStreak();
    data.warningDismissed = true;
    saveStreak(data);
    hideStreakWarning();
}

function sendStreakWarningNotification() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    const data = loadStreak();
    const hours = hoursSince(data.lastActivity);
    const hoursLeft = Math.max(0, Math.ceil(24 - hours));
    
    new Notification('⚠️ Streak Alert - StudyFlow', {
        body: `You have ${hoursLeft} hour(s) left to keep your ${data.streak}-day streak! Add or revise a concept now.`,
        icon: 'android-chrome-192x192.png',
        tag: 'streak-warning',
        requireInteraction: true
    });
}

function sendStreakBrokenNotification() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    new Notification('💔 Streak Broken - StudyFlow', {
        body: 'Your study streak has been reset due to 24 hours of inactivity. Start fresh today!',
        icon: 'android-chrome-192x192.png',
        tag: 'streak-broken'
    });
}

function recordActivity() {
    const data = loadStreak();
    const status = checkStreakBreak();
    
    if (status.broken) {
        // Streak was broken, reset to 1
        data.streak = 1;
        data.lastActivity = Date.now();
        data.warningDismissed = false;
        saveStreak(data);
        updateStreakUI(1);
        hideStreakWarning();
        sendStreakBrokenNotification();
        showToast('💔 Streak reset. Let\'s start fresh!', 'warning');
    } else {
        // Check if this is a new activity that continues the streak
        if (!data.lastActivity) {
            // First time
            data.streak = 1;
        } else {
            const hours = hoursSince(data.lastActivity);
            // If more than 1 hour since last activity, it counts as keeping streak alive
            if (hours >= 1) {
                data.streak += 1;
                showToast(`🔥 Streak continued! Day ${data.streak}`, 'success');
            }
        }
        
        data.lastActivity = Date.now();
        data.warningDismissed = false;
        saveStreak(data);
        updateStreakUI(data.streak);
        hideStreakWarning();
    }
}

function initStreak() {
    if (!elements.streakCount) return;
    
    const data = loadStreak();
    const status = checkStreakBreak();
    
    if (status.broken && data.streak > 0) {
        // Streak was broken while user was away
        data.streak = 0;
        data.lastActivity = null;
        data.warningDismissed = false;
        saveStreak(data);
        updateStreakUI(0);
        sendStreakBrokenNotification();
        showToast('Your streak was reset due to inactivity', 'warning');
    } else if (status.warning) {
        // Show warning
        showStreakWarning();
    }
    
    updateStreakUI(data.streak);
    
    // Set up dismiss button
    if (elements.dismissWarningBtn) {
        elements.dismissWarningBtn.addEventListener('click', dismissStreakWarning);
    }
    
    // Check periodically (every 5 minutes)
    setInterval(() => {
        const currentStatus = checkStreakBreak();
        if (currentStatus.warning && !loadStreak().warningDismissed) {
            showStreakWarning();
        }
    }, 5 * 60 * 1000);
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

/*
 * ==================== Future Enhancement Ideas ====================
 * 
 * 1. Dark Mode Toggle
 *    - Add a toggle button in the header
 *    - Store preference in localStorage
 *    - Use CSS custom properties to switch color schemes
 * 
 * 2. Export/Import Data as JSON
 *    - Add "Export" button to download all data as JSON file
 *    - Add "Import" button to upload and restore from JSON
 *    - Useful for backup or transferring between devices
 * 
 * 3. Highlight Stale Concepts
 *    - Show visual indicator for concepts not revised in X days
 *    - Could add a "Days since revision" column
 *    - Highlight in orange/red based on staleness
 * 
 * 4. Spaced Repetition Suggestions
 *    - Based on last revised date, suggest which concepts to review
 *    - Implement a simple spaced repetition algorithm
 * 
 * 5. Search Functionality
 *    - Add global search to find concepts across all subjects
 *    - Quick navigation to specific concepts
 * 
 * 6. Keyboard Shortcuts
 *    - Add shortcuts for common actions (add subject, add concept, etc.)
 *    - Show shortcut hints in tooltips
 * 
 * 7. Drag and Drop Reordering
 *    - Allow reordering subjects and concepts via drag and drop
 *    - More intuitive organization
 * 
 * 
 * 9. Notes for Each Concept
 *    - Add optional notes/description field for concepts
 *    - Could include links to resources
 * 
 * 10. PWA Support
 *     - Add service worker for offline support
 *     - Add manifest for installability
 *     - Works as a native app on mobile
 */

// ==================== Image Attachment Feature ====================

let currentImageConceptId = null;

/**
 * Open the image modal for a concept
 */
function openImageModal(conceptId, conceptName) {
    currentImageConceptId = conceptId;
    const modal = document.getElementById('imageModal');
    const title = document.getElementById('imageModalTitle');
    
    title.textContent = `📷 Notes for: ${conceptName}`;
    modal.classList.remove('hidden');
    
    renderImageGallery();
}

/**
 * Close the image modal
 */
function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
    currentImageConceptId = null;
}

/**
 * Render the image gallery for the current concept
 */
function renderImageGallery() {
    const gallery = document.getElementById('imageGallery');
    const concept = getConceptById(currentImageConceptId);
    
    if (!concept || !concept.images || concept.images.length === 0) {
        gallery.innerHTML = '<p class="empty-gallery">📭 No photos attached yet. Add photos of your notes!</p>';
        return;
    }
    
    gallery.innerHTML = concept.images.map((img, index) => `
        <div class="gallery-item" data-index="${index}">
            <img src="${img.data}" alt="Note ${index + 1}" onclick="viewImage(${index})">
            <div class="gallery-item-actions">
                <button class="btn btn-danger btn-sm delete-image-btn" onclick="deleteImage(${index})">🗑️</button>
            </div>
            <span class="gallery-item-date">${formatDate(img.addedAt)}</span>
        </div>
    `).join('');
}

/**
 * Add images to the current concept
 */
function addImagesToConceptHandler(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const concept = getConceptById(currentImageConceptId);
    if (!concept) return;
    
    // Initialize images array if it doesn't exist
    if (!concept.images) {
        concept.images = [];
    }
    
    let loadedCount = 0;
    const totalFiles = files.length;
    
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            showToast('Please select only image files.', 'warning');
            return;
        }
        
        // Check file size (max 2MB per image to avoid localStorage limits)
        if (file.size > 2 * 1024 * 1024) {
            showToast(`Image "${file.name}" is too large. Max 2MB per image.`, 'warning');
            loadedCount++;
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            concept.images.push({
                data: e.target.result,
                addedAt: new Date().toISOString(),
                name: file.name
            });
            
            loadedCount++;
            
            if (loadedCount === totalFiles) {
                saveToStorage();
                renderImageGallery();
                renderConceptsList(); // Update badge count
                showToast(`${concept.images.length === 1 ? 'Photo' : 'Photos'} added!`, 'success');
            }
        };
        reader.readAsDataURL(file);
    });
    
    // Reset input
    event.target.value = '';
}

/**
 * Delete an image from the current concept
 */
function deleteImage(index) {
    const concept = getConceptById(currentImageConceptId);
    if (!concept || !concept.images) return;
    
    showConfirmModal(
        'Delete Photo',
        'Are you sure you want to delete this photo?',
        () => {
            concept.images.splice(index, 1);
            saveToStorage();
            renderImageGallery();
            renderConceptsList(); // Update badge count
            showToast('Photo deleted.', 'success');
        }
    );
}

/**
 * View an image in full screen
 */
function viewImage(index) {
    const concept = getConceptById(currentImageConceptId);
    if (!concept || !concept.images || !concept.images[index]) return;
    
    const viewerModal = document.getElementById('imageViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    
    viewerImage.src = concept.images[index].data;
    viewerModal.classList.remove('hidden');
}

/**
 * Close the image viewer
 */
function closeImageViewer() {
    document.getElementById('imageViewerModal').classList.add('hidden');
}

// ==================== Application Initialization ====================

// Setup image modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Close image modal
        document.getElementById('closeImageModalBtn')?.addEventListener('click', closeImageModal);
        
        // Add image button
        document.getElementById('addImageBtn')?.addEventListener('click', () => {
            document.getElementById('imageUploadInput')?.click();
        });
        
        // Image upload input
        document.getElementById('imageUploadInput')?.addEventListener('change', addImagesToConceptHandler);
        
        // Close image viewer
        document.getElementById('closeImageViewerBtn')?.addEventListener('click', closeImageViewer);
        
        // Close viewer on overlay click
        document.getElementById('imageViewerModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'imageViewerModal') {
                closeImageViewer();
            }
        });
        
        // Close image modal on overlay click
        document.getElementById('imageModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'imageModal') {
                closeImageModal();
            }
        });
        
        // Initialize features
        try {
            initNotifications();
        } catch (error) {
            // Notifications failed, continue
        }
        
        try {
            initTimetable();
        } catch (error) {
            // Timetable failed, continue
        }
        
        // Add error recovery
        window.addEventListener('error', (e) => {
            showToast('⚠️ An error occurred. Please refresh if issues persist.', 'error');
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            // Log silently
        });
        
    } catch (error) {
        showToast('❌ Failed to initialize app. Please refresh the page.', 'error');
    }
});


// ==================== Notifications System ====================

function initNotifications() {
    // Notifications for study reminders
    // Request permission if not already granted
    if ('Notification' in window && Notification.permission !== 'granted') {
        requestNotificationPermission();
    }

    // Schedule daily revision reminder at 7:00 PM
    scheduleStudyReminder('19:00', "Hey! Let's revise your concepts today in StudyFlow.");

    // Schedule daily timetable planning reminder at 8:00 AM
    scheduleStudyReminder('08:00', "Plan your study timetable for today in StudyFlow!");
}

function openNotificationSettings() {
    requestNotificationPermission();
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Browser does not support notifications', 'error');
        return;
    }
    
    if (Notification.permission === 'granted') {
        showToast('🔔 Notifications already enabled!', 'success');
        return;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('✅ Notifications enabled!', 'success');
            new Notification('StudyFlow Notifications', {
                body: 'You\'ll now receive study reminders!',
                icon: 'android-chrome-192x192.png'
            });
        }
    }
}

function scheduleStudyReminder(time, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Calculate time until reminder
        const now = new Date();
        const [hours, minutes] = time.split(':');
        const reminderTime = new Date();
        reminderTime.setHours(parseInt(hours), parseInt(minutes), 0);
        
        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        const timeUntil = reminderTime - now;
        
        setTimeout(() => {
            new Notification('📚 StudyFlow Reminder', {
                body: message,
                icon: 'android-chrome-192x192.png',
                badge: 'android-chrome-192x192.png',
                requireInteraction: true
            });
            
            // Reschedule for next day
            scheduleStudyReminder(time, message);
        }, timeUntil);
        
        showToast(`⏰ Reminder set for ${time}`, 'success');
    }
}

// ==================== Timetable Feature ====================

const TIMETABLE_KEY = 'studyFlowTimetable';

/**
 * Initialize the timetable feature
 */
function initTimetable() {
    const timetableBtn = document.getElementById('timetableBtn');
    const closeTimetableBtn = document.getElementById('closeTimetableBtn');
    const addTimetableBtn = document.getElementById('addTimetableBtn');
    const timetableModal = document.getElementById('timetableModal');
    
    timetableBtn?.addEventListener('click', () => {
        timetableModal.classList.remove('hidden');
        renderTimetable();
    });
    
    closeTimetableBtn?.addEventListener('click', () => {
        timetableModal.classList.add('hidden');
    });
    
    timetableModal?.addEventListener('click', (e) => {
        if (e.target.id === 'timetableModal') {
            timetableModal.classList.add('hidden');
        }
    });
    
    addTimetableBtn?.addEventListener('click', addTimetableEntry);
    
    // Enter key on inputs
    ['timetableDay', 'timetableTime', 'timetableTask', 'timetableDuration'].forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTimetableEntry();
        });
    });
}

/**
 * Get timetable from storage
 */
function getTimetable() {
    try {
        const data = localStorage.getItem(TIMETABLE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Save timetable to storage
 */
function saveTimetable(timetable) {
    localStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetable));
}

/**
 * Add a timetable entry
 */
function addTimetableEntry() {
    const dayInput = document.getElementById('timetableDay');
    const timeInput = document.getElementById('timetableTime');
    const taskInput = document.getElementById('timetableTask');
    const durationInput = document.getElementById('timetableDuration');
    
    const day = dayInput.value.trim();
    const time = timeInput.value;
    const task = taskInput.value.trim();
    const duration = parseInt(durationInput.value) || 0;
    
    if (!day || !time || !task) {
        showToast('Please fill in day, time, and task.', 'warning');
        return;
    }
    
    const timetable = getTimetable();
    timetable.push({
        id: generateId(),
        day,
        time,
        task,
        duration
    });
    
    // Sort by day and time
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    timetable.sort((a, b) => {
        const dayA = dayOrder.indexOf(a.day.toLowerCase());
        const dayB = dayOrder.indexOf(b.day.toLowerCase());
        if (dayA !== dayB) return dayA - dayB;
        return a.time.localeCompare(b.time);
    });
    
    saveTimetable(timetable);
    renderTimetable();
    
    // Clear inputs
    dayInput.value = '';
    timeInput.value = '';
    taskInput.value = '';
    durationInput.value = '';
    dayInput.focus();
    
    showToast('📅 Schedule added!', 'success');
}

/**
 * Delete a timetable entry
 */
function deleteTimetableEntry(id) {
    const timetable = getTimetable().filter(entry => entry.id !== id);
    saveTimetable(timetable);
    renderTimetable();
    showToast('Schedule entry removed.', 'success');
}

/**
 * Render the timetable
 */
function renderTimetable() {
    const list = document.getElementById('timetableList');
    const emptyMessage = document.getElementById('noTimetableMessage');
    const timetable = getTimetable();
    
    if (!list) return;
    
    if (timetable.length === 0) {
        list.innerHTML = '';
        emptyMessage?.classList.remove('hidden');
        return;
    }
    
    emptyMessage?.classList.add('hidden');
    
    list.innerHTML = timetable.map(entry => `
        <div class="timetable-entry" data-id="${entry.id}">
            <span class="entry-day">${escapeHtml(entry.day)}</span>
            <span class="entry-time">${entry.time}</span>
            <span class="entry-task">${escapeHtml(entry.task)}</span>
            ${entry.duration ? `<span class="entry-duration">${entry.duration} min</span>` : ''}
            <button class="btn btn-danger btn-sm delete-entry-btn" onclick="deleteTimetableEntry('${entry.id}')">🗑️</button>
        </div>
    `).join('');
}
