using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ZoomClone.Models;

namespace ZoomClone.Hubs;

public class CallHub(List<Room> rooms) : Hub
{
    private readonly List<Room> _rooms = rooms;
    
    private static readonly object _lock = new object();

    
    public async Task<string[]> JoinRoom(string roomName, string username)
    {
        string connectionId = Context.ConnectionId;
        string[] others;

        lock (_lock)
        {
            Room? room = _rooms.FirstOrDefault(i => i.RoomId == roomName);
            room ??= new Room() { RoomId = roomName, Users = [] };
            
            var list = room.Users.Select(i => i.ConnectionId).ToList();
            others = [.. list];
            room.Users.Add(new User() { Username = username, ConnectionId = connectionId });
        }

        await Groups.AddToGroupAsync(connectionId, roomName);
        return others;
    }

    public async Task SendOffer(string toConnectionId, string fromConnectionId, string offer)
    {
        await Clients.Client(toConnectionId).SendAsync("ReceiveOffer", fromConnectionId, offer);
    }

    public async Task SendAnswer(string toConnectionId, string fromConnectionId, string answer)
    {
        await Clients.Client(toConnectionId).SendAsync("ReceiveAnswer", fromConnectionId, answer);
    }

    public async Task SendIceCandidate(string toConnectionId, string fromConnectionId, string candidate)
    {
        await Clients.Client(toConnectionId).SendAsync("ReceiveIceCandidate", fromConnectionId, candidate);
    }


    public async Task SendUsername(string roomId, string connectionId)
    {
        string username = _rooms.First(i => i.RoomId == roomId)
                                .Users
                                .First(i => i.ConnectionId == connectionId).Username;
        await Clients.Caller.SendAsync("ReceiveUsername", username, connectionId);
    }

    public override async Task OnDisconnectedAsync(System.Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        Room? leftRoom = null;

        lock (_lock)
        {
            foreach (var room in _rooms)
            {
                if (room.Users.Remove(room.Users.First(i => i.ConnectionId == connectionId)))
                {
                    leftRoom = room;
                    break;
                }
            }
        }

        if (leftRoom != null)
        {
            await Clients.Group(leftRoom.RoomId).SendAsync("UserLeft", connectionId);
            if (leftRoom.Users.Count == 0)
            {
                _rooms.Remove(leftRoom);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}
