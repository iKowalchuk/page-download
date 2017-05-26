'use strict'

var http = require('http')
var https = require('https')
var urlM = require('url')
var encoding = require("encoding")

exports.parseStringAsJsonObject = (json) => {
    var object

    try {
        object = JSON.parse(json.toString())
    } catch (err) {
        console.log(`ERROR parseStringAsJsonObject() ${err.message}`)
    }

    return object
}

exports.loadPageAsStringAsync = (downloadOptions) => {
    if (!downloadOptions.timeout) { downloadOptions.timeout = 30 }

    var options = {}

    if (downloadOptions.gBot) {
        options.headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        }
    }

    var parsedUrl = urlM.parse(downloadOptions.url)
    if (downloadOptions.proxyIp && downloadOptions.proxyPort) {
        options.host = downloadOptions.proxyIp
        options.port = downloadOptions.proxyPort
        options.path = downloadOptions.url
        options.headers = downloadOptions.headers
    } else {
        options.host = parsedUrl.hostname
        options.port = parsedUrl.port
        options.path = parsedUrl.path
    }

    return new Promise((resolve, reject) => {
        var httpModule = parsedUrl.protocol === "https:" ? https : http
        httpModule.get(options,
            (res) => {
                var body = []

                res.on('data', chunk => {
                    res.resume()
                    body.push(chunk)
                })

                res.on('end', () => {
                    res.resume()
                    resolve({ r: Buffer.concat(body).toString(), e: undefined })
                })

                res.resume()
            }).on('error', err => {
                if (downloadOptions.rejectOnError) {
                    reject(err.message)
                } else {
                    resolve({ r: undefined, e: err.message })
                }
            }).setTimeout(downloadOptions.timeout * 1000, function () {
                this.abort()
                var message = `Timedout (${downloadOptions.timeout} sec)`
                if (downloadOptions.rejectOnError) {
                    reject(message)
                } else {
                    resolve({ r: undefined, e: message })
                }
            })
    })
}
