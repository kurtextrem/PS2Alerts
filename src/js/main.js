+function(window) {
	'use strict';

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

	var App = function() {
		if (typeof sessionStorage.startup === 'undefined') {
			sessionStorage.startup = 1
			chrome.runtime.getBackgroundPage($.noop)
		}
		chrome.storage.local.get({servers: {}, main: 13, lastUpdate: 0, direction: 'desc', by: 'server', flare: 0, hide2: 0}, function(data) {
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
			$table.data('tablesort').sort($('#'+data.by), data.direction)

			$('#refresh').click(function(e) {
				this.refresh()
				e.stopImmediatePropagation()
			}.bind(this))
			$table.on('tablesort:complete', function(e, tablesort) {
				chrome.storage.local.set({direction: tablesort.direction, by: $('.sorted').attr('id')})
			})
			$('#server-'+this.main+' td').css('background-color', 'rgb(224, 236, 218)')
			$('#server > button').attr('title', new Date(data.lastUpdate))
		}.bind(this))
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
				$('tr:last').append('<td class="server-name"><button type="button" data-toggle="collapse" data-target="#collapse'+server.id+'" class="btn btn-link">' + server.name + '</button></td>')
				$('tr:last').append('<td class="remaining"></td>')
				$('tr:last').append('<td class="type"></td>')
				$('tr:last').append('<td class="continent"></td>')
			}.bind(this))
		},

		updateTable: function(server) {
			var main = 's'+server.id,
			$server = $('#server-' + server.id)

			if (server.status === 1) {
				$server.addClass('success')

				var video = $server.find('.server-name')
				if (video.find('video').length === 0)
					video.prepend('<video width="15" height="15" autoplay loop><source src="img/AlertAnim2.mp4" type="video/mp4"></video>').find('video')[0].play()

				$server.find('.type').html(typeData[server.alert.type]+' <span title="EXP Bonus">(+'+server.alert.experience_bonus+'%)</span>')
				$server.find('.server-name > button').removeAttr('disabled')

				switch (server.alert.type) {
					case 1:
						this.addType('territory', server)
						break;
					case (2 || 3 || 4):
						this.addType('facility', server)
						break;
					default:
						$server.find('.server-name > button').attr('disabled', true)
						break
				}

				$server.find('.continent').text(zoneData[server.alert.zone])
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

			if (typeof server.status === 'string') {
				$server.find('.remaining').html(server.status.charAt(0).toUpperCase() + server.status.slice(1))
				if (server.status.search('error') !== -1)
					$server.addClass('danger')

			}
		},

		_addTerritory: function(server) {
			var vanu = server.alert.faction_vs,
			tr = server.alert.faction_tr,
			nc = server.alert.faction_nc,
			count = 100 - nc - tr,
			row = $('body').remove('#collapse'+server.id).find('p').before('<div id="collapse'+server.id+'" class="collapse"><div class="container"><div class="progress"><div class="progress-bar progress-bar-danger" style="width:'+tr +'%" title="'+Math.floor(tr)+'%"></div><div class="progress-bar progress-bar-info" style="width:'+ nc +'%" title="'+Math.floor(nc)+'%"></div><div class="progress-bar progress-bar-purple" style="width:'+ count +'%" title="'+Math.floor(vanu)+'%"></div></div></div></div>')

			return [row, vanu, tr, nc]
		},

		addType: function(which, server) {
			var data = null
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

			var collapse = data[0].prevAll('#collapse'+server.id),
			container = collapse.find('.container')

			if (this.flare === 0 && data[3] < data[1] && data[2] < data[1])
				container.append('<div class="text-center text-success">Vanu is leading!</div>')
			if (this.flare === 1 && data[2] < data[3] && data[3] > data[1])
				container.append('<div class="text-center text-success">NC is leading!</div>')
			if (this.flare === 2 && data[2] > data[1] && nc < data[3])
				container.append('<div class="text-center text-success">TR is leading!</div>')
			collapse.collapse({toggle: false})
		},

		_addFacility: function(server) {
			var row = $('body').remove('#collapse'+server.id).find('p').before('<div id="collapse'+server.id+'" class="collapse"><div class="container"></div></div>'),
			$container = $('#collapse'+server.id+' > .container'),
			vanu = server.alert.faction_vs,
			tr = server.alert.faction_tr,
			nc = server.alert.faction_nc


			$.each(server.alert.facilities, function(i, facility) {
				$container.append('<div class="facility" data-tooltip="true" title="'+facility.name+' ('+typeData[facility['facility-type']]+') on '+zoneData[facility.continent]+'">')
			})

			return [row, vanu, tr, nc]
		},

		updateTime: function(server) {
			if (!server) {
				return $.each(this.servers, function(i, server) {
					this.updateTime(server)
				}.bind(this))
			}
			var current = Date.now()

			if (server.status === 1) {
				var date = new Date(server.alert.start - current)

				if (server.alert.type === 1 || server.alert.zone === 0) {
					date.setUTCHours(date.getUTCHours() + 2)
				} else {
					date.setUTCHours(date.getUTCHours() + 1)
				}

				var h = date.getUTCHours()
				var m = ('0' + date.getUTCMinutes()).slice(-2)
				var s = ('0' + date.getUTCSeconds()).slice(-2)

				if (h < 2 && (h + +m + +s) > 0)
					return $('#server-' + server.id + ' .remaining').html(h + ':' + m + ':' + s)
				server.status = 'no alert'
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
				$('#server > button').attr('title', new Date(data.lastUpdate))
				window.setTimeout(function() {
					$(e).removeAttr('disabled')
				}, 30000)
			})
		}
	}

	window.App = App
}(window)

$.fn.ready(function() {
	App = new App()
	window.setTimeout(function() {
		$.each($('video'), function(i, vid) {
			vid.play()
		})
	}, 500)
})