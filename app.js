// CineTrack Application State
let watchlist = JSON.parse(localStorage.getItem('cinetrack-watchlist')) || [];

// 1. Select the HTML elements we need to manipulate
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsGrid = document.getElementById('results-grid');
const resultsHeading = document.getElementById('results-heading');
const watchlistGrid = document.getElementById('watchlist-grid');
const watchlistCount = document.getElementById('watchlist-count');
const watchlistEmpty = document.getElementById('watchlist-empty');
const movieModal = document.getElementById('movie-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDetailsBody = document.getElementById('modal-details-body');

// NEW: Variable to hold our active debounce timer (the elevator door control)
let searchTimeout;

// Initialize the saved watchlist sidebar on startup
renderWatchlist();

// 2. Set up event listeners
searchBtn.addEventListener('click', () => {
    // Manual search override on button click
    handleSearch(searchInput.value.trim());
});

searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        clearTimeout(searchTimeout); // Kill any pending timer
        handleSearch(searchInput.value.trim()); // Execute immediately
    }
});

// NEW EVENT LISTENER: This handles the automated "Search-as-you-Type" flow
searchInput.addEventListener('input', () => {
    // Stop the previous countdown immediately because the user is still typing!
    clearTimeout(searchTimeout);

    const query = searchInput.value.trim();

    // If the input is empty, reset the results area back to its welcoming starting state
    if (query === '') {
        resetSearchResults();
        return;
    }

    // Start a fresh 500ms countdown. If 500ms passes without a new input event, run handleSearch.
    searchTimeout = setTimeout(() => {
        handleSearch(query);
    }, 500);
});

// Helper to reset the search results view when the search input is cleared
function resetSearchResults() {
    resultsHeading.textContent = 'Search Results';
    resultsGrid.innerHTML = `
        <div class="initial-state">
            <p>Your search results will appear here. Try searching for a show above!</p>
        </div>
    `;
}

// 3. Asynchronous handler to look up shows via the keyless TVMaze API
async function handleSearch(query) {
    if (!query || query === '') return;

    try {
        // Display loading state
        resultsGrid.innerHTML = `
            <div class="initial-state">
                <p>Searching movie database for "${query}"... 🍿</p>
            </div>
        `;
        resultsHeading.textContent = `Search Results for "${query}"`;

        const apiUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error('Failed to fetch data from the cinematic database.');

        const results = await response.json();
        renderSearchResults(results);

    } catch (error) {
        resultsGrid.innerHTML = `
            <div class="initial-state">
                <p style="color: #e50914;">Error: ${error.message}</p>
            </div>
        `;
    }
    // Notice: We removed "searchInput.value = ''" from the finally block! 
    // This allows users to keep seeing what they typed while looking at their results.
}

//  PASTE THIS UPDATED BLOCK INSTEAD:
// 4. Overwrite Search Grid with newly fetched API elements
function renderSearchResults(results) {
    resultsGrid.innerHTML = '';

    if (results.length === 0) {
        resultsGrid.innerHTML = `
            <div class="initial-state">
                <p>No titles found matching that search. Try another query!</p>
            </div>
        `;
        return;
    }

    results.forEach(item => {
        const show = item.show;
        
        // Formulate fallback placeholders if rating, image or year is null
        const posterUrl = show.image 
            ? show.image.medium 
            : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop';
        
        const releaseYear = show.premiered 
            ? show.premiered.split('-') 
            : 'N/A';
            
        const ratingScore = show.rating && show.rating.average 
            ? `⭐ ${show.rating.average}` 
            : '⭐ N/A';

        const isAdded = watchlist.some(fav => fav.id === show.id);

        // Build Card Element
        const card = document.createElement('div');
        card.className = 'movie-card';

        card.innerHTML = `
            <!-- Clickable poster wrapper with added modal hook class -->
            <div class="movie-poster-wrapper clickable-target">
                <img src="${posterUrl}" alt="${show.name}" class="movie-poster" loading="lazy">
            </div>
            <div class="movie-info">
                <!-- Clickable title with added modal hook class -->
                <h3 class="movie-title clickable-target" title="${show.name}">${show.name}</h3>
                <div class="movie-meta">
                    <span class="movie-year">${releaseYear}</span>
                    <span class="movie-rating">${ratingScore}</span>
                </div>
                <button class="movie-btn" data-id="${show.id}">Add to Watchlist +</button>
            </div>
        `;

        // Configure the Action button state
        const actionBtn = card.querySelector('.movie-btn');
        if (isAdded) {
            setButtonToAdded(actionBtn);
        } else {
            actionBtn.addEventListener('click', () => {
                addToWatchlist(show, actionBtn);
            });
        }

        // NEW MODAL BINDING: Targets both the poster wrapper and title text
        const clickableElements = card.querySelectorAll('.clickable-target');
        clickableElements.forEach(element => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => {
                openModal(show);
            });
        });

        resultsGrid.appendChild(card);
    });
}

// Helper to transition button styling to an active 'added' state
function setButtonToAdded(btn) {
    btn.textContent = 'Added to Watchlist ✓';
    btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    btn.style.color = '#888888';
    btn.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    btn.style.cursor = 'default';
}

