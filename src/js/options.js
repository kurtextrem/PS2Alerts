+function(window) {
	'use strict';

	var servers = [
		{name: 'Briggs', id: 25, status: 0},
		{name: 'Ceres', id: 11, status: 0},
		{name: 'Cobalt', id: 13, status: 0},
		{name: 'Connery', id: 1, status: 0},
		{name: 'Mattherson', id: 17, status: 0},
		{name: 'Miller', id: 10, status: 0},
		{name: 'Waterson', id: 18, status: 0},
		{name: 'Woodman', id: 9, status: 0},
	]

	var flares = {
		0: ['Vanu', [128, 0, 255, 255]],
		1: ['NC', [0, 200, 255, 255]],
		2: ['TR', [219, 0, 0, 255]],
		3: ['NS', [255, 238, 0, 255]]
	}


	var Options = function() {
		this.createHTML()
		this.load()
		this.bind()
	}
	Options.prototype = {
		constructor: Options,
		createHTML: function() {
			var option = $('<option>').val(0).text('All')
			$('#notification').append(option)
			$.each(servers, function(i, server) {
				option = $('<option>').val(server.id).text(server.name)
				$('#notification, #main').append(option)
			})
			$.each(flares, function(i, flare) {
				option = $('<option>').val(i).text(flare[0]).css('background-color', 'rgba('+flare[1][0]+', '+flare[1][1]+', '+flare[1][2]+', '+flare[1][3]+')')
				$('#flare').append(option)
			})
		},
		load: function() {
			chrome.storage.local.get({main: 13, flare: 0, notification: 13, hide: 0, hide2: 0}, function(data) {
				$('#notification > option[value='+data.notification+']').attr('selected', 'selected')
				$('#flare > option[value='+data.flare+']').attr('selected', 'selected')
				$('#main > option[value='+data.main+']').attr('selected', 'selected')
				if (data.hide)
					$('#hide').attr('checked', true)
				if (data.hide2)
					$('#hide2').attr('checked', true)
			})
		},
		bind: function() {
			$('#notification, #main, #flare, #hide, #hide2').change(function(e) {
				var obj = {}, val = +e.target.value
				if (e.target.id === 'hide') {
					val = $('#hide').is(':checked')
					if (!val)
						chrome.browserAction.enable()
				}
				if (e.target.id === 'hide2') {
					val = $('#hide2').is(':checked')
				}
				obj[e.target.id] = val
				chrome.storage.local.set(obj, function() {
					chrome.runtime.getBackgroundPage(function(w) {
						w.alert.init(true)
					})
				})
			})
			$('[data-popover]').popover({
				animation: true,
				html: true,
				trigger: 'hover',
				placement: 'bottom'
			})
		}
	}

	window.Options = Options
}(window)

new Options()