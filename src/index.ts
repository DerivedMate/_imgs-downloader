import { Reader } from './Reader'
import { cpus } from 'os'

const input = process.argv[2]
const output = process.argv[3]

if (!input || !output) throw new Error('Missing some arguents')
else {
  const reader = new Reader(input, cpus().length, output)
}
