import rl, { ReadLine } from 'readline'
import fs from 'fs'
import cl from 'cluster'
import { resolve } from 'path'

export type Data = [string, string, string]

export class Reader {
  // @ts-ignore
  stream: ReadLine
  processedCount: number = 0
  current: number = 0
  doneReading: boolean = false
  buffer: Data[]
  constructor(
    public filePath: string,
    public maxWorkers: number,
    public dist: string
  ) {
    this.buffer = []
    this._initWorkers().then(() => {
      this.stream = rl.createInterface({
        input: fs.createReadStream(resolve(__dirname, filePath), {
          encoding: 'utf-8',
          highWaterMark: 128,
        }),
      })
      this._initEvents()
    })
  }

  private _initEvents() {
    this.stream.on('line', this.onLine)
    this.stream.on('close', () => {
      this.doneReading = true
    })
    cl.on('message', this.onMessage)
  }

  private _initWorkers() {
    return new Promise(res => {
      cl.setupMaster({
        exec: resolve(__dirname, 'Worker'),
      })

      for (let i = 0; i < this.maxWorkers; i++) {
        cl.fork()
        this.current++
      }
      cl.once('online', res)
    })
  }

  filterLine(line: string): boolean {
    return !/data:/gi.test(line)
  }

  onLine = (line: string) => {
    if (!this.filterLine(line)) return
    const processed = this.processInput(line)
    processed && this.buffer.push(processed)

    if (this.buffer.length > this.maxWorkers) this.stream.pause()
  }

  onMessage = (worker: cl.Worker, msg: string) => {
    console.log(msg)
    if (this.doneReading && this.buffer.length === 0) worker.kill()
    else {
      console.clear()
      console.log(`Currently running: ${this.current}`)
      const v = this.consume()
      if (v) {
        worker.send(v)
        this.processedCount++
        console.log(`Processed: ${this.processedCount}`)
      } else {
        worker.send('')
        this.current--
      }
    }
  }

  processInput(line?: string): Data | undefined {
    if (!line) return
    const [url, ext] = line.split(',').map(s => s.trim())
    return [this.dist, url, ext]
  }

  consume() {
    if (this.buffer.length === this.maxWorkers) this.stream.resume()
    return this.buffer.pop()
  }
}

process.on('beforeExit', () => {
  for (const w in cl.workers) {
    // @ts-ignore
    cl.workers[w] && cl.workers[w].kill()
  }
})
