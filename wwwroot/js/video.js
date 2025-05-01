const video = document.getElementById('localVideo');

const toggleVideoBtn = document.getElementById('toggleVideo');


function startVideo() {    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(function (stream) {
            video.srcObject = stream;
            video.play();
        });
    }
    
    toggleVideoBtn.setAttribute('data-state', 'opened');
    toggleVideoBtn.classList.add('btn-danger');
    toggleVideoBtn.classList.remove('btn-info');
    toggleVideoBtn.innerHTML = "Stop video";
    toggleShareBtn.disabled = true
}

function stopVideo() {
    var stream = video.srcObject;
    var tracks = stream.getTracks();

    for (var i = 0; i < tracks.length; i++) {
        var track = tracks[i];
        track.stop();
    }

    video.srcObject = null;

    toggleVideoBtn.setAttribute('data-state', 'closed');
    toggleVideoBtn.classList.add('btn-info');
    toggleVideoBtn.classList.remove('btn-danger');
    toggleVideoBtn.innerHTML = "Start video";
    toggleShareBtn.disabled = false
}


toggleVideoBtn.onclick = function () {
    var state = toggleVideoBtn.getAttribute('data-state')
    if (state === 'opened') {
        stopVideo();
    } else {
        startVideo();
    }
};

