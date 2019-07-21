import http from 'http'
import https from 'https'
import { Data } from './Reader'
import { resolve } from 'path'
import { createWriteStream } from 'fs'

const rIsHttps = /^https:\/\//
const rIsHttp = /^http:\/\//

const genFileName = (ext: string): string =>
  new Array(8)
    .fill(0)
    .reduce(
      acc => (acc += (Math.floor(Math.random() * 256) + 256).toString(16)),
      ''
    ) + `.${ext}`

console.log(`[#${process.pid}]> Worker on duty, sir!`)
process.send && process.send('')

process.on('message', (msg?: Data) => {
  if (!msg) return process.abort()
  const [dist, url, ext] = msg
  const writer = createWriteStream(resolve(dist, genFileName(ext)), {
    encoding: 'utf-8',
  })

  if (rIsHttp.test(url)) http.get(url, res => res.pipe(writer))
  else if (rIsHttps.test(url))
    https.get(url, res => {
      res.pipe(writer)
    })

  writer.on('finish', () => process.send && process.send('Finished: ' + url))
})

process.on('beforeExit', () => {
  console.log(`[#${process.pid}]> Worker off duty!`)
})
