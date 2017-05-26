'use strict'

const http = require('http')
const https = require('https')
const httpsProxyAgent = require('https-proxy-agent')
const urlM = require('url')
const log = require('logging')

exports.parseStringAsJsonObject = (json) => {
    let object

    try {
        object = JSON.parse(json.toString())
    } catch (err) {
        log.warn(`ERROR parseStringAsJsonObject() ${err.message}`)
    }

    return object
}

exports.loadPageAsStringAsync = (downloadOptions) => {
    if (!downloadOptions.timeout) { downloadOptions.timeout = 30 }

    const options = {}

    if (downloadOptions.method) {
        options.method = downloadOptions.method
    }

    if (downloadOptions.headers) {
        options.headers = downloadOptions.headers
    }

    if (downloadOptions.gBot) {
        if (!options.headers) { options.headers = {} }

        options.headers['User-Agent'] = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    }

    const parsedUrl = urlM.parse(downloadOptions.url)
    if (downloadOptions.proxyIp && downloadOptions.proxyPort) {
        if (parsedUrl.protocol === 'https:') {
            const proxy = urlM.parse(`http://${downloadOptions.proxyIp}:${downloadOptions.proxyPort}`)
            if (downloadOptions.proxyUser && downloadOptions.proxyPass) {
                proxy.auth = `${downloadOptions.proxyUser}:${downloadOptions.proxyPass}`
            }
            const agent = new httpsProxyAgent(proxy)

            options.host = parsedUrl.hostname
            options.port = parsedUrl.port
            options.path = parsedUrl.path
            options.agent = agent
        } else {
            if (downloadOptions.proxyUser && downloadOptions.proxyPass) {
                if (!options.headers) { options.headers = {} }
                
                options.headers['Proxy-Authorization'] = `Basic ${new Buffer(`${downloadOptions.proxyUser}:${downloadOptions.proxyPass}`).toString("base64")}`
                options.headers['Host'] = parsedUrl.host
            }

            options.host = downloadOptions.proxyIp
            options.port = downloadOptions.proxyPort
            options.path = downloadOptions.url
        }
    } else {
        options.host = parsedUrl.hostname
        options.port = parsedUrl.port
        options.path = parsedUrl.path
    }

    return new Promise((resolve, reject) => {
        const httpModule = parsedUrl.protocol === 'https:' ? https : http
        const req = httpModule.request(options,
            (res) => {
                const body = []

                res.on('data', chunk => {
                    res.resume()
                    body.push(chunk)
                })

                res.on('end', () => {
                    res.resume()
                    resolve({ r: Buffer.concat(body).toString(), rb: Buffer.concat(body), s: res.statusCode, e: undefined, h: res.headers })
                })

                res.resume()
            }).on('error', err => {
                if (downloadOptions.rejectOnError) {
                    reject(err)
                } else {
                    resolve({ r: undefined, e: err })
                }
            }).setTimeout(downloadOptions.timeout * 1000, function () {
                this.abort()
                const err = new Error(`Timedout (${downloadOptions.timeout} sec)`)
                if (downloadOptions.rejectOnError) {
                    reject(err)
                } else {
                    resolve({ r: undefined, e: err })
                }
            })
        if (downloadOptions.body) {
            req.write(downloadOptions.body)
        }

        req.end()
    })
}