+function (window) {
	'use strict'

	var chrome = window.chrome,
		document = window.document

	var VERSION = 1.0

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

	/* by p3lim */
	var typeData = {
		1: 2, // Indar Territory
		2: 8, // Esamir Territory
		3: 6, // Amerish Territory
		4: 4, // Hossin Territory
		51: 2, // Indar Pumpkin Hunt
		52: 8, // Esamir Pumpkin Hunt
		53: 6, // Amerish Pumpkin Hunt
		54: 4  // Hossin Pumpkin Hunt
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
		flare: 1,
		notification: 13,
		hide: 0,
		remember: false,
		count: 0,
		alert: false,
		timeRemind: 30,
		alwaysRemind: false,
		errorCount: 0,

		init: function (force, callback) {
			chrome.storage.sync.get({
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

				if (!data.servers.s1) {
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
			chrome.storage.sync.set({ lastUpdate: Date.now() })

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
					obj.id = +server
					obj.name = serverData[obj.id] || 'Unknown'
					obj.status = obj.InProgress ? 'active' : 'inactive'

					if (obj.status === 'active') {
						this._updateServer(obj)
					} else {
						this.alert = false
						chrome.storage.sync.set({ alert: false })
						obj.notified = false
						this.sendToPopup(obj)
					}
				}

				chrome.storage.sync.set({ servers: this.servers, count: this.count, serverTimestamp: +data.timestamp, error: false })
				this.updateIcon()
			}.bind(this))
			.catch(function (err) {
				console.error(err)

				this._error('Error while receiving data.', Date.now())
				// @todo: Notify popup, differentiate between error messages
			}.bind(this))
		},

		_error: function (text, timestamp) {
			chrome.storage.sync.set({ error: text, serverTimestamp: timestamp })
			window.setTimeout(this.update.bind(this), 30000)
			chrome.browserAction.setBadgeText({
				text: 'Error'
			})
		},

		sendToPopup: function (server) {
			this.servers['s' + server.id] = server

			var popups = chrome.extension.getViews({ type: 'popup' })
			if (0 < popups.length)
				popups[0].App.updated(server)
		},

		_updateServer: function (server) {
			if (server.status === 'active') { // used to skip notification, if servers' alert isn't 'new'
				server.notified = false
				if (server.id === this.main) {
					this.alert = false
					chrome.storage.sync.set({ alert: false })
					this.clearBadgeAlarm()
				}
				//this.sendToPopup(server)
				//return false
			}

			this.count++
			server.status = 1
			server.started = +(server.ResultStartTime + '000')
			server.type = typeData[server.ResultAlertType]
			server.zone = zoneData[server.ResultAlertCont]
			server.data.facilityOwnerID = server.data.facilityOwner
			server.data.facilityOldOwnerID = server.data.facilityOldOwner
			server.data.facilityOwner = flares[server.data.facilityOwner][0]
			server.data.facilityOldOwner = flares[server.data.facilityOldOwner][0]

			if (server.id === this.main) {
				this.alert = true
				chrome.storage.sync.set({ alert: true })
				this.setBadgeAlarm(server)
			}

			if (server.id === this.notification || this.notification === 0) {
				if (typeof this.servers['s' + server.id] !== 'undefined' && !this.servers['s' + server.id].notified) {
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
			chrome.storage.sync.set({ server: server })
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
				chrome.storage.sync.get({ version: -1 }, function (data) {
					if (VERSION < 1.0) {
						chrome.storage.sync.get({ flare: 0 }, function (data) {
							if (data.flare === 3)
								data.flare = -1
							chrome.storage.sync.set({ flare: data.flare + 1 })
						})
					} // migrate to sync
					if (VERSION > data.version) {
						chrome.storage.sync.set({ servers: {}, version: VERSION, error: false })
					}
				})
				this.init()
				this.registerUpdateAlarms()
			}.bind(this))
			chrome.alarms.onAlarm.addListener(this.alarmListener.bind(this))
		},

		alarmListener: function (alarm) {
			this.init(false, function () {
				if (alarm.name === 'update-badge')
					return this.updateBadge(this.servers['s' + this.main])
					//if (alarm.name === 'update') // Updates anyway, if required
					//	return this.update()
			}.bind(this))
		},

		updateBadge: function (server) {
			if (server.status === 'inactive')
				this.clearBadgeAlarm()
			if (server.status === 1) {
				var end = new Date(server.started)
				end.setMinutes(end.getMinutes() + 90)
				end = new Date(end - Date.now())

				var h = end.getUTCHours()
				var m = ('0' + end.getUTCMinutes()).slice(-2)

				if (h > 2 || (h + +m) < 0) {
					this.alert = false
					chrome.storage.sync.set({ alert: false })
					this.clearBadgeAlarm()
				} else {
					chrome.browserAction.enable()
					if (this.remember && h < 1 && m <= this.timeRemind) {
						this.remember = false
						chrome.storage.sync.set({ remember: false })
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
					chrome.storage.sync.set({ remember: true })
				}
				chrome.notifications.onButtonClicked.addListener(function (id, index) {
					this.remember = true
					chrome.storage.sync.set({ remember: true })
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
		},

		returnOptions: function () {
			return [serverData, flares]
		}
	}

	window.alert = new Alert()
}(window);

// speedier .bind
+function(n,t){"use strict";var e=n.bind;t.defineProperty(n,"bind",{value:function(n){var t=this;return 1===arguments.length?function(){return t.apply(n,arguments)}:e.apply(t,arguments)}})}(Function.prototype,Object);
