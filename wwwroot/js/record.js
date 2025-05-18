
(() => {
    // Grab references to our newly added buttons:
    const startBtn = document.getElementById("startRecordingBtn");
    const stopBtn  = document.getElementById("stopRecordingBtn");
    const remoteVideosContainer = document.getElementById("remoteVideos");

    let mediaRecorder = null;
    let recordedChunks = [];
    let captureCanvas = null;
    let canvasCtx = null;
    let drawIntervalId = null;

    // 1. Observe when a <video> is appended into #remoteVideos.
    //    Once at least one <video> exists, enable the Start button.
    const observer = new MutationObserver((mutationsList) => {
        // Check if there is at least one <video> child
        const hasVideo = remoteVideosContainer.querySelector("video") !== null;
        if (hasVideo) {
            startBtn.disabled = false;
        }
    });
    observer.observe(remoteVideosContainer, { childList: true, subtree: true });

    // 2. When the user clicks "Start Recording"
    startBtn.addEventListener("click", () => {
        // Disable Start, enable Stop
        startBtn.disabled = true;
        stopBtn.disabled = false;

        // If already recording, bail
        if (mediaRecorder && mediaRecorder.state === "recording") {
            console.warn("Already recording.");
            return;
        }

        // Create a hidden <canvas> element to composite all remote <video> elements
        captureCanvas = document.createElement("canvas");
        canvasCtx = captureCanvas.getContext("2d");

        // We need to decide canvas dimensions. For simplicity:
        //   – If there's only one remote video, size canvas to that video's resolution.
        //   – If multiple, tile them horizontally.
        const videos = Array.from(remoteVideosContainer.querySelectorAll("video"));
        if (videos.length === 0) {
            console.error("No remote <video> elements found. Cannot start recording.");
            return;
        }

        // Assume each video has same width/height. If not, pick the largest width/height among them.
        let maxWidth = 0, maxHeight = 0;
        videos.forEach(v => {
            // If not yet playing we might not know dimensions; fall back to 640x480 default.
            const w = v.videoWidth || 640;
            const h = v.videoHeight || 480;
            if (w > maxWidth) maxWidth = w;
            if (h > maxHeight) maxHeight = h;
        });

        // If multiple videos, tile horizontally
        captureCanvas.width  = maxWidth * videos.length;
        captureCanvas.height = maxHeight;

        // Do not add this canvas to the DOM; keep it off‐screen.

        // Use captureStream() on the canvas at 30fps (you can tweak fps):
        const recordedStream = captureCanvas.captureStream(30);
        
        const [videoTrack] = recordedStream.getVideoTracks();
        const [audioTrack] = videos.map((i) => i.srcObject.getAudioTracks()[0]);

        const combinedStream = new MediaStream([
            videoTrack,
            audioTrack
        ]);


        // Create a MediaRecorder to record the canvas stream.
        const mime = "video/webm";
        const options = { mimeType: mime };
        if (!MediaRecorder.isTypeSupported(mime)) {
          console.error("MIME not supported:", mime);
        }
        try {
            mediaRecorder = new MediaRecorder(combinedStream, options);
        } catch (e) {
            console.error("Failed to create MediaRecorder:", e);
            alert("MediaRecorder is not supported or mimeType not supported by this browser.");
            startBtn.disabled = false;
            stopBtn.disabled = true;
            return;
        }

        recordedChunks = [];
        mediaRecorder.ondataavailable = (evt) => {
            if (evt.data && evt.data.size > 0 && !(evt.data.size === 0)) {
                recordedChunks.push(evt.data);
            }
        };
        mediaRecorder.onstop = async () => {
            // Assemble the final Blob
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            // Send it to server
            await uploadRecordedBlob(blob);
            recordedChunks = [];
        };

        // Start drawing frames from each remote <video> onto the canvas every ~33ms (~30fps).
        drawIntervalId = setInterval(() => {
            canvasCtx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);

            videos.forEach((v, idx) => {
                // Only draw if the video is ready (has dimensions)
                if (v.videoWidth > 0 && v.videoHeight > 0) {
                    // Draw each video side by side
                    canvasCtx.drawImage(
                        v,
                        idx * maxWidth,  // x offset
                        0,
                        maxWidth,
                        maxHeight
                    );
                }
            });
        }, 1000 / 30);

        // Finally, start the recorder
        mediaRecorder.start(1000 / 30);
        
        console.log("Recording started. state =", mediaRecorder.state);
    });

    // 3. When user clicks "Stop Recording"
    stopBtn.addEventListener("click", () => {
        stopBtn.disabled = true;

        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            console.log("Recording stopped.");
        }
        if (drawIntervalId) {
            clearInterval(drawIntervalId);
            drawIntervalId = null;
        }
        // Re-enable the Start button so user can record again if desired
        startBtn.disabled = false;
    });

    // Helper: Sends the final Blob to /api/video/record
    async function uploadRecordedBlob(blob) {
        const formData = new FormData();
        formData.append("videoFile", blob, "recording.webm");

        try {
            const resp = await fetch("/api/video/record", {
                method: "POST",
                body: formData
            });
            if (!resp.ok) {
                throw new Error(`Server returned ${resp.status}`);
            }
            const json = await resp.json();
            console.log("Server saved video to:", json.path);
            console.log("Video successfully recorded on server:\n" + json.path);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload recording: " + err.message);
        }
    }
})();
