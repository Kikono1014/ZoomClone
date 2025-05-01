const callId = document.getElementById('CallId').textContent;
const video = document.getElementById('localVideo');
const usersContainer = document.getElementById('users');
const userSample = document.getElementById('userSample');

const toggleVideoBtn = document.getElementById('toggleVideo');

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/videoHub")
    .withAutomaticReconnect()
    .build();

connection.start().then(() => {
    let user = generateId();
    
    console.info('Joining...');
    connection.invoke("Join", user, callId).catch((err) => {
        console.error(err);
    });

    console.info(`Connected as ${user}`);


}).catch(err => console.error(err));

connection.on('ReceiveFrame', (data, userId) => {
    document.getElementById(userId).src = data;
}); 

connection.on('UpdateUsers', users => {
    usersContainer.innerHTML = "";
    for (let user of users)
    {
        let userVideo = document.cloneNode(userSample).getElementById("userSample");
        userVideo.style.display = "inline-block";
        userVideo.id = user[1];
        usersContainer.appendChild(userVideo);
    }

}); 


const getVideoFrame = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth / 2;
    canvas.height = video.videoHeight / 2;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.5);
    return data;
}


let captureIntervalId = setInterval(() => {
    var state = toggleVideoBtn.getAttribute('data-state');
    if (state === 'opened')
    {
        const dataUrl = getVideoFrame()
        
        connection.invoke("SendFrame", dataUrl, callId)
                    .catch(err => console.error(err));
    }
}, 100);


function startVideo() {    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 200, height: 200 }, audio: false }).then(function (stream) {
            video.srcObject = stream;
            video.play();
        });
    }
    
    toggleVideoBtn.setAttribute('data-state', 'opened');
    toggleVideoBtn.classList.add('btn-danger');
    toggleVideoBtn.classList.remove('btn-info');
    toggleVideoBtn.innerHTML = "Stop video";
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
}


toggleVideoBtn.onclick = function () {
    var state = toggleVideoBtn.getAttribute('data-state')
    if (state === 'opened') {
        stopVideo();
    } else {
        startVideo();
    }
};
