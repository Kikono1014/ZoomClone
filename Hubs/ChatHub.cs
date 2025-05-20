using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Concurrent;

namespace ZoomClone.Hubs;

public class ChatHub : Hub
{
    private static ConcurrentDictionary<string, string> _users = new();

    public async Task Register(string username)
    {
        _users[username] = Context.ConnectionId;
        await Groups.AddToGroupAsync(Context.ConnectionId, "ChatGroup");
    }

    public Task SendPublicMessage(string sender, string message)
    {
        return Clients.Group("ChatGroup")
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