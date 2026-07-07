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
const btnToggleView = document.getElementById('btn-toggle-view');

// Sélecteurs dynamiques pour le formulaire universel
const modalTitleDynamic = document.getElementById('modal-title-dynamic');
const labelTitle = document.getElementById('label-title');
const labelArtist = document.getElementById('label-artist');
const labelImage = document.getElementById('label-image');
const labelDate = document.getElementById('label-date');
const formGroupArtist = document.getElementById('form-group-artist');
const formGroupYear = document.getElementById('form-group-year');
const formGroupPlatform = document.getElementById('form-group-platform');
const formGroupDateEnd = document.getElementById('form-group-date-end');

// --- État de l'application ---
let currentCategory = 'movies'; 
let currentView = 'grid'; // Cycle des vues : 'grid' -> 'carousel' -> 'timeline'
let movies = JSON.parse(localStorage.getItem('movies')) || []; 
let pressTimer;

// --- Fonctions de Stockage & Rendu ---
function saveMovies() {
    localStorage.setItem('movies', JSON.stringify(movies));
}

function renderMovies() {
    moviesContainer.innerHTML = '';
    
    // Nettoyage et application des classes de vue fixes
    moviesContainer.classList.remove('carousel-mode', 'timeline-mode');
    if (currentView === 'carousel') {
        moviesContainer.classList.add('carousel-mode');
    } else if (currentView === 'timeline') {
        moviesContainer.classList.add('timeline-mode');
    }

    // Filtrage par catégorie
    const filteredMovies = movies.filter(movie => movie.category === currentCategory || (!movie.category && currentCategory === 'movies'));

    // Tri chronologique : le plus récent en premier (à gauche)
    filteredMovies.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredMovies.forEach((movie) => {
        const realIndex = movies.indexOf(movie);

        const perspectiveDiv = document.createElement('div');
        perspectiveDiv.className = 'card-perspective';
        
        if (movie.category === 'music') {
            perspectiveDiv.classList.add('music-card-size');
        }

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.backgroundImage = `url('${movie.image}')`;
        card.dataset.index = realIndex;

        const flare = document.createElement('div');
        flare.className = 'card-flare';
        card.appendChild(flare); 

        // --- NOUVEAU : Création des éléments réels de la Timeline ---
        const timelineLine = document.createElement('div');
        timelineLine.className = 'timeline-line';

        const timelineDot = document.createElement('div');
        timelineDot.className = 'timeline-dot';

        const dateBadge = document.createElement('span');
        dateBadge.className = 'timeline-date-badge';
        dateBadge.innerText = new Date(movie.date).toLocaleDateString('fr-FR');
        // -------------------------------------------------------------

        let isMoving = false;
        card.addEventListener('touchstart', () => { isMoving = false; }, { passive: true });
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
            if (!isMoving) { showMovieDetails(realIndex); }
        });

        // --- NOUVEL ORDRE D'IMBRICATION ---
        card.appendChild(dateBadge); // Le badge va DANS la carte pour utiliser ses dimensions
        
        perspectiveDiv.appendChild(card);
        perspectiveDiv.appendChild(timelineLine);
        perspectiveDiv.appendChild(timelineDot);
        
        moviesContainer.appendChild(perspectiveDiv);
    });

    if (currentView === 'carousel') {
        initCarouselObserver();
    } else if (window.carouselObserver) {
        window.carouselObserver.disconnect(); // Désactive l'observer si on quitte le carrousel
    }
}

// --- Calcul de l'effet 3D (Tilt) et de la LUMIÈRE sur Mobile ---
function handleTouchMove(e, card) {
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    
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

// --- Détection de la carte centrale (Focus du Carrousel) ---
function initCarouselObserver() {
    if (window.carouselObserver) window.carouselObserver.disconnect();

    const options = {
        root: moviesContainer,
        rootMargin: '0px -45% 0px -45%',
        threshold: 0
    };

    window.carouselObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active-card');
            } else {
                entry.target.classList.remove('active-card');
            }
        });
    }, options);

    const cards = moviesContainer.querySelectorAll('.card-perspective');
    cards.forEach(card => window.carouselObserver.observe(card));
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
            const angle = (visibleIndex * 30) + 180; 
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
    pressTimer = setTimeout(() => { openRadialMenu(); }, 300);
}

function cancelPress() { clearTimeout(pressTimer); }

// --- Adaptation Dynamique du Formulaire ---
function setupFormFields() {
    formGroupArtist.classList.add('hidden-field');
    formGroupYear.classList.add('hidden-field');
    formGroupPlatform.classList.add('hidden-field');
    formGroupDateEnd.classList.add('hidden-field');
    document.getElementById('artist').required = false;
    document.getElementById('year').required = false;
    document.getElementById('platform').required = false;

    if (currentCategory === 'music') {
        modalTitleDynamic.innerText = "Ajouter un album";
        labelTitle.innerText = "Titre de l'album";
        labelArtist.innerText = "Artiste";
        labelImage.innerText = "URL de la pochette (Format carré)";
        labelDate.innerText = "Date de première écoute";
        formGroupArtist.classList.remove('hidden-field');
        formGroupYear.classList.remove('hidden-field');
        document.getElementById('artist').required = true;
        document.getElementById('year').required = true;

    } else if (currentCategory === 'games') {
        modalTitleDynamic.innerText = "Ajouter un jeu vidéo";
        labelTitle.innerText = "Nom du jeu";
        labelArtist.innerText = "Développé par";
        labelImage.innerText = "URL de la cover (Format vertical Steam)";
        labelDate.innerText = "Date de début de partie";
        formGroupArtist.classList.remove('hidden-field');
        formGroupYear.classList.remove('hidden-field');
        formGroupPlatform.classList.remove('hidden-field');
        formGroupDateEnd.classList.remove('hidden-field');
        document.getElementById('artist').required = true;
        document.getElementById('year').required = true;
        document.getElementById('platform').required = true;

    } else if (currentCategory === 'books') {
        modalTitleDynamic.innerText = "Ajouter un livre";
        labelTitle.innerText = "Titre du livre";
        labelArtist.innerText = "Auteur";
        labelImage.innerText = "URL de la couverture (Format vertical)";
        labelDate.innerText = "Date de début de lecture";
        formGroupArtist.classList.remove('hidden-field');
        formGroupDateEnd.classList.remove('hidden-field');
        document.getElementById('artist').required = true;

    } else { 
        modalTitleDynamic.innerText = "Ajouter un film";
        labelTitle.innerText = "Titre";
        labelImage.innerText = "URL de l'image (Affiche)";
        labelDate.innerText = "Date de visionnage";
    }
}

