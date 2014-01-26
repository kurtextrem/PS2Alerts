+function (window) {
	'use strict';

	var servers = [
		{name: 'Briggs', id: 25, status: 0},
		{name: 'Ceres', id: 11, status: 0},
		{ name: 'Cobalt', id: 13, status: 0 },
		{name: 'Connery', id: 1, status: 0},
		{name: 'Mattherson', id: 17, status: 0},
		{name: 'Miller', id: 10, status: 0},
		{name: 'Waterson', id: 18, status: 0},
		{name: 'Woodman', id: 9, status: 0},
	]

	var events = [
		{zone: 2, type: 1},
		{zone: 8, type: 1},
		{zone: 6, type: 1},
		{zone: 0, type: 2},
		{zone: 0, type: 3},
		{zone: 0, type: 4},
		{zone: 6, type: 2},
		{zone: 6, type: 3},
		{zone: 6, type: 4},
		{zone: 2, type: 2},
		{zone: 2, type: 3},
		{zone: 2, type: 4},
		{zone: 8, type: 2},
		{zone: 8, type: 4}
	]

	var activeEvent = {
		135: true,
		136: true,
		139: true
	}

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
		url: 'http://census.soe.com/get/ps2:v2/',

		constructor: Alert,
		servers: {},
		main: 13,
		flare: 0,
		notification: 13,
		hide: 0,
		remember: false,
		count: 0,

		init: function (force) {
			chrome.storage.local.get({
				main: 13,
				flare: 0,
				lastUpdate: 0,
				servers: {},
				notification: 13,
				hide: 0,
				count: 0,
				remember: false
			}, function (data) {
				if (typeof data.servers[0] === 'undefined') {
					var serverObj = {}
					$.each(servers, function (i, server) {
						serverObj['s' + server.id] = server
						serverObj['s' + server.id].alert = {}
					})
					this.servers = data.servers = serverObj
					chrome.storage.local.set({
						servers: data.servers
					})
				} else {
					this.servers = data.servers
				}
				this.main = data.main
				this.flare = data.flare
				this.notification = data.notification
				this.hide = data.hide
				this.count = data.count
				this.remember = data.remember

				var main = this.servers['s' + this.main]
				if (force || $.now() - data.lastUpdate > 300000) {
					this.update()
				} else {
					this.setBadgeAlarm(main)
				}
				this.registerUpdateAlarms()
			}.bind(this))
		},

		update: function () {
			chrome.storage.local.set({
				count: 0,
				lastUpdate: $.now()
			})
			this.count = 0
			$.each(this.servers, function (index, server) {
				$.ajax(this.url + 'world?world_id=' + server.id, {
					dataType: 'json',
					success: function (response) {
						if (response && response.world_list && response.world_list[0]) {
							var state = response.world_list[0].state
							if (state === 'online') {
								this._updateServer(server)
							} else {
								server.status = state
								this.sendToPopup(server)
							}
						} else {
							server.status = 'errorUA'
							this.sendToPopup(server)
						}
					}.bind(this),
					error: function () {
						server.status = 'errorAPI'
						this.sendToPopup(server)
					}
				})
			}.bind(this))
		},

		sendToPopup: function (server) {
			chrome.storage.local.get({ servers: {} }, function (data) {
				var id = 's' + server.id
				this.servers[id] = data.servers[id] = server
				chrome.storage.local.set({ servers: data.servers })

				var popups = chrome.extension.getViews({ type: 'popup' })
				if (0 < popups.length)
					popups[0].app.updated(server)
			}.bind(this))
		},

		_updateServer: function (server) {
			$.ajax(this.url + 'world_event?world_id=' + server.id + '&type=METAGAME', {
				dataType: 'json',
				success: function (response) {
					if (!response && !response.world_event_list) {
						server.status = 'errorUS'
						this.clearBadgeAlarm()
						return this.sendToPopup(server)
					}

					var data = response.world_event_list[0]
					if (!activeEvent[+data.metagame_event_state]) {
						server.status = 'no alert'
						this.clearBadgeAlarm()
						return this.sendToPopup(server)
					}

					this.count++
					chrome.storage.local.set({
						count: this.count
					})

					var event = events[+data.metagame_event_id - 1]

					server.status = 1
					server.alert = {
						start: +(data.timestamp + '000'),
						type: event.type,
						zone: event.zone,
						notified: false,
						faction_nc: data.faction_nc,
						faction_tr: data.faction_tr,
						faction_vs: data.faction_vs,
						experience_bonus: data.experience_bonus || 0
					}

					if (server.id === this.main) {
						this.setBadgeAlarm(server)
					} else {
						this.clearBadgeAlarm()
					}

					if (server.id === this.notification || this.notification === 0) {
						if (this.servers['s' + server.id].alert && !this.servers['s' + server.id].alert.notified) {
							server.alert.notified = true
							this.createNotification(server)
						} else {
							server.alert.notified = true
						}
					}

					this.sendToPopup(server)
				}.bind(this),
				error: function () {
					server.state = 'errorAPI'
					this.sendToPopup(server)
				}
			})
		},

		clearBadgeAlarm: function() {
			chrome.browserAction.setBadgeText({ text: '' })
			chrome.alarms.clear('update-badge')
			this.updateIcon('img/notification_tray_empty.png')
			if (this.hide)
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
					date = new Date(server.alert.start - current)

				if (server.alert.type === 1 || server.alert.zone === 0) {
					date.setUTCHours(date.getUTCHours() + 2)
				} else {
					date.setUTCHours(date.getUTCHours() + 1)
				}

				var h = date.getUTCHours()
				var m = ('0' + date.getUTCMinutes()).slice(-2)

				if (h > 2 || (h + +m) < 0) {
					this.clearBadgeAlarm()
				} else {
					chrome.browserAction.enable()
					if (this.remember && h < 1 && m <= 30) {
						this.remember = false
						chrome.storage.local.set({remember: false})
						this.createNotification(server, true)
					}
					this.updateIcon('img/notification_tray_attention.png')
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
			chrome.alarms.create('update', { delayInMinutes: 3, periodInMinutes: 3 })
			chrome.alarms.onAlarm.addListener(function (alarm) {
				if (alarm.name === 'update')
					this.update()
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
					title: 'Remeber 30min before alert end'
				}]
			}
			chrome.notifications.create(server.id + '-alert', opt, function (id) {
				chrome.notifications.onButtonClicked.addListener(function (id, index) {
					this.remember = true
					chrome.storage.local.set({remember: true})
				}.bind(this))
				chrome.alarms.create('close-notification', { delayInMinutes: 1 })
				chrome.alarms.onAlarm.addListener(function (alarm) {
					if (alarm.name === 'close-notification')
						chrome.notifications.clear(id, function () {})
				})
			}.bind(this))
		},

		updateIcon: function (path) {
			var canvas = $('canvas')
			if (canvas.length < 1) {
				canvas = $('<canvas width="19" height="19"></canvas>')
				$('body')
					.append(canvas)
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
		}
	}

	window.alert = new Alert()
}(window)