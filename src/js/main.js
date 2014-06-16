+function(window) {
	'use strict';

	var VERSION = 0.4

	var App = function() {
		chrome.storage.local.get({servers: {}, main: 13, lastUpdate: 0, order: [], flare: 0, hide2: 0, serverTimestamp: 0, sortOrder: null}, function(data) {
			this.servers = data.servers
			this.main = data.main
			this.flare = data.flare
			this.hide2 = data.hide2
			this.addHTML()
			this.interval = window.setInterval(this.updateTime.bind(this), 1000)

			if (data.sortOrder !== null && !this.hide2) {
				var $detach = $('.alert-container').detach()
				for (var i = 0; i < data.sortOrder.length; i++) {
					data.sortOrder[i] = $detach.find('#' + data.sortOrder[i])
				}
				$('body').prepend('<div class="alert-container container-fluid"></div>').find('.alert-container').prepend(data.sortOrder)
			}

			$('.alert-container').sortable({
				handle: '.handle',
				items: '.row'
			}).on('sortupdate', function() {
				var order = [], children = document.getElementsByClassName('alert-container')[0].children
				for (var i = 0; i < children.length; i++) {
					order.push(children[i].id)
				}
				chrome.storage.local.set({sortOrder: order})
				$.each($('video'), function(i, vid) {
					vid.play()
				})
			})

			$('#refresh').click(function(e) {
				this.refresh()
				e.stopImmediatePropagation()
			}.bind(this)).attr({
				title: 'Last updates<br>Client: ' + new Date(data.lastUpdate) + '<br>Server: ' + new Date(data.serverTimestamp),
				'data-tooltip': true
			}).tooltip()
			$('.server-' + this.main).addClass('panel-info').removeClass('panel-default')
		}.bind(this))
		$('#options').click(function() {
			chrome.tabs.create({ url: 'settings.html' })
		}).attr('title', 'v' + VERSION).parent().find('[data-tooltip]').tooltip()
		window.setTimeout(function() {
			$.each($('video'), function(i, vid) {
				vid.play()
			})
		}, 550)
	}
	App.prototype = {
		servers: {},
		interval: null,
		constructor: App,

		addHTML: function() {
			$.each(this.servers, function (index, server) {
				if (this.hide2 && server.id !== this.main)
					return
				var add = ''
				if (server.id === this.main)
					add = ' in'
				$('.alert-container').append('<div class="row" id="server-' + server.id + '"><div class="col-xs-1"><button type="button" class="btn btn-default btn-lg handle"><span class="glyphicon glyphicon-align-justify"></span></button></div><div class="col-xs-11"><div class="panel panel-default server-' + server.id + '"><div class="panel-heading"><h4 class="panel-title"><a data-toggle="collapse"  href="#collapse' + server.id + '"><span class="server-name">' + server.name + '</span></a><span class="pull-right badge remaining"></span></h4><table class="table info text-center hide"><tbody><tr><td class="type"></td><td class="continent"></td></tr></tbody></table></div><div id="collapse' + server.id + '" class="panel-collapse collapse' + add + '"><div class="panel-body text-center"></div><table class="table"><tbody><tr><td class="remaining"></td><td class="type"></td><td class="continent"></td></tr></tbody></table></div></div></div></div>')
				this.updateTable(server)
			}.bind(this))
		},

		updateTable: function(server) {
			var $server = $('.server-' + server.id)

			if (server.Status === 1) {
				$server.addClass('success')
				$server.find('.info').removeClass('hide')
				$server.find('.handle').css('height', '51px')

				var video = $server.find('.server-name')
				if (video.find('video').length === 0)
					video.before('<video width="30" height="30" autoplay loop><source src="img/AlertAnim2.mp4" type="video/mp4"></video>').prev()[0].play()

				$server.find('.type').html(server.alert.type).attr({
					//title: 'EXP Bonus: ' + server.alert.experience_bonus + '%',
					'data-tooltip': true
				}).tooltip({container: 'body'})

				switch (server.alert.type) {
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
				}

				$server.find('.continent').text(server.alert.zone)
				$server.find('.remaining').removeClass('inactive')

				this.updateTime(server)
			} else {
				//$server.removeClass()
				$server.find('video').remove()
				$server.find('.type').empty()
				$server.find('.continent').empty()
				$server.find('.panel-body').html('<a href="' + server.FullAlertLink + '" target="_blank">View all alerts for this server</a>')
				$server.find('.remaining').addClass('inactive')
				$server.find('.info').addClass('hide')
				$server.find('.handle').css('height', 'auto')
			}

			if (typeof server.Status === 'string') {
				$server.find('.remaining:not(".badge")').html(server.Status.charAt(0).toUpperCase() + server.Status.slice(1))
				if (server.Status.indexOf('error') !== -1)
					$server.addClass('danger')
			}
		},

		_addTerritory: function(server) {
			var vanu = server.alert.TerritoryVS,
			tr = server.alert.TerritoryTR,
			nc = server.alert.TerritoryNC,
			count = 100 - nc - tr,
			row = $('#collapse' + server.id + ' > .panel-body').append('<div class="progress"><div class="progress-bar progress-bar-danger" style="width:' + tr  + '%">' + Math.floor(tr) + '%</div><div class="progress-bar progress-bar-info" style="width:' + nc  + '%">' + Math.floor(nc) + '%</div><div class="progress-bar progress-bar-purple" style="width:' +  count  + '%" >' + Math.floor(vanu) + '%</div></div>')

			return [row, vanu, tr, nc]
		},

		addType: function(which, server) {
			var data
			$('#collapse' + server.id + ' > .panel-body').html('')
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
			container.append('<div class="' + add + '">' + append + '<br><a href="' + server.FullAlertLink + '" target="_blank">View this alert live on PS2Alerts</a></div>')
		},

		_addFacility: function(server) {
			var row = $('#collapse' + server.id + ' > .panel-body').append('<div class="facilities"></div>'),
			$container = $('#collapse' + server.id + ' > .panel-body'),
			$facilities = $container.find('.facilities'),
			vanu = 0,
			tr = 0,
			nc = 0


			$.each(server.alert, function(facility, status) {
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
				$facilities.append('<div class="facility ' + add + '" data-tooltip="true" title="' + facility + ' (' + server.alert.type + ')">')
			})
			$facilities.find('[data-tooltip]').tooltip()

			return [row, vanu, tr, nc]
		},

		updateTime: function(server) {
			if (!server) {
				return $.each(this.servers, function(i, server) {
					this.updateTime(server)
				}.bind(this))
			}
			var current = Date.now()

			if (server.Status === 1) {
				var date = new Date(+server.alert.start - current)

				if (server.alert.type === 'Territory' || server.alert.zone === 'Global') {
					date.setUTCHours(date.getUTCHours() + 2)
				} else {
					date.setUTCHours(date.getUTCHours() + 1)
				}

				var h = date.getUTCHours()
				var m = ('0' + date.getUTCMinutes()).slice(-2)
				var s = ('0' + date.getUTCSeconds()).slice(-2)

				if (h < 2 && (h + +m + +s) > 0) {
					if (server.id === this.main)
						chrome.runtime.getBackgroundPage(function(w) {
							w.alert.init(false, w.alert.updateBadge(server))
						})
					return $('.server-' + server.id + ' .remaining').html(h + 'h ' + m + 'm ' + s + 's')
				}
				//chrome.runtime.getBackgroundPage(function(w) {
				//	w.alert.count--
				//	w.alert.updateIcon()
				//})
				server.Status = 'INACTIVE'
				//this.servers['s' + server.id].Status = 'INACTIVE'
				//chrome.storage.local.set({servers: this.servers})
				this.updateTable(server)
			}
		},

		updated: function(server) {
			this.updateTable(server)
		},

		refresh: function() {
			var $e = $('#refresh')
			$e.attr('disabled', true)
			chrome.runtime.getBackgroundPage(function(w) {
				w.alert.init(true, function() {
					chrome.storage.local.get({lastUpdate: 0, serverTimestamp: 0}, function(data) {
						$e.attr('title', new Date(data.lastUpdate) + '(' +new Date(data.serverTimestamp) + ')')
					})
					window.setTimeout(function() {
						$e.removeAttr('disabled')
					}, 120000)
				})
			})
		}
	}

	window.App = App
}(window)

$.fn.ready(function() {
	App = new App()
})
