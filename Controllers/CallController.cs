using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ZoomClone.Models;

namespace ZoomClone.Controllers;

public class CallController(List<Call> calls, ILogger<HomeController> logger) : Controller
{
    private readonly ILogger<HomeController> _logger = logger;
    private readonly List<Call> _calls = calls;

    public IActionResult Index(string? id)
    {
        if (id == null) return BadRequest();

        ViewData["roomId"] = id;
        return View();
    }
    
    public IActionResult Join()
    {
        return View();
    }

    [HttpPost]
    public IActionResult JoinPost(IFormCollection form)
    {
        return RedirectToAction("Index", new { id = form["RoomId"] });
    }
}
