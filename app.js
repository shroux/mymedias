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
let currentView = 'grid'; // 'grid' ou 'carousel'
let movies = JSON.parse(localStorage.getItem('movies')) || []; 
let pressTimer;
let editingIndex = null;

// --- Blocage du Pull-to-Refresh natif (WebView / Navigateur) ---
let touchStartClientY = 0;

document.addEventListener('touchstart', (e) => {
    // On enregistre la position verticale initiale du doigt
    touchStartClientY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    const touchMoveClientY = e.touches[0].clientY;
    
    // Si la page est tout en haut (scrollY === 0) 
    // ET que le mouvement du doigt descend (touchMoveClientY > touchStartClientY)
    if (window.scrollY === 0 && touchMoveClientY > touchStartClientY) {
        // Si l'événement peut être annulé, on bloque le comportement du navigateur/APK
        if (e.cancelable) {
            e.preventDefault();
        }
    }
}, { passive: false });

// --- Fonctions de Stockage & Rendu ---
function saveMovies() {
    localStorage.setItem('movies', JSON.stringify(movies));
}

function renderMovies() {
    moviesContainer.innerHTML = '';
    
    if (currentView === 'carousel') {
        moviesContainer.classList.add('carousel-mode');
    } else {
        moviesContainer.classList.remove('carousel-mode');
    }

    // Filtrage par catégorie
    const filteredMovies = movies.filter(movie => movie.category === currentCategory || (!movie.category && currentCategory === 'movies'));

    // Tri chronologique : le plus récent en premier
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

        // --- NEW: Subtle Date Label Generation ---
        const dateLabel = document.createElement('div');
        dateLabel.className = 'card-date-subtitle';
        
        const formattedDate = new Date(movie.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        let prefix = 'Vu le';
        if (movie.category === 'music') prefix = 'Écouté le';
        if (movie.category === 'games') prefix = 'Lancé le';
        if (movie.category === 'books') prefix = 'Lu le';

        dateLabel.innerText = `${prefix} ${formattedDate}`;
        // ----------------------------------------

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
            if (!isMoving) {
                showMovieDetails(realIndex);
            }
        });

        perspectiveDiv.appendChild(card);
        perspectiveDiv.appendChild(dateLabel); // Append the label below the card inside perspective wrapper
        moviesContainer.appendChild(perspectiveDiv);
    });

    if (currentView === 'carousel') {
        initCarouselObserver();
    } else if (window.carouselObserver) {
        window.carouselObserver.disconnect();
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
    
    const maxTilt = 25; 
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

    const modalContent = detailsModal.querySelector('.modal-content');
    modalContent.classList.remove('actions-revealed'); // Reset option drawer state

    movieDetailsContent.innerHTML = `
        <img src="${item.image}" class="details-poster" style="aspect-ratio: ${isMusic ? '1/1' : 'auto'};">
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
        
        <p style="line-height: 1.5; margin-bottom: 8px;">${item.description}</p>
        
        <div class="swipe-hint">▲ Glissez vers le haut pour les options ▲</div>

        <div class="action-drawer">
            <button id="btn-edit-movie" class="btn secondary" style="flex: 1; padding: 6px 12px; font-size: 14px;">Modifier</button>
            <button id="btn-delete-movie" class="btn danger" style="flex: 1; padding: 6px 12px; font-size: 14px;">Supprimer</button>
        </div>
    `;

    // --- Détection du geste de Swipe Up uniquement ---
    let touchStartY = 0;
    let touchStartX = 0;

    const handleDetailsTouchStart = (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
    };

    const handleDetailsTouchEnd = (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndX = e.changedTouches[0].clientX;
        
        const deltaY = touchStartY - touchEndY; // Positif = Swipe vers le haut
        const deltaX = Math.abs(touchStartX - touchEndX);

        // On vérifie que le mouvement est vertical et fait au moins 50px
        if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > deltaX) {
            if (deltaY > 0) {
                // Swipe Up : On affiche les options
                modalContent.classList.add('actions-revealed');
            } else {
                // Swipe Down : On referme juste le tiroir d'options s'il est ouvert, sans fermer le modal
                if (modalContent.classList.contains('actions-revealed')) {
                    modalContent.classList.remove('actions-revealed');
                }
            }
        }
    };

    modalContent.removeEventListener('touchstart', modalContent._tsHandler);
    modalContent.removeEventListener('touchend', modalContent._teHandler);
    
    modalContent._tsHandler = handleDetailsTouchStart;
    modalContent._teHandler = handleDetailsTouchEnd;

    modalContent.addEventListener('touchstart', handleDetailsTouchStart, { passive: true });
    modalContent.addEventListener('touchend', handleDetailsTouchEnd, { passive: true });

    // --- Boutons d'actions du tiroir ---
    document.getElementById('btn-edit-movie').addEventListener('click', () => {
        editingIndex = index;
        setupFormFields();
        
        document.getElementById('title').value = item.title || '';
        document.getElementById('image').value = item.image || '';
        document.getElementById('rating').value = item.rating || '';
        document.getElementById('date').value = item.date || '';
        document.getElementById('description').value = item.description || '';
        
        if (document.getElementById('artist')) document.getElementById('artist').value = item.artist || '';
        if (document.getElementById('year')) document.getElementById('year').value = item.year || '';
        if (document.getElementById('platform')) document.getElementById('platform').value = item.platform || '';
        if (document.getElementById('date-end')) document.getElementById('date-end').value = item.dateEnd || '';

        modalTitleDynamic.innerText = modalTitleDynamic.innerText.replace("Ajouter", "Modifier");

        detailsModal.classList.add('hidden');
        formModal.classList.remove('hidden');
    });

    document.getElementById('btn-delete-movie').addEventListener('click', () => {
        movies.splice(index, 1);
        saveMovies();
        renderMovies();
        detailsModal.classList.add('hidden');
    });

    detailsModal.classList.remove('hidden');
}

