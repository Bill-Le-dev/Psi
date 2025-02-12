import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

const loader = new GLTFLoader(); // For the model
const fbxLoader = new FBXLoader(); // For animations
let mixer, idleAction, thinkingAction;
// Create and configure the DRACOLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); // Use the online decoder path
loader.setDRACOLoader(dracoLoader);

// OpenAI API setup
let conversationHistory = [];
const openaiApiKey = 'your Api key';
const openaiEndpoint = 'https://api.openai.com/v1/chat/completions';

const audDApiKey = '2eb1b972883c81272d97bff25bdf07d0';
const audDEndpoint = 'https://api.audd.io/';

const synth = window.speechSynthesis;
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';

// Elements
const chatContainer = document.getElementById("chat-container");
const toggleChatBtn = document.getElementById("toggle-chat-btn");
const goback = document.getElementById("goback");
goback.style.position = 'fixed';
goback.style.top = '5px';
goback.style.left = '10px';
document.body.appendChild(goback);
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const messages = document.getElementById("messages");

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Set the size of the canvas to be 90% of the window size
    const canvasWidth = window.innerWidth * 0.95;
    const canvasHeight = window.innerHeight*0.97;
    canvas.style.margin = 'auto'; // Centering the canvas using margin auto
    canvas.style.display = 'block'; // Ensure it behaves like a block element

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvasWidth, canvasHeight);

    // Set up the scene and camera
    const scene = new THREE.Scene();

    // Load and set a skybox as the background
    const textureLoader = new THREE.CubeTextureLoader();
    const skyboxTexture = textureLoader.load([
        '/assets/skybox/xpos.png', // Positive X
        '/assets/skybox/xneg.png', // Negative X
        '/assets/skybox/ypos.png', // Positive Y
        '/assets/skybox/yneg.png', // Negative Y
        '/assets/skybox/zpos.png', // Positive Z
        '/assets/skybox/zneg.png', // Negative Z
    ]);
    scene.background = skyboxTexture;

    // Add lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 2.3);

    // Create the animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        if (mixer) {
            mixer.update(0.01);  // Update the animation mixer
        }
        renderer.render(scene, camera);
    };
    animate();

    // Load the character model
    loader.load('/assets/animations/Prometheus.glb', (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.name = 'Prometheus';
        
        // Initialize the mixer
        mixer = new AnimationMixer(model);

        // Load idle animation
        fbxLoader.load('/assets/animations/idle.fbx', (idleAnim) => {
            idleAction = mixer.clipAction(idleAnim.animations[0]);
            idleAction.play(); // Start with idle animation
        });

        // Load thinking animation
        fbxLoader.load('/assets/animations/salute.fbx', (thinkingAnim) => {
            thinkingAction = mixer.clipAction(thinkingAnim.animations[0]);
            // thinkingAction.play();
        });
    });

    // Initialize WebGazer for eye tracking
    let lastX = null;
    let lastY = null;
    const smoothingFactor = 0.2;
    let calibrationComplete = false;
    let webGazerActive = false;

    function startCalibration() {
        const points = [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.5, y: 0.5 },
            { x: 0.1, y: 0.9 },
            { x: 0.9, y: 0.9 },
        ];

        let index = 0;

        const calibrationDot = document.createElement('div');
        calibrationDot.style.position = 'absolute';
        calibrationDot.style.width = '10px';
        calibrationDot.style.height = '10px';
        calibrationDot.style.background = 'red';
        calibrationDot.style.borderRadius = '50%';
        document.body.appendChild(calibrationDot);

        function showNextPoint() {
            if (index >= points.length) {
                document.body.removeChild(calibrationDot);
                calibrationComplete = true;
                webgazer.resume(); // Resume eye tracking
                return;
            }

            const point = points[index];
            calibrationDot.style.left = `${point.x * window.innerWidth}px`;
            calibrationDot.style.top = `${point.y * window.innerHeight}px`;

            setTimeout(() => {
                webgazer.recordScreenPosition(point.x * window.innerWidth, point.y * window.innerHeight);
                index++;
                showNextPoint();
            }, 1000); // Display each point for 1 second
        }

        webgazer.pause(); // Pause eye tracking during calibration
        showNextPoint();
    }

    webgazer.setGazeListener((data, elapsedTime) => {
        if (data == null || !calibrationComplete || !webGazerActive) return;

        const { x, y } = data;

        // Apply smoothing
        if (lastX === null || lastY === null) {
            lastX = x;
            lastY = y;
        } else {
            lastX = lastX + smoothingFactor * (x - lastX);
            lastY = lastY + smoothingFactor * (y - lastY);
        }

        // Map gaze coordinates to camera rotation
        const normalizedX = (lastX / window.innerWidth) * 2 - 1; // Normalize to -1 to 1
        const normalizedY = -(lastY / window.innerHeight) * 2 + 1; // Invert and normalize

        camera.rotation.y = normalizedX * Math.PI * -0.5; // Horizontal rotation
        camera.rotation.x = normalizedY * Math.PI * 0.25; // Vertical rotation
    }).begin();

    // Enable debugging features
    webgazer.showVideo(false);
    webgazer.showFaceOverlay(true);
    webgazer.showFaceFeedbackBox(true);

    // Start calibration
    startCalibration();

    // Toggle Camera Button
    const toggleCameraButton = document.createElement('button');
    toggleCameraButton.innerText = 'Start Camera';
    toggleCameraButton.style.position = 'fixed';
    toggleCameraButton.style.top = '5px';
    toggleCameraButton.style.right = '25px';
    document.body.appendChild(toggleCameraButton);

    toggleCameraButton.addEventListener('click', () => {
        if (webGazerActive) {
            webgazer.pause(); // Stop eye tracking
            toggleCameraButton.innerText = 'Start Camera';
            camera.position.set(0, 1.6, 2.3);
            camera.rotation.set(0, 0, 0); // Reset rotation if needed
            webgazer.showVideo(false);
        } else {
            webgazer.resume(); // Resume eye tracking
            toggleCameraButton.innerText = 'Stop Camera';
            webgazer.showVideo(true);
        }
        webGazerActive = !webGazerActive; // Toggle the active state
    });

    const openAvatarCreatorBtn = document.getElementById("open-avatar-creator");
    openAvatarCreatorBtn.style.position = 'fixed';
    openAvatarCreatorBtn.style.top = '5px';
    openAvatarCreatorBtn.style.right = '650px';
    document.body.appendChild(openAvatarCreatorBtn);

    openAvatarCreatorBtn.addEventListener("click", () => {
        // Create the iframe element
        const iframe = document.createElement("iframe");
        iframe.id = "avatar-creator-iframe";
        iframe.src = "https://readyplayer.me/avatar";
        iframe.style.width = "100%";
        iframe.style.height = "725px"; // Adjust height as needed

        // Create a container element for the iframe (optional)
        const container = document.createElement("div");
        container.style.position = "fixed"; // Make the container fixed for better positioning
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; // Add a semi-transparent background (optional)
        container.style.zIndex = 100; // Set a high z-index to ensure the iframe is on top (optional)

        // Append the iframe to the container (optional)
        container.appendChild(iframe);

        // Append the container (or iframe directly) to the body
        document.body.appendChild(container); // Or document.body.appendChild(iframe);

        // (Optional) Add a close button to the container
        const closeButton = document.createElement("button");
        closeButton.textContent = "Close";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "750px";
        closeButton.addEventListener("click", () => {
            document.body.removeChild(container); // Or document.body.removeChild(iframe);
        });
        container.appendChild(closeButton);
    });

    // New element for the input field
    const modelUrlInput = document.createElement('input');
    modelUrlInput.type = 'text';
    modelUrlInput.placeholder = 'Paste model URL here';
    modelUrlInput.style.position = 'fixed';
    modelUrlInput.style.bottom = '10px';
    modelUrlInput.style.left = '10px';
    document.body.appendChild(modelUrlInput);
    document.body.appendChild(modelUrlInput);

    // New element for the load button
    const loadModelButton = document.createElement('button');
    loadModelButton.innerText = 'Load Model';
    loadModelButton.style.position = 'fixed';
    loadModelButton.style.bottom = '31px';
    loadModelButton.style.left = '10px';
    document.body.appendChild(loadModelButton);
    document.body.appendChild(loadModelButton);

    loadModelButton.addEventListener('click', () => {
        const modelUrl = modelUrlInput.value;
        if (!modelUrl) {
          return; // Handle empty URL case
        }
      
        // Clear the previously loaded model
        const currentModel = scene.getObjectByName('Prometheus'); // Assuming the model is named "Prometheus"
        if (currentModel) {
          scene.remove(currentModel);
          mixer.stopAllActions(); // Stop animations from the previous model
        }
      
        loader.load(modelUrl, (gltf) => {
          const model = gltf.scene;
          scene.add(model);
          model.name = 'Prometheus'; // Set a name for easier identification
      
          // Initialize the mixer for the new model
          mixer = new AnimationMixer(model);
      
          // Load idle animation
          fbxLoader.load('/assets/animations/idle.fbx', (idleAnim) => {
            idleAction = mixer.clipAction(idleAnim.animations[0]);
            idleAction.play(); // Start with idle animation
          });
      
          // Load thinking animation
          fbxLoader.load('/assets/animations/salute.fbx', (thinkingAnim) => {
            thinkingAction = mixer.clipAction(thinkingAnim.animations[0]);
          });
        });
    });
    createVoiceSelector();
    console.log('Voice selector initialized.');
});


