/* jshint node: true, devel: true */
var shell = require('shelljs'),
	zipdir = require('zip-dir'),
	fs = require('fs');

!function () {
	'use strict'

	var Build = function () {
		this.args = process.argv.slice(2)
		this.args.forEach(function (arg) {
			if (this[arg]) {
				this[arg]()
			} else {
				console.warn('undefined option', arg)
			}
		}.bind(this))
	}

	Build.prototype.copy = function () {
		this.copyLocales()
		this.copyImg()
		this.copyFonts()
		this.copyCSS()
		this.copyJS()
		this.copyHTML()
	}

	Build.prototype.copyLocales = function () {
		fs.readdir('src/_locales', function (err, folder) {
			if (err) throw err

			folder.forEach(function (name) {
				if (name !== '.' && name !== '..') {
					shell.mkdir('-p', 'dist/_locales/' + name)
					shell.exec('json-minify src/_locales/' + name + '/messages.json > dist/_locales/' + name + '/messages.json')
				}
			})
		})
	}

	Build.prototype.copyImg = function () {
		shell.cp('-r', 'src/img', 'dist')
	}

	Build.prototype.copyCSS = function () {
		shell.mkdir('-p', 'dist/css')
		fs.readdir('src/css', function (err, folder) {
			if (err) throw err

			folder.forEach(function (name) {
				if (name !== '.' && name !== '..') {
					if (name.indexOf('.min') === -1)
						shell.exec('cssnano src/css/' + name + ' dist/css/' + name)
					else
						shell.cp('src/css/' + name, 'dist/css/' + name)
				}
			})
		})
	}

	Build.prototype.copyJS = function () {
		shell.mkdir('-p', 'dist/js')
		fs.readdir('src/js', function (err, folder) {
			if (err) throw err

			folder.forEach(function (name) {
				if (name !== '.' && name !== '..') {
					if (name.indexOf('.min') === -1)
						shell.exec('uglifyjs -c drop_console=true src/js/' + name + ' > dist/js/' + name)
					else
						shell.cp('src/js/' + name, 'dist/js/' + name)
				}
			})
		})
	}

	Build.prototype.copyFonts = function () {
		shell.cp('-r', 'src/fonts', 'dist')
	}

	Build.prototype.copyHTML = function () {
		shell.cp('src/*.html', 'dist')
	}

	Build.prototype.buildZip = function () {
		zipdir('dist', { saveTo: 'dist.zip' }, function (err) {
			if (err)
				console.error(err)
		})
	}

	new Build()
}();
