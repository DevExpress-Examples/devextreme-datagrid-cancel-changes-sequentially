using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Net.Http.Headers;

namespace ASP_NET_Core.Data;

public record RemoteResponse(int StatusCode, string Content, string ContentType, string SessionId);

// Forwards DataGrid requests to the remote DevExtreme demo service used by the jQuery example.
// The service stores changes per session, so each request carries the caller's remote session ID.
public class OrdersApiClient(HttpClient httpClient) {
    public const string Url = "https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi";
    public const string SessionCookieName = "ASP.NET_SessionId";

    public Task<RemoteResponse> LoadOrdersAsync(string sessionId) {
        return SendAsync(HttpMethod.Get, "Orders?skip=700", null, sessionId);
    }

    public Task<RemoteResponse> InsertOrderAsync(string values, string sessionId) {
        return SendAsync(HttpMethod.Post, "InsertOrder", new() { ["values"] = values }, sessionId);
    }

    public Task<RemoteResponse> UpdateOrderAsync(string key, string values, string sessionId) {
        return SendAsync(HttpMethod.Put, "UpdateOrder", new() { ["key"] = key, ["values"] = values }, sessionId);
    }

    public Task<RemoteResponse> DeleteOrderAsync(string key, string sessionId) {
        return SendAsync(HttpMethod.Delete, "DeleteOrder", new() { ["key"] = key }, sessionId);
    }

    async Task<RemoteResponse> SendAsync(HttpMethod method, string action, Dictionary<string, string> form, string sessionId) {
        using var request = new HttpRequestMessage(method, $"{Url}/{action}");
        if(form != null)
            request.Content = new FormUrlEncodedContent(form);
        if(!string.IsNullOrEmpty(sessionId))
            request.Headers.Add(HeaderNames.Cookie, new CookieHeaderValue(SessionCookieName, sessionId).ToString());

        using var response = await httpClient.SendAsync(request);
        return new RemoteResponse(
            (int)response.StatusCode,
            await response.Content.ReadAsStringAsync(),
            response.Content.Headers.ContentType?.ToString(),
            GetSessionId(response) ?? sessionId
        );
    }

    static string GetSessionId(HttpResponseMessage response) {
        if(!response.Headers.TryGetValues(HeaderNames.SetCookie, out var values))
            return null;
        return SetCookieHeaderValue.ParseList(values.ToList())
            .FirstOrDefault(cookie => cookie.Name == SessionCookieName)?.Value.Value;
    }
}
