// --- Sélecteurs ---
const moviesContainer = document.getElementById('movies-container');
const fabContainer = document.getElementById('fab-container');
const fabMain = document.getElementById('fab-main');
const fabAdd = document.getElementById('fab-add');
const formModal = document.getElementById('form-modal');
const detailsModal = document.getElementById('details-modal');
const movieForm = document.getElementById('movie-form');
const btnCancel = document.getElementById('btn-cancel');
const closeDetails = document.getElementById('close-details');
const movieDetailsContent = document.getElementById('movie-details-content');

// --- État de l'application ---
let currentCategory = 'movies'; // Catégorie active par défaut
let movies = JSON.parse(localStorage.getItem('movies')) || [];
let pressTimer;

// --- Fonctions de Stockage & Rendu ---
function saveMovies() {
    localStorage.setItem('movies', JSON.stringify(movies));
}

function renderMovies() {
    moviesContainer.innerHTML = '';
    
    // NOUVEAU : On filtre le tableau pour n'afficher que la catégorie active
    // (Note : On garde la condition "|| !movie.category" pour ne pas perdre vos anciens films déjà stockés)
    const filteredMovies = movies.filter(movie => movie.category === currentCategory || (!movie.category && currentCategory === 'movies'));

    filteredMovies.forEach((movie) => {
        // ATTENTION : Puisque le tableau est filtré, l'index de la boucle .forEach 
        // ne correspond plus à l'index réel dans le tableau global 'movies'.
        // On récupère donc l'index d'origine pour que la suppression et les détails fonctionnent toujours.
        const realIndex = movies.indexOf(movie);

        const perspectiveDiv = document.createElement('div');
        perspectiveDiv.className = 'card-perspective';

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.backgroundImage = `url('${movie.image}')`;
        card.dataset.index = realIndex; // Utilise l'index réel global

        const flare = document.createElement('div');
        flare.className = 'card-flare';
        card.appendChild(flare); 

        let isMoving = false;

        card.addEventListener('touchstart', () => { 
            isMoving = false; 
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault(); 
            isMoving = true;
            handleTouchMove(e, card);
        }, { passive: false });

        card.addEventListener('touchend', () => {
            resetCardTransform(card);
            setTimeout(() => { isMoving = false; }, 50);
        });
        
        card.addEventListener('click', () => {
            if (!isMoving) {
                showMovieDetails(realIndex); // Utilise l'index réel global
            }
        });

        perspectiveDiv.appendChild(card);
        moviesContainer.appendChild(perspectiveDiv);
    });
}

// --- Calcul de l'effet 3D (Tilt) et de la LUMIÈRE sur Mobile ---
function handleTouchMove(e, card) {
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    
    // Position confinée
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const boundedX = Math.max(0, Math.min(x, rect.width));
    const boundedY = Math.max(0, Math.min(y, rect.height));

    const px = (boundedX / rect.width) - 0.5;
    const py = (boundedY / rect.height) - 0.5;
    
    const maxTilt = 15; 
    const rotateX = -py * maxTilt;
    const rotateY = px * maxTilt;
    
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    card.style.boxShadow = `${-rotateY * 2}px ${rotateX * 2}px 25px rgba(0,0,0,0.6)`;

    // Gestion de la lumière (Flare)
    const flare = card.querySelector('.card-flare');
    if (flare) {
        const flareX = (boundedX / rect.width) * 100;
        const flareY = (boundedY / rect.height) * 100;
        flare.style.background = `radial-gradient(circle at ${flareX}% ${flareY}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 80%)`;

        const distanceFromCenter = Math.sqrt(Math.pow(px, 2) + Math.pow(py, 2));
        flare.style.opacity = Math.min(distanceFromCenter * 1.2, 0.6); 
    }
}

function resetCardTransform(card) {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.3)';

    const flare = card.querySelector('.card-flare');
    if (flare) {
        flare.style.opacity = '0';
    }
}

