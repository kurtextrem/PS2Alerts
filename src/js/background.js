+function (window) {
	'use strict';

	var flares = {
		0: [128, 0, 255, 255], // Vanu
		1: [0, 200, 255, 255], // NC
		2: [219, 0, 0, 255], // TR
		3: [255, 238, 0, 255] // NS
	}


	var Alert = function () {
		this.init()
	}

	Alert.prototype = {
		url: 'http://kurtextrem.de/PS2/get/data',

		constructor: Alert,
		updateTime: 1,
		servers: {},
		main: 13,
		flare: 0,
		notification: 13,
		hide: 0,
		remember: false,
		count: 0,
		alert: false,
		test: false,

		init: function (force) {
			chrome.storage.local.get({
				main: 13,
				flare: 0,
				lastUpdate: 0,
				servers: {},
				notification: 13,
				hide: 0,
				count: 0,
				remember: false,
				alert: false
			}, function (data) {
				console.log('init')

				this.alert = data.alert
				this.main = data.main
				this.flare = data.flare
				this.notification = data.notification
				this.hide = data.hide
				this.count = data.count
				this.remember = data.remember
				this.servers = data.servers

				var main = this.servers['s' + this.main]
				if (force || $.now() - data.lastUpdate >= this.updateTime * 60000) {
					console.log('update')
					this.update()
				} else {
					this.setBadgeAlarm(main)
				}
				if (this.test || data.servers === '') {
					force = true
				} else {
					this.servers = data.servers
				}
				this.registerUpdateAlarms()
			}.bind(this))
		},

		update: function () {
			chrome.storage.local.set({lastUpdate: $.now()})

			$.ajax(this.url, {
				dataType: 'json',
				success: function(data) {
					if (!data) {
						// same as error API error U
					}
					this.count = data.alertCount
					chrome.storage.local.set({count: this.count, serverTimestamp: data.time+'000'})

					$.each(data.servers, function(index, server) {
						if (server.isOnline) {
							this._updateServer(server)
						} else {
							this.alert = false
							chrome.storage.local.set({alert: false})
							server.alert.notified = false
							this.sendToPopup(server)
						}
					}.bind(this))

					chrome.storage.local.set({ servers: this.servers })
					this.updateIcon()

				}.bind(this),
				error: function() {
					//server.alert.notified = false
					//server.status = 'API error'
					//this.sendToPopup(server)
					//@todo: Not sure what I should do here
				}.bind(this)
			})
		},

		sendToPopup: function (server) {
			this.servers['s'+server.id] = server

			var popups = chrome.extension.getViews({ type: 'popup' })
			if (0 < popups.length)
				popups[0].App.updated(server)
		},

		_updateServer: function (server) {
			if (server.status === 'no alert') {
				server.alert.notified = false
				if (server.id === this.main) {
					this.alert = false
					chrome.storage.local.set({ alert: false })
					this.clearBadgeAlarm()
				}
				return this.sendToPopup(server)
			}

			if (server.id === this.main) {
				this.alert = true
				chrome.storage.local.set({ alert: true })
				this.setBadgeAlarm(server)
			}

			if (server.id === this.notification || this.notification === 0) {
				if (typeof this.servers['s'+server.id] !== 'undefined' && !this.servers['s' + server.id].alert.notified) {
					server.alert.notified = true
					this.createNotification(server)
				} else {
					server.alert.notified = true
				}
			}

			this.sendToPopup(server)
		},

		clearBadgeAlarm: function() {
			chrome.browserAction.setBadgeText({ text: '' })
			chrome.alarms.clear('update-badge')
			this.updateIcon()
			if (this.hide && !this.alert)
				chrome.browserAction.disable()
		},

		setBadgeAlarm: function (server) {
			this._updateBadge(server)
			chrome.alarms.create('update-badge', {
				delayInMinutes: 1,
				periodInMinutes: 1
			})
			chrome.alarms.onAlarm.addListener(function (alarm) {
				if (alarm.name === 'update-badge')
					this._updateBadge(server)
			}.bind(this))
		},

		_updateBadge: function (server) {
			if (server.status === 'no alert')
				this.clearBadgeAlarm()
			if (server.status === 1) {
				var current = Date.now(),
					date = new Date(+server.alert.start - current)

				if (server.alert.type === 1 || server.alert.zone === 0) {
					date.setUTCHours(date.getUTCHours() + 2)
				} else {
					date.setUTCHours(date.getUTCHours() + 1)
				}

				var h = date.getUTCHours()
				var m = ('0' + date.getUTCMinutes()).slice(-2)

				if (h > 2 || (h + +m) < 0) {
					this.alert = false
					chrome.storage.local.set({alert: false})
					this.clearBadgeAlarm()
				} else {
					chrome.browserAction.enable()
					if (this.remember && h < 1 && m <= 30) {
						this.remember = false
						chrome.storage.local.set({remember: false})
						this.createNotification(server, true)
					}
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
			chrome.alarms.onAlarm.addListener(function (alarm) {
				if (alarm.name === 'update') {
					console.log('update alarm')
					this.update()
				}
			}.bind(this))
		},

		createNotification: function (server, remember) {
			var opt = {
				type: 'basic',
				iconUrl: 'img/AlertIconWaves3.png'
			}
			if (remember) {
				opt.title = server.name + ' Alert: 30min left!'
				opt.message = '30mins left, start playing now!'
			} else {
				opt.title = server.name + ': Alert just started!'
				opt.message = 'An alert started on ' + server.name + '.'
				opt.buttons = [{
					title: 'Remind me 30min before the alert ends'
				}]
			}
			chrome.notifications.create(server.id + '-alert-'+!!remember, opt, function (id) {
				chrome.notifications.onButtonClicked.addListener(function (id, index) {
					this.remember = true
					chrome.storage.local.set({remember: true})
				}.bind(this))
			}.bind(this))
		},

		updateIcon: function () {
			var path = 'img/notification_tray_empty.png'
			if (this.alert)
				path = 'img/notification_tray_attention.png'

			var canvas = $('canvas')
			if (canvas.length < 1) {
				canvas = $('<canvas width="19" height="19"></canvas>')
				$('body').append(canvas)
			}
			var context = canvas[0].getContext('2d'),
				imageObj = new Image()

			imageObj.onload = function () {
				context.clearRect(0, 0, 19, 19)
				context.drawImage(imageObj, 0, 0, 19, 19)
				context.fillStyle = '#888'
				console.log('icon count: '+this.count)
				context.fillText(this.count, 6.5, 12)
				var details = {
					imageData: 0
				}
				details.imageData = context.getImageData(0, 0, 19, 19)
				chrome.browserAction.setIcon(details)
			}.bind(this)
			imageObj.src = path
		}
	}

	window.alert = new Alert()
}(window)