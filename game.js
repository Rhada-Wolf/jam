// game.js
export class Game {
    constructor(criminalData) {
        this.criminalData = criminalData;
        this.currentCriminalIndex = 0;
        this.timeLeft = 30;
        this.timerInterval = null;

        this.mainScreen = document.getElementById('mainScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.colorPalette = document.getElementById('colorPalette');
        this.brushSizePalette = document.querySelector('.brush-size-palette');
        this.eraserBtn = document.getElementById('eraserBtn');
        this.criminalDescriptionElem = document.getElementById('criminalDescription');
        this.timeLeftElem = document.getElementById('timeLeft');
        this.submitBtn = document.getElementById('submitBtn');
        this.scoreElem = document.getElementById('score');
        this.nextCriminalBtn = document.getElementById('nextCriminalBtn');
        this.detectedFeaturesListElem = document.getElementById('detectedFeaturesList');
        this.targetFeaturesListElem = document.getElementById('targetFeaturesList');
        this.stickerGallery = document.querySelector('.sticker-gallery');
        this.gamePopup = document.getElementById('gamePopup');
        this.popupMessageElem = document.getElementById('popupMessage');
        this.popupCloseBtn = document.getElementById('popupCloseBtn');

        this.isDrawing = false;
        this.isErasing = false;
        this.selectedSticker = null;

        this.initEventListeners();
        this.loadCriminalProfile();
        this.startTimer();
        this.initCanvasSettings();
    }

    initEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.stickerGallery.addEventListener('click', (e) => this.handleStickerSelection(e));
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.nextCriminalBtn.addEventListener('click', () => this.nextCriminal());
        this.colorPalette.addEventListener('click', (e) => this.handleColorPaletteClick(e));
        this.brushSizePalette.addEventListener('click', (e) => this.handleBrushSizeClick(e));
        this.eraserBtn.addEventListener('click', () => this.activateEraser());
        this.submitBtn.addEventListener('click', () => this.submitSketch());
        this.popupCloseBtn.addEventListener('click', () => this.hidePopup());

        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
    }