// --- Événements Formulaire ---
movieForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const updatedItem = {
        title: document.getElementById('title').value,
        image: document.getElementById('image').value,
        rating: document.getElementById('rating').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        category: currentCategory
    };

    if (currentCategory === 'music' || currentCategory === 'games' || currentCategory === 'books') {
        updatedItem.artist = document.getElementById('artist').value; 
    }
    if (currentCategory === 'music' || currentCategory === 'games') {
        updatedItem.year = document.getElementById('year').value;
    }
    if (currentCategory === 'games') {
        updatedItem.platform = document.getElementById('platform').value;
    }
    if (currentCategory === 'games' || currentCategory === 'books') {
        updatedItem.dateEnd = document.getElementById('date-end').value;
    }

    // Sauvegarde de l'index avant réinitialisation pour la redirection
    const lastEditingIndex = editingIndex;

    if (editingIndex !== null) {
        // Mode Édition : écrase l'élément existant
        movies[editingIndex] = updatedItem;
        editingIndex = null; // Réinitialise l'état
    } else {
        // Mode Création
        movies.push(updatedItem);
    }

    saveMovies();
    renderMovies();
    movieForm.reset();
    formModal.classList.add('hidden');

    // --- NOUVEAU : Redirection conditionnelle ---
    if (lastEditingIndex !== null) {
        // Si on était en train de modifier, on réaffiche directement le détail mis à jour
        showMovieDetails(lastEditingIndex);
    }
});

// --- Écouteurs d'Événements Globaux ---
fabMain.addEventListener('mousedown', startPress);
fabMain.addEventListener('touchstart', startPress, { passive: true });
window.addEventListener('mouseup', cancelPress);
window.addEventListener('touchend', cancelPress);

document.addEventListener('click', (e) => {
    if (!fabContainer.contains(e.target)) closeRadialMenu();
});

// Bascule d'affichage simplifiée à 2 états
btnToggleView.addEventListener('click', () => {
    if (currentView === 'grid') {
        currentView = 'carousel';
        btnToggleView.innerText = '☰';
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
    editingIndex = null; // Ensure we are creating, not editing
    movieForm.reset();   // Clear any leftover data from edits
    setupFormFields();
    formModal.classList.remove('hidden');
    closeRadialMenu();
});

btnCancel.addEventListener('click', () => {
    movieForm.reset();
    formModal.classList.add('hidden');
    
    // Si on annule pendant une édition, on retourne au détail de l'item
    if (editingIndex !== null) {
        const lastEditingIndex = editingIndex;
        editingIndex = null; // On nettoie l'état d'édition
        showMovieDetails(lastEditingIndex);
    }
});closeDetails.addEventListener('click', () => detailsModal.classList.add('hidden'));

// Initialisation au chargement
renderMovies();