// Toggle visibility of the chat window
toggleChatBtn.addEventListener("click", () => {
    if (chatContainer.style.display === "none") {
        chatContainer.style.display = "flex";
        toggleChatBtn.innerText = "Close Chat";
    } else {
        chatContainer.style.display = "none";
        toggleChatBtn.innerText = "Open Chat";
    }
});

function appendMessage(sender, text) {
    if (!text) {
        console.error("Empty message received:", sender, text);
        return; // Don't add empty messages to history
    }
    const newMessage = { sender, text };
    conversationHistory.push(newMessage);
    const messageElement = document.createElement("div");
    messageElement.className = sender === "user" ? "user-message" : "bot-message";
    messageElement.textContent = text;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight; // Scroll to the latest message
}

// Send a message to ChatGPT
async function sendMessageToChatGPT(userMessage) {
    appendMessage("user", userMessage);
    chatInput.value = ""; // Clear input
    if (userMessage.startsWith("open")) {
        const appName = userMessage.replace("open", "").trim(); // Extract the app name
        if (appName) {
            const url = `https://${appName}.com`;
            console.log(`Opening in a new tab: ${url}`);
            window.open(url, '_blank'); // Open the URL in a new tab
        } else {
            console.error("No application name specified after 'open'.");
        }
    } else {
        const conversationString = conversationHistory.map(message => {
            if (message && message.sender && message.text) {
                return `${message.sender}: ${message.text}`;
            } else {
                console.error("Invalid message object in conversation history:", message);
                return "";
            }
        }).join('\n');        
    
        const prompt = `You are an friendly and casual AI chatbot. This is our past conversation:\n${conversationString}\nUsing this info, answer this question, adapting to the tone and match the way they talk: ${userMessage}`;
    
        console.log("Sending prompt:", prompt);
        const aiResponse = await getAIResponse(prompt);
        console.log(`AI: ${aiResponse}`);
        appendMessage("bot", aiResponse);
    }
}

