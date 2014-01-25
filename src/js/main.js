+function(window) {
	'use strict'

	var App = function() {
		chrome.storage.local.get({servers: {}, main: 13}, function(data) {
			this.servers = data.servers
			this.addHTML()
			$.each(data.servers, function(index, server) {
				this.updateAlerts(server)
			}.bind(this))
			$('#refresh').click(this.refresh)
			chrome.storage.local.get({direction: 'desc', by: $('th')}, function(data) {
				var $table = $('table')
				$table.tablesort()
				$table.data('tablesort').sort($('#'+data.by), data.direction)
			})
			$('table').on('tablesort:complete', function(e, tablesort) {
				chrome.storage.local.set({direction: tablesort.direction, by: $('.sorted').attr('id')})
			})
			$('#server-'+data.main).css('background-color', '#d0e9c6')
		}.bind(this))
	}
	App.prototype = {
		servers: {},
		intervals: {},
		constructor: App,
		updated: function(server) {
			if (!server)
				return this._updateAll()
			this.updateAlerts(server)
		},

		_updateAll: function() {
			chrome.storage.local.get({servers: {}}, function(data) {
				this.servers = data.servers
				$.each(data.servers, function(index, server) {
					this.updateAlerts(server)
				}.bind(this))
			}.bind(this))
		},

		refresh: function(e) {
			var $e = $(e)
			$e.attr('disabled', true)
			chrome.runtime.getBackgroundPage(function(w) {
				w.alert.update()
				window.setTimeout(function() {
					$(e).removeAttr('disabled')
				}, 30000)
			})
		},

		addHTML: function() {
			$.each(this.servers, function (index, server) {
				$('tbody').append('<tr id="server-' + server.id + '"></tr>')
				$('tr:last').append('<td class="server-name">' + server.name + '</td>')
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
				$server.find('.server-name').prepend('<video width="15" height="15" autoplay loop><source src="img/AlertAnim2.mp4" type="video/mp4"></video>')
				$server.find('.type').html(server.alert.type)
				$server.find('.continent').html(server.alert.zone)
				$server.find('.remaining').removeClass('inactive')

				this.updateTime(server)
				this.intervals[main] = window.setInterval(this.updateTime.bind(this, server), 1000)
			} else {
				$server.removeClass()
				$server.find('.server-name video').remove()
				$server.find('.type').html('')
				$server.find('.continent').html('')
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
	})
})