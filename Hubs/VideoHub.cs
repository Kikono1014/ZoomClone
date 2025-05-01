using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using System.Diagnostics;
using System.ComponentModel;
using ZoomClone.Models;
using System.Text;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.ColorSpaces;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace ZoomClone.Hubs;


public class VideoHub(List<Call> calls) : Hub
{
    private readonly List<Call> _calls = calls;


    public async Task Join(string username, string callId)
    {
        User user = new()
        {
            Username = username,
            ConnectionId = Context.ConnectionId
        };

        Call call = _calls.First(i => i.CallId == callId);
        call.Users.Add(user);

        await Groups.AddToGroupAsync(Context.ConnectionId, call.CallId);
        await UpdateUsers(call);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Call call = _calls.First(i => i.Users.Any(j => j.ConnectionId == Context.ConnectionId));
        call.Users.RemoveAll(u => u.ConnectionId == Context.ConnectionId);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, call.CallId);
        await UpdateUsers(call);

        if (call.Users.Count == 0)
            _calls.Remove(call);


        await base.OnDisconnectedAsync(exception);
    }

    public async Task UpdateUsers(Call call)
    {
        await Clients.Group(call.CallId)
            .SendAsync("UpdateUsers", call.Users.Select(i => new List<string>([i.Username, i.ConnectionId])));
    }


    public async Task SendFrame(string frameData, string callId)
    {
        //! if recording
        // Call call = _calls.First(i => i.CallId == callId);
        // User user = call.Users.First(i => i.ConnectionId == Context.ConnectionId);
        // user.FrameData = frameData;

        await Clients.Group(callId).SendAsync("ReceiveFrame", frameData, Context.ConnectionId);
    }
        
    //! For recording only
    // public string CombineFrames(string callId)
    // {
    //     Call call = _calls.First(i => i.CallId == callId);

    //     List<Image> images = [];
    //     int width = 0;
    //     int height = 0;


    //     foreach (var user in call.Users)
    //     {
    //         if (user.FrameData is null)
    //             continue;

    //         string base64Data = Regex.Match(user.FrameData, @"data:image/(?<type>.+?),(?<data>.+)").Groups["data"].Value;
    //         byte[] binData = Convert.FromBase64String(base64Data);

    //         Image image = Image.Load(binData);

    //         width += image.Width;

    //         height += image.Height;
    //         images.Add(image);
    //     }


    //     Image combined = new Image<Rgb24>(width, height);

    //     int xPosition = 0;
    //     foreach (var image in images)
    //     {
    //         combined.Mutate(i => i.DrawImage(image, new Point(xPosition, 0), 1f));
    //         xPosition += image.Width;
    //     }

    //     return combined.ToBase64String(JpegFormat.Instance);
    // }
}