    startGame() {
        this.mainScreen.classList.remove('active');
        this.gameScreen.classList.add('active');
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
                this.ctx.drawImage(img, e.offsetX - img.width / 2, e.offsetY - img.height / 2, img.width, img.height);
            };
            this.selectedSticker.style.border = '1px solid #eee';
            this.selectedSticker = null;
        }
    }

    nextCriminal() {
        this.currentCriminalIndex = (this.currentCriminalIndex + 1) % this.criminalData.length;
        this.loadCriminalProfile();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.timeLeft = 30;
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

    activateEraser() {
        this.isErasing = true;
        this.ctx.strokeStyle = '#fff';
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

        const detectedFeatures = this.detectFeatures(this.canvas);
        const currentCriminal = this.criminalData[this.currentCriminalIndex];
        const matchingFeaturesCount = this.compareFeatures(detectedFeatures, currentCriminal.targetFeatures);
        const totalTargetFeatures = Object.keys(currentCriminal.targetFeatures).length;
        const score = this.calculateScore(matchingFeaturesCount, totalTargetFeatures);

        this.scoreElem.textContent = score;
        this.showPopup(`Sketch submitted! Your score: ${score}%`);

        // Removed detailed feedback display as per user request
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
        let data = colors.data;

        let colorCounts = {};
        for (let i = 0; i < data.length; i += 3) { // RGB
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            // Simple quantization for common colors
            let colorName = "other";
            if (r < 50 && g < 50 && b < 50) colorName = "black";
            else if (r > 200 && g > 200 && b > 200) colorName = "white";
            else if (r > 150 && g < 100 && b < 100) colorName = "red";
            else if (r < 100 && g < 100 && b > 150) colorName = "blue";
            else if (r < 100 && g > 150 && b < 100) colorName = "green";
            else if (r > 100 && r < 200 && g > 50 && g < 150 && b < 100) colorName = "brown";
            else if (r > 200 && g > 200 && b < 100) colorName = "blonde"; // Yellowish
            else if (r > 150 && g > 150 && b > 150) colorName = "gray"; // Light gray
            else if (r > 100 && r < 200 && g > 100 && g < 200 && b > 100 && b < 200) colorName = "silver"; // Medium gray
            else if (r > 200 && g > 150 && b < 100) colorName = "gold"; // Orange-yellowish

            colorCounts[colorName] = (colorCounts[colorName] || 0) + 1;
        }
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

    detectFeatures(canvas) {
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.threshold(gray, gray, 120, 255, cv.THRESH_BINARY_INV); // Binary image for shape detection

        let detectedFeatures = {
            has_glasses: false,
            glasses_color: "unknown",
            has_mustache: false,
            mustache_color: "unknown",
            has_beard: false,
            beard_color: "unknown",
            hair_type: "none", // "short", "long", "bald", "medium"
            hair_color: "unknown",
            has_hat: false,
            hat_color: "unknown",
            eye_color: "unknown",
            complexion: "unknown", // "fair", "olive", "dark"
            nose_shape: "unknown", // "prominent", "small", "wide", "narrow", "hooked", "button"
            lip_fullness: "unknown", // "thin", "medium", "full"
            lip_color: "unknown",
            face_shape: "unknown", // "round", "oval", "square", "heart", "diamond", "long"
            ear_size: "unknown", // "small", "medium", "large"
            eyebrow_shape: "unknown", // "thick", "thin", "arched", "straight", "bushy", "faded"
            eyebrow_color: "unknown",
            hair_texture: "unknown", // "straight", "wavy", "curly", "kinky", "braided", "dreadlocks"
            facial_hair_style: "clean_shaven" // "stubble", "goatee", "full_beard", "clean_shaven", "van_dyke", "soul_patch", "sideburns"
        };

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

        // Glasses Detection
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
        if (glassesCount >= 2 && density > glassesThreshold) {
            detectedFeatures.has_glasses = true;
            detectedFeatures.glasses_color = this.getColorInRegion(src, eyeRegion1); // Get color from one eye region
        }

        // Mustache Detection
        let mustacheRoi = gray.roi(mustacheRegion);
        let nonZeroMustache = cv.countNonZero(mustacheRoi);
        if (nonZeroMustache / totalPixels > mustacheThreshold) {
            detectedFeatures.has_mustache = true;
            detectedFeatures.mustache_color = this.getColorInRegion(src, mustacheRegion);
        }
        mustacheRoi.delete();

        // Beard Detection
        let beardRoi = gray.roi(beardRegion);
        let nonZeroBeard = cv.countNonZero(beardRoi);
        if (nonZeroBeard / totalPixels > beardThreshold) {
            detectedFeatures.has_beard = true;
            detectedFeatures.beard_color = this.getColorInRegion(src, beardRegion);
        }
        beardRoi.delete();

        // Hair Type and Color Detection
        let hairRoi = gray.roi(hairRegion);
        let nonZeroHair = cv.countNonZero(hairRoi);
        if (nonZeroHair / totalPixels > hairThreshold) {
            detectedFeatures.hair_color = this.getColorInRegion(src, hairRegion);
            // Basic hair type logic (can be refined)
            if (nonZeroHair / totalPixels > 0.005) { // Higher density for "long"
                detectedFeatures.hair_type = "long";
            } else if (nonZeroHair / totalPixels > 0.002) { // Medium density for "medium"
                detectedFeatures.hair_type = "medium";
            } else {
                detectedFeatures.hair_type = "short";
            }
        } else {
            detectedFeatures.hair_type = "bald";
            detectedFeatures.hair_color = "none"; // No hair color if bald
        }
        hairRoi.delete();

        // Hat Detection
        let hatRoi = gray.roi(hatRegion);
        let nonZeroHat = cv.countNonZero(hatRoi);
        if (nonZeroHat / totalPixels > hatThreshold) {
            detectedFeatures.has_hat = true;
            detectedFeatures.hat_color = this.getColorInRegion(src, hatRegion);
        }
        hatRoi.delete();

        // Eye Color (simplified: average color in eye region)
        detectedFeatures.eye_color = this.getColorInRegion(src, eyeRegion1); // Use one eye for simplicity

        // Complexion (simplified: average color in a central face region)
        // Complexion (simplified: average color in a central face region)
        let complexionRoi = src.roi(complexionRegion);
        let avgColor = cv.mean(complexionRoi);
        complexionRoi.delete();
        let lightness = (Math.max(avgColor[0], avgColor[1], avgColor[2]) + Math.min(avgColor[0], avgColor[1], avgColor[2])) / 2;

        if (lightness > 220) detectedFeatures.complexion = "pale";
        else if (lightness > 180) detectedFeatures.complexion = "light";
        else if (lightness > 140) detectedFeatures.complexion = "medium";
        else if (lightness > 100) detectedFeatures.complexion = "tan";
        else detectedFeatures.complexion = "dark";


        // Nose Shape (Placeholder - requires advanced techniques)
        // This is highly complex and would need advanced contour analysis or ML
        detectedFeatures.nose_shape = "unknown";

        // Lip Fullness and Color
        let lipRoi = gray.roi(lipRegion);
        let nonZeroLip = cv.countNonZero(lipRoi);
        if (nonZeroLip / totalPixels > 0.0005) { // Basic threshold for lips drawn
            detectedFeatures.lip_color = this.getColorInRegion(src, lipRegion);
            // Very basic fullness based on height of drawn lips
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

        // Face Shape (Placeholder - requires advanced techniques)
        // This is very complex, requiring robust face contour detection and analysis
        detectedFeatures.face_shape = "unknown";

        // Ear Size (Placeholder - requires advanced techniques)
        // Requires reliable ear detection and size comparison
        detectedFeatures.ear_size = "unknown";

        // Eyebrow Shape and Color (Placeholder - requires advanced techniques)
        let eyebrowRoiLeft = gray.roi(eyebrowRegionLeft);
        let nonZeroEyebrowLeft = cv.countNonZero(eyebrowRoiLeft);
        eyebrowRoiLeft.delete();
        let eyebrowRoiRight = gray.roi(eyebrowRegionRight);
        let nonZeroEyebrowRight = cv.countNonZero(eyebrowRoiRight);
        eyebrowRoiRight.delete();

        if ((nonZeroEyebrowLeft / totalPixels > 0.0001) || (nonZeroEyebrowRight / totalPixels > 0.0001)) {
            detectedFeatures.eyebrow_color = this.getColorInRegion(src, eyebrowRegionLeft); // Use left for simplicity
            detectedFeatures.eyebrow_shape = "thick"; // Simplistic, could be refined
        } else {
            detectedFeatures.eyebrow_shape = "thin";
            detectedFeatures.eyebrow_color = "unknown";
        }


        // Hair Texture (Placeholder - requires advanced techniques)
        // Very difficult to detect from simple drawings
        detectedFeatures.hair_texture = "unknown";

        // Facial Hair Style (Placeholder - requires advanced techniques)
        // Requires more granular analysis of beard/mustache shapes
        if (detectedFeatures.has_mustache && detectedFeatures.has_beard) {
            detectedFeatures.facial_hair_style = "full_beard"; // Simplistic
        } else if (detectedFeatures.has_mustache) {
            detectedFeatures.facial_hair_style = "mustache";
        } else if (detectedFeatures.has_beard) {
            detectedFeatures.facial_hair_style = "beard";
        } else {
            detectedFeatures.facial_hair_style = "clean_shaven";
        }


        src.delete();
        gray.delete();
        contours.delete();
        hierarchy.delete();

        return detectedFeatures;
    }
}