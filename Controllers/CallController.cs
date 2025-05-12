using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ZoomClone.Models;

namespace ZoomClone.Controllers;

public class CallController(List<Call> calls, ILogger<HomeController> logger) : Controller
{
    private readonly ILogger<HomeController> _logger = logger;
    private readonly List<Call> _calls = calls;

    public IActionResult Index()
    {
        return View();
    }
}