// Handle form submission
chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const userMessage = chatInput.value.trim();
    if (userMessage) {
        sendMessageToChatGPT(userMessage);
    }
});

// Event Handling
// let isSpacePressed = false;
// window.addEventListener('keydown', (event) => {
//     if (event.code === 'Space' && !isSpacePressed) {
//         isSpacePressed = true;
//         recognition.start();
//         idleAction.stop();
//         thinkingAction.play();
//     }
// });
// window.addEventListener('keyup', (event) => {
//     if (event.code === 'Space') isSpacePressed = false;
//     thinkingAction.stop();
//     idleAction.play();
// });

// Flag to track whether speech recognition is active
let isSpeechRecognitionActive = false;

// Update the event listener for keydown
window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && !event.repeat) { // Prevent triggering on key hold
        isSpeechRecognitionActive = !isSpeechRecognitionActive; // Toggle the state

        if (isSpeechRecognitionActive) {
            recognition.start();
            console.log("Speech recognition started");
            if (idleAction) idleAction.stop();
            if (thinkingAction) thinkingAction.play();
        } else {
            recognition.stop();
            console.log("Speech recognition stopped");
            if (thinkingAction) thinkingAction.stop();
            if (idleAction) idleAction.play();
        }
    }
});

// Ensure that animations return to idle when recognition ends unexpectedly
recognition.onend = () => {
    if (isSpeechRecognitionActive) {
        console.log("Speech recognition ended unexpectedly, restarting...");
        recognition.start(); // Restart recognition if it stopped unexpectedly
    } else {
        console.log("Speech recognition ended normally.");
        if (thinkingAction) thinkingAction.stop();
        if (idleAction) idleAction.play();
    }
};

