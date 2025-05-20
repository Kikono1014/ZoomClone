using ZoomClone.Hubs;
using ZoomClone.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR(options => {
    options.MaximumReceiveMessageSize = null;
});

builder.Services.AddSingleton<List<Room>>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowAnyOrigin());
});
var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthorization();

app.UseCors("AllowAll");
app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Call}/{action=Join}/{id?}")
    .WithStaticAssets();
app.UseStaticFiles();
app.MapControllers();


app.MapGet("/downloadFile/{id}", (string id) => {
    if (ChatHub._fileMemory.TryGetValue(id, out var entry))
    {
        return Results.File(entry.Content, entry.ContentType, entry.FileName);
    }
    return Results.NotFound();
});



app.MapHub<CallHub>("/callHub", options =>
{
    options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.WebSockets;
});

app.MapHub<ChatHub>("/chatHub");


app.Run();
