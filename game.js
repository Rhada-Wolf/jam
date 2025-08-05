// game.js
import { INITIAL_TIME_LEFT } from './config.js';

export class Game {
    constructor(criminalData) {
        if (!Array.isArray(criminalData) || criminalData.length === 0) {
            console.error("Game initialization error: criminalData must be a non-empty array.");
            // Optionally, throw an error or handle gracefully, e.g., by disabling game features
            // For now, we'll just log and proceed with an empty array to prevent crashes.
            this.criminalData = [];
        } else {
            this.criminalData = criminalData;
        }
        this.currentCriminalIndex = 0;
        this.timeLeft = INITIAL_TIME_LEFT;
        this.timerInterval = null;
        this.gameMode = 'drawing'; // 'drawing' or 'sticker'
        this.faceClassifier = new cv.CascadeClassifier();
        this.eyeClassifier = new cv.CascadeClassifier();

        this.mainScreen = document.getElementById('mainScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.startStickerGameBtn = document.getElementById('startStickerGameBtn'); // New button
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.colorPalette = document.getElementById('colorPalette');
        this.brushSizePalette = document.querySelector('.brush-size-palette');
        this.eraserBtn = document.getElementById('eraserBtn');
        this.criminalDescriptionElem = document.getElementById('criminalDescription');
        this.submitBtn = document.getElementById('submitBtn');
        this.scoreElem = document.getElementById('score');
        this.nextCriminalBtn = document.getElementById('nextCriminalBtn');
        this.detectedFeaturesListElem = document.getElementById('detectedFeaturesList');
        this.targetFeaturesListElem = document.getElementById('targetFeaturesList');
        this.stickerGallery = document.querySelector('.sticker-gallery');
        this.stickerControls = document.querySelector('.sticker-controls'); // New element
        this.stickerSizePalette = document.querySelector('.sticker-size-palette');
        this.stickerEraserBtn = document.getElementById('stickerEraserBtn');
        this.stickerImageContainer = document.getElementById('stickerImageContainer'); // New element
        this.debugToggleBtn = document.getElementById('debugToggleBtn');
        this.gamePopup = document.getElementById('gamePopup');
        this.popupMessageElem = document.getElementById('popupMessage');
        this.popupCloseBtn = document.getElementById('popupCloseBtn');
        this.drawingTools = document.querySelector('.controls'); // Group drawing tools

        this.isDrawing = false;
        this.isErasing = false;
        this.selectedSticker = null;
        this.currentStickerScale = 1.0; // Default sticker scale
        this.stickerImages = []; // To store loaded sticker images

        this.initEventListeners();
        this.shuffleCriminals();
        this.loadCriminalProfile();
        this.initCanvasSettings();
        this.boundStartDrawing = this.startDrawing.bind(this);
        this.boundDraw = this.draw.bind(this);
        this.boundStopDrawing = this.stopDrawing.bind(this);
        this.boundHandleCanvasClick = this.handleCanvasClick.bind(this);

        this.loadClassifiers();
        this.loadStickerImages(); // Load sticker images on game initialization
    }

    shuffleCriminals() {
        for (let i = this.criminalData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.criminalData[i], this.criminalData[j]] = [this.criminalData[j], this.criminalData[i]];
        }
    }

    initEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.startGame('drawing'));
        this.startStickerGameBtn.addEventListener('click', () => this.startGame('sticker')); // New event listener
        this.stickerGallery.addEventListener('click', (e) => this.handleStickerSelection(e));
        this.stickerSizePalette.addEventListener('click', (e) => this.handleStickerSizeSelection(e));
        this.stickerEraserBtn.addEventListener('click', () => this.activateStickerEraser());
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.nextCriminalBtn.addEventListener('click', () => this.nextCriminal());
        this.colorPalette.addEventListener('click', (e) => this.handleColorPaletteClick(e));
        this.brushSizePalette.addEventListener('click', (e) => this.handleBrushSizeClick(e));
        this.eraserBtn.addEventListener('click', () => this.activateDrawingEraser());
        this.submitBtn.addEventListener('click', () => this.submitSketch());
        this.popupCloseBtn.addEventListener('click', () => this.hidePopup());
        this.debugToggleBtn.addEventListener('click', () => this.toggleDebugFeatures());

        this.canvas.addEventListener('mousedown', this.boundStartDrawing);
        this.canvas.addEventListener('mousemove', this.boundDraw);
        this.canvas.addEventListener('mouseup', this.boundStopDrawing);
        this.canvas.addEventListener('mouseout', this.boundStopDrawing);
    }

    startGame(mode) {
        this.gameMode = mode;
        this.mainScreen.classList.remove('active');
        this.gameScreen.classList.add('active');
        this.timeLeftElem = document.getElementById('timeLeft'); // Initialize here
        this.timeLeftElem.textContent = `${Math.floor(this.timeLeft / 60)}:${this.timeLeft % 60 < 10 ? '0' : ''}${this.timeLeft % 60}`; // Initialize display
        this.startTimer(); // Start timer when game mode is selected

        if (this.gameMode === 'drawing') {
            this.drawingTools.style.display = 'flex'; // Use flex for controls
            this.stickerGallery.style.display = 'none';
            this.canvas.removeEventListener('click', this.boundHandleCanvasClick); // Remove sticker click listener
            this.canvas.addEventListener('mousedown', this.boundStartDrawing);
            this.canvas.addEventListener('mousemove', this.boundDraw);
            this.canvas.addEventListener('mouseup', this.boundStopDrawing);
            this.canvas.addEventListener('mouseout', this.boundStopDrawing);
            this.canvas.style.cursor = 'crosshair'; // Default drawing cursor
        } else if (this.gameMode === 'sticker') {
            this.drawingTools.style.display = 'none';
            this.stickerGallery.style.display = 'flex'; // Use flex for sticker gallery
            this.stickerControls.style.display = 'flex'; // Show sticker controls
            this.stickerImageContainer.style.display = 'flex'; // Show sticker image container
            this.canvas.removeEventListener('mousedown', this.boundStartDrawing); // Remove drawing listeners
            this.canvas.removeEventListener('mousemove', this.boundDraw);
            this.canvas.removeEventListener('mouseup', this.boundStopDrawing);
            this.canvas.removeEventListener('mouseout', this.boundStopDrawing);
            this.canvas.addEventListener('click', this.boundHandleCanvasClick); // Add sticker click listener
            this.canvas.style.cursor = 'copy'; // Change cursor to copy when in sticker mode
        }
    }

    handleStickerSelection(e) {
        if (e.target.classList.contains('sticker')) {
            this.selectedSticker = e.target;
            Array.from(this.stickerGallery.children).forEach(child => {
                if (child.classList.contains('sticker')) {
                    child.style.border = '1px solid #eee';
                }
            });
            this.selectedSticker.style.border = '2px solid blue';
        }
    }

    handleCanvasClick(e) {
        if (this.selectedSticker) {
            const img = new Image();
            img.src = this.selectedSticker.dataset.stickerSrc;
            img.onload = () => {
                const originalWidth = img.width;
                const originalHeight = img.height;
                const scaledWidth = originalWidth * this.currentStickerScale;
                const scaledHeight = originalHeight * this.currentStickerScale;

                // Calculate position to center the sticker at the click point
                const x = e.offsetX - scaledWidth / 2;
                const y = e.offsetY - scaledHeight / 2;
                this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            };
            this.selectedSticker.style.border = '1px solid #eee';
            this.selectedSticker = null;
        } else if (this.isErasing) {
            // Implement sticker eraser functionality here
            // For now, a simple clearRect around the click
            const eraseSize = 50; // Size of the eraser
            this.ctx.clearRect(e.offsetX - eraseSize / 2, e.offsetY - eraseSize / 2, eraseSize, eraseSize);
        }
    }

    nextCriminal() {
        this.currentCriminalIndex++;
        if (this.currentCriminalIndex >= this.criminalData.length) {
            this.shuffleCriminals(); // Reshuffle if all criminals have been shown
            this.currentCriminalIndex = 0;
        }
        this.loadCriminalProfile();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.timeLeft = INITIAL_TIME_LEFT;
        this.timeLeftElem.textContent = `${Math.floor(this.timeLeft / 60)}:${this.timeLeft % 60 < 10 ? '0' : ''}${this.timeLeft % 60}`; // Reset display
        this.startTimer();
        this.scoreElem.textContent = '0';
    }

    loadCriminalProfile() {
        const criminal = this.criminalData[this.currentCriminalIndex];
        this.criminalDescriptionElem.textContent = criminal.description;
        // TODO: Display reference photo if available
    }

    startTimer() {
        clearInterval(this.timerInterval); // Clear any existing timer
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            this.timeLeftElem.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.isDrawing = false;
                this.showPopup('Time is up! Your sketch is submitted.');
                this.submitSketch(); // Automatically submit when time is up
            }
        }, 1000);
    }

    showPopup(message) {
        this.popupMessageElem.textContent = message;
        this.gamePopup.classList.add('active');
    }

    hidePopup() {
        this.gamePopup.classList.remove('active');
    }

    initCanvasSettings() {
        // Default to medium size
        const defaultBrushSizeSwatch = this.brushSizePalette.querySelector('[data-size="8"]');
        if (defaultBrushSizeSwatch) {
            this.ctx.lineWidth = parseInt(defaultBrushSizeSwatch.dataset.size);
            defaultBrushSizeSwatch.classList.add('selected');
        } else {
            this.ctx.lineWidth = 8; // Fallback default
        }
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#000000'; // Default to black
        this.renderColorPalette();
    }

    renderColorPalette() {
        const colors = [
            { name: "black", hex: "#000000" },
            { name: "white", hex: "#FFFFFF" },
            { name: "red", hex: "#FF0000" },
            { name: "blue", hex: "#0000FF" },
            { name: "green", hex: "#008000" },
            { name: "brown", hex: "#A52A2A" },
            { name: "blonde", hex: "#F4D03F" }, // Yellowish
            { name: "gray", hex: "#808080" },
            { name: "silver", hex: "#C0C0C0" },
            { name: "gold", hex: "#FFD700" },
            // Skin tones
            { name: "pale", hex: "#FAD2B8" },
            { name: "light", hex: "#E0AC8D" },
            { name: "medium", hex: "#C2876C" },
            { name: "tan", hex: "#A06B4F" },
            { name: "dark", hex: "#6F4F3A" }
        ];

        this.colorPalette.innerHTML = '';
        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.classList.add('color-swatch');
            swatch.style.backgroundColor = color.hex;
            swatch.dataset.color = color.hex;
            swatch.dataset.name = color.name;
            this.colorPalette.appendChild(swatch);
        });
    }

    handleColorPaletteClick(e) {
        if (e.target.classList.contains('color-swatch')) {
            this.ctx.strokeStyle = e.target.dataset.color;
            this.isErasing = false;
            // Optional: Add a visual cue for selected color
            Array.from(this.colorPalette.children).forEach(child => {
                child.classList.remove('selected');
            });
            e.target.classList.add('selected');
        }
    }

    handleBrushSizeClick(e) {
        if (e.target.classList.contains('brush-size-swatch')) {
            const size = e.target.dataset.size;
            this.ctx.lineWidth = parseInt(size);
            this.isErasing = false; // Turn off eraser when brush size is picked
            // Optional: Add a visual cue for selected brush size
            Array.from(this.brushSizePalette.children).forEach(child => {
                child.classList.remove('selected');
            });
            e.target.classList.add('selected');
        }
    }

    activateDrawingEraser() {
        this.isErasing = true;
        this.ctx.strokeStyle = '#fff';
        // Deselect any sticker when activating drawing eraser
        if (this.selectedSticker) {
            this.selectedSticker.style.border = '1px solid #eee';
            this.selectedSticker = null;
        }
    }

    activateStickerEraser() {
        this.isErasing = true;
        this.selectedSticker = null; // Deselect any sticker
        // Remove selected class from sticker sizes
        Array.from(this.stickerSizePalette.children).forEach(child => {
            child.classList.remove('selected');
        });
        this.canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"30\" height=\"30\" viewBox=\"0 0 30 30\"><circle cx=\"15\" cy=\"15\" r=\"10\" fill=\"white\" stroke=\"black\" stroke-width=\"2\"/></svg>") 15 15, auto';
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.ctx.beginPath();
        this.ctx.moveTo(e.offsetX, e.offsetY);
    }

    draw(e) {
        if (!this.isDrawing) return;
        this.ctx.lineTo(e.offsetX, e.offsetY);
        this.ctx.stroke();
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    submitSketch() {
        clearInterval(this.timerInterval);
        this.isDrawing = false;

        const currentCriminal = this.criminalData[this.currentCriminalIndex];
        const detectedFeatures = this.detectFeatures(this.canvas, currentCriminal.targetFeatures);
        const matchingFeaturesCount = this.compareFeatures(detectedFeatures, currentCriminal.targetFeatures);
        const totalTargetFeatures = Object.keys(currentCriminal.targetFeatures).length;
        const score = this.calculateScore(matchingFeaturesCount, totalTargetFeatures);

        this.scoreElem.textContent = score;
        this.showPopup(`Sketch submitted! Your score: ${score}%`);

        // Re-add detailed feedback display for debug purposes, hidden by default
        this.detectedFeaturesListElem.innerHTML = '';
        this.targetFeaturesListElem.innerHTML = '';

        for (const feature in currentCriminal.targetFeatures) {
            const targetLi = document.createElement('li');
            targetLi.textContent = `${feature}: ${currentCriminal.targetFeatures[feature]}`;
            this.targetFeaturesListElem.appendChild(targetLi);

            const detectedLi = document.createElement('li');
            detectedLi.textContent = `${feature}: ${detectedFeatures[feature]}`;
            if (detectedFeatures[feature] === currentCriminal.targetFeatures[feature]) {
                detectedLi.classList.add('match');
            } else {
                detectedLi.classList.add('miss');
            }
            this.detectedFeaturesListElem.appendChild(detectedLi);
        }
    }

    toggleDebugFeatures() {
        const feedbackDisplay = document.querySelector('.feedback-display');
        if (feedbackDisplay.style.display === 'none' || feedbackDisplay.style.display === '') {
            feedbackDisplay.style.display = 'block'; // Or 'flex' depending on original display
        } else {
            feedbackDisplay.style.display = 'none';
        }
    }

    compareFeatures(detectedFeatures, targetFeatures) {
        let matchingFeatures = 0;
        for (const feature in targetFeatures) {
            if (detectedFeatures.hasOwnProperty(feature) && detectedFeatures[feature] === targetFeatures[feature]) {
                matchingFeatures++;
            }
        }
        return matchingFeatures;
    }

    calculateScore(matchingFeaturesCount, totalTargetFeatures) {
        if (totalTargetFeatures === 0) {
            return 0;
        }
        return Math.round((matchingFeaturesCount / totalTargetFeatures) * 100);
    }

    // Helper function to get dominant color in a region
    getColorInRegion(srcMat, rect) {
        if (rect.width <= 0 || rect.height <= 0 || rect.x < 0 || rect.y < 0 || rect.x + rect.width > srcMat.cols || rect.y + rect.height > srcMat.rows) {
            return "unknown"; // Invalid region
        }
        let roi = srcMat.roi(rect);
        let colors = new cv.Mat();
        cv.cvtColor(roi, colors, cv.COLOR_RGBA2RGB); // Convert to RGB for color analysis
        roi.delete();

        // Reshape to a 1D array of pixels
        let hsv = new cv.Mat();
        cv.cvtColor(colors, hsv, cv.COLOR_RGB2HSV);
        let data = hsv.data; // Now data is HSV

        let colorCounts = {};
        for (let i = 0; i < data.length; i += 3) { // HSV
            let h = data[i];
            let s = data[i + 1];
            let v = data[i + 2];

            let colorName = "other";

            // Black, White, Gray
            if (v < 50) colorName = "black"; // Very low value (dark)
            else if (s < 30 && v > 200) colorName = "white"; // Low saturation, high value (light)
            else if (s < 50 && v > 100 && v < 200) colorName = "gray"; // Low saturation, medium value

            // Primary/Secondary Colors (adjust ranges as needed)
            else if (h >= 0 && h <= 10 || h >= 170 && h <= 180) colorName = "red"; // Red (0-10, 170-180)
            else if (h >= 20 && h <= 35) colorName = "gold"; // Orange/Gold
            else if (h >= 40 && h <= 70) colorName = "blonde"; // Yellow/Blonde
            else if (h >= 80 && h <= 100) colorName = "green"; // Green
            else if (h >= 110 && h <= 130) colorName = "blue"; // Blue
            else if (h >= 140 && h <= 160) colorName = "silver"; // Purple/Silver (adjust if silver is more gray)

            // Brown (often low saturation, specific hue range)
            else if (h >= 10 && h <= 25 && s > 50 && s < 150 && v > 50 && v < 150) colorName = "brown";

            // Skin Tones (more complex, often in orange/yellow hue range with varying saturation/value)
            // These ranges are approximate and might need significant tuning
            else if (h >= 5 && h <= 25 && s >= 20 && s <= 100 && v >= 100 && v <= 255) {
                if (v > 220) colorName = "pale";
                else if (v > 180) colorName = "light";
                else if (v > 140) colorName = "medium";
                else if (v > 100) colorName = "tan";
                else colorName = "dark";
            }

            colorCounts[colorName] = (colorCounts[colorName] || 0) + 1;
        }
        hsv.delete(); // Delete the HSV Mat
        colors.delete();

        let dominantColor = "unknown";
        let maxCount = 0;
        for (const color in colorCounts) {
            if (colorCounts[color] > maxCount) {
                maxCount = colorCounts[color];
                dominantColor = color;
            }
        }
        return dominantColor;
    }

    detectFeatures(canvas, targetFeatures) {
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.threshold(gray, gray, 120, 255, cv.THRESH_BINARY_INV); // Binary image for shape detection

        let detectedFeatures = {};

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const totalPixels = gray.rows * gray.cols;
        const nonZeroPixels = cv.countNonZero(gray);
        const density = nonZeroPixels / totalPixels;

        const glassesThreshold = 0.0005;
        const mustacheThreshold = 0.0001;
        const beardThreshold = 0.0002;
        const hairThreshold = 0.001;
        const hatThreshold = 0.0008; // New threshold for hat detection

        // Regions of Interest (ROIs)
        let eyeRegion1 = new cv.Rect(canvas.width * 0.25, canvas.height * 0.3, canvas.width * 0.1, canvas.height * 0.05);
        let eyeRegion2 = new cv.Rect(canvas.width * 0.65, canvas.height * 0.3, canvas.width * 0.1, canvas.height * 0.05);
        let mustacheRegion = new cv.Rect(canvas.width * 0.4, canvas.height * 0.45, canvas.width * 0.2, canvas.height * 0.05);
        let beardRegion = new cv.Rect(canvas.width * 0.35, canvas.height * 0.55, canvas.width * 0.3, canvas.height * 0.1);
        let hairRegion = new cv.Rect(canvas.width * 0.2, 0, canvas.width * 0.6, canvas.height * 0.2);
        let hatRegion = new cv.Rect(canvas.width * 0.2, 0, canvas.width * 0.6, canvas.height * 0.15); // Region for hat detection
        let lipRegion = new cv.Rect(canvas.width * 0.4, canvas.height * 0.5, canvas.width * 0.2, canvas.height * 0.05);
        let noseRegion = new cv.Rect(canvas.width * 0.45, canvas.height * 0.38, canvas.width * 0.1, canvas.height * 0.07);
        let faceRegion = new cv.Rect(canvas.width * 0.2, canvas.height * 0.15, canvas.width * 0.6, canvas.height * 0.7);
        let earRegionLeft = new cv.Rect(canvas.width * 0.1, canvas.height * 0.3, canvas.width * 0.1, canvas.height * 0.2);
        let earRegionRight = new cv.Rect(canvas.width * 0.8, canvas.height * 0.3, canvas.width * 0.1, canvas.height * 0.2);
        let eyebrowRegionLeft = new cv.Rect(canvas.width * 0.3, canvas.height * 0.25, canvas.width * 0.1, canvas.height * 0.03);
        let eyebrowRegionRight = new cv.Rect(canvas.width * 0.6, canvas.height * 0.25, canvas.width * 0.1, canvas.height * 0.03);
        let complexionRegion = new cv.Rect(canvas.width * 0.4, canvas.height * 0.4, canvas.width * 0.2, canvas.height * 0.1); // Central face for complexion

        if (targetFeatures.hasOwnProperty('has_glasses')) {
            let glassesCount = 0;
            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let rect = cv.boundingRect(cnt);

                const intersectsEyeRegion1 = !(rect.x + rect.width < eyeRegion1.x || eyeRegion1.x + eyeRegion1.width < rect.x || rect.y + rect.height < eyeRegion1.y || eyeRegion1.y + eyeRegion1.height < rect.y);
                const intersectsEyeRegion2 = !(rect.x + rect.width < eyeRegion2.x || eyeRegion2.x + eyeRegion2.width < rect.x || rect.y + rect.height < eyeRegion2.y || eyeRegion2.y + eyeRegion2.height < rect.y);

                if ((intersectsEyeRegion1 || intersectsEyeRegion2) && rect.width > 10 && rect.height > 5) {
                    glassesCount++;
                }
            }
            // Calculate localized densities for eye regions
            let eyeRoi1 = gray.roi(eyeRegion1);
            let nonZeroEye1 = cv.countNonZero(eyeRoi1);
            let eyeDensity1 = nonZeroEye1 / (eyeRegion1.width * eyeRegion1.height);
            eyeRoi1.delete();

            let eyeRoi2 = gray.roi(eyeRegion2);
            let nonZeroEye2 = cv.countNonZero(eyeRoi2);
            let eyeDensity2 = nonZeroEye2 / (eyeRegion2.width * eyeRegion2.height);
            eyeRoi2.delete();

            // A more appropriate threshold for localized eye region density
            const localizedGlassesThreshold = 0.1; // This value might need tuning

            if (glassesCount >= 2 && (eyeDensity1 > localizedGlassesThreshold || eyeDensity2 > localizedGlassesThreshold)) {
                detectedFeatures.has_glasses = true;
                detectedFeatures.glasses_color = this.getColorInRegion(src, eyeRegion1);
            } else {
                detectedFeatures.has_glasses = false;
                detectedFeatures.glasses_color = "unknown";
            }
        }

        if (targetFeatures.hasOwnProperty('has_mustache')) {
            let mustacheRoi = gray.roi(mustacheRegion);
            let nonZeroMustache = cv.countNonZero(mustacheRoi);
            if (nonZeroMustache / totalPixels > mustacheThreshold) {
                detectedFeatures.has_mustache = true;
                detectedFeatures.mustache_color = this.getColorInRegion(src, mustacheRegion);
            } else {
                detectedFeatures.has_mustache = false;
                detectedFeatures.mustache_color = "unknown";
            }
            mustacheRoi.delete();
        }

        if (targetFeatures.hasOwnProperty('has_beard')) {
            let beardRoi = gray.roi(beardRegion);
            let nonZeroBeard = cv.countNonZero(beardRoi);
            if (nonZeroBeard / totalPixels > beardThreshold) {
                detectedFeatures.has_beard = true;
                detectedFeatures.beard_color = this.getColorInRegion(src, beardRegion);
            } else {
                detectedFeatures.has_beard = false;
                detectedFeatures.beard_color = "unknown";
            }
            beardRoi.delete();
        }

        if (targetFeatures.hasOwnProperty('hair_type') || targetFeatures.hasOwnProperty('hair_color')) {
            let hairRoi = gray.roi(hairRegion);
            let nonZeroHair = cv.countNonZero(hairRoi);
            if (nonZeroHair / totalPixels > hairThreshold) {
                detectedFeatures.hair_color = this.getColorInRegion(src, hairRegion);
                if (nonZeroHair / totalPixels > 0.005) {
                    detectedFeatures.hair_type = "long";
                } else if (nonZeroHair / totalPixels > 0.002) {
                    detectedFeatures.hair_type = "medium";
                } else {
                    detectedFeatures.hair_type = "short";
                }
            } else {
                detectedFeatures.hair_type = "bald";
                detectedFeatures.hair_color = "none";
            }
            hairRoi.delete();
        }

        if (targetFeatures.hasOwnProperty('has_hat')) {
            let hatRoi = gray.roi(hatRegion);
            let nonZeroHat = cv.countNonZero(hatRoi);
            if (nonZeroHat / totalPixels > hatThreshold) {
                detectedFeatures.has_hat = true;
                detectedFeatures.hat_color = this.getColorInRegion(src, hatRegion);
            } else {
                detectedFeatures.has_hat = false;
                detectedFeatures.hat_color = "unknown";
            }
            hatRoi.delete();
        }

        if (targetFeatures.hasOwnProperty('eye_color')) {
            detectedFeatures.eye_color = this.getColorInRegion(src, eyeRegion1);
        }

        if (targetFeatures.hasOwnProperty('complexion')) {
            let complexionRoi = src.roi(complexionRegion);
            let avgColor = cv.mean(complexionRoi);
            complexionRoi.delete();
            let lightness = (Math.max(avgColor[0], avgColor[1], avgColor[2]) + Math.min(avgColor[0], avgColor[1], avgColor[2])) / 2;

            if (lightness > 220) detectedFeatures.complexion = "pale";
            else if (lightness > 180) detectedFeatures.complexion = "light";
            else if (lightness > 140) detectedFeatures.complexion = "medium";
            else if (lightness > 100) detectedFeatures.complexion = "tan";
            else detectedFeatures.complexion = "dark";
        }


        if (targetFeatures.hasOwnProperty('nose_shape')) {
            let noseRoi = gray.roi(noseRegion);
            let noseContours = new cv.MatVector();
            let noseHierarchy = new cv.Mat();
            cv.findContours(noseRoi, noseContours, noseHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            if (noseContours.size() > 0) {
                let largestContourArea = 0;
                for (let i = 0; i < noseContours.size(); ++i) {
                    let cnt = noseContours.get(i);
                    let area = cv.contourArea(cnt);
                    if (area > largestContourArea) {
                        largestContourArea = area;
                    }
                    cnt.delete();
                }
                if (largestContourArea > 50) {
                    detectedFeatures.nose_shape = "defined";
                } else {
                    detectedFeatures.nose_shape = "subtle";
                }
            } else {
                detectedFeatures.nose_shape = "none";
            }
            noseRoi.delete();
            noseContours.delete();
            noseHierarchy.delete();
        }

        if (targetFeatures.hasOwnProperty('lip_fullness') || targetFeatures.hasOwnProperty('lip_color')) {
            let lipRoi = gray.roi(lipRegion);
            let nonZeroLip = cv.countNonZero(lipRoi);
            if (nonZeroLip / totalPixels > 0.0005) {
                detectedFeatures.lip_color = this.getColorInRegion(src, lipRegion);
                if (lipRegion.height > canvas.height * 0.04) {
                    detectedFeatures.lip_fullness = "full";
                } else if (lipRegion.height > canvas.height * 0.02) {
                    detectedFeatures.lip_fullness = "medium";
                } else {
                    detectedFeatures.lip_fullness = "thin";
                }
            } else {
                detectedFeatures.lip_fullness = "unknown";
                detectedFeatures.lip_color = "unknown";
            }
            lipRoi.delete();
        }

        if (targetFeatures.hasOwnProperty('face_shape')) {
            let faceRoi = gray.roi(faceRegion);
            let nonZeroFace = cv.countNonZero(faceRoi);
            let faceDensity = nonZeroFace / (faceRegion.width * faceRegion.height);
            faceRoi.delete();

            if (faceDensity > 0.05) {
                detectedFeatures.face_shape = "present";
            } else {
                detectedFeatures.face_shape = "undefined";
            }
        }

        if (targetFeatures.hasOwnProperty('ear_size')) {
            let earRoiLeft = gray.roi(earRegionLeft);
            let nonZeroEarLeft = cv.countNonZero(earRoiLeft);
            earRoiLeft.delete();

            let earRoiRight = gray.roi(earRegionRight);
            let nonZeroEarRight = cv.countNonZero(earRoiRight);
            earRoiRight.delete();

            const earThreshold = 0.0001;

            if ((nonZeroEarLeft / totalPixels > earThreshold) || (nonZeroEarRight / totalPixels > earThreshold)) {
                detectedFeatures.ear_size = "visible";
            } else {
                detectedFeatures.ear_size = "hidden";
            }
        }

        if (targetFeatures.hasOwnProperty('eyebrow_shape') || targetFeatures.hasOwnProperty('eyebrow_color')) {
            let eyebrowRoiLeft = gray.roi(eyebrowRegionLeft);
            let nonZeroEyebrowLeft = cv.countNonZero(eyebrowRoiLeft);
            eyebrowRoiLeft.delete();
            let eyebrowRoiRight = gray.roi(eyebrowRegionRight);
            let nonZeroEyebrowRight = cv.countNonZero(eyebrowRoiRight);
            eyebrowRoiRight.delete();

            if ((nonZeroEyebrowLeft / totalPixels > 0.0001) || (nonZeroEyebrowRight / totalPixels > 0.0001)) {
                detectedFeatures.eyebrow_color = this.getColorInRegion(src, eyebrowRegionLeft);
                detectedFeatures.eyebrow_shape = "thick";
            } else {
                detectedFeatures.eyebrow_shape = "thin";
                detectedFeatures.eyebrow_color = "unknown";
            }
        }


        if (targetFeatures.hasOwnProperty('hair_texture')) {
            detectedFeatures.hair_texture = "unknown";
        }

        if (targetFeatures.hasOwnProperty('facial_hair_style')) {
            if (detectedFeatures.has_mustache && detectedFeatures.has_beard) {
                detectedFeatures.facial_hair_style = "full_beard";
            } else if (detectedFeatures.has_mustache) {
                detectedFeatures.facial_hair_style = "mustache";
            } else if (detectedFeatures.has_beard) {
                detectedFeatures.facial_hair_style = "beard";
            } else {
                detectedFeatures.facial_hair_style = "clean_shaven";
            }
        }


        src.delete();
        gray.delete();
        contours.delete();
        hierarchy.delete();

        return detectedFeatures;
    }

    handleStickerSizeSelection(e) {
        if (e.target.classList.contains('sticker-size-swatch')) {
            this.currentStickerScale = parseFloat(e.target.dataset.scale);
            this.isErasing = false; // Turn off eraser when sticker size is picked
            // Optional: Add a visual cue for selected sticker size
            Array.from(this.stickerSizePalette.children).forEach(child => {
                child.classList.remove('selected');
            });
            e.target.classList.add('selected');
            this.canvas.style.cursor = 'copy'; // Reset cursor to copy
        }
    }

    loadClassifiers() {
        // Load face cascade
        this.faceClassifier.load('images/haarcascades/haarcascade_frontalface_default.xml');
        // Load eye cascade
        this.eyeClassifier.load('images/haarcascades/haarcascade_eye.xml');
    }

    async loadStickerImages() {
        const stickerPaths = [
            'images/stickers/eyes1.jpeg',
            'images/stickers/eyes2.jpeg',
            'images/stickers/mouth1.jpeg',
            'images/stickers/mouth2.jpeg',
            'images/stickers/nose1.jpeg',
            'images/stickers/nose2.jpeg',
            'images/stickers/sticker1.png',
            'images/stickers/sticker2.png'
        ];

        const stickerImageContainer = document.getElementById('stickerImageContainer');
        stickerImageContainer.innerHTML = ''; // Clear existing content

        for (const path of stickerPaths) {
            const img = new Image();
            img.src = path;
            img.classList.add('sticker');
            img.dataset.stickerSrc = path;
            img.alt = path.split('/').pop(); // Use filename as alt text
            stickerImageContainer.appendChild(img);
        }

        // Initialize default sticker size selection
        const defaultStickerSizeSwatch = this.stickerSizePalette.querySelector('[data-scale="1.0"]');
        if (defaultStickerSizeSwatch) {
            defaultStickerSizeSwatch.classList.add('selected');
        }
    }
}