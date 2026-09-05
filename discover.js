// 1. Select DOM Grid Elements
const latestGrid = document.getElementById('latest-grid');
const upcomingGrid = document.getElementById('upcoming-grid');
const movieModal = document.getElementById('movie-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDetailsBody = document.getElementById('modal-details-body');

// Initialize fetches
fetchDiscoverFeeds();

// 2. Main Coordinator Function
async function fetchDiscoverFeeds() {
    // A) Get formatted YYYY-MM-DD strings for Today and Tomorrow
    const todayStr = getFormattedDate(0);
    const tomorrowStr = getFormattedDate(1);

    // B) Fetch both feeds in parallel!
    try {
        const [latestData, upcomingData] = await Promise.all([
            fetchSchedule(todayStr),
            fetchSchedule(tomorrowStr)
        ]);

        renderFeed(latestData, latestGrid);
        renderFeed(upcomingData, upcomingGrid);
    } catch (error) {
        console.error("Error loading discover schedules:", error);
    }
}

// 3. Helper to format dates dynamically (0 = today, 1 = tomorrow, etc.)
function getFormattedDate(daysOffset) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

// 4. Async Fetcher for a single date
async function fetchSchedule(dateString) {
    const response = await fetch(`https://api.tvmaze.com/schedule?country=US&date=${dateString}`);
    if (!response.ok) throw new Error("Failed to load schedule");
    return await response.json();
}

// 5. Render list arrays to their targeted layout container
function renderFeed(scheduleItems, gridElement) {
    gridElement.innerHTML = '';

    // Slice array to show only the top 10 items so the page doesn't get cluttered
    const topItems = scheduleItems.slice(0, 10);

    if (topItems.length === 0) {
        gridElement.innerHTML = `<div class="initial-state"><p>No scheduled releases found.</p></div>`;
        return;
    }

    topItems.forEach(item => {
        const show = item.show;
        
        // Poster fallback
        const posterUrl = show.image 
            ? show.image.medium 
            : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop';
            
        const ratingScore = show.rating && show.rating.average 
            ? `⭐ ${show.rating.average}` 
            : '⭐ N/A';

        // Display the airtime and episode details as meta-text
        const airtime = item.airtime ? `🕔 ${item.airtime}` : '';
        const epInfo = `S${item.season} Ep${item.number}`;

        const card = document.createElement('div');
        card.className = 'movie-card';

        card.innerHTML = `
            <div class="movie-poster-wrapper clickable-target">
                <img src="${posterUrl}" alt="${show.name}" class="movie-poster" loading="lazy">
            </div>
            <div class="movie-info">
                <h3 class="movie-title clickable-target" title="${show.name}">${show.name}</h3>
                <div class="movie-meta">
                    <span class="movie-year">${epInfo}</span>
                    <span class="movie-rating">${airtime}</span>
                </div>
                <button class="movie-btn">View Details 🔍</button>
            </div>
        `;

        // Bind clicks to open our modal details!
        const interactiveElements = card.querySelectorAll('.clickable-target, .movie-btn');
        interactiveElements.forEach(elem => {
            elem.style.cursor = 'pointer';
            elem.addEventListener('click', () => openModal(show));
        });

        gridElement.appendChild(card);
    });
}

// 6. Dynamic Details Modal Rendering (Fully Reused logic!)
function openModal(show) {
    if (!modalDetailsBody || !movieModal) return;

    const posterUrl = show.image 
        ? show.image.original 
        : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop';
    
    const releaseYear = show.premiered ? show.premiered.split('-') : 'N/A';
    const ratingScore = show.rating && show.rating.average ? `⭐ ${show.rating.average}` : '⭐ N/A';
    
    const genresHTML = show.genres && show.genres.length > 0
        ? show.genres.map(genre => `<span class="genre-pill">${genre}</span>`).join('')
        : '<span class="genre-pill">N/A</span>';

    const summaryText = show.summary || '<p>No cinematic description available.</p>';

    modalDetailsBody.innerHTML = `
        <div class="modal-body-layout">
            <img src="${posterUrl}" alt="${show.name}" class="modal-poster">
            <div class="modal-text">
                <h2 class="modal-title">${show.name}</h2>
                <div class="modal-info-row">
                    <span><strong>Premiered:</strong> ${releaseYear}</span> | 
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

    movieModal.classList.add('show');
}

function closeModal() {
    if (movieModal) movieModal.classList.remove('show');
}

// Event Listeners for closing modal
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (movieModal) {
    movieModal.addEventListener('click', (event) => {
        if (event.target === movieModal) closeModal();
    });
}
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && movieModal && movieModal.classList.contains('show')) {
        closeModal();
    }
});