+function(window) {
	'use strict'

	var App = function() {
		chrome.storage.local.get({servers: {}}, function(data) {
			this.servers = data.servers
			this.addHTML()
			$.each(data.servers, function(index, server) {
				this.updateAlerts(server)
			}.bind(this))
			$('#refresh').click(this.refresh)
		}.bind(this))
	}
	App.prototype = {
		servers: {},
		intervals: {},
		constructor: App,
		updated: function() {
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
				$(e).removeAttr('disabled')
			})
		},

		addHTML: function() {
			$.each(this.servers, function (index, server) {
				$('tbody').append('<tr id="server-' + server.id + '"></tr>')
				$('tr:last').append('<td>' + server.name + '</td>')
				$('tr:last').append('<td class="remaining"></td>')
				$('tr:last').append('<td class="type"></td>')
				$('tr:last').append('<td class="continent"></td>')
			})
		},

		updateAlerts: function(server) {
			var main = 's'+server.id
			if (server.status == 1) {
				$('#server-' + server.id).addClass('success')
				$('#server-' + server.id + ' .type').html(server.alert.type)
				$('#server-' + server.id + ' .continent').html(server.alert.zone)
				$('#server-' + server.id + ' .remaining').removeClass('inactive')

				this.updateTime(server)
				this.intervals[main] = window.setInterval(this.updateTime.bind(this, server), 1000)
			} else {
				$('#server-' + server.id).removeClass()
				$('#server-' + server.id + ' .type').html('')
				$('#server-' + server.id + ' .continent').html('')
				$('#server-' + server.id + ' .remaining').addClass('inactive')

				if (this.intervals[main])
					window.clearInterval(this.intervals[main])
			}

			if (typeof server.status === 'string') {
				var $el = $('#server-' + server.id)
				$el.find('.remaining').html(server.status.charAt(0).toUpperCase() + server.status.slice(1))
				if (server.status.search('error') !== -1)
					$el.addClass('danger')

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

app = new App()