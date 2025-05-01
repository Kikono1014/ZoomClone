using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ZoomClone.Models;

namespace ZoomClone.Controllers;

public class CallController(List<Call> calls, ILogger<HomeController> logger) : Controller
{
    private readonly ILogger<HomeController> _logger = logger;
    private readonly List<Call> _calls = calls;

    public IActionResult Index(string id)
    {
        if (!_calls.Any(i => i.CallId == id))
            _calls.Add(new Call() { CallId = id });

        ViewData["CallId"] = id;
        ViewData["Users"] = _calls.First(i => i.CallId == id).Users;

        return View();
    }

    public IActionResult Source()
    {
        return View();
    }
}
