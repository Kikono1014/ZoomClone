using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ZoomClone.Hubs;

public class CallHub : Hub
{
    // In-memory storage of room membership (for demo purposes)
    // Key = room name, Value = list of connection IDs in that room.
    private static readonly ConcurrentDictionary<string, List<string>> Rooms
        = new ConcurrentDictionary<string, List<string>>();
    private static readonly object _lock = new object();

    // Called by client to join a room. Returns existing peer IDs in the room.
    public async Task<string[]> JoinRoom(string roomName)
    {
        string connectionId = Context.ConnectionId;
        string[] others;

        lock (_lock)
        {
            if (!Rooms.ContainsKey(roomName))
                Rooms[roomName] = new List<string>();
            var list = Rooms[roomName];
            others = list.ToArray();  // IDs of peers already in room
            list.Add(connectionId);
        }

        await Groups.AddToGroupAsync(connectionId, roomName);
        return others;
    }

    // Client sends SDP offer to a specific peer
    public async Task SendOffer(string toConnectionId, string fromConnectionId, string offer)
    {
        await Clients.Client(toConnectionId).SendAsync("ReceiveOffer", fromConnectionId, offer);
    }

    // Client sends SDP answer to a specific peer
    public async Task SendAnswer(string toConnectionId, string fromConnectionId, string answer)
    {
        await Clients.Client(toConnectionId).SendAsync("ReceiveAnswer", fromConnectionId, answer);
    }

    // Client sends ICE candidate to a specific peer
    public async Task SendIceCandidate(string toConnectionId, string fromConnectionId, string candidate)
    {
        await Clients.Client(toConnectionId).SendAsync("ReceiveIceCandidate", fromConnectionId, candidate);
    }

    // Clean up when a user disconnects
    public override async Task OnDisconnectedAsync(System.Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        string? leftRoom = null;

        // Remove this connection from whichever room it was in
        lock (_lock)
        {
            foreach (var kvp in Rooms)
            {
                if (kvp.Value.Remove(connectionId))
                {
                    leftRoom = kvp.Key;
                    break;
                }
            }
        }

        if (leftRoom != null)
        {
            // Notify other members in the room that this user left
            await Clients.Group(leftRoom).SendAsync("UserLeft", connectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