// Speech Recognition
recognition.onresult = async (event) => {
    const userSpeech = event.results[0][0].transcript;
    console.log(`User: ${userSpeech}`);
    // Check for song recognition command
    if (userSpeech.includes("what is this song")) {
        console.log("Song recognition requested");
        speak("Listening to the song...");
        await recognizeCurrentSong();
        return;
    }
    // Check if the command starts with "open"
    if (userSpeech.startsWith("open")) {
        const appName = userSpeech.replace("open", "").trim(); // Extract the app name
        if (appName) {
            const url = `https://${appName}.com`;
            console.log(`Opening in a new tab: ${url}`);
            window.open(url, '_blank'); // Open the URL in a new tab
        } else {
            console.error("No application name specified after 'open'.");
        }
    } else {
        console.log("No valid 'open' command detected.");
        const conversationString = conversationHistory.map(message => {
            if (message && message.sender && message.text) {
                return `${message.sender}: ${message.text}`;
            } else {
                console.error("Invalid message object in conversation history:", message);
                return "";
            }
        }).join('\n');
        const prompt = `You are an friendly and casual AI chatbot. This is our past conversation:\n${conversationString}\nUsing this info, answer this question, adapting to the tone and match the way they talk: ${userSpeech}`;
        appendMessage("user", userSpeech);
        console.log("Sending prompt:", prompt);
        const aiResponse = await getAIResponse(prompt);
        console.log(`AI: ${aiResponse}`);
        appendMessage("bot", aiResponse);
        speak(aiResponse);
    }
};

// OpenAI API Call
async function getAIResponse(userText) {
    const response = await fetch(openaiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: userText }],
        })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Function to get voices when they are available
function getVoices() {
    return new Promise((resolve, reject) => {
        const voices = synth.getVoices();
        
        if (voices.length > 0) {
            resolve(voices);
        } else {
            synth.onvoiceschanged = () => {
                const voices = synth.getVoices();
                if (voices.length > 0) {
                    resolve(voices);
                } else {
                    reject(new Error("No voices found"));
                }
            };
        }
    });
}

// Function to create a voice selection dropdown
function createVoiceSelector() {
    const voiceSelector = document.createElement('select');
    voiceSelector.id = 'voice-selector';
    voiceSelector.style.position = 'fixed';
    voiceSelector.style.top = '10px';
    voiceSelector.style.left = '200px';
    document.body.appendChild(voiceSelector);

    // Fetch and populate voices
    getVoices().then(voices => {
        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = voice.name;
            voiceSelector.appendChild(option);
        });
    });

    // Store the selected voice in local storage
    voiceSelector.addEventListener('change', () => {
        const selectedVoiceIndex = voiceSelector.value;
        localStorage.setItem('selectedVoiceIndex', selectedVoiceIndex);
    });

    // Set the dropdown to the previously selected voice, if available
    const storedVoiceIndex = localStorage.getItem('selectedVoiceIndex');
    if (storedVoiceIndex) {
        voiceSelector.value = storedVoiceIndex;
    }
}

// Update the speak function to use the selected voice
async function speak(text) {
    const voices = await getVoices();
    const selectedVoiceIndex = localStorage.getItem('selectedVoiceIndex') || 0; // Default to the first voice
    const voice = voices[selectedVoiceIndex];

    if (voice) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang || 'en-US';
        synth.speak(utterance);
        console.log(utterance);
        console.log(`Speaking with voice: ${voice.name}`);
    } else {
        console.error('No voice available to speak.');
    }
}

async function recognizeCurrentSong() {
    try {
        // Create audio stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        // Record for 5 seconds
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks);
            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('api_token', audDApiKey);
            
            try {
                const response = await fetch(audDEndpoint, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.result) {
                    const songInfo = `This is ${data.result.title} by ${data.result.artist}`;
                    console.log(songInfo);
                    speak(songInfo);
                    appendMessage("bot", songInfo);
                } else {
                    const noMatch = "Sorry, I couldn't identify the song.";
                    speak(noMatch);
                    appendMessage("bot", noMatch);
                }
            } catch (error) {
                console.error('Error identifying song:', error);
                speak("Sorry, there was an error identifying the song.");
            }
            
            // Stop recording and release media stream
            stream.getTracks().forEach(track => track.stop());
        };

        // Start recording
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
    } catch (error) {
        console.error('Error accessing microphone:', error);
        speak("Sorry, I couldn't access the microphone.");
    }
}
