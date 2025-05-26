import puppeteerRPC
import print
import net 
import options
import results
import jsony
import json
import os
import htmlparser
import xmltree

let testString = "hehe"
var socket = newSocket(AF_UNIX,SOCK_SEQPACKET, IPPROTO_IP)
connectUnix(socket, "../puppeteer.sock")
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


echo requestPuppeteer(socket, clicky).get()

let dumpy = PuppeteerRequest(call: DumpPage, includeNetwork: true)

let responses = requestPuppeteer(socket, dumpy).get().to(PageDump).responses

let getResult = PuppeteerRequest(call: Query, selector : ".result")

#Json within json haha
let result = parseJson(requestPuppeteer(socket, getResult).get()["html"].getStr)

doAssert(result["successful"].getBool == true) 

doAssert(result["goodEnter"].getStr == testString) 

print responses

sleep 10000
