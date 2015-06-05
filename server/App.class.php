<?php

class App {
	/**
	 * Represents the filename for the cached data.
	 */
	const FILE_NAME = 'data.json';

	/**
	 * Checks for the correct update key and updates.
	 *
	 * @author 	Jacob Groß
	 * @date   	2015-06-05
	 */
	public function __construct() {
		if (!isset($_GET['data']) && !isset($_GET['updateKey'])) {
			exit($this->setHeader('404'));
		}

		// get config
		require_once 'config.inc.php';
		// set url according to conf
		define('URL', 'http://api.ps2alerts.com/v1/servers/active/all?apikey=' . API_KEY);

		if (isset($_GET['updateKey']) && $_GET['updateKey'] === UPDATE_KEY) {
			exit($this->update());
		}

		// wrong key
		$this->setHeader('404');
	}

	/**
	 * Updates the cache file.
	 *
	 * @author 	Jacob Groß
	 * @date   	2015-06-05
	 */
	private function update() {
		return @file_put_contents(self::FILE_NAME, preg_replace('{',  '{"timestamp":' . time() . '000,', @file_get_contents(URL), 1));
	}

	/**
	 * Sets the header according to the param.
	 *
	 * @author 	Jacob Groß
	 * @date   	2015-06-05
	 * @param  	string      	$header 	Status to set.
	 */
	private function setHeader($header = '404') {
		switch ($header) {
			case '404':
				header($_SERVER['SERVER_PROTOCOL'].' 404 Not Found');
				exit();

			default:
				return false;
		}
	}
}
