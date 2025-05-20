"use strict";

const chatConnection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .build();

document.getElementById("sendPublicButton").disabled = true;
document.getElementById("sendPrivateButton").disabled = true;

chatConnection.start().then(function () {
    document.getElementById("sendPublicButton").disabled = false;
    document.getElementById("sendPrivateButton").disabled = false;
    chatConnection.invoke("Register", currentUser);
}).catch(function (err) {
    return console.error(err.toString());
});

document.getElementById("sendPublicButton").addEventListener("click", function (event) {
    const msg = document.getElementById("messageInput").value;
    chatConnection.invoke("SendPublicMessage", currentUser, msg).catch(err => console.error(err.toString()));
    document.getElementById("messageInput").value = "";
    event.preventDefault();
});

document.getElementById("sendPrivateButton").addEventListener("click", function (event) {
    const msg = document.getElementById("privateMessageInput").value;
    const recipient = document.getElementById("privateRecipientInput").value;
    chatConnection.invoke("SendPrivateMessage", currentUser, recipient, msg).catch(err => console.error(err.toString()));
    document.getElementById("privateMessageInput").value = "";
    document.getElementById("privateRecipientInput").value = "";
    event.preventDefault();
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
