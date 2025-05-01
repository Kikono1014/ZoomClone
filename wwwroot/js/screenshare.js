const toggleShareBtn = document.getElementById('toggleShare');


function startShare() {    
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        var constraints = { audio: false,
            video:{
                width:  { ideal: 1000, max: 1920 },
                height: { ideal: 1000, max: 1080 },
                frameRate: { ideal: 30 }
            }
        };
        navigator.mediaDevices.getDisplayMedia(constraints).then(function (stream) {
            video.srcObject = stream;
            video.play();
        });
    }
    
    toggleShareBtn.setAttribute('data-state', 'opened');
    toggleShareBtn.classList.add('btn-danger');
    toggleShareBtn.classList.remove('btn-info');
    toggleShareBtn.innerHTML = "Stop sharing";
    toggleVideoBtn.disabled = true
}

function stopShare() {
    var stream = video.srcObject;
    var tracks = stream.getTracks();

    for (var i = 0; i < tracks.length; i++) {
        var track = tracks[i];
        track.stop();
    }

    video.srcObject = null;

    toggleShareBtn.setAttribute('data-state', 'closed');
    toggleShareBtn.classList.add('btn-info');
    toggleShareBtn.classList.remove('btn-danger');
    toggleShareBtn.innerHTML = "Start sharing";
    toggleVideoBtn.disabled = false
}


toggleShareBtn.onclick = function () {
    var state = toggleShareBtn.getAttribute('data-state')
    if (state === 'opened') {
        stopShare();
    } else {
        startShare();
    }
};

