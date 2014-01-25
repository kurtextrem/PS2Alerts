+function(window) {
	'use strict'
	var servers = [
		{name: 'Briggs', id: 25, status: 0},
		{name: 'Ceres', id: 11, status: 0},
		{name: 'Cobalt', id: 13, status: 0},
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

	var zoneData = {
		0: 'Global',
		2: 'Indar',
		6: 'Amerish',
		8: 'Esamir'
	}

	var typeData = {
		1: 'Territory',
		2: 'Bio Labs',
		3: 'Tech Plants',
		4: 'Amp Stations'
	}

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


	var Alert = function() {
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

		init: function(force) {
			chrome.storage.local.get({main: 13, flare: 0, lastUpdate: 0, servers: '', notification: 13, hide: 0, count: 0}, function(data) {
				if (data.servers === '') {
					var serverObj = {}
					$.each(servers, function(i, server) {
						serverObj['s'+server.id] = server
						serverObj['s'+server.id].alert = {}
					})
					this.servers = data.servers = serverObj
					chrome.storage.local.set({servers: data.servers})
				} else {
					this.servers = data.servers
				}
				this.main = data.main
				this.flare = data.flare
				this.notification = data.notification
				this.hide = data.hide
				this.count = data.count
				if (force || $.now()-data.lastUpdate > 300000)
					this.update()
				else {
					var main = data.servers['s'+this.main]
					this.setBadgeAlarm(main)
				}
				this.registerAlarms()
			}.bind(this))
		},

		sendToPopup: function(server) {
			chrome.storage.local.get({servers: {}}, function(data) {
				data.servers['s'+server.id] = server
				this.servers['s'+server.id] = server
				chrome.storage.local.set({servers: data.servers})
				var popups = chrome.extension.getViews({type: 'popup'})
				if (0 < popups.length)
					popups[0].app.updated(server)
			}.bind(this))
		},

		update: function() {
			this.count = 0
			chrome.storage.local.set({lastUpdate: $.now(), count: 0})
			servers.forEach(function (server) {
				$.ajax(this.url + 'world?world_id=' + server.id, {
					dataType: 'json',
					success: function (response) {
						if (response && response.world_list && response.world_list[0]) {
							var state = response.world_list[0].state
							if (state == 'online') {
								this._updateServer(server)
							} else {
								server.status = state
								this.sendToPopup(server)
							}
						} else {
							server.status = 'errorUA'
							this.sendToPopup(server)
						}
					}.bind(this)
				})
			}.bind(this))
		},

		_updateServer: function(server) {
			$.ajax(this.url + 'world_event?world_id=' + server.id + '&type=METAGAME', {
				dataType: 'json',
				success: function (response) {
					if (response && response.world_event_list) {
						var data = response.world_event_list[0]
						if (activeEvent[+data.metagame_event_state]) {
							var event = events[+data.metagame_event_id - 1]

							server.status = 1
							server.counted = false
							server.alert = {
								start: +(data.timestamp + '000'),
								type: typeData[event.type],
								zone: zoneData[event.zone],
								notified: false,
								faction_nc: data.faction_nc,
								faction_tr: data.faction_tr,
								faction_vs: data.faction_vs,
								experience_bonus: data.experience_bonus
							}
							if (server.id === this.main) {
								this.setBadgeAlarm(server)
							}
							if (server.id === this.notification || this.notification === 0) {
								if (!this.servers['s'+server.id].alert.notified) {
									this.createNotification(server)
									server.alert.notified = true
								}
							}
							if (!this.servers['s'+server.id].counted) {
								server.counted = true
								this.count++
								chrome.storage.local.set({count: this.count})
							}
						} else {
							server.status = 'no alert'
							if (server.counted) {
								this.count--
								chrome.storage.local.set({count: this.count})
							}
						}

						this.sendToPopup(server)
						return
					} else {
						server.status = 'errorUS'
						this.sendToPopup(server)
					}
				}.bind(this)
			})
		},

		registerAlarms: function() {
			chrome.alarms.create('update', {delayInMinutes: 5, periodInMinutes: 5})
			chrome.alarms.onAlarm.addListener(function(alarm) {
				if (alarm.name === 'update')
					this.update()
			}.bind(this))
		},

		setBadgeAlarm: function(server) {
			this._updateBadge(server)
			chrome.alarms.create('update-badge', {delayInMinutes: 1, periodInMinutes: 1})
			chrome.alarms.onAlarm.addListener(function(alarm) {
				if (alarm.name === 'update-badge')
					this._updateBadge(server)
			}.bind(this))
		},

		createNotification: function(server, remember) {
			var opt = {
			  	type: 'basic',
			  	iconUrl: 'img/AlertIconWaves3.png'
			}
			if (remember) {
				opt.title = server.name+' Alert: 30min left!'
			} else {
				opt.title = server.name+': Alert just started!'
				opt.message = 'An alert started on '+server.name+'.'
				opt.buttons = [
					{
						title: 'Remeber 30min before alert end'
					}
				]
			}
			chrome.notifications.create(server.id+'-alert', opt, function(id) {
				chrome.notifications.onButtonClicked.addListener(function(id, index){
					this.remember = true
				}.bind(this))
				chrome.alarms.create('close-notification', {delayInMinutes: 1})
				chrome.alarms.onAlarm.addListener(function(alarm) {
					if (alarm.name === 'close-notification')
						chrome.notifications.clear(id, function(){})
				})
			}.bind(this))
		},

		_updateBadge: function(server) {
			if (server.status === 'no alert') {
				this.updateIcon('img/notification_tray_empty.png')
				chrome.browserAction.setBadgeText({text: ''})
				chrome.alarms.clear('update-badge')
				if (this.hide)
					chrome.browserAction.disable()
			}
			if (server.status === 1) {
				var current = Date.now(),
				date = new Date(server.alert.start - current)

				if (server.alert.type === 'Territory' || server.alert.zone === 'Global') {
					date.setUTCHours(date.getUTCHours() + 2)
				} else {
					date.setUTCHours(date.getUTCHours() + 1)
				}

				var h = date.getUTCHours()
				var m = ('0' + date.getUTCMinutes()).slice(-2)

				if (h > 2 || (h + +m) < 0) {
					this.updateIcon('img/notification_tray_empty.png')
					chrome.browserAction.setBadgeText({text: ''})
					chrome.alarms.clear('update-badge')
					if (this.hide)
						chrome.browserAction.disable()
				} else {
					chrome.browserAction.enable()
					if (this.remember && h < 1 && m <= 30) {
						this.createNotification(server, true)
						this.remember = false
					}
					this.updateIcon('img/notification_tray_attention.png')
					chrome.browserAction.setBadgeText({text: h + ':' + m})
					chrome.browserAction.setBadgeBackgroundColor({color: flares[this.flare]})
				}
			}
		},

		updateIcon: function(path) {
			var canvas = $('canvas')
			if (canvas.length < 1) {
				canvas = $('<canvas width="19" height="19"></canvas>')
				$('body').append(canvas)
			}
			var context = canvas[0].getContext('2d'),
			imageObj = new Image()

			context.clearRect(0, 0, 19, 19)

			imageObj.onload = function() {
				context.drawImage(imageObj, 0, 0, 19, 19)
				context.fillStyle = '#888'
				context.fillText(this.count, 6.5, 12)
				var details = { imageData: 0 }
				details.imageData = context.getImageData(0, 0, 19, 19)
				chrome.browserAction.setIcon(details)
			}.bind(this)
			imageObj.src = path
		}
	}

	window.Alert = Alert
}(window)

alert = new Alert()