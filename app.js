// --- Sélecteurs ---
const moviesContainer = document.getElementById('movies-container');
const fabAdd = document.getElementById('fab-add');
const formModal = document.getElementById('form-modal');
const detailsModal = document.getElementById('details-modal');
const movieForm = document.getElementById('movie-form');
const btnCancel = document.getElementById('btn-cancel');
const closeDetails = document.getElementById('close-details');
const movieDetailsContent = document.getElementById('movie-details-content');

// --- État de l'application ---
let movies = JSON.parse(localStorage.getItem('movies')) || [];

// --- Fonctions de Stockage & Rendu ---
function saveMovies() {
    localStorage.setItem('movies', JSON.stringify(movies));
}

function renderMovies() {
    moviesContainer.innerHTML = '';
    movies.forEach((movie, index) => {
        // Wrapper pour la perspective
        const perspectiveDiv = document.createElement('div');
        perspectiveDiv.className = 'card-perspective';

        // La carte elle-même
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.backgroundImage = `url('${movie.image}')`;
        card.dataset.index = index;

        // Création de la couche de lumière (Flare)
        const flare = document.createElement('div');
        flare.className = 'card-flare';
        card.appendChild(flare); 

        // Événements tactiles pour l'effet 3D Mobile
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
        
        // Ouvrir les détails au clic/tap simple
        card.addEventListener('click', () => {
            if (!isMoving) {
                showMovieDetails(index);
            }
        });

        perspectiveDiv.appendChild(card);
        moviesContainer.appendChild(perspectiveDiv);
    });
}

// --- Calcul de l'effet 3D (Tilt) sur Mobile ---
// --- Calcul de l'effet 3D (Tilt) et de la LUMIÈRE sur Mobile ---
function handleTouchMove(e, card) {
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    
    // --- Code existant pour le Tilt (Position confinée) ---
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
    // -----------------------------------------------------

    // --- NOUVEAU : Gestion de la lumière (Flare) ---
    const flare = card.querySelector('.card-flare');
    if (flare) {
        // 1. Positionnement : On déplace le centre du dégradé radial
        // On calcule le pourcentage de position (0% à 100%)
        const flareX = (boundedX / rect.width) * 100;
        const flareY = (boundedY / rect.height) * 100;
        flare.style.background = `radial-gradient(circle at ${flareX}% ${flareY}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 80%)`;

        // 2. Opacité : Plus l'inclinaison est forte (plus le doigt est au bord), plus la lumière est intense.
        // On calcule la distance par rapport au centre (0 à 0.5)
        const distanceFromCenter = Math.sqrt(Math.pow(px, 2) + Math.pow(py, 2));
        // L'opacité max sera de 0.6 quand on est tout au bord
        flare.style.opacity = Math.min(distanceFromCenter * 1.2, 0.6); 
    }
}

// --- Réinitialisation (Ajustée) ---
function resetCardTransform(card) {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.3)';

    // NOUVEAU : On cache la lumière
    const flare = card.querySelector('.card-flare');
    if (flare) {
        flare.style.opacity = '0';
    }
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

    // Gestion de la suppression au clic sur le bouton
    const btnDelete = document.getElementById('btn-delete-movie');
    btnDelete.addEventListener('click', () => {
        // Demande de confirmation avant de supprimer
        if (confirm(`Voulez-vous vraiment supprimer "${movie.title}" ?`)) {
            movies.splice(index, 1); // Supprime le film du tableau
            saveMovies();            // Sauvegarde dans le localStorage
            renderMovies();          // Met à jour la grille de films
            detailsModal.classList.add('hidden'); // Ferme la modale
        }
    });

    detailsModal.classList.remove('hidden');
}

// --- Événements Formulaire ---
movieForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newMovie = {
        title: document.getElementById('title').value,
        image: document.getElementById('image').value,
        rating: document.getElementById('rating').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value
    };

    movies.push(newMovie);
    saveMovies();
    renderMovies();
    
    // Reset et fermeture
    movieForm.reset();
    formModal.classList.add('hidden');
});

// --- Gestionnaires d'Ouverture / Fermeture ---
fabAdd.addEventListener('click', () => formModal.classList.remove('hidden'));
btnCancel.addEventListener('click', () => formModal.classList.add('hidden'));
closeDetails.addEventListener('click', () => detailsModal.classList.add('hidden'));

// Initialisation au chargement
renderMovies();