using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace ZoomClone.Hubs;

public class VideoHub : Hub
{
    public async Task SendFrame(string frameData)
    {
        await Clients.All.SendAsync("ReceiveFrame", frameData);
    }
}