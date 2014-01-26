+function(window) {
	'use strict'
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
		0: 'Vanu',
		1: 'NC',
		2: 'TR',
		3: 'NS'
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
				option = $('<option>').val(i).text(flare)
				$('#flare').append(option)
			})
		},
		load: function() {
			chrome.storage.local.get({main: 13, flare: 0, notification: 13, hide: 0}, function(data) {
				$('#notification > option[value='+data.notification+']').attr('selected', 'selected')
				$('#flare > option[value='+data.flare+']').attr('selected', 'selected')
				$('#main > option[value='+data.main+']').attr('selected', 'selected')
				if (data.hide)
					$('#hide').attr('checked', true)
			})
		},
		bind: function() {
			$('#notification, #main, #flare, #hide').change(function(e) {
				var obj = {}, val = +e.target.value
				if (e.target.id === 'hide') {
					val = $('#hide').is(':checked')
					if (!val)
						chrome.browserAction.enable()
				}
				obj[e.target.id] = val
				chrome.storage.local.set(obj, function() {
					chrome.runtime.getBackgroundPage(function(w) {
						w.Alert.init(true)
					})
				})
			})
		}
	}

	window.Options = Options
}(window)

new Options()