// --- Gestion des Modales & Détails ---
function showMovieDetails(index) {
    const item = movies[index];
    const isMusic = item.category === 'music';
    const isGame = item.category === 'games';
    const isBook = item.category === 'books';

    movieDetailsContent.innerHTML = `
        <img src="${item.image}" style="width:100%; border-radius:12px; margin-bottom:16px; aspect-ratio: ${isMusic ? '1/1' : 'auto'}; object-fit: cover;">
        <h2>${item.title}</h2>
        
        ${isMusic ? `<p style="font-size:18px; margin: 4px 0;"><strong>Artiste :</strong> ${item.artist}</p>` : ''}
        ${isGame ? `<p style="font-size:18px; margin: 4px 0;"><strong>Développeur :</strong> ${item.artist}</p>` : ''}
        ${isBook ? `<p style="font-size:18px; margin: 4px 0;"><strong>Auteur :</strong> ${item.artist}</p>` : ''}
        ${isGame ? `<p style="font-size:16px; color:var(--accent-color); margin: 4px 0;"><strong>Plateforme :</strong> ${item.platform}</p>` : ''}
        ${(isMusic || isGame) ? `<p style="font-size:14px; color:var(--text-muted); margin-bottom: 4px;"><strong>Année :</strong> ${item.year}</p>` : ''}
        
        <p style="color:var(--accent-color); font-weight:bold; margin: 8px 0;">Note : ${item.rating}/5</p>
        
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">
            <strong>${isMusic ? 'Écouté le :' : isGame ? 'Commencé le :' : isBook ? 'Début de lecture :' : 'Vu le :'}</strong> ${new Date(item.date).toLocaleDateString('fr-FR')}
        </p>
        ${(isGame || isBook) && item.dateEnd ? `<p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;"><strong>Fini le :</strong> ${new Date(item.dateEnd).toLocaleDateString('fr-FR')}</p>` : ''}
        
        <p style="margin-bottom: 24px; line-height: 1.5;">${item.description}</p>
        <button id="btn-delete-movie" class="btn danger" style="width: 100%;">Supprimer cet élément</button>
    `;

    document.getElementById('btn-delete-movie').addEventListener('click', () => {
        if (confirm(`Voulez-vous vraiment supprimer cet élément ?`)) {
            movies.splice(index, 1);
            saveMovies();
            renderMovies();
            detailsModal.classList.add('hidden');
        }
    });

    detailsModal.classList.remove('hidden');
}

// --- Événements Formulaire ---
movieForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newItem = {
        title: document.getElementById('title').value,
        image: document.getElementById('image').value,
        rating: document.getElementById('rating').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        category: currentCategory
    };

    if (currentCategory === 'music' || currentCategory === 'games' || currentCategory === 'books') {
        newItem.artist = document.getElementById('artist').value; 
    }
    if (currentCategory === 'music' || currentCategory === 'games') {
        newItem.year = document.getElementById('year').value;
    }
    if (currentCategory === 'games') {
        newItem.platform = document.getElementById('platform').value;
    }
    if (currentCategory === 'games' || currentCategory === 'books') {
        newItem.dateEnd = document.getElementById('date-end').value;
    }

    movies.push(newItem);
    saveMovies();
    renderMovies();
    
    movieForm.reset();
    formModal.classList.add('hidden');
});

// --- Écouteurs d'Événements Globaux ---
fabMain.addEventListener('mousedown', startPress);
fabMain.addEventListener('touchstart', startPress, { passive: true });
window.addEventListener('mouseup', cancelPress);
window.addEventListener('touchend', cancelPress);

document.addEventListener('click', (e) => {
    if (!fabContainer.contains(e.target)) closeRadialMenu();
});

// Gestion cyclique de la bascule d'affichage à 3 états
btnToggleView.addEventListener('click', () => {
    if (currentView === 'grid') {
        currentView = 'carousel';
        btnToggleView.innerText = '☰';
    } else if (currentView === 'carousel') {
        currentView = 'timeline';
        btnToggleView.innerText = '⏳';
    } else {
        currentView = 'grid';
        btnToggleView.innerText = '📱';
    }
    renderMovies();
});

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
        renderMovies();
    });
});

fabAdd.addEventListener('click', () => {
    setupFormFields();
    formModal.classList.remove('hidden');
    closeRadialMenu();
});

btnCancel.addEventListener('click', () => formModal.classList.add('hidden'));
closeDetails.addEventListener('click', () => detailsModal.classList.add('hidden'));

// Initialisation au chargement
renderMovies();