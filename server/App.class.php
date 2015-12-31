<?php
require_once 'config.inc.php';

error_reporting(ERROR);
set_error_handler('App::error_handler');
set_exception_handler('App::exception_handler');

class App {
	/**
	 * Represents the filename for the cached data.
	 */
	const FILE_NAME = 'data.json';

	const DOMAIN = 'http://api.ps2alerts.com/v2/';

	/**
	 * Checks for the correct update key and updates.
	 *
	 * @author 	Jacob Groß
	 * @date   	2015-06-05
	 */
	public function __construct() {
		if (!isset($_GET['updateKey']) && php_sapi_name() != 'cli') { // !isset($_GET['data']) &&
			exit($this->setHeader('404'));
		}

		// set url according to conf
		define('URL', self::DOMAIN . 'alert/active?apikey=' . API_KEY);

		$this->ctx = stream_context_create(array(
			'http' => array(
				'timeout' => 5
			)
		));

		if (php_sapi_name() == 'cli' || (isset($_GET['updateKey']) && $_GET['updateKey'] === UPDATE_KEY)) {
			exit($this->update() ? 'Done' : 'Error');
		}

		// wrong key
		$this->setHeader('404');
	}

	/**
	 * Updates the cache file and adds a javascript timestamp.
	 *
	 * @author 	Jacob Groß
	 * @date   	2015-12-20
	 */
	private function update() {
		$data = file_get_contents(URL, 0, $this->ctx);
		if (!$data) throw new Exception('PS2Alerts API does not respond correctly.');
		$data = $this->completeData($data);

		return @file_put_contents(self::FILE_NAME, json_encode($data));
	}

	/**
	 * Requests details for a specific alert.
	 *
	 * @author 	Jacob Groß
	 * @date          	2015-12-21
	 * @param 	$data
	 * @return 	array
	 */
	private function completeData($data) {
		if (!$data)
			throw new Exception('No PS2Alerts API Result found.');

		$data = $this->parseData($data, true);
		$new = array();
		foreach($data as $server) {
			$map = file_get_contents(self::DOMAIN . 'metrics/map/' . $server['ResultID'] . '/latest', 0, $this->ctx);
			if (!$map) throw new Exception('PS2Alerts API does not respond correctly.');

			$server['data'] = $this->parseData($map, true)[0];
			$new['' . $server['ResultServer']] = $server;
		}

		return array(
			'timestamp' => time() . '000',
			'data' => $new,
			'error' => false
		);
	}

	/**
	 * Parses a JSON response.
	 *
	 * @author 	Jacob Groß
	 * @date          	2015-12-21
	 * @param 	String 	$data
	 * @param  	bool   	$assoc
	 * @return 	array / stdClass
	 */
	private function parseData($data, $assoc = true) {
		if (empty($data))
			$data = '{}';
		return json_decode(utf8_encode($data), $assoc);
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
				return;
		}
	}

	public static function error_hadler($errno, $errstr) {
		switch ($errno) {
			case E_USER_ERROR:
				$errstr = 'Error while receiving API.';
				break;

			case E_USER_WARNING:
				$errstr = 'Error while parsing API.';
				break;

			case E_USER_NOTICE:
				$errstr = 'Error while parsing API.';
				break;

			default:
				$errstr = '';
				break;
		}
		return $errstr;
	}

	public static function exception_handler ($e) {
		return self::error($e->getMessage());
	}

	public static function error($str = '') {
		if (empty($str)) {
			$str = 'Something went wrong.';
		}

		@file_put_contents(self::FILE_NAME, json_encode(array(
			'timestamp' => time() . '000',
			'data' => array(),
			'error' => $str
		)));

		// prevent PHP from throwing it
		return true;
	}
}
