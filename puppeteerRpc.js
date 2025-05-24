const jsesc = require('jsesc');
var AsyncLock = require('async-lock');
const { PuppeteerBlocker } = require('@ghostery/adblocker-puppeteer');
var lock = new AsyncLock();

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const { SeqpacketServer, SeqpacketSocket } = require('node-unix-socket');
const os = require('os');
const path = require('path');
const fs = require('fs');

const bindPath = path.resolve('./puppeteer.sock');
try {
  fs.unlinkSync(bindPath);
} catch (e) { }

const server = new SeqpacketServer();
server.listen(bindPath);
puppeteer.use(StealthPlugin());
let browser;
let pages = {}
let pageResponses = {}

async function init() {
  browser = await puppeteer.launch(
    {
      headless: false,
      userDataDir: './puppeteer'
    }
  );

}

async function newPage(id) {
  //  Creates a new page and registers it for the given connection ID
  //  Connection ids are created upon a new connection.
  //  Each connection has its own ID, and its own page.
  if (id in pages) {
    await pages[id].close()
  }
  pages[id] = await browser.newPage();

  PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInPage(pages[id]);
  });
  pageResponses[id] = {}
  pages[id].on('request', (request) => {
    if (request.url().includes('cookie')) {
      request.abort()
    }
  })

  pages[id].on('response', async (response) => {
    try {
      let obj = {
        headers: response.headers(),
        body: (await response.buffer()).toString("base64"),
        url: response.url()
      }
      pageResponses[id][response.url()] = obj
    }
    catch (e) {
      return
    }
  })

  pages[id].setDefaultTimeout(5000)
}
async function gotoPage(url, id, waitForNetwork = false) {
  pageResponses[id] = {}
  ////console.log(url)
  ////console.log(pages)

  await pages[id].goto(url, {})
  if (waitForNetwork) {
    await pages[id].waitForFunction(
      'window.performance.timing.loadEventEnd - window.performance.timing.navigationStart >= 100'
    );
  }
}

async function getPageData(id, exportResponses) {
  ////console.log("id" + id)

  ////console.log("pages" + pages)
  const html = await pages[id].content();
  ////console.log(exportResponses)
  if (exportResponses) {
    ////console.log(pageResponses)
    ////console.log(pageResponses[id])
    return {
      "responses": pageResponses[id],
      "html": html
    }
  }
  return {
    "html": html,
  }
}

(async () => {
  await init()
})()

async function parseReqeust(json, id) {
  let response = {}
  let func = json.func;
  let params = json.params

  if (pages[id] == null) {
    return
  }

  try {
    await pages[id].bringToFront()
  }
  catch (e) {
    return;
  }
  let page = pages[id]

  switch (func) {
    case "goToPage":
      if (!("url" in params)) {
        return {
          status: -1
        }
      }

      await gotoPage(params.url, id, params.waitForNetwork)
      response = {
        status: 0
      }
      break;
    case "dumpPage":
      ////console.log("DUMPING")
      let data = await getPageData(id, params.includeNetwork)
      data["status"] = 0
      response = data
      break;
    case "reload":
      await pages[id].reload()
      response = { status: 0 }
      break;
    case "ping":
      response = { status: 0 }
      break;
    case "getUrl":
      response = {
        status: 0,
        url: pages[id].getUrl()
      }
      break;
    case "click":
      let selector = params["selector"]
      if (!selector) {
        return {
          status: -1
        }
      }
      let button = await page.$(selector)
      await button.click()
      response = {
        status: 0
      }
      break;
    case "type": {
      await pages[id].type(params.typeSelector, params.text)
      response = { status: 0 }
      breakl
    };
    case "query": {
      const bodyHandle = await page.$(params.selector);
      const html = await page.evaluate(body => body.innerHTML, bodyHandle);
      response = { status: 0, html: html }
      await bodyHandle.dispose();
      break;
    }
  }
  return response
}

let idCounter = 0

//only  put the raw json in here please
function splitBuffer(buffer, maxLength) {
  //  There is a maximum size of message in Linux when sent between sockets
  //  So, this function splits up the buffer.
  let result = []
  if (maxLength > buffer.length - 16) {
    let numbers = Buffer.alloc(9)
    numbers.writeUInt8(1, 0)
    numbers.writeBigInt64BE(BigInt(buffer.length), 1)
    let resultBuffer = Buffer.concat([numbers, buffer])
    result.push(resultBuffer)
    return result;
  }
  let totalSent = 0
  let length = buffer.length
  while (true) {
    let totalTransfer = maxLength - 9
    let toTransfer = 0
    if (totalSent + totalTransfer > length) {
      toTransfer = length - totalSent
    }
    else {
      toTransfer = totalTransfer
    }
    let numbers = Buffer.alloc(9)

    if (!("id" in response)) {
      response["id"] = 0
    }

    numbers.writeUInt8(
      toTransfer == totalTransfer
        ? 0 : 1, 0);

    numbers.writeBigInt64BE(BigInt(toTransfer), 1)


    let newBuffer = buffer.slice(totalSent, totalSent + toTransfer)

    result.push(Buffer.concat([numbers, newBuffer]))

    totalSent += toTransfer
    if (toTransfer != totalTransfer) {
      break
    }

  }
  return result;
}

server.on('connection', async (socket, bindPath) => {

  //  Creates a new ID for each connection
  idCounter += 1
  let id = structuredClone(idCounter)
  socket.on('end', async () => {
    try {
      if (pages[id] != null) {
        await pages[id].close()
      }
    }
    catch {

    }
  })


  socket.on('data', async (buff) => {
    lock.acquire('key', async () => {
      if (!(id in pages)) {
        //console.log("NOT FOUND")
        try {
          await newPage(id)
        }
        catch (e) {
          socket.destroy()
          return;
        }
      }
      response = {}
      //console.log(id)
      try {
        let stringified = buff.toString('utf8')
        let request = JSON.parse(stringified)
        response = await parseReqeust(request, id)
      }
      catch (e) {
        console.log(e)
        response = { status: -1 }
      }
      //TODO: Maybe manage this so it doesn't break as readily
      //console.log('response section')
      let stringified = JSON.stringify(response)

      let jsonBuffer = Buffer.from(stringified)

      let buffers = splitBuffer(jsonBuffer, 1000)
      let i;
      for (i = 0; i != buffers.length; i++) {
        console.log(socket.destroyed)
        if (socket.destroyed) {
          break
        }

        await Promise.resolve().then(() => socket.write(buffers[i])).catch(x => { console.log("pipe broken") })
      }

    })
  });

  socket.on('error', async () => {
    try {
      await pages[id].close()
    }
    catch (e) {

    }
    finally {
      pages[id] = null;
    }

    socket.destroy()
  })
});


