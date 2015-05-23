+function (window) {
	'use strict';

	var servers = [
		{ name: 'Connery', id: 1, status: 0 },
		{ name: 'Miller', id: 10, status: 0 },
		{ name: 'Cobalt', id: 13, status: 0 },
		{ name: 'Emerald', id: 17, status: 0 },
		{ name: 'Briggs', id: 25, status: 0 },
		{ name: 'Jaeger', id: 19, status: 0 }
	]

	var flares = {
		0: ['Vanu', [128, 0, 255, 0.6]],
		1: ['NC', [0, 200, 255, 0.6]],
		2: ['TR', [219, 0, 0, 0.6]],
		3: ['NS', [255, 238, 0, 0.6]]
	}


	var Options = function () {
		this.createHTML()
		this.load()
		this.bind()
	}

	Options.prototype = {
		constructor: Options,
		createHTML: function () {
			var option = $('<option>').val(0).text('All')
			$('#notification').append(option)
			$.each(servers, function (i, server) {
				option = $('<option>').val(server.id).text(server.name)
				$('#notification, #main').append(option)
			})
			$.each(flares, function (i, flare) {
				option = $('<option>').val(i).text(flare[0]).css('background-color', 'rgba('+flare[1][0]+', '+flare[1][1]+', '+flare[1][2]+', '+flare[1][3]+')')
				$('#flare').append(option)
			})
		},
		load: function () {
			chrome.storage.sync.get({ main: 13, flare: 0, notification: 13, hide: 0, hide2: 0, jaeger: 0, alwaysRemind: 0, timeRemind: 30 }, function (data) {
				$('#notification > option[value='+data.notification+']').attr('selected', 'selected')
				$('#flare > option[value='+data.flare+']').attr('selected', 'selected')
				$('#main > option[value='+data.main+']').attr('selected', 'selected')
				if (data.hide)
					$('#hide').attr('checked', true)
				if (data.hide2)
					$('#hide2').attr('checked', true)
				if (data.alwaysRemind)
					$('#alwaysRemind').attr('checked', true)
				if (data.jaeger)
					$('#jaeger').attr('checked', true)
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
					chrome.runtime.getBackgroundPage(function (w) {
						w.alert.init()
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
