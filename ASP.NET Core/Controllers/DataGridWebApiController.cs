using System.Threading.Tasks;
using ASP_NET_Core.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ASP_NET_Core.Controllers;

// Proxies DataGrid CRUD requests to the remote demo service (OrdersApiClient.Url).
[Route("api/[controller]/[action]")]
public class DataGridWebApiController(OrdersApiClient client): Controller {
    // Stores the remote service session ID, so each browser keeps its own set of changes.
    const string SessionCookie = "DataGridWebApiSession";

    [HttpGet]
    public async Task<IActionResult> Orders() {
        return ToActionResult(await client.LoadOrdersAsync(SessionId));
    }

    [HttpPost]
    public async Task<IActionResult> InsertOrder([FromForm] string values) {
        return ToActionResult(await client.InsertOrderAsync(values, SessionId));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateOrder([FromForm] string key, [FromForm] string values) {
        return ToActionResult(await client.UpdateOrderAsync(key, values, SessionId));
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteOrder([FromForm] string key) {
        return ToActionResult(await client.DeleteOrderAsync(key, SessionId));
    }

    string SessionId => Request.Cookies[SessionCookie];

    IActionResult ToActionResult(RemoteResponse response) {
        if(!string.IsNullOrEmpty(response.SessionId) && response.SessionId != SessionId)
            Response.Cookies.Append(SessionCookie, response.SessionId, new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Lax });

        return new ContentResult {
            StatusCode = response.StatusCode,
            Content = response.Content,
            ContentType = response.ContentType
        };
    }
}
