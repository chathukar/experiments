// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA973XL9wV_FNXLmbwFGwhg00O3SJmJj1E",
    authDomain: "letmeshowyouthis-42d37.firebaseapp.com",
    databaseURL: "https://letmeshowyouthis-42d37-default-rtdb.firebaseio.com",
    projectId: "letmeshowyouthis-42d37",
    storageBucket: "letmeshowyouthis-42d37.firebasestorage.app",
    messagingSenderId: "518467169936",
    appId: "1:518467169936:web:f701130cba79b926273215",
    measurementId: "G-PPFE0F696B"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("Firebase initialized");

// Version tracking function
function updateVersionInfo() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };
    const timeString = now.toLocaleString('en-US', options);
    document.getElementById('versionInfo').textContent = `Version: ${timeString}`;
}

// Call it when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateVersionInfo();
});

let currentRoom = null;
let messageListener = null;

// DOM Elements
const roomSelection = document.getElementById('roomSelection');
const chatInterface = document.getElementById('chatInterface');
const roomInput = document.getElementById('roomInput');
const joinRoomButton = document.getElementById('joinRoomButton');
const leaveRoomButton = document.getElementById('leaveRoomButton');
const roomInfo = document.getElementById('roomInfo');
const textarea = document.getElementById('myTextarea');
const messageContainer = document.getElementById('messageContainer');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');

// Add console logs to debug
console.log("Elements found:", {
    roomSelection, chatInterface, roomInput, joinRoomButton
});

// Join Room
joinRoomButton.addEventListener('click', () => {
    console.log("Join button clicked");
    const roomNumber = roomInput.value.trim();
    console.log("Room number:", roomNumber);
    if (roomNumber) {
        joinRoom(roomNumber);
    }
});

// Also join room when pressing Enter in the room input
roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        console.log("Enter pressed in room input");
        const roomNumber = roomInput.value.trim();
        if (roomNumber) {
            joinRoom(roomNumber);
        }
    }
});

// Add this after Firebase initialization
function updateRoomCount(roomNumber) {
    const roomRef = database.ref(`rooms/${roomNumber}/users`);
    
    // Add this user to the room
    const userRef = roomRef.push(true);

    // Remove user when they disconnect
    userRef.onDisconnect().remove();

    // Listen for changes in user count
    roomRef.on('value', (snapshot) => {
        const userCount = snapshot.numChildren();
        roomInfo.textContent = `Room: ${roomNumber} (${userCount} user${userCount !== 1 ? 's' : ''} online)`;
    });

    return userRef;
}

let currentUserRef = null; // Add this with your other global variables

// Modify your joinRoom function
function joinRoom(roomNumber) {
    console.log("Joining room:", roomNumber);
    currentRoom = roomNumber;
    
    // Switch interfaces
    roomSelection.style.display = 'none';
    chatInterface.style.display = 'block';
    
    // Add user to room and track presence
    currentUserRef = updateRoomCount(roomNumber);
    
    // Clear previous messages
    messageContainer.innerHTML = '';
    
    // Remove previous listener if exists
    if (messageListener) {
        database.ref(`rooms/${currentRoom}/messages`).off('child_added', messageListener);
    }
    
    // Listen for messages in this room
    messageListener = database.ref(`rooms/${currentRoom}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        addMessageToContainer(message.text);
    });
}

// Leave Room
leaveRoomButton.addEventListener('click', () => {
    leaveRoom();
});

// Add this function to check and clear empty rooms
function checkAndClearEmptyRoom(roomNumber) {
    const roomRef = database.ref(`rooms/${roomNumber}`);
    roomRef.child('users').once('value', (snapshot) => {
        if (!snapshot.exists() || snapshot.numChildren() === 0) {
            console.log("Room is empty, clearing messages");
            // Clear all messages from empty room
            roomRef.child('messages').remove()
                .then(() => console.log("Cleared messages from empty room"))
                .catch(error => console.error("Error clearing messages:", error));
        }
    });
}

// Modify your leaveRoom function
function leaveRoom() {
    if (messageListener) {
        database.ref(`rooms/${currentRoom}/messages`).off('child_added', messageListener);
    }
    
    // Remove user from room
    if (currentUserRef) {
        currentUserRef.remove()
            .then(() => {
                // Check if room is empty after user leaves
                checkAndClearEmptyRoom(currentRoom);
            });
        currentUserRef = null;
    }
    
    currentRoom = null;
    messageListener = null;
    
    // Switch back to room selection
    chatInterface.style.display = 'none';
    roomSelection.style.display = 'block';
    roomInput.value = '';
    messageContainer.innerHTML = '';
}

function sendMessage() {
    const message = textarea.value;
    if (message.trim() !== '' && currentRoom) {
        // Save message to Firebase under the current room
        database.ref(`rooms/${currentRoom}/messages`).push({
            text: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => console.log("Message saved to Firebase"))
        .catch(error => console.error("Error saving message:", error));
        
        textarea.value = '';
    }
}

// Send button click handler
sendButton.addEventListener('click', sendMessage);

// Enter key handler
textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Clear button click handler
clearButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
        // Clear Firebase database for current room
        database.ref(`rooms/${currentRoom}/messages`).remove()
            .then(() => {
                console.log("Messages cleared from Firebase");
                messageContainer.innerHTML = '';
            })
            .catch(error => console.error("Error clearing messages:", error));
    }
});

function addMessageToContainer(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.textContent = message;
    messageContainer.insertBefore(messageDiv, messageContainer.firstChild);
}
