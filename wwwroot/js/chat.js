"use strict";

const chatConnection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .build();

chatConnection.start().then(function () {
    chatConnection.invoke("Register", currentUser, roomId);
}).catch(function (err) {
    return console.error(err.toString());
});

chatConnection.on("ReceivePublic", function (sender, message) {
    const encodedMsg = sender + ": " + message;
    const li = document.createElement("li");
    li.textContent = encodedMsg;
    document.getElementById("messagesList").appendChild(li);
});

chatConnection.on("ReceivePrivate", function (sender, recipient, message) {
    let displayText = "";
    if (recipient === currentUser) {
        displayText = `${sender} (private): ${message}`;
    } else if (sender === currentUser) {
        displayText = `${sender} (private to ${recipient}): ${message}`;
    }
    if (displayText) {
        const li = document.createElement("li");
        li.textContent = displayText;
        document.getElementById("messagesList").appendChild(li);
    }
});

chatConnection.on("ReceiveFile", (user, fileName, fileId) => {
    const list = document.getElementById('messagesList');
    const linkHtml = `<strong>${user}</strong> sent a file: <a href="/downloadFile/${fileId}" download>${fileName}</a><br/>`;
    list.innerHTML += linkHtml;
});


async function sendPublicMessage() {
    const msgInput = document.getElementById('publicMessageInput');
    const fileInput = document.getElementById('publicFileInput');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;
            await chatConnection.invoke("SendPublicFile", currentUser, roomId, file.name, base64Data);
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    } else if (msgInput.value !== '') {
        await chatConnection.invoke("SendPublicMessage", currentUser, roomId, msgInput.value);
        msgInput.value = '';
    }
}

async function sendPrivateMessage() {
    const recipient = document.getElementById("privateRecipientInput").value;
    const msgInput = document.getElementById('privateMessageInput');
    const fileInput = document.getElementById('privateFileInput');
    const file = fileInput.files[0];

    if (currentUser === recipient) return;
    
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;
            await chatConnection.invoke("SendPrivateFile", currentUser, recipient, file.name, base64Data);
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    } else if (msgInput.value !== '') {
        await chatConnection.invoke("SendPrivateMessage", currentUser, recipient, msgInput.value);
        msgInput.value = '';
    }
}