// --- Logique du Menu Radial & Appui Long ---
function openRadialMenu() {
    fabContainer.classList.add('open');
    
    const children = fabContainer.querySelectorAll('.fab-child');
    let visibleIndex = 0;

    children.forEach((child) => {
        const cat = child.dataset.cat;
        
        if (cat === currentCategory) {
            child.classList.add('hidden-cat');
            child.style.transform = 'none';
        } else {
            child.classList.remove('hidden-cat');
            
            // --- AJUSTEMENTS POUR ESPACER LES BOUTONS ---
            // On augmente l'écart à 30 degrés entre chaque bouton
            // Le premier bouton commencera à 180° (gauche parfaite)
            const angle = (visibleIndex * 30) + 180; 
            
            // On pousse le rayon à 110px (au lieu de 95px) pour les éloigner
            const radius = 110; 
            
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
            child.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            visibleIndex++;
        }
    });
}

function closeRadialMenu() {
    fabContainer.classList.remove('open');
    const children = fabContainer.querySelectorAll('.fab-child');
    children.forEach(child => {
        child.style.transform = 'translate(0, 0) scale(0)';
    });
}

function startPress(e) {
    if (e.type === 'click' && fabContainer.classList.contains('open')) return;
    
    pressTimer = setTimeout(() => {
        openRadialMenu();
    }, 300);
}

function cancelPress() {
    clearTimeout(pressTimer);
}

// --- Gestion des Modales & Détails ---
function showMovieDetails(index) {
    const movie = movies[index];
    movieDetailsContent.innerHTML = `
        <img src="${movie.image}" style="width:100%; border-radius:12px; margin-bottom:16px;">
        <h2>${movie.title}</h2>
        <p style="color:var(--accent-color); font-weight:bold; margin: 8px 0;">Note : ${movie.rating}/5</p>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Vu le : ${new Date(movie.date).toLocaleDateString('fr-FR')}</p>
        <p style="margin-bottom: 24px;">${movie.description}</p>
        
        <button id="btn-delete-movie" class="btn danger" style="width: 100%;">Supprimer ce film</button>
    `;

    // Gestion de la suppression
    const btnDelete = document.getElementById('btn-delete-movie');
    btnDelete.addEventListener('click', () => {
        if (confirm(`Voulez-vous vraiment supprimer "${movie.title}" ?`)) {
            movies.splice(index, 1);
            saveMovies();
            renderMovies();
            detailsModal.classList.add('hidden');
        }
    });

    detailsModal.classList.remove('hidden');
}

// --- Événements Formulaire ---
// --- Événements Formulaire ---
movieForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newMovie = {
        title: document.getElementById('title').value,
        image: document.getElementById('image').value,
        rating: document.getElementById('rating').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        category: currentCategory // <-- NOUVEAU : On marque l'item avec la catégorie en cours ('movies', etc.)
    };

    movies.push(newMovie);
    saveMovies();
    renderMovies();
    
    movieForm.reset();
    formModal.classList.add('hidden');
});

// --- Écouteurs d'Événements du Menu & Fenêtre ---
fabMain.addEventListener('mousedown', startPress);
fabMain.addEventListener('touchstart', startPress, { passive: true });
window.addEventListener('mouseup', cancelPress);
window.addEventListener('touchend', cancelPress);

document.addEventListener('click', (e) => {
    if (!fabContainer.contains(e.target)) {
        closeRadialMenu();
    }
});

// Changement dynamique de catégorie
// Changement dynamique de catégorie
fabContainer.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentCategory = btn.dataset.cat;
        
        const titles = { 
            movies: 'Mes Films', 
            games: 'Mes Jeux Vidéo', 
            music: 'Ma Musique', 
            books: 'Mes Livres' 
        };
        document.querySelector('header h1').innerText = titles[currentCategory];
        
        closeRadialMenu();
        renderMovies(); // <-- NOUVEAU : On rafraîchit la grille avec le nouveau filtre !
    });
});

// Actions sur les boutons du menu
fabAdd.addEventListener('click', () => {
    formModal.classList.remove('hidden');
    closeRadialMenu();
});

btnCancel.addEventListener('click', () => formModal.classList.add('hidden'));
closeDetails.addEventListener('click', () => detailsModal.classList.add('hidden'));

// Initialisation au chargement
renderMovies();