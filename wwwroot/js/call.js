const callId = document.getElementById('CallId').textContent;
const usersContainer = document.getElementById('users');
const userSample = document.getElementById('userSample');

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/videoHub", signalR.HttpTransportType.WebSockets)
    .build();

connection.start().then(() => {
    let user = generateId();
    
    console.info('Joining...');
    connection.invoke("Join", user, callId).catch((err) => {
        console.error(err);
    });

    console.info(`Connected as ${user}`);


}).catch(err => console.error(err));

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


connection.on('ReceiveFrame', (data, userId) => {
    document.getElementById(userId).src = data;
}); 



const getVideoFrame = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth / 2;
    canvas.height = video.videoHeight / 2;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.4);
    return data;
}


let captureIntervalId = setInterval(() => {
    var stateVideo = toggleVideoBtn.getAttribute('data-state');
    var stateShare = toggleShareBtn.getAttribute('data-state');
    if (stateVideo === 'opened' ^ stateShare === 'opened')
    {
        const dataUrl = getVideoFrame()
        
        connection.invoke("SendFrame", dataUrl, callId)
                    .catch(err => console.error(err));
    }
}, 100);
