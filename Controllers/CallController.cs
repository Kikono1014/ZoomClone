using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ZoomClone.Models;

namespace ZoomClone.Controllers;

public class CallController(ILogger<HomeController> logger) : Controller
{
    private readonly ILogger<HomeController> _logger = logger;

    public IActionResult Index()
    {
        return View();
    }

    public IActionResult Source()
    {
        return View();
    }
}
