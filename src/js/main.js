+function (window) {
	'use strict'

	var App = function () {
		chrome.storage.sync.get({ servers: {}, main: 13, lastUpdate: 0, order: [], flare: 0, hide2: 0, jaeger: 0, serverTimestamp: 0, sortOrder: null, version: 0, error: '', ps4: 0 }, function (data) {
			if (data.error) {
				return $('.error--message').find('small').text(data.error)
			}

			this.$container = $('.alert-container').detach()
			this.servers = data.servers
			this.main = data.main
			this.flare = data.flare
			this.hide2 = data.hide2
			this.jaeger = data.jaeger
			this.ps4 = data.ps4
			this.addHTML()

			this.interval = window.setInterval(this.updateTime.bind(this), 1000)

			if (data.sortOrder !== null && !this.hide2) {
				for (var i = 0; i < data.sortOrder.length; i++) {
					data.sortOrder[i] = this.$container.find('#' + data.sortOrder[i]).detach()
				}
				this.$container.prepend(data.sortOrder)
			}

			this.$container.insertBefore('.error--message')

			this.$container.sortable({
				handle: '.handle',
				items: '.row',
				forcePlaceholderSize: true
			}).on('sortupdate', function (e, ui) {
				var order = [], children = ui.startparent.children
				for (var i = 0; i < children.length; i++) {
					order.push(children[i].id)
				}
				chrome.storage.sync.set({ sortOrder: order })
				$.each($('video'), function (i, vid) {
					vid.play()
				})
			})

			$('#refresh').click(function (e) {
				this.refresh(e.currentTarget)
			}.bind(this)).attr({
				title: 'Last updates<br>Client: ' + new Date(data.lastUpdate) + '<br>Server: ' + new Date(data.serverTimestamp),
				'data-tooltip': true
			}).tooltip()
			$('.server-' + this.main).addClass('panel-info').removeClass('panel-default')

			$('#options').click(function () {
				return chrome.runtime.openOptionsPage()
			}).attr('title', 'v' + data.version).parent().find('[data-tooltip]').tooltip()

			$.each($('video'), function (i, vid) {
				vid.play()
			})
		}.bind(this))
	}
	App.prototype = {
		servers: {},
		interval: null,
		constructor: App,

		addHTML: function () {
			for (var server in this.servers) {
				server = this.servers[server]

				if ((this.hide2 && server.id !== this.main) || (!this.jaeger && server.id === 19) || (!this.ps4 && server.id > 999))
					continue

				var add = ''
				if (server.id === this.main)
					add = ' in'
				this.$container.append('<div class="row" id="server-' + server.id + '"><div class="col-xs-1"><button type="button" class="btn btn-default btn-lg handle"><span class="glyphicon glyphicon-align-justify"></span></button></div><div class="col-xs-11"><div class="panel panel-default server-' + server.id + '"><div class="panel-heading"><h4 class="panel-title"><a data-toggle="collapse"  href="#collapse' + server.id + '"><span class="server-name">' + server.name + '</span></a><span class="pull-right badge remaining"></span></h4><table class="table info text-center hide"><tbody><tr><td class="type"></td><td class="continent"></td></tr></tbody></table></div><div id="collapse' + server.id + '" class="panel-collapse collapse' + add + '"><div class="panel-body text-center"></div><table class="table"><tbody><tr><td class="remaining"></td><td class="type"></td><td class="continent"></td></tr><tr><td class="facility--name"></td><td class="facility--owner"><span class="label facility--owner-curent"></span>&nbsp;<span class="label facility--owner-past"></span></td><td class="facility--defended"></td></tr></tbody></table></div></div></div></div>')
				this.updateTable(server)
			}
		},

		updateTable: function (server) {
			var $server = this.$container.find('#server-' + server.id)

			if (server.status === 1) {
				$server.addClass('success')
				$server.find('.info').removeClass('hide')
				$server.find('.handle').css('height', '51px')

				var video = $server.find('.server-name')
				if (video.find('video').length === 0)
					video.before('<video width="30" height="30" autoplay loop><source src="img/AlertAnim2.mp4" type="video/mp4"></video>').prev().get(0).play()

				$server.find('.type').html('Territory').attr({ // server.type
					//title: 'EXP Bonus: ' + server.alert.experience_bonus + '%',
					'data-tooltip': true
				}).tooltip({ container: 'body' })

				/*switch (server.type) {
					case 'Territory':
						this.addType('territory', server)
						break
					case 'Bio':
						this.addType('facility', server)
						break
					case 'Tech':
						this.addType('facility', server)
						break
					case 'Amp':
						this.addType('facility', server)
						break
					default:
						break
				}*/
				this.addType('territory', server)

				$server.find('.continent').text(server.zone)
				$server.find('.remaining').removeClass('inactive')

				this.updateTime(server)
			} else {
				// $server.removeClass()
				$server.find('video').remove()
				$server.find('.type').empty()
				$server.find('.continent').empty()
				$server.find('.panel-body').html('<a href="http://ps2alerts.com/allalerts" target="_blank">View all alerts for this server</a>')
				$server.find('.remaining').addClass('inactive')
				$server.find('.info').addClass('hide')
				$server.find('.handle').css('height', 'auto')
			}

			if (typeof server.status === 'string') {
				$server.find('.remaining:not(".badge")').html(server.status.charAt(0).toUpperCase() + server.status.slice(1))
				if (server.status.indexOf('error') !== -1)
					$server.addClass('danger')
			}
		},

		_addTerritory: function (server) {
			var vanu = server.data.controlVS,
			tr = server.data.controlTR,
			nc = server.data.controlNC,
			count = 100 - nc - tr,
			row = this.$container.find('#collapse' + server.id)

			row.find('.facility--name').text(server.data.facilityID)
			row.find('.facility--owner-curent').text(server.data.facilityOwner).removeClass('progress-bar-purple progress-bar-danger progress-bar-info').addClass('progress-bar-purple')
			row.find('.facility--owner-past').text(server.data.facilityOldOwner).removeClass('progress-bar-purple progress-bar-danger progress-bar-info').addClass('progress-bar-purple')
			row.find('.facility--defended').text(server.data.defence).removeClass('text-success text-danger').addClass('text-success')
			row = row.find('.panel-body').append('<div class="progress"><div class="progress-bar progress-bar-danger" style="width:' + tr  + '%">' + Math.floor(tr) + '%</div><div class="progress-bar progress-bar-info" style="width:' + nc  + '%">' + Math.floor(nc) + '%</div><div class="progress-bar progress-bar-purple" style="width:' +  count  + '%" >' + Math.floor(vanu) + '%</div></div>')

			return [row, vanu, tr, nc]
		},

		addType: function (which, server) {
			var data
			this.$container.find('#collapse' + server.id).find('.panel-body').html('')

			switch (which) {
				case 'territory':
					data = this._addTerritory(server)
					break
				case 'facility':
					data = this._addFacility(server)
					break

				default:
					return
					break
			}

			var container = data[0],
			append = 'Fair fight.',
			lead = 4,
			add = 'text-info'

			if (data[3] < data[1] && data[2] < data[1]) {
				lead = 0
				append = 'Vanu is leading.'
			} else if (data[2] < data[3] && data[3] > data[1]) {
				lead = 1
				append = 'NC is leading.'
			} else if (data[2] > data[1] && data[3] < data[2]) {
				lead = 2
				append = 'TR is leading.'
			}
			if (this.flare === lead)
				add = 'text-success'
			container.append('<div class="' + add + '">' + append + '<br><a href="http://ps2alerts.com/Alert/' + server.resultID + '" target="_blank">View this alert live on PS2Alerts</a></div>')
		},

		// obsolete atm
		_addFacility: function (server) {
			var row = this.$container.find('#collapse' + server.id).find('.panel-body').append('<div class="facilities"></div>'),
			$facilities = row.find('.facilities'),
			vanu = 0,
			tr = 0,
			nc = 0

			$.each(server.alert, function (facility, status) {
				if (facility === 'dataID' || facility === 'dataTimestamp' || facility === 'resultID' || facility === 'start' || facility === 'type' || facility === 'zone' || status === null || facility === 'notified')
					return
				var add = 'progress-bar-purple'
				switch (status) {
					case '1': // Vanu
						vanu++
						break
					case '2': // NC
						nc++
						add = 'progress-bar-info'
						break
					case '3': // TR
						tr++
						add = 'progress-bar-danger'
						break

					default:
						break
				}
				$facilities.append('<div class="facility ' + add + '" data-tooltip="true" title="' + facility + ' (' + server.type + ')">')
			})
			$facilities.find('[data-tooltip]').tooltip()

			return [row, vanu, tr, nc]
		},

		updateTime: function (server) {
			if (!server) {
				return $.each(this.servers, function (i, server) {
					this.updateTime(server)
				}.bind(this))
			}
			var current = Date.now()

			if (server.status === 1) {
				var end = new Date(server.started)
				end.setMinutes(end.getMinutes() + 90)
				end = new Date(end - Date.now())

				var h = end.getUTCHours()
				var m = ('0' + end.getUTCMinutes()).slice(-2)
				var s = ('0' + end.getUTCSeconds()).slice(-2)

				if (h < 2 && (h + +m + +s) > 0)  {
					if (server.id === this.main)
						chrome.runtime.getBackgroundPage(function (w) {
							w.alert.init(false, w.alert.updateBadge(server))
						})
					return this.$container.find('.server-' + server.id + ' .remaining').html(h + 'h ' + m + 'm ' + s + 's')
				}
				//chrome.runtime.getBackgroundPage(function(w) {
				//	w.alert.count--
				//	w.alert.updateIcon()
				//})
				server.status = 'inactive'
				//this.servers['s' + server.id].Status = 'INACTIVE'
				//chrome.storage.local.set({servers: this.servers})
				this.updateTable(server)
			}
		},

		updated: function (server) {
			this.updateTable(server)
		},

		refresh: function (e) {
			e.disabled = true
			chrome.runtime.getBackgroundPage(function (w) {
				w.alert.init(true, function () {
					chrome.storage.sync.get({ lastUpdate: 0, serverTimestamp: 0 }, function (data) {
						e.title = new Date(data.lastUpdate) + '(' +new Date(data.serverTimestamp) + ')'
					})
					window.setTimeout(function () {
						e.disabled = false
					}, 120000)
				})
			})
		}
	}

	$.fn.ready(function () {
		window.App = new App()
	})
}(window)
