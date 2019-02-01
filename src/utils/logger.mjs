import util from 'util'

export default class Logger {
  constructor(name) {
    this.name = name
  }

  showPadded(indicator, level) {
    const fourSpace = '    '
    const clams = typeof indicator === 'object' ? util.inspect(indicator) : indicator
    const shell = clams.split(/\r?\n/)
    console[level](fourSpace + shell.join('\n' + fourSpace))
  }

  log(str) {
    console.log(`[${(new Date()).toISOString()}] ${this.name} | ${str}`)
  }

  detail(indicator) {
    if (!config.flags.verbose) return
    this.showPadded(indicator, 'log')
  }

  error(indicator) {
    this.showPadded(indicator, 'error')
  }
}
