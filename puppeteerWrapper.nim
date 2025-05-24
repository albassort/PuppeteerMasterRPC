import net
import ../lib/postgresssy
import std/base64
import std/monotimes
import tables
import sets
import std/options
import pretty
import strutils
import std/endians  
import json
import jsony
import os
import sequtils
import sugar
import results 
import ./../lib/webParsers
type 
  PuppeteerRpcFuncs* = enum
    GoToPage = "goToPage",
    DumpPage = "dumpPage",
    Reload = "reload",
    Ping = "ping",
    GetUrl = "getUrl",
    Click = "click",
    Query = "query",
    Type = "type"
  PuppeteerError* = enum
    TimedOut, Dead
  PuppeteerRequest* = object
    case call* : PuppeteerRpcFuncs:
      of GoToPage:
        url* : string 
        waitForNetwork* = false 
      of DumpPage:
        includeNetwork* : bool
      of Reload, Ping, GetUrl:
        unused* : bool
      of Click, Query:
        selector* : string
      of Type:
        text* : string
        typeSelector* : string
  PuppeteerResponse* = object
    body* : string
    headers* : Table[string, string] 
    url* : string
  PageDump* = object
    html* : string
    status* : int
    responses* : Table[string, PuppeteerResponse]
  ImageDataAndType* = object
    data* : string
    format* : string

proc `$`(a :  PuppeteerRequest): string =
  var intermidiate = newJObject()
  intermidiate["params"] = newJObject()
  for key, val in fieldPairs[PuppeteerRequest](a):
    if key == "call":
      intermidiate["func"] = %* $val  
    else:
      intermidiate["params"][key] = %* $val  
  result = intermidiate.toJson()

proc recvJson(a : Socket, timeout = -1) : string = 

  var data : array[9, byte]
  var littleEndian : array[8, byte]
  var jsonData : string
  var results : seq[string]
  while true:
    discard a.recv(addr data[0], 9, timeout = timeout)
    swapEndian64(addr littleEndian[0], addr data[1])
    let ending  = cast[bool](data[0])
    var jsonLength = cast[int64](littleEndian)
    discard a.recv(jsonData, jsonLength, timeout = timeout)
    result.add(jsonData) 
    if ending:
      break

proc requestPuppeteer*(a : Socket, request : PuppeteerRequest) : Result[JsonNode, PuppeteerError] =
  let ping = PuppeteerRequest(call: Ping )
  a.send($ping)
  try:
    discard a.recvJson(15000)

  except CatchableError as e:      
    echo e[]
    return err Dead

  a.send($request)
  let t1 = getMonoTime()
  result = 
    try:
      ok parseJson(a.recvJson(15000))
    except Exception as e:      
      echo "MY ERROR:"
      echo getMonoTime()-t1
      echo e[]
      echo "=="
      err TimedOut


 
  #[
  let pageRequest = PuppeteerRequest(call: GoToPage, url :  url)
  let dumpRequest = PuppeteerRequest(call: DumpPage, includeNetwork : true)

  echo requestPuppeteer(socket, pageRequest).get()
  let dump = requestPuppeteer(socket, dumpRequest).get().to(PageDump)
  
  echo getHltvWinners(dump.html)
]#
