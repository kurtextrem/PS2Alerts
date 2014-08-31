+function (window) {
	'use strict';

	var flares = {
		0: [128, 0, 255, 255], // Vanu
		1: [0, 200, 255, 255], // NC
		2: [219, 0, 0, 255], // TR
		3: [255, 238, 0, 255] // NS
	}

	var serverData = {
		'25': 'Briggs',
		'11': 'Ceres',
		'13': 'Cobalt',
		'1': 'Connery',
		'17': 'Emerald',
		'10': 'Miller',
		'9': 'Woodman'
	}

	var Alert = function () {
		this.addListener()
	}

	Alert.prototype = {
		url: 'http://kurtextrem.de/PS2/data.json',

		constructor: Alert,
		updateTime: 2,
		servers: {},
		main: 13,
		flare: 0,
		notification: 13,
		hide: 0,
		remember: false,
		count: 0,
		alert: false,
		timeRemind: 30,
		alwaysRemind: false,
		errorCount: 0,

		init: function (force, callback) {
			chrome.storage.local.get({
				main: 13,
				flare: 0,
				lastUpdate: 0,
				servers: {},
				notification: 13,
				hide: 0,
				remember: false,
				alert: false,
				timeRemind: 30,
				alwaysRemind: false
			}, function (data) {
				this.alert = data.alert
				this.main = data.main
				this.flare = data.flare
				this.notification = data.notification
				this.hide = data.hide
				this.remember = data.remember
				this.servers = data.servers
				this.timeRemind = data.timeRemind
				this.alwaysRemind = data.alwaysRemind
				this.count = 0

				if (data.servers === '') {
					force = true
				} else {
					this.servers = data.servers
				}
				if (force || Date.now() - data.lastUpdate >= this.updateTime * 60000) {
					this.update()
				}
				if (callback !== undefined)
					callback()
			}.bind(this))
		},

		update: function () {
			chrome.storage.local.set({ lastUpdate: Date.now() })

			qwest.get(this.url, {}, { dataType: 'json', headers: { Connection: 'close' }}).success(function (data) {
				if (!data) {
					if (!this.errorCount) {
						this.errorCount++
						return window.setTimeout(this.update.bind(this), 30000)
					}
					return
				}
				this.errorCount =  0

				var server, length = Object.keys(data).length - 1
				for (var i = 0; i < length; i++) {
					server = data[i]
					server.id = +(server.ServerID)
					if (server.id === 18) return; // Emerald fix
					server.name = serverData[server.id]
					server.alert = data.Actives[i] || {}
					if (server.ServerStatus === 'ONLINE') {
						this._updateServer(server)
					} else {
						this.alert = false
						chrome.storage.local.set({ alert: false })
						server.alert.notified = false
						this.sendToPopup(server)
					}
				}

				chrome.storage.local.set({ servers: this.servers, count: this.count, serverTimestamp: Date.now() })
				this.updateIcon()
			}.bind(this)).error(function () {
				if (!this.errorCount) {
					this.errorCount++
					window.setTimeout(this.update.bind(this), 30000)
				}
			}.bind(this))
		},

		sendToPopup: function (server) {
			this.servers['s' + server.id] = server

			var popups = chrome.extension.getViews({ type: 'popup' })
			if (0 < popups.length)
				popups[0].App.updated(server)
		},

		_updateServer: function (server) {
			if (server.Status === 'INACTIVE') {
				server.alert.notified = false
				if (server.id === this.main) {
					this.alert = false
					chrome.storage.local.set({ alert: false })
					this.clearBadgeAlarm()
				}
				this.sendToPopup(server)
				return false
			}

			this.count++
			server.Status = 1
			server.alert = server.alert.Stats
			server.alert.start = +(server.LastTimestamp + '000')
			server.alert.type = server.Detail.type
			server.alert.zone = server.Detail.cont

			if (server.id === this.main) {
				this.alert = true
				chrome.storage.local.set({ alert: true })
				this.setBadgeAlarm(server)
			}

			if (server.id === this.notification || this.notification === 0) {
				if (typeof this.servers['s' + server.id] !== 'undefined' && !this.servers['s' + server.id].alert.notified) {
					server.alert.notified = true
					this.createNotification(server)
				} else {
					server.alert.notified = true
				}
			}

			this.sendToPopup(server)
			return true
		},

		clearBadgeAlarm: function () {
			chrome.browserAction.setBadgeText({ text: '' })
			chrome.alarms.clear('update-badge')
			this.updateIcon()
			if (this.hide && !this.alert)
				chrome.browserAction.disable()
		},

		setBadgeAlarm: function (server) {
			this.updateBadge(server)
			chrome.storage.local.set({ server: server })
			chrome.alarms.get('update-badge', function (alarm) {
				if (alarm === undefined)
					chrome.alarms.create('update-badge', {
						delayInMinutes: 1,
						periodInMinutes: 1
					})
			})
		},

		addListener: function () {
			chrome.runtime.onInstalled.addListener(function () {
				this.init()
				this.registerUpdateAlarms()
			}.bind(this))
			chrome.alarms.onAlarm.addListener(function (alarm) {
				this.init(false, function () {
					if (alarm.name === 'update-badge')
						return this.updateBadge(this.servers['s' + this.main])
					//if (alarm.name === 'update') // Updates anyway, if required
					//	return this.update()
				}.bind(this))
			}.bind(this))
		},

		updateBadge: function (server) {
			if (server.status === 'INACTIVE')
				this.clearBadgeAlarm()
			if (server.Status === 1) {
				var current = Date.now(),
				date = new Date(+server.alert.start - current)

				if (server.alert.type === 'Territory' || server.alert.zone === 'Global') {
					date.setUTCHours(date.getUTCHours() + 2)
				} else {
					date.setUTCHours(date.getUTCHours() + 1)
				}

				var h = date.getUTCHours()
				var m = ('0' + date.getUTCMinutes()).slice(-2)

				if (h > 2 || (h + +m) < 0) {
					this.alert = false
					chrome.storage.local.set({ alert: false })
					this.clearBadgeAlarm()
				} else {
					chrome.browserAction.enable()
					if (this.remember && h < 1 && m <= this.timeRemind) {
						this.remember = false
						chrome.storage.local.set({ remember: false })
						this.createNotification(server, true)
					}
					if (m === '00')
						m = '01'
					chrome.browserAction.setBadgeText({
						text: h + ':' + m
					})
					chrome.browserAction.setBadgeBackgroundColor({
						color: flares[this.flare]
					})
				}
			}
		},

		registerUpdateAlarms: function () {
			chrome.alarms.create('update', { delayInMinutes: this.updateTime, periodInMinutes: this.updateTime })
		},

		createNotification: function (server, reminder) {
			var opt = {
				type: 'basic',
				iconUrl: 'img/AlertIconWaves3.png'
			}
			if (reminder) {
				opt.title = server.name + ' Alert: ' + this.timeRemind + 'min left!'
				opt.message =  this.timeRemind + 'min left, start playing now!'
			} else {
				opt.title = server.name + ': Alert just started!'
				opt.message = 'An alert started on ' + server.name + '.'
				opt.buttons = [{
					title: 'Remind me ' + this.timeRemind + 'min before the alert ends'
				}]
			}
			chrome.notifications.create(server.id + '-alert-' + !!reminder, opt, function (id) {
				if (!reminder && this.alwaysRemind) {
					this.remember = true
					chrome.storage.local.set({ remember: true })
				}
				chrome.notifications.onButtonClicked.addListener(function (id, index) {
					this.remember = true
					chrome.storage.local.set({ remember: true })
				}.bind(this))
			}.bind(this))
		},

		updateIcon: function () {
			var path = 'img/notification_tray_empty.png'
			if (this.alert)
				path = 'img/notification_tray_attention.png'

			var canvas = document.getElementsByTagName('canvas')
			if (canvas.length < 1) {
				canvas = document.createElement('canvas')
				canvas.setAttribute('width', '19')
				canvas.setAttribute('height', '19')
				document.getElementsByTagName('body')[0].appendChild(canvas)
				canvas = [canvas]
			}
			var context = canvas[0].getContext('2d'),
			imageObj = new Image()

			imageObj.onload = function () {
				context.clearRect(0, 0, 19, 19)
				context.drawImage(imageObj, 0, 0, 19, 19)
				context.fillStyle = '#888'
				context.fillText(this.count, 6.5, 12)
				var details = {
					imageData: 0
				}
				details.imageData = context.getImageData(0, 0, 19, 19)
				chrome.browserAction.setIcon(details)
			}.bind(this)
			imageObj.src = path
			chrome.browserAction.setTitle({ title: this.count + ' Alerts running' })
		}
	}

	window.alert = new Alert()
}(window)
