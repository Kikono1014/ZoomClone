
const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideos = document.getElementById("remoteVideos");

// Configuration for RTCPeerConnection (using Google’s STUN server for NAT traversal)
const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

let localStream = null;
const peerConnections = {};  // Map of peerId -> RTCPeerConnection
let connection = null;       // SignalR HubConnection



const micBtn = document.getElementById('toggle-mic');
micBtn.onclick = () => {
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
};

const camBtn = document.getElementById('toggle-camera');
camBtn.onclick = () => {
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack && videoTrack.enabled) {
    // If camera currently on, turn off and send placeholder
    videoTrack.enabled = false;
    sendPlaceholderToPeers();
  } else {
    // If camera off or placeholder, restore actual camera
    videoTrack.enabled = true;
    restoreCameraToPeers();
  }
};



document.getElementById('share-screen').onclick = async () => {
  try {
    // Get screen media stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    // Replace video track in each peer connection
    for (const pc of Object.values(peerConnections)) {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }
    }

    // Replace video track in local video element
    const localVideo = document.getElementById('localVideo');
    localVideo.srcObject = screenStream;

    // Stop sharing when user ends screen share
    screenTrack.onended = async () => {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const cameraTrack = cameraStream.getVideoTracks()[0];

      for (const pc of Object.values(peerConnections)) {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(cameraTrack);
        }
      }

      localVideo.srcObject = cameraStream;
      localStream = cameraStream; // update your local stream reference
    };
  } catch (err) {
    console.error('Error sharing screen:', err);
  }
};



function createPlaceholderStream() {
  const canvas = document.getElementById('placeholderCanvas');
  const img    = document.getElementById('placeholderImg');
  const ctx    = canvas.getContext('2d');

  // Draw the image once (it will persist)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Capture a MediaStream from the canvas at 1 fps (default)
  return canvas.captureStream();  // uses HTMLCanvasElement.captureStream() :contentReference[oaicite:0]{index=0}
}

async function sendPlaceholderToPeers() {
  const placeholderStream = createPlaceholderStream();
  const placeholderTrack  = placeholderStream.getVideoTracks()[0];

  // For each RTCPeerConnection, replace the outgoing video track
  Object.values(peerConnections).forEach(async pc => {
    const videoSender = pc.getSenders()
                         .find(s => s.track && s.track.kind === 'video');
    if (videoSender) {
      // Swap in the placeholder track without renegotiation :contentReference[oaicite:2]{index=2}
      await videoSender.replaceTrack(placeholderTrack);
    }
  });

  // Also update your local <video> element so you see the placeholder
  localVideo.srcObject = placeholderStream;
  localStream = placeholderStream;  // update reference if needed
}

async function restoreCameraToPeers() {
  // Get real camera + mic again
  const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const cameraTrack  = cameraStream.getVideoTracks()[0];

  // Swap back on each peer connection
  Object.values(peerConnections).forEach(async pc => {
    const videoSender = pc.getSenders()
                         .find(s => s.track && s.track.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(cameraTrack);
    }
  });

  // Update local preview
  localVideo.srcObject = cameraStream;
  localStream = cameraStream;
}






// Capture local media (camera + microphone)
async function initLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error("Error accessing media devices.", err);
        alert("Could not access camera/microphone: " + err);
    }
}

// Create a video element for a new remote peer
function createRemoteVideo(peerId) {
    const video = document.createElement("video");
    video.id = "remote_" + peerId;
    video.autoplay = true;
    video.playsInline = true;
    video.className = "remote";
    remoteVideos.appendChild(video);
    return video;
}

// Remove a remote video element when a peer leaves
function removeRemoteVideo(peerId) {
    const video = document.getElementById("remote_" + peerId);
    if (video) {
        video.srcObject = null;
        remoteVideos.removeChild(video);
    }
}

// Handle incoming offer: create RTCPeerConnection, set remote desc, send answer
async function handleReceiveOffer(peerId, offer) {
    console.log("Received offer from", peerId);
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections[peerId] = pc;

    // Add local tracks to the connection
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // When an ICE candidate is found, send it to the peer
    pc.onicecandidate = event => {
        if (event.candidate) {
            connection.invoke("SendIceCandidate", peerId, connection.connectionId, JSON.stringify(event.candidate));
        }
    };

    // When remote track arrives, show it in a video element
    pc.ontrack = event => {
        const remoteVideo = document.getElementById("remote_" + peerId) || createRemoteVideo(peerId);
        // The event.streams[0] contains the remote MediaStream
        remoteVideo.srcObject = event.streams[0];
    };

    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    // Send answer back to the offering peer
    connection.invoke("SendAnswer", peerId, connection.connectionId, JSON.stringify(pc.localDescription));
}

// Handle incoming answer: set it as remote description
async function handleReceiveAnswer(peerId, answer) {
    console.log("Received answer from", peerId);
    const pc = peerConnections[peerId];
    if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
    }
}

// Handle incoming ICE candidate: add to the peer connection
async function handleReceiveIceCandidate(peerId, candidate) {
    console.log("Received ICE candidate from", peerId);
    const pc = peerConnections[peerId];
    if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
    }
}

// Create an RTCPeerConnection as the caller (new user) and send an offer
async function createOffer(peerId) {
    console.log("Creating offer for", peerId);
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections[peerId] = pc;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = event => {
        if (event.candidate) {
            connection.invoke("SendIceCandidate", peerId, connection.connectionId, JSON.stringify(event.candidate));
        }
    };

    pc.ontrack = event => {
        const remoteVideo = document.getElementById("remote_" + peerId) || createRemoteVideo(peerId);
        remoteVideo.srcObject = event.streams[0];
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // Send the offer to the existing peer
    connection.invoke("SendOffer", peerId, connection.connectionId, JSON.stringify(offer));
}

// Handle a user leaving: close their connection and remove video
function handleUserLeft(peerId) {
    console.log("Peer left:", peerId);
    const pc = peerConnections[peerId];
    if (pc) {
        pc.close();
        delete peerConnections[peerId];
    }
    removeRemoteVideo(peerId);
}

joinBtn.onclick = async () => {
    const roomName = roomInput.value.trim();
    if (!roomName) {
        alert("Enter a room name.");
        return;
    }

    joinBtn.disabled = true;
    // Initialize local media
    await initLocalStream();

    // Connect to SignalR hub
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/callHub")  // matches the MapHub path
        .withAutomaticReconnect()
        .build();

    // Define handlers for messages from the hub
    connection.on("ReceiveOffer", (peerId, offer) => {
        handleReceiveOffer(peerId, offer);
    });
    connection.on("ReceiveAnswer", (peerId, answer) => {
        handleReceiveAnswer(peerId, answer);
    });
    connection.on("ReceiveIceCandidate", (peerId, candidate) => {
        handleReceiveIceCandidate(peerId, candidate);
    });
    connection.on("UserLeft", (peerId) => {
        handleUserLeft(peerId);
    });

    await connection.start();
    console.log("SignalR connected, ID:", connection.connectionId);

    // Join the specified room; get list of other peers already in room
    const otherPeers = await connection.invoke("JoinRoom", roomName);
    console.log("Other peers in room:", otherPeers);

    // Create an offer for each existing peer
    otherPeers.forEach(peerId => {
        createOffer(peerId);
    });
};