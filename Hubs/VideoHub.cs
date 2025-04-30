using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using System.Diagnostics;
using System.ComponentModel;

namespace ZoomClone.Hubs;

public class VideoHub : Hub
{
    public async Task SendFrame(string frameData)
    {
        string base64Data = Regex.Match(frameData, @"data:image/(?<type>.+?),(?<data>.+)").Groups["data"].Value;
        byte[] binData = Convert.FromBase64String(base64Data);
        
        string path = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

        string fileName = "frame.jpeg";
        path = Path.Combine(path, fileName);

        // File.WriteAllBytes(path, binData);
        
        // Image image = Image.Load(binData);
        // await image.SaveAsJpegAsync("/home/kikono/Documents/frame1.jpeg");


        await Clients.All.SendAsync("ReceiveFrame", frameData);
    }
}