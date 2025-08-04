const mainScreen = document.getElementById('mainScreen');
const gameScreen = document.getElementById('gameScreen');
const startGameBtn = document.getElementById('startGameBtn');

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSizeSlider = document.getElementById('brushSize');
const eraserBtn = document.getElementById('eraserBtn');
const criminalDescriptionElem = document.getElementById('criminalDescription');
const timeLeftElem = document.getElementById('timeLeft');
const submitBtn = document.getElementById('submitBtn');
const scoreElem = document.getElementById('score');
const nextCriminalBtn = document.getElementById('nextCriminalBtn');
const detectedFeaturesListElem = document.getElementById('detectedFeaturesList');
const targetFeaturesListElem = document.getElementById('targetFeaturesList');
const stickerGallery = document.querySelector('.sticker-gallery');

startGameBtn.addEventListener('click', () => {
    mainScreen.classList.remove('active');
    gameScreen.classList.add('active');
});

let selectedSticker = null;

stickerGallery.addEventListener('click', (e) => {
    if (e.target.classList.contains('sticker')) {
        selectedSticker = e.target;
        // Optional: Add a visual cue for selected sticker
        Array.from(stickerGallery.children).forEach(child => {
            if (child.classList.contains('sticker')) {
                child.style.border = '1px solid #eee';
            }
        });
        selectedSticker.style.border = '2px solid blue';
    }
});

canvas.addEventListener('click', (e) => {
    if (selectedSticker) {
        const img = new Image();
        img.src = selectedSticker.dataset.stickerSrc;
        img.onload = () => {
            ctx.drawImage(img, e.offsetX - img.width / 2, e.offsetY - img.height / 2, img.width, img.height);
        };
        selectedSticker.style.border = '1px solid #eee'; // Deselect sticker after placing
        selectedSticker = null;
    }
});

nextCriminalBtn.addEventListener('click', () => {
    currentCriminalIndex = (currentCriminalIndex + 1) % criminalData.length;
    loadCriminalProfile();
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas for new drawing
    timeLeft = 30; // Reset timer
    startTimer(); // Start timer for new round
    scoreElem.textContent = '0'; // Reset score display
});

let isDrawing = false;
let isErasing = false;
let timeLeft = 30; // 3 minutes in seconds
let timerInterval;

const criminalData = [
    {
        id: 1,
        description: "Male, mid-30s, short dark hair, prominent nose, wearing glasses.",
        photoPath: "images/criminal1_photo.jpg", // Placeholder
        targetFeatures: {
            has_glasses: true,
            has_mustache: false,
            has_beard: false,
            hair_type: "short"
        }
    },
    {
        id: 2,
        description: "Female, long blonde hair, no glasses, small nose, wearing a hat.",
        photoPath: "images/criminal2_photo.jpg", // Placeholder
        targetFeatures: {
            has_glasses: false,
            has_mustache: false,
            has_beard: false,
            hair_type: "long"
        }
    }
];

let currentCriminalIndex = 0;

function loadCriminalProfile() {
    const criminal = criminalData[currentCriminalIndex];
    criminalDescriptionElem.textContent = criminal.description;
    // TODO: Display reference photo if available
}

// Initial call to load the first criminal profile
loadCriminalProfile();
startTimer();

ctx.lineWidth = brushSizeSlider.value;
ctx.lineCap = 'round';
ctx.strokeStyle = colorPicker.value;

colorPicker.addEventListener('input', (e) => {
    ctx.strokeStyle = e.target.value;
    isErasing = false; // Turn off eraser when color is picked
});

brushSizeSlider.addEventListener('input', (e) => {
    ctx.lineWidth = e.target.value;
});

eraserBtn.addEventListener('click', () => {
    isErasing = true;
    ctx.strokeStyle = '#fff'; // Set to canvas background color for erasing
});

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeLeftElem.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isDrawing = false; // Stop drawing when time is up
            alert('Time is up! Your sketch is submitted.');
            // TODO: Trigger submission and scoring
        }
    }, 1000);
}


