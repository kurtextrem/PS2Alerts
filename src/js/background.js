+function (window) {
	'use strict'

	var chrome = window.chrome,
		document = window.document

	var VERSION = 1.1

	var flares = {
		0: ['NS', [255, 238, 0, 255]],
		1: ['Vanu', [128, 0, 255, 255]],
		2: ['NC', [0, 200, 255, 255]],
		3: ['TR', [219, 0, 0, 255]]

	}

	var serverData = {
		1: 'Connery',
		10: 'Miller',
		13: 'Cobalt',
		17: 'Emerald',
		25: 'Briggs',
		19: 'Jaeger (Events)',
		1000: 'Genudine (PS4US)',
		2000: 'Ceres (PS4EU)'
	}

	var zoneData = {
		2: 'Indar',
		4: 'Hossin',
		6: 'Amerish',
		8: 'Esamir'
	}

	var tries = 0

	var Alert = function () {
		this.addListener()
	}

	Alert.prototype = {
		url: 'http://kurtextrem.de/PS2/data.json',

		constructor: Alert,
		updateTime: 2,
		servers: {},
		main: 13,
		flare: 1,
		notification: 13,
		hide: 0,
		remember: false,
		count: 0,
		alert: false,
		timeRemind: 30,
		alwaysRemind: false,

		init: function (force, callback) {
			chrome.storage.local.get({
				main: 13,
				flare: 1,
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

				if (!data.servers.length) {
					force = true
				} else {
					this.servers = data.servers
				}
				if (force || Date.now() - data.lastUpdate >= this.updateTime * 60000) {
					this.update()
				}
				if (callback)
					callback()
			}.bind(this))
		},

		update: function () {
			chrome.storage.local.set({ lastUpdate: Date.now() })

			window.fetch(this.url, { headers: { Connection: 'close' }})
			.then(function (response) {
				if (response.status >= 200 && response.status < 300) {
					return response.json()
				}
				var error = new Error(response.statusText)
				error.response = response
				throw error
			})
			.then(function (data) {
				if (data.error)
					return this._error(data.error, data.timestamp)
				return data
			}.bind(this))
			.then(function (data) {
				this.clearBadgeAlarm()

				for (var server in serverData) {
					var obj = data.data[server] || {}
					obj.resultID = obj.id
					obj.id = +server
					obj.name = serverData[obj.id] || 'Unknown'
					obj.status = obj.inProgress ? 'active' : 'inactive'

					if (obj.status === 'active') {
						this._updateServer(obj)
					} else {
						this.alert = false
						chrome.storage.local.set({ alert: false })
						obj.notified = false
						this.sendToPopup(obj)
					}
				}

				chrome.storage.local.set({ servers: this.servers, count: this.count, serverTimestamp: +data.timestamp, error: false })
				this.updateIcon()
				tries = 0 // when an error happens in the two lines above, don't reset the counter
			}.bind(this))
			.catch(function (err) {
				console.error(err)

				this._error('Error while receiving data.', Date.now())
				// @todo: Notify popup, differentiate between error messages
			}.bind(this))
		},

		_error: function (text, timestamp) {
			chrome.storage.local.set({ error: text, serverTimestamp: timestamp })
			window.setTimeout(this.update.bind(this), ++tries * 30000)
			chrome.browserAction.setBadgeBackgroundColor({
				color: '#FF0000'
			})
			chrome.browserAction.setBadgeText({
				text: 'Error'
			})
		},

		sendToPopup: function (server) {
			this.servers['s' + server.id] = server

			var popups = chrome.extension.getViews({ type: 'popup' })
			if (popups.length)
				popups[0].App.updated(server)
		},

		_updateServer: function (server) {
			if (server.status === 'active') { // used to skip notification, if servers' alert isn't 'new'
				server.notified = false
				if (server.id === this.main) {
					this.alert = false
					chrome.storage.local.set({ alert: false })
					this.clearBadgeAlarm()
				}
				//this.sendToPopup(server)
				//return false
			}

			this.count++
			server.status = 1
			server.started = +(server.started + '000')
			server.zone = zoneData[server.zone]
			if (server.data.map && server.data.map[0]) {
				server.data.map[0].facilityOwner = flares[server.data.map[0].facilityNewFaction][0]
				server.data.map[0].facilityOwnerID = server.data.map[0].facilityNewFaction
				server.data.map[0].facilityOldOwnerID = server.data.map[0].facilityOldFaction
				server.data.map[0].facilityOldOwner = flares[server.data.map[0].facilityOldFaction][0]
				server.data.map = server.data.map[0]
			}

			if (server.id === this.main) {
				this.alert = true
				chrome.storage.local.set({ alert: true })
				this.setBadgeAlarm(server)
			}

			if (server.id === this.notification || this.notification === 0) {
				if (this.servers['s' + server.id] !== undefined && !this.servers['s' + server.id].notified) {
					server.notified = true
					this.createNotification(server)
				} else {
					server.notified = true
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
			chrome.alarms.clear('update-badge', function () {
				chrome.alarms.create('update-badge', {
					delayInMinutes: 1,
					periodInMinutes: 1
				})
			})

		},

		addListener: function () {
			chrome.runtime.onInstalled.addListener(this.installedListener.bind(this))
			chrome.alarms.onAlarm.addListener(this.alarmListener.bind(this))
		},

		installedListener: function () {
			chrome.storage.local.get({ version: -1 }, function (data) {
				if (VERSION < 1.0) {
					chrome.storage.sync.get({ flare: 0 }, function (data) {
						if (data.flare === 3)
							data.flare = -1
						chrome.storage.sync.set({ flare: data.flare + 1 })
					})
				} // migrate to sync
				if (VERSION < 1.1)
					this.syncSettings()
				if (VERSION > data.version) {
					chrome.storage.local.set({ servers: {}, version: VERSION, error: false })
				}
			})
			this.init()
			this.registerUpdateAlarms()
		},

		alarmListener: function (alarm) {
			switch (alarm) {
				case 'sync-settings':
					return this.syncSettings()
					break

				case 'update-badge':
					return this.updateBadge(this.servers['s' + this.main])
					break

				default:
				case 'update':
					return this.init(false)
			}
		},

		syncSettings: function () {
			chrome.storage.sync.get({ main: 13, flare: 1, notification: 13, hide: 0, hide2: 0, jaeger: 0, alwaysRemind: 0, timeRemind: 30, ps4: 0 }, function (data) {
				chrome.storage.local.set(data)
			})
		},

		registerUpdateAlarms: function () {
			chrome.alarms.clear('update', function () {
				chrome.alarms.create('update', { delayInMinutes: this.updateTime, periodInMinutes: this.updateTime })
			}.bind(this))
			chrome.alarms.clear('sync-settings', function () {
				chrome.alarms.create('sync-settings', { delayInMinutes: 30, periodInMinutes: 30 })
			})
		},

		updateBadge: function (server) {
			if (server.status === 'inactive') {
				this.clearBadgeAlarm()
			}
			if (server.status === 1) {
				var end = new Date(server.started)
				end.setMinutes(end.getMinutes() + 90)
				end = new Date(end - Date.now())

				var h = end.getUTCHours()
				var m = ('0' + end.getUTCMinutes()).slice(-2)

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
						color: flares[this.flare][1]
					})
				}
			}
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
			if (!canvas.length) {
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
		},

		returnOptions: function () {
			return [serverData, flares]
		}
	}

	window.alert = new Alert()
}(window);
