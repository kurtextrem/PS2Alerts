+function (window) {
	'use strict'

	var Options = function () {
		chrome.runtime.getBackgroundPage(function (w) {
			var opts = w.alert.returnOptions()
			this.createHTML(opts[0], opts[1])
			this.load()
			this.bind()
		}.bind(this))
	}

	Options.prototype = {
		constructor: Options,
		createHTML: function (servers, flares) {
			var option = $('<option>').val(0).text('All')
			$('#notification').append(option)
			for (var server in servers) {
				option = $('<option>').val(server).text(servers[server])
				$('#notification, #main').append(option)
			}
			for (var flare in flares) {
				option = $('<option>').val(flare).text(flares[flare][0]).css('background-color', 'rgba(' + flares[flare][1][0] + ', ' + flares[flare][1][1] + ', ' + flares[flare][1][2] + ', ' + flares[flare][1][3] + ')')
				$('#flare').append(option)
			}
		},
		load: function () {
			chrome.storage.sync.get({ main: 13, flare: 1, notification: 13, hide: 0, hide2: 0, jaeger: 0, alwaysRemind: 0, timeRemind: 30, ps4: 1 }, function (data) {
				$('#notification > option[value=' + data.notification + ']').prop('selected', true)
				$('#flare > option[value=' + data.flare + ']').prop('selected', true)
				$('#main > option[value=' + data.main + ']').prop('selected', true)
				if (data.hide)
					$('#hide').prop('checked', true)
				if (data.hide2)
					$('#hide2').prop('checked', true)
				if (data.alwaysRemind)
					$('#alwaysRemind').prop('checked', true)
				if (data.jaeger)
					$('#jaeger').prop('checked', true)
				if (data.ps4)
					$('#ps4').prop('checked', true)
				$('#timeRemind').val(data.timeRemind)
			})
		},
		bind: function () {
			// save
			$('input, select').change(function (e) {
				var obj = {}, val = +e.target.value

				if (e.target.type === 'checkbox')
					val = $('#' + e.target.id).is(':checked')
				if (e.target.id === 'hide' && !val)
						chrome.browserAction.enable() // make sure it gets enabled
				obj[e.target.id] = val
				chrome.storage.sync.set(obj, function () {
					chrome.storage.local.set(obj, function () {
						chrome.runtime.getBackgroundPage(function (w) {
							w.alert.init()
						})
					})
				})
			})

			// bottom links
			$('[data-popover]').popover({
				animation: true,
				html: true,
				placement: 'bottom'
			})
		}
	}

	window.Options = new Options()
}(window)
