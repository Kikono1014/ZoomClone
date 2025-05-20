
const roomId = document.getElementById("roomId_").value.trim();
const username = document.getElementById("username_").value.trim();
const muteAudio = document.getElementById("muteAudio_").value.trim();
const muteVideo = document.getElementById("muteVideo_").value.trim();


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
  if (audioTrack.enabled) {
    micBtn.classList.remove("btn-danger");
    micBtn.classList.add("btn-primary");
  } else  {
    micBtn.classList.remove("btn-primary");
    micBtn.classList.add("btn-danger");
  }
};

const camBtn = document.getElementById('toggle-camera');
camBtn.onclick = () => {
  const videoTrack = localStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
  if (videoTrack.enabled) {
    restoreCameraToPeers();
    camBtn.classList.remove("btn-danger");
    camBtn.classList.add("btn-primary");
  } else {
    sendPlaceholderToPeers();
    camBtn.classList.remove("btn-primary");
    camBtn.classList.add("btn-danger");
  }
};

function createPlaceholderStream() {
  const canvas = document.getElementById('placeholderCanvas');
  const img    = document.getElementById('placeholderImg');
  const ctx    = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.captureStream(); 
}

async function sendPlaceholderToPeers() {
  const placeholderStream = createPlaceholderStream();
  const placeholderTrack  = placeholderStream.getVideoTracks()[0];

  Object.values(peerConnections).forEach(async pc => {
    const videoSender = pc.getSenders()
                         .find(s => s.track && s.track.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(placeholderTrack);
    }
  });
}

async function restoreCameraToPeers() {
  const cameraTrack  = localStream.getVideoTracks()[0];

  Object.values(peerConnections).forEach(async pc => {
    const videoSender = pc.getSenders()
                         .find(s => s.track && s.track.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(cameraTrack);
    }
  });

}


const shrbtn = document.getElementById('share-screen');

shrbtn.onclick = async () => {
  try {
    // Get screen media stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
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
    shrbtn.classList.remove("btn-danger");
    shrbtn.classList.add("btn-primary");


    camBtn.classList.remove("btn-primary");
    camBtn.classList.add("btn-danger");

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

      localStream = cameraStream;
      localStream = addUsername(localStream, username);
      localVideo.srcObject = localStream;

      shrbtn.classList.remove("btn-primary");
      shrbtn.classList.add("btn-danger");
      
      camBtn.classList.remove("btn-danger");
      camBtn.classList.add("btn-primary");
    };
  } catch (err) {
    console.error('Error sharing screen:', err);
  }

};






// Capture local media (camera + microphone)
async function initLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        // localVideo.srcObject = addUsername(localStream, username);
        
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

    // const title = document.createElement("p");
    // title.textContent = peerId;
    // title.style.fontSize = 10;
    
    // const div = document.createElement("div");
    // // div.id = "remote_" + peerId;
    // div.style.display = "inline-block";
    // video.className = "videoDiv";
    // div.appendChild(video);
    // div.appendChild(title);
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


function addUsername(stream, username) {
  // 1. Create a hidden video element to play the input stream.
  const video = document.createElement("video");
  video.srcObject = stream;
  // Ensure the video can autoplay (muted) to avoid browser blocks on autoplay.
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.display = "none";
  document.body.appendChild(video);

  // 2. Once the video is ready, create a canvas of matching dimensions.
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // We need to wait until the video metadata loads so dimensions are known.
  video.addEventListener("loadedmetadata", () => {
    // Set canvas width/height same as video resolution.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 3. Start the drawing loop: draw video frame + overlay text.
    function draw() {
      // Draw the current video frame onto the canvas.
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Configure text style for the username overlay.
      const fontSize = Math.floor(canvas.height * 0.1); // e.g., 4% of height
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; // White text, slightly translucent
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";    // Black outline for contrast
      ctx.lineWidth = 2;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";

      // Calculate position: 10px from top-left (or adjust as needed)
      const x = 10;
      const y = 10;

      // Draw outline first (strokeText) for readability against video backgrounds.
      ctx.strokeText(username, x, y);
      // Fill the text on top.
      ctx.fillText(username, x, y);

      // Schedule next frame draw.
      requestAnimationFrame(draw);
    }

    // Kick off the loop.
    requestAnimationFrame(draw);
  });

  // 4. Capture the canvas as a new MediaStream at 30fps (adjust if needed).
  //    Note: captureStream() only functions after the canvas is attached (but
  //    we can capture immediately here, since the drawing loop starts on 'loadedmetadata').
  const modifiedStream = canvas.captureStream(30);

  // If the original stream had audio, preserve it by adding its tracks to modifiedStream.
  stream.getAudioTracks().forEach((track) => {
    modifiedStream.addTrack(track);
  });

  // Clean-up: once the page unloads, stop video and canvas if desired.
  window.addEventListener("beforeunload", () => {
    video.pause();
    video.srcObject = null;
    canvas.width = canvas.height = 0;
  });

  return modifiedStream;
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
        remoteVideo.srcObject = event.streams[0];
        connection.invoke("SendUsername", roomId, peerId);
        
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
        connection.invoke("SendUsername", roomId, peerId);  
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

(async () => {
    if (!roomId) {
        alert("Enter a room name.");
        return;
    }

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
    connection.on("ReceiveUsername", (username, peerId) => {
        const remoteVideo = document.getElementById("remote_" + peerId);
        const stream = remoteVideo.srcObject;
        remoteVideo.srcObject = addUsername(stream, username);
    });

    await connection.start();
    console.log("SignalR connected, ID:", connection.connectionId);

    // Join the specified room; get list of other peers already in room
    const otherPeers = await connection.invoke("JoinRoom", roomId, username);
    console.log("Other peers in room:", otherPeers);

    // Create an offer for each existing peer
    otherPeers.forEach(peerId => {
        createOffer(peerId);
    });

    if (muteAudio !== "on") {
      micBtn.click();
    }

    if (muteVideo !== "on") {
      camBtn.click();
    }

})();
