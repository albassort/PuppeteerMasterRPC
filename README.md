# Puppeteer Master
Puppeteer Master is a simple RPC for puppeteer to communicate between puppeteer and native sockets. 

# Features
  - Communicates over native sockets
  - Allows multiple threads to use it at once
  - Can dump not only the page content but also all content downloaded in the process of fetching the page, e.g images and videos
  - Configured to maintain cookies and such by default.
  - JSON RPC

# Limitations
Currently, each connection is a page in the browser. So to use multiple pages at once you need multiple socket connection, but multiple threads works because there is a lock while processing each command. The browser will switch to the requesting connection before executing your request. 

After each connection disconnects, the page is destroyed.


# Packet Format
The RPC is JSON, its platform agnostic ideally. The request Format is as follows
```
{
  "func": $FUNC,
  "params":
    {
      $PARAMS
    } 
}
```
For example, to type in the first "input", the text "Hello, World!":
```
{
"func": "type"
"params": {
    "typeSelector" : "input",
    "text" : "Hello, World"
  }
}
```
The following functions are available, with their corresponding params:
## Request Format
```
#EXAMPLE:
# funcName - Description 
# param1 -- Description
-
goToPage - Navigates to the given url
  url: String -- The url you wish to navigate to
  waitForNetwork: Bool -- If you wait for a cesation of network traffic. This is hard coded to be 500ms.
-
dumpPage - Dumps all the data on the page
  includeNetwork: Bool -- Sends all of the assets downloaded on the page. This format will be explained later on in this document
-
click - Clicks on the first element which meets the provided CSS selector
  selector: String -- The CSS selector you wish to click
-
query - Gets the specific contents of the selector provided. Less heavy than a full page dump!
  selector: String -- The CSS selector for the html you wish to dump
-
type - Types the given text in the first element which meets the CSS selector provided
  text: String -- The text you wish to type in the selected element
  typeSelector String -- The CSS selector you wish to type text into
-
ping -- Checks if the daemon is alive
-
reload -- Reloads the page
-
getUrl -- Returns the current url
```
Similarly, the response format is also JSON. The response format is as follows: 
## Response Format
```
Global Response (always returned)
status:
  0 -- Good
  -1 -- Bad (the request failed, don't expect any data)
-
getUrl
url: String -- The current url on the page
-
query
html: HTML DATA -- The html data of the selector you asked for!
-
DumpPage
responses: JsonObject -- Present if requested, contains all assets downloaded by the request.
html: HTML DATA -- The entire webpage's html content
-
```
## Downloaded Response Format
```

{
  "headers": String-String Keyval Pair -- The request headers,
  "body": Base64-Encoded String -- The body of the url requested. Images, Videos, JS Code, etc. Useful for webscraping,
  "url": String -- The URL requested
}
```

## Examples

I have programmed a wrapper in Nim for my THB project, you can find it [here](https://raw.githubusercontent.com/albassort/puppeteerRPC/refs/heads/master/puppeteerRPC.nim)
Here is an example of its API; the same principles work in any language. 

```nim
let pageRequest = PuppeteerRequest(call: GoToPage, url :  "http://localhost:5173")

echo requestPuppeteer(socket, pageRequest).get()

let getGetMe = PuppeteerRequest(call: Query, selector : "#getme")

let body = parseHtml(requestPuppeteer(socket, getGetMe).get()["html"].getStr)

doAssert body[0].innerText == "GET ME"

let typeInTypy = PuppeteerRequest(call: Type, typeSelector : "#enter-in-me", text : testString)

echo requestPuppeteer(socket, typeInTypy).get()

let dontClick = PuppeteerRequest(call: Click, selector : "")
echo requestPuppeteer(socket, dontClick).get()
let clicky = PuppeteerRequest(call: Click, selector : "#click-me")
```
The full example is in ./test/test.nim.