submitBtn.addEventListener('click', () => {
    clearInterval(timerInterval); // Stop the timer
    isDrawing = false; // Prevent further drawing

    const detectedFeatures = detectFeatures(canvas);
    const currentCriminal = criminalData[currentCriminalIndex];
    const matchingFeaturesCount = compareFeatures(detectedFeatures, currentCriminal.targetFeatures);
    const totalTargetFeatures = Object.keys(currentCriminal.targetFeatures).length;
    const score = calculateScore(matchingFeaturesCount, totalTargetFeatures);

    scoreElem.textContent = score;
    alert(`Sketch submitted! Your score: ${score}%`);

    // Display feedback
    detectedFeaturesListElem.innerHTML = '';
    targetFeaturesListElem.innerHTML = '';

    for (const feature in currentCriminal.targetFeatures) {
        const targetLi = document.createElement('li');
        targetLi.textContent = `${feature}: ${currentCriminal.targetFeatures[feature]}`;
        targetFeaturesListElem.appendChild(targetLi);

        const detectedLi = document.createElement('li');
        detectedLi.textContent = `${feature}: ${detectedFeatures[feature]}`;
        if (detectedFeatures[feature] === currentCriminal.targetFeatures[feature]) {
            detectedLi.classList.add('match');
        } else {
            detectedLi.classList.add('miss');
        }
        detectedFeaturesListElem.appendChild(detectedLi);
    }
});

// Initial call to start the timer when the script loads
function compareFeatures(detectedFeatures, targetFeatures) {
    let matchingFeatures = 0;
    for (const feature in targetFeatures) {
        if (detectedFeatures.hasOwnProperty(feature) && detectedFeatures[feature] === targetFeatures[feature]) {
            matchingFeatures++;
        }
    }
    return matchingFeatures;
}

function calculateScore(matchingFeaturesCount, totalTargetFeatures) {
    if (totalTargetFeatures === 0) {
        return 0;
    }
    return Math.round((matchingFeaturesCount / totalTargetFeatures) * 100);
}

function detectFeatures(canvas) {
    let src = cv.imread(canvas);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(gray, gray, 120, 255, cv.THRESH_BINARY_INV);

    let detectedFeatures = {
        has_glasses: false,
        has_mustache: false,
        has_beard: false,
        hair_type: "none" // "short", "long", "bald"
    };

    // Simple detection for glasses (looking for two dark blobs in eye region)
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let eyeRegion1 = new cv.Rect(canvas.width * 0.25, canvas.height * 0.3, canvas.width * 0.1, canvas.height * 0.05);
    let eyeRegion2 = new cv.Rect(canvas.width * 0.65, canvas.height * 0.3, canvas.width * 0.1, canvas.height * 0.05);

    let glassesCount = 0;
    for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let rect = cv.boundingRect(cnt);
        if ((rect.intersects(eyeRegion1) || rect.intersects(eyeRegion2)) && rect.width > 10 && rect.height > 5) {
            glassesCount++;
        }
    }
    if (glassesCount >= 2) { // Assuming two distinct shapes for glasses
        detectedFeatures.has_glasses = true;
    }

    // Simple detection for mustache (looking for a dark blob above the lip)
    let mustacheRegion = new cv.Rect(canvas.width * 0.4, canvas.height * 0.45, canvas.width * 0.2, canvas.height * 0.05);
    let mustacheRoi = gray.roi(mustacheRegion);
    let nonZeroMustache = cv.countNonZero(mustacheRoi);
    if (nonZeroMustache > 50) { // Threshold for detecting a mustache
        detectedFeatures.has_mustache = true;
    }
    mustacheRoi.delete();

    // Simple detection for beard (looking for a dark area below the chin)
    let beardRegion = new cv.Rect(canvas.width * 0.35, canvas.height * 0.55, canvas.width * 0.3, canvas.height * 0.1);
    let beardRoi = gray.roi(beardRegion);
    let nonZeroBeard = cv.countNonZero(beardRoi);
    if (nonZeroBeard > 100) { // Threshold for detecting a beard
        detectedFeatures.has_beard = true;
    }
    beardRoi.delete();

    // Hair type (very basic: check top of head for significant drawing)
    let hairRegion = new cv.Rect(canvas.width * 0.2, 0, canvas.width * 0.6, canvas.height * 0.2);
    let hairRoi = gray.roi(hairRegion);
    let nonZeroHair = cv.countNonZero(hairRoi);
    if (nonZeroHair > 500) { // Arbitrary threshold for "some hair"
        detectedFeatures.hair_type = "short"; // Simplistic, could be refined
    } else {
        detectedFeatures.hair_type = "bald";
    }
    hairRoi.delete();

    src.delete();
    gray.delete();
    contours.delete();
    hierarchy.delete();

    return detectedFeatures;
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});