// 5. Append a movie record to local storage state
function addToWatchlist(show, btn) {
    if (watchlist.some(item => item.id === show.id)) return;

    const posterUrl = show.image 
        ? show.image.medium 
        : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=150&auto=format&fit=crop';

    const releaseYear = show.premiered 
        ? show.premiered.split('-') 
        : 'N/A';

    const ratingScore = show.rating && show.rating.average 
        ? `⭐ ${show.rating.average}` 
        : '⭐ N/A';

    const newWatchlistItem = {
        id: show.id,
        name: show.name,
        year: releaseYear,
        rating: ratingScore,
        poster: posterUrl
    };

    watchlist.push(newWatchlistItem);
    saveAndSync();
    setButtonToAdded(btn);
}

// 6. Delete a movie record from local storage state
function removeFromWatchlist(id) {
    watchlist = watchlist.filter(item => item.id !== id);
    saveAndSync();

    // Re-enable target card button in active search grid if it exists
    const searchCardBtn = document.querySelector(`.movie-btn[data-id="${id}"]`);
    if (searchCardBtn) {
        searchCardBtn.textContent = 'Add to Watchlist +';
        searchCardBtn.style.borderColor = '#e50914';
        searchCardBtn.style.color = '#ffffff';
        searchCardBtn.style.backgroundColor = 'transparent';
        searchCardBtn.style.cursor = 'pointer';
        
        // Re-attach fresh click handler since it was disabled
        searchCardBtn.replaceWith(searchCardBtn.cloneNode(true));
        
        const refreshedBtn = document.querySelector(`.movie-btn[data-id="${id}"]`);
        refreshedBtn.addEventListener('click', () => {
            const targetQueryItem = {
                id: id,
                name: refreshedBtn.closest('.movie-info').querySelector('.movie-title').textContent,
                premiered: refreshedBtn.closest('.movie-info').querySelector('.movie-year').textContent,
                rating: { average: refreshedBtn.closest('.movie-info').querySelector('.movie-rating').textContent.replace('⭐ ', '') },
                image: { medium: refreshedBtn.closest('.movie-card').querySelector('.movie-poster').src }
            };
            addToWatchlist(targetQueryItem, refreshedBtn);
        });
    }
}

// 7. Write to LocalStorage & re-render layouts
function saveAndSync() {
    localStorage.setItem('cinetrack-watchlist', JSON.stringify(watchlist));
    renderWatchlist();
}

// 8. Dynamic DOM generation for Watchlist container (Sidebar)
function renderWatchlist() {
    watchlistGrid.innerHTML = '';
    watchlistCount.textContent = watchlist.length;

    if (watchlist.length === 0) {
        watchlistEmpty.style.display = 'block';
        return;
    }

    watchlistEmpty.style.display = 'none';

    watchlist.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'watchlist-item';

        itemElement.innerHTML = `
            <img src="${item.poster}" alt="${item.name}" class="watchlist-poster">
            <div class="watchlist-info">
                <h4 class="watchlist-title" title="${item.name}">${item.name}</h4>
                <div class="watchlist-meta">${item.year} | ${item.rating}</div>
            </div>
            <button class="remove-btn" title="Remove from Watchlist">&times;</button>
        `;

        const deleteButton = itemElement.querySelector('.remove-btn');
        deleteButton.addEventListener('click', () => {
            removeFromWatchlist(item.id);
        });

        watchlistGrid.appendChild(itemElement);
    });
}
// ==========================================================================
// DETAILED MODAL EVENT HANDLERS
// ==========================================================================

// Function to construct the modal body layout dynamically
function openModal(show) {
    // A) Fallback checks
    const posterUrl = show.image 
        ? show.image.original 
        : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop';
    
    const releaseYear = show.premiered ? show.premiered.split('-') : 'N/A';
    const ratingScore = show.rating && show.rating.average ? `⭐ ${show.rating.average}` : '⭐ N/A';
    
    // B) Map genres into styled pill tags
    const genresHTML = show.genres && show.genres.length > 0
        ? show.genres.map(genre => `<span class="genre-pill">${genre}</span>`).join('')
        : '<span class="genre-pill">N/A</span>';

    const summaryText = show.summary || '<p>No cinematic plot description available for this show.</p>';

    // C) Populate HTML content
    modalDetailsBody.innerHTML = `
        <div class="modal-body-layout">
            <img src="${posterUrl}" alt="${show.name}" class="modal-poster">
            <div class="modal-text">
                <h2 class="modal-title">${show.name}</h2>
                <div class="modal-info-row">
                    <span><strong>Year:</strong> ${releaseYear}</span> | 
                    <span><strong>Rating:</strong> ${ratingScore}</span>
                </div>
                <div class="modal-genres">
                    ${genresHTML}
                </div>
                <div class="modal-summary">${summaryText}</div>
                ${show.officialSite ? `<a href="${show.officialSite}" target="_blank" class="modal-link-btn">Official Website ↗</a>` : ''}
            </div>
        </div>
    `;

    // D) Show the overlay
    movieModal.classList.add('show');
}

// Function to close modal
function closeModal() {
    movieModal.classList.remove('show');
}

// Event Listeners for closing actions
closeModalBtn.addEventListener('click', closeModal);

// Close modal if user clicks on the semi-transparent overlay surrounding the card
movieModal.addEventListener('click', (event) => {
    if (event.target === movieModal) {
        closeModal();
    }
});

// Close modal if user presses physical Escape key on keyboard
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && movieModal.classList.contains('show')) {
        closeModal();
    }
});