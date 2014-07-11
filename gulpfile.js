'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var uglify = require('gulp-uglifyjs');
var rimraf = require('rimraf');
var runSequence = require('run-sequence');
//var browserSync = require('browser-sync');
//var reload = browserSync.reload;


gulp.task('styles:pretty', function () {
	//return gulp.src(['src/css/**', '!src/css/*.min.css']).pipe($.recess()).pipe(gulp.dest('dist/css'))
})

gulp.task('copy-css', function () {
	return gulp.src('src/css/*.min.css').pipe(gulp.dest('dist/css'))
})

// Output Final CSS Styles
gulp.task('styles', ['styles:pretty', 'copy-css']);

gulp.task('json', function () {
	return gulp.src('src/**/**/*.json')
		.pipe($.replace('js/bglib.min.js", "js/background.js', 'js/background.js'))
		.pipe($.jsonminify())
		.pipe(gulp.dest('dist'))
		.pipe($.size({
			title: 'json'
		}));
})

gulp.task('zip', function () {
	return gulp.src('dist/**').pipe($.zip('dist.zip')).pipe(gulp.dest('dist'))
})

gulp.task('copy', function () {
	runSequence(['copy-img', 'copy-fonts', 'copy-js'])
})

gulp.task('copy-img', function () {
	return gulp.src('src/img/**').pipe(gulp.dest('dist/img'))
})

gulp.task('copy-js', function () {
	return gulp.src(['src/js/bootstrap.min.js', 'src/js/jquery.min.js']).pipe(gulp.dest('dist/js'))
})

gulp.task('copy-fonts', function () {
	return gulp.src('src/fonts/**').pipe(gulp.dest('dist/fonts'))
})

// Scan Your HTML For Assets & Optimize Them
gulp.task('html', function () {
	return gulp.src('src/*.html')
	.pipe($.useref.assets({
		searchPath: '{.tmp,src}'
	}))
	// Concatenate And Minify JavaScript
	.pipe($.if ('*.js', uglify('', {
			mangle: {
				toplevel: false,
				screw_ie8: true
			},
			compress: {
				screw_ie8: true,
				sequences: true,
				properties: true,
				dead_code: false,
				drop_debugger: true,
				comparisons: true,
				conditionals: true,
				evaluate: true,
				booleans: true,
				loops: true,
				unused: false,
				hoist_funs: true,
				if_return: true,
				join_vars: true,
				cascade: true,
				negate_iife: true,
				drop_console: true
			}
	})))
	// Concatenate And Minify Styles
	.pipe($.if ('*.css', $.cssshrink()))
	// Remove Any Unused CSS
	// .pipe($.if ('*.css', $.uncss({ html: ['app/index.html', 'app/styleguide/index.html'] })))
	.pipe($.useref.restore())
	.pipe($.useref())
	// Minify Any HTML
	.pipe($.minifyHtml())
	// Output Files
	.pipe(gulp.dest('dist'))
	.pipe($.size({
		title: 'html'
	}));
});

gulp.task('background-js', function () {
	return gulp.src(['bglib.min.js', 'background.js'], {
		cwd: 'src/js'
	}).pipe(uglify('background.js', {
		mangle: {
			toplevel: true,
			screw_ie8: true
		},
		compress: {
			screw_ie8: true,
			sequences: true,
			//properties: true, <-- TEST!
			dead_code: true,
			drop_debugger: true,
			comparisons: true,
			conditionals: true,
			evaluate: true,
			booleans: true,
			loops: true,
			unused: false,
			hoist_funs: true,
			if_return: true,
			join_vars: true,
			cascade: true,
			//negate_iife: true, <-- TEST!
			drop_console: true
		}
	})).pipe($.replace('"use strict";', '')).pipe(gulp.dest('dist/js')).pipe($.size({
		title: 'bg js'
	}));
})

// Clean Output Directory
gulp.task('clean', function (cb) {
	rimraf('dist', rimraf.bind({}, '.tmp', cb));
});

// Watch Files For Changes & Reload
/*gulp.task('serve', function () {
	browserSync.init(null, {
		server: {
			baseDir: ['app', '.tmp']
		},
		notify: false
	});

	gulp.watch(['app/**REMOVE/*.html'], reload);
	gulp.watch(['app/styles/**REMVE/*.{css,scss}'], ['styles']);
	gulp.watch(['.tmp/styles/**REMVE/*.css'], reload);
	gulp.watch(['app/scripts/**REMOVE/*.js'], ['jshint']);
	gulp.watch(['app/images/**REMOVE/*'], ['images']);
});*/

// Build Production Files
gulp.task('build', function (cb) {
	runSequence('copy', ['styles', 'background-js', 'json', 'html'], 'zip', cb);
});

// Default Task
gulp.task('default', ['clean'], function (cb) {
	gulp.start('build', cb);
});
