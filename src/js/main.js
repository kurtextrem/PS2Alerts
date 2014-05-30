+function(window) {
	'use strict';

	var VERSION = 0.4

	var serverData = {
		'25': 'Briggs',
		'11': 'Ceres',
		'13': 'Cobalt',
		'1': 'Connery',
		'17': 'Mattherson',
		'10': 'Miller',
		'18': 'Waterson',
		'9': 'Woodman',
	}

	var App = function() {
		if (typeof sessionStorage.startup === 'undefined') {
			sessionStorage.startup = 1
			chrome.runtime.getBackgroundPage($.noop)
		}
		chrome.storage.local.get({servers: {}, main: 13, lastUpdate: 0, direction: 'desc', by: 'server', flare: 0, hide2: 0, serverTimestamp: 0}, function(data) {
			this.servers = data.servers
			this.main = data.main
			this.flare = data.flare
			this.hide2 = data.hide2
			this.addHTML()
			$.each(data.servers, function(index, server) {
				this.updateTable(server)
			}.bind(this))
			this.interval = window.setInterval(this.updateTime.bind(this), 1000)

			var $table = $('table')
			$table.tablesort()
			$table.data('tablesort').sort($('#' + data.by), data.direction)

			$('#refresh').click(function(e) {
				this.refresh()
				e.stopImmediatePropagation()
			}.bind(this))
			$table.on('tablesort:complete', function(e, tablesort) {
				chrome.storage.local.set({direction: tablesort.direction, by: $('.sorted').attr('id')})
			})
			$('#server-' + this.main + ' td').css('background-color', 'rgb(224, 236, 218)')
			$('#server > button').attr({
				title: 'Last updates<br>Client: ' + new Date(data.lastUpdate) + '<br>Server: ' + new Date(data.serverTimestamp),
				'data-tooltip': true
			}).tooltip({html: true, placement: 'bottom'})
		}.bind(this))
		$('#options').click(function() {
			chrome.tabs.create({ url: 'settings.html' })
		}).attr('title', 'v' + VERSION).parent().find('[data-tooltip]').tooltip()
		window.setTimeout(function() {
			$.each($('video'), function(i, vid) {
				vid.play()
			})
		}, 750)
	}
	App.prototype = {
		servers: {},
		interval: null,
		constructor: App,

		addHTML: function() {
			$.each(this.servers, function (index, server) {
				$('tbody').append('<tr id="server-' + server.id + '"></tr>')
				if (this.hide2 && server.id !== this.main)
					$('tr:last').hide()
				$('tr:last').append('<td class="server-name"><button type="button" data-toggle="collapse" data-target="#collapse' + server.id + '" class="btn btn-link">' + serverData[server.id] + '</button></td>')
				$('tr:last').append('<td class="remaining"></td>')
				$('tr:last').append('<td class="type"></td>')
				$('tr:last').append('<td class="continent"></td>')
			}.bind(this))
		},

		updateTable: function(server) {
			var main = 's' + server.id,
			$server = $('#server-' + server.id)

			if (server.Status === 1) {
				$server.addClass('success')

				var video = $server.find('.server-name')
				if (video.find('video').length === 0)
					video.prepend('<video width="15" height="15" autoplay loop><source src="img/AlertAnim2.mp4" type="video/mp4"></video>').find('video')[0].play()

				$server.find('.type').html(server.alert.type).attr({
					//title: 'EXP Bonus: ' + server.alert.experience_bonus + '%',
					'data-tooltip': true
				}).tooltip({container: 'body'})
				$server.find('.server-name > button').removeAttr('disabled')

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
						$server.find('.server-name > button').attr('disabled', true)
						break
				}

				$server.find('.continent').text(server.alert.zone)
				$server.find('.remaining').removeClass('inactive')

				this.updateTime(server)
			} else {
				$server.removeClass()
				$server.find('.server-name video').remove()
				$server.find('.server-name > button').attr('disabled', true)
				$server.find('.type').text('')
				$server.find('.continent').text('')
				$server.find('.remaining').addClass('inactive')
			}

			if (typeof server.Status === 'string') {
				$server.find('.remaining').html(server.Status.charAt(0).toUpperCase() + server.Status.slice(1))
				if (server.Status.indexOf('error') !== -1)
					$server.addClass('danger')
			}
		},

		_addTerritory: function(server) {
			var vanu = server.alert.TerritoryVS,
			tr = server.alert.TerritoryTR,
			nc = server.alert.TerritoryNC,
			count = 100 - nc - tr,
			row = $('footer').before('<div id="collapse' + server.id + '" class="collapse"><div class="container"><div class="progress"><div class="progress-bar progress-bar-danger" style="width:' + tr  + '%">' + Math.floor(tr) + '%</div><div class="progress-bar progress-bar-info" style="width:' + nc  + '%">' + Math.floor(nc) + '%</div><div class="progress-bar progress-bar-purple" style="width:' +  count  + '%" >' + Math.floor(vanu) + '%</div></div></div></div>')

			return [row, vanu, tr, nc]
		},

		addType: function(which, server) {
			var data
			$('#collapse' + server.id).remove()
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

			var collapse = data[0].prevAll('#collapse' + server.id),
			container = collapse.find('.container'),
			append = 'Fair fight.',
			lead = 4,
			add = 'text-info',
			col = false

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
			container.append('<div class="text-center ' + add + '">' + append + '</div>')
			if (this.hide2 && server.id === this.main)
				col = true
			collapse.collapse({toggle: col})
		},

		_addFacility: function(server) {
			var row = $('footer').before('<div id="collapse' + server.id + '" class="collapse"><div class="container"><div class="facilities text-center"></div></div></div>'),
			$container = $('#collapse' + server.id + ' > .container'),
			$facilities = $container.find('.facilities'),
			vanu = server.alert.TerritoryVS,
			tr = server.alert.TerritoryTR,
			nc = server.alert.TerritoryNC


			$.each(server.alert, function(facility, status) {
				if (facility === 'dataID' || facility === 'dataTimestamp' || facility === 'resultID')
					return
				var add = 'progress-bar-purple'
				switch (status) {
					case '1': // Vanu
						break
					case '2': // NC
						add = 'progress-bar-info'
						break
					case '3': // TR
						add = 'progress-bar-danger'
						break

					default:
						break
				}
				$facilities.append('<div class="facility ' + add + '" data-tooltip="true" title="' + facility + ' (' + server.alert.type + ') on ' + server.alert.zone + '">')
			})
			$facilities.find('[data-tooltip]').tooltip()

			return [row, +vanu.toFixed(2), +tr.toFixed(2), +nc.toFixed(2)]
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
							w.alert.updateBadge(server)
						})
					return $('#server-' + server.id + ' .remaining').html(h + ':' + m + ':' + s)
				}
				server.Status = 'INACTIVE'
				this.updateTable(server)
			}
		},

		updated: function(server) {
			this.updateTable(server)
		},

		refresh: function(e) {
			var $e = $(e)
			$e.attr('disabled', true)
			chrome.runtime.getBackgroundPage(function(w) {
				w.alert.update()
				chrome.storage.local.get({lastUpdate: 0, serverTimestamp: 0}, function(data) {
					$('#server > button').attr('title', new Date(data.lastUpdate) + '(' +new Date(data.serverTimestamp) + ')')
				})
				window.setTimeout(function() {
					$e.removeAttr('disabled')
				}, 30000)
			})
		}
	}

	window.App = App
}(window)

$.fn.ready(function() {
	App = new App()
})
