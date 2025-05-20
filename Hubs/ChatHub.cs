using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Concurrent;

namespace ZoomClone.Hubs;

public class ChatHub : Hub
{
    private static ConcurrentDictionary<string, string> _users = new();
    public static readonly Dictionary<string, (byte[] Content, string ContentType, string FileName)> _fileMemory
        = new Dictionary<string, (byte[], string, string)>();

    public async Task Register(string username, string roomId)
    {
        _users[username] = Context.ConnectionId;
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
    }

    public Task SendPublicMessage(string sender, string roomId, string message)
    {
        return Clients.Group(roomId)
                        .SendAsync("ReceivePublic", sender, message);
    }

    public async Task SendPrivateMessage(string sender, string recipient, string message)
    {
        if (_users.TryGetValue(recipient, out var recipientConnId) &&
            _users.TryGetValue(sender, out var senderConnId))
        {
            await Clients.Client(recipientConnId)
                            .SendAsync("ReceivePrivate", sender, recipient, message);
            await Clients.Client(senderConnId)
                            .SendAsync("ReceivePrivate", sender, recipient, message);
        }
    }

    public async Task SendPublicFile(string user, string roomId, string fileName, string fileData)
    {
        var parts = fileData.Split(',');
        var contentType = parts[0].Split(':')[1].Split(';')[0];
        byte[] bytes = Convert.FromBase64String(parts[1]);

        var fileId = Guid.NewGuid().ToString();
        _fileMemory[fileId] = (bytes, contentType, fileName);

        await Clients.Group(roomId).SendAsync("ReceiveFile", user, fileName, fileId);
    }

    public async Task SendPrivateFile(string sender, string recipient, string fileName, string fileData)
    {
        var parts = fileData.Split(',');
        var contentType = parts[0].Split(':')[1].Split(';')[0];
        byte[] bytes = Convert.FromBase64String(parts[1]);

        var fileId = Guid.NewGuid().ToString();
        _fileMemory[fileId] = (bytes, contentType, fileName);

        if (_users.TryGetValue(recipient, out var recipientConnId) &&
            _users.TryGetValue(sender, out var senderConnId))
        {
            await Clients.Client(recipientConnId).SendAsync("ReceiveFile", sender, fileName, fileId);
            await Clients.Client(senderConnId).SendAsync("ReceiveFile", sender, fileName, fileId);
        }

    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var user = _users.FirstOrDefault(kvp => kvp.Value == Context.ConnectionId).Key;
        if (user != null)
        {
            _users.TryRemove(user, out _);
        }
        await base.OnDisconnectedAsync(exception);
    }
}