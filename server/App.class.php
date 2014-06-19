<?php

class App {
	const FILE_NAME = 'data.json';

	function __construct() {
		if (!isset($_GET['data']) && !isset($_GET['updateKey']))
			exit($this->setHeader('404'));

		require_once 'config.inc.php';
		//define('URL', 'http://ps2alerts.com/API/status?ref=ALERTMON');
		define('URL', 'http://maelstrome26.servehttp.com/ps2alerts/API/status?ref=ALERTMON');

		if (isset($_GET['updateKey']) && $_GET['updateKey'] === UPDATE_KEY) {
			$this->update();
			echo 'Done';
			exit;
		}
		Header($_SERVER['SERVER_PROTOCOL'].' 404 Not Found');
	}

	function update() {
		@file_put_contents(self::FILE_NAME, @file_get_contents(URL));
	}
}
