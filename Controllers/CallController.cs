using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ZoomClone.Models;

namespace ZoomClone.Controllers;

public class CallController(List<Room> rooms, ILogger<HomeController> logger) : Controller
{
    private readonly ILogger<HomeController> _logger = logger;
    private readonly List<Room> _rooms = rooms;

    public IActionResult Index(string? id, string? username, string? muteAudio, string? muteVideo)
    {
        if (id == null) return BadRequest();

        Room? room = _rooms.FirstOrDefault(i => i.RoomId == id);
        if (room is null)
            _rooms.Add(new Room() { RoomId = id });

        ViewData["RoomId"] = id;
        ViewData["Username"] = username;
        ViewData["MuteAudio"] = muteAudio;
        ViewData["MuteVideo"] = muteVideo;
        
        return View();
    }
    
    public IActionResult Join()
    {
        return View();
    }

    [HttpPost]
    public IActionResult JoinPost(IFormCollection form)
    {
        return RedirectToAction("Index", new
        {
            id = form["RoomId"],
            username = form["Username"],
            muteAudio = form["MuteAudio"],
            muteVideo = form["MuteVideo"]
        });
    }
}
