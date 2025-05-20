using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ZoomClone.Controllers;


[ApiController]
[Route("api/[controller]")]
public class VideoController : ControllerBase
{
    // POST /api/video/record
    [HttpPost("record")]
    public async Task<IActionResult> Record([FromForm] IFormFile videoFile)
    {
        if (videoFile == null || videoFile.Length == 0)
        {
            return BadRequest("No video file provided.");
        }

        // Decide where to store recordings. e.g. wwwroot/recordings or "RecordedVideos" at content root.
        var recordingsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/recordings");
        if (!Directory.Exists(recordingsDir))
        {
            Directory.CreateDirectory(recordingsDir);
        }

        // Generate a unique filename (e.g. GUID.webm)
        var fileName = $"{Guid.NewGuid()}.webm";
        var filePath = Path.Combine(recordingsDir, fileName);

        using (var fs = new FileStream(filePath, FileMode.Create, FileAccess.Write))
        {
            await videoFile.CopyToAsync(fs);
        }

        // Return the path (relative or absolute) so client can notify user
        var relativePath = Path.Combine("recordings", fileName);
        return Ok(new { path = relativePath });
    }
}
