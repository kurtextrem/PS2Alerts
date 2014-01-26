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
		chrome.storage.local.get({servers: {}, main: 13, lastUpdate: 0, direction: 'desc', by: 'server'}, function(data) {
			this.servers = data.servers
			this.addHTML()
			$.each(data.servers, function(index, server) {
				this.updateTable(server)
			}.bind(this))
			this.interval = window.setInterval(this.updateTime.bind(this), 1000)

			var $table = $('table')
			$table.tablesort()
			$table.data('tablesort').sort($('#'+data.by), data.direction)

			$('#refresh').click(this.refresh)
			$table.on('tablesort:complete', function(e, tablesort) {
				chrome.storage.local.set({direction: tablesort.direction, by: $('.sorted').attr('id')})
			})
			$('#server-'+data.main+' td').css('background-color', '#d0e9c6')
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
				$('tr:last').append('<td class="server-name"><button type="button" data-toggle="collapse" data-target="#collapse'+server.id+'" class="btn btn-link">' + server.name + '</button></td>')
				$('tr:last').append('<td class="remaining"></td>')
				$('tr:last').append('<td class="type"></td>')
				$('tr:last').append('<td class="continent"></td>')
			})
		},

		updateTable: function(server) {
			var main = 's'+server.id,
			$server = $('#server-' + server.id)

			if (server.status === 1) {
				$server.addClass('success')

				var video = $server.find('.server-name')
				if (video.find('video').length === 0)
					video.prepend('<video width="15" height="15" autoplay loop><source src="img/AlertAnim2.mp4" type="video/mp4"></video>').find('video')[0].play()

				$server.find('.type').text(typeData[server.alert.type]+' (+'+server.alert.experience_bonus+'%)')
				if (server.alert.type === 1) {
					$('body').remove('#collapse'+server.id).find('p').before('<div id="collapse'+server.id+'" class="collapse"><div class="container"><div class="progress"><div class="progress-bar progress-bar-danger" style="width:'+Math.round(server.alert.faction_tr)+'%"></div><div class="progress-bar progress-bar-info" style="width:'+Math.round(server.alert.faction_nc)+'%"></div><div class="progress-bar progress-bar-purple" style="width:'+Math.ceil(server.alert.faction_vs)+'%"></div></div></div></div>')
					$('.collapse').collapse({toggle: false})
					$server.find('.server-name > button').removeAttr('disabled')
				} else {
					$server.find('.server-name > button').attr('disabled', true)
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

				if (h < 2 || (h + +m + +s) > 0)
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
				w.Alert.init(true)
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