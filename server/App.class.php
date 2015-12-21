<?php
error_reporting(ERROR);

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

		// get config
		require_once 'config.inc.php';
		// set url according to conf
		define('URL', self::DOMAIN . 'alert/active?apikey=' . API_KEY);

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
		$data = file_get_contents(URL);
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
		foreach($data as &$server) {
			$map = file_get_contents(self::DOMAIN . 'metrics/map/' . $server['ResultID'] . '/latest');
			$server['data'] = $this->parseData($map, true)[0];
		}

		return array(
			'timestamp' => time() . '000',
			'data' => $data
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
}
