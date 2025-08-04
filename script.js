import { Game } from './game.js';

async function initGame() {
    try {
        console.log("Attempting to fetch criminals.json...");
        const response = await fetch('criminals.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const criminalData = await response.json();
        console.log("Criminal data loaded successfully.");
        new Game(criminalData);
        console.log("Game initialized.");
    } catch (error) {
        console.error('Failed to initialize game:', error);
        // Display an error message to the user
        document.getElementById('mainScreen').innerHTML = `
            <h1>Error</h1>
            <p>Failed to load game data. Please try again later.</p>
            <p>${error.message}</p>
        `;
        document.getElementById('mainScreen').classList.add('active');
        document.getElementById('gameScreen').classList.remove('active');
    }
}

// Ensure OpenCV.js is loaded before initializing the game
if (typeof cv !== 'undefined' && cv.Mat) {
    console.log("OpenCV.js is ready. Initializing game...");
    initGame();
} else {
    console.log("OpenCV.js not yet ready. Polling...");
    // Poll for OpenCV.js to be ready
    const interval = setInterval(() => {
        if (typeof cv !== 'undefined' && cv.Mat) {
            clearInterval(interval);
            console.log("OpenCV.js is now ready. Initializing game...");
            initGame();
        }
    }, 100);
}