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

// Initialize the saved watchlist sidebar on startup
renderWatchlist();

// 2. Set up event listeners for Search actions
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
});

// 3. Asynchronous handler to look up shows via the keyless TVMaze API
async function handleSearch() {
    const query = searchInput.value.trim();

    if (query === '') {
        alert('Please enter a search term first!');
        return;
    }

    try {
        // Display animated loading state in results box
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
    } finally {
        // Clear input bar
        searchInput.value = '';
    }
}

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
            <div class="movie-poster-wrapper">
                <img src="${posterUrl}" alt="${show.name}" class="movie-poster" loading="lazy">
            </div>
            <div class="movie-info">
                <h3 class="movie-title" title="${show.name}">${show.name}</h3>
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
    // Escape early if item is already added
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
        
        // Bind dynamic listener again after cloning
        const refreshedBtn = document.querySelector(`.movie-btn[data-id="${id}"]`);
        refreshedBtn.addEventListener('click', () => {
            // Find current matching show in search output
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

        // Bind delete action to cross button
        const deleteButton = itemElement.querySelector('.remove-btn');
        deleteButton.addEventListener('click', () => {
            removeFromWatchlist(item.id);
        });

        watchlistGrid.appendChild(itemElement);
    });
}