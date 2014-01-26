+function(window) {
	'use strict';

	var App = function() {
		chrome.storage.local.get({servers: {}, main: 13, lastUpdate: 0}, function(data) {
			this.servers = data.servers
			this.addHTML()
			$.each(data.servers, function(index, server) {
				this.updateAlerts(server)
			}.bind(this))
			$('#refresh').click(this.refresh)
			chrome.storage.local.get({direction: 'desc', by: 'server'}, function(data) {
				var $table = $('table')
				$table.tablesort()
				$table.data('tablesort').sort($('#'+data.by), data.direction)
			})
			$('table').on('tablesort:complete', function(e, tablesort) {
				chrome.storage.local.set({direction: tablesort.direction, by: $('.sorted').attr('id')})
			})
			$('#server-'+data.main+' td').css('background-color', '#d0e9c6')
			$('#server > button').attr('title', new Date(data.lastUpdate))
		}.bind(this))
	}
	App.prototype = {
		servers: {},
		intervals: {},
		constructor: App,
		updated: function(server) {
			this.updateAlerts(server)
		},

		refresh: function(e) {
			var $e = $(e)
			$e.attr('disabled', true)
			chrome.runtime.getBackgroundPage(function(w) {
				w.alert.init(true)
				$('#server > button').attr('title', new Date(data.lastUpdate))
				window.setTimeout(function() {
					$(e).removeAttr('disabled')
				}, 30000)
			})
		},

		addHTML: function() {
			$.each(this.servers, function (index, server) {
				$('tbody').append('<tr id="server-' + server.id + '"></tr>')
				$('tr:last').append('<td class="server-name"><button type="button" data-toggle="collapse" data-target="#collapse'+server.id+'" class="btn btn-link">' + server.name + '</button></td>')
				$('tr:last').append('<td class="remaining"></td>')
				$('tr:last').append('<td class="type"></td>')
				$('tr:last').append('<td class="continent"></td>')
			})
		},

		updateAlerts: function(server) {
			var main = 's'+server.id,
			$server = $('#server-' + server.id)
			if (server.status == 1) {
				$server.addClass('success')
				var video = $server.find('.server-name')
				if (video.find('video').length === 0)
					video.prepend('<video width="15" height="15" autoplay loop><source src="img/AlertAnim2.mp4" type="video/mp4"></video>').find('video')[0].play()
				$server.find('.type').text(server.alert.type+' (+'+server.alert.experience_bonus+'%)')
				if (server.alert.type === 'Territory') {
					$('body').remove('#collapse'+server.id).find('p').before('<div id="collapse'+server.id+'" class="collapse"><div class="container"><div class="progress"><div class="progress-bar progress-bar-danger" style="width:'+Math.round(server.alert.faction_tr)+'%"></div><div class="progress-bar progress-bar-info" style="width:'+Math.round(server.alert.faction_nc)+'%"></div><div class="progress-bar progress-bar-purple" style="width:'+Math.ceil(server.alert.faction_vs)+'%"></div></div></div></div>')
					$('.collapse').collapse({toggle: false})
					$server.find('.server-name > button').removeAttr('disabled')
				} else {
					$server.find('.server-name > button').attr('disabled', true)
				}
				$server.find('.continent').text(server.alert.zone)
				$server.find('.remaining').removeClass('inactive')

				this.updateTime(server)
				this.intervals[main] = window.setInterval(this.updateTime.bind(this, server), 1000)
			} else {
				$server.removeClass()
				$server.find('.server-name video').remove()
				$server.find('.server-name > button').attr('disabled', true)
				$server.find('.type').text('')
				$server.find('.continent').text('')
				$server.find('.remaining').addClass('inactive')

				if (this.intervals[main])
					window.clearInterval(this.intervals[main])
			}

			if (typeof server.status === 'string') {
				$server.find('.remaining').html(server.status.charAt(0).toUpperCase() + server.status.slice(1))
				if (server.status.search('error') !== -1)
					$server.addClass('danger')

			}
		},

		updateTime: function(server) {
			var current = Date.now()

			if (server.status == 1) {
				var date = new Date(server.alert.start - current)

				if (server.alert.type === 'Territory' || server.alert.zone === 'Global') {
					date.setUTCHours(date.getUTCHours() + 2)
				} else {
					date.setUTCHours(date.getUTCHours() + 1)
				}

				var h = date.getUTCHours()
				var m = ('0' + date.getUTCMinutes()).slice(-2)
				var s = ('0' + date.getUTCSeconds()).slice(-2)

				if (h > 2 || (h + +m + +s) < 0) {
					server.status = 'no alert'
					this.updateAlerts(server)
				} else {
					$('#server-' + server.id + ' .remaining').html(h + ':' + m + ':' + s)
				}
			}
		}
	}

	window.App = App
}(window)

var app
$.fn.ready(function() {
	app = new App()
	window.setTimeout(function() {
		$.each($('video'), function(i, vid) {
			vid.play()
		})
	}, 500)
})