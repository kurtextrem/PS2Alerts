<?php

class App {
	const UPDATE_TIME = 1;
	const FILE_NAME = 'cache/data';

	private $url;
	private $servers = array(
	                 '25' => array('name' => 'Briggs', 'status' => 'API error (U)', 'isOnline' => false, 'alert' => array()),
	                 '11' => array('name' => 'Ceres', 'status' => 'API error (U)','isOnline' => false, 'alert' => array()),
	                 '13' => array('name' => 'Cobalt', 'status' => 'API error (U)', 'isOnline' => false, 'alert' => array()),
	                 '1' => array('name' => 'Connery', 'status' => 'API error (U)', 'isOnline' => false, 'alert' => array()),
	                 '17' => array('name' => 'Mattherson', 'status' => 'API error (U)', 'isOnline' => false, 'alert' => array()),
	                 '10' => array('name' => 'Miller', 'status' => 'API error (U)', 'isOnline' => false, 'alert' => array()),
	                 '18' => array('name' => 'Waterson', 'status' => 'API error (U)', 'isOnline' => false, 'alert' => array()),
	                	'9' => array('name' => 'Woodman', 'status' => 'API error (U)', 'isOnline' => false, 'alert' => array())
	);

	private $events = array(
		array('zone' => 2, 'type' => 1),
		array('zone'=> 8, 'type' => 1),
		array('zone'=> 6, 'type' => 1),
		array('zone'=> 0, 'type' => 2),
		array('zone'=> 0, 'type' => 3),
		array('zone'=> 0, 'type' => 4),
		array('zone'=> 6, 'type' => 2),
		array('zone'=> 6, 'type' => 3),
		array('zone'=> 6, 'type' => 4),
		array('zone'=> 2, 'type' => 2),
		array('zone'=> 2, 'type' => 3),
		array('zone'=> 2, 'type' => 4),
		array('zone'=> 8, 'type' => 2),
		array('zone'=> 8, 'type' => 4)
	);

	private $activeEvent = array(
		'135'// => true, // started
		'136'// => true // restarted
		/*'137' => false, // canceled
		'138' => false, // finished
		'139' => false'*/
	);

	private $output = array('time' => 0, 'alertCount' => 0, 'servers' => array());

	function __construct() {
		if (!isset($_GET['data']) && !isset($_GET['updateKey']))
			exit($this->setHeader('404'));

		define('NOW', time());
		require_once 'config.inc.php';
		define('URL', 'http://census.soe.com/s:'.ID.'/get/ps2:v2/');

		if (isset($_GET['updateKey']) && $_GET['updateKey'] === UPDATE_KEY) {
			$this->update();
			echo 'Done';
			exit;
		}

		$data = @file_get_contents(self::FILE_NAME);
		if ($data) {
			$this->output = json_decode($data, true);
		}

		$this->setHeader('json');
		$this->output(json_encode($this->output));
	}

	function setHeader($type) {
		$header = 'Content-type: application/json';
		switch ($type) {
			case 'json':
				break;
			case '404':
				$header = $_SERVER['SERVER_PROTOCOL'].' 404 Not Found';
				break;

			default:
				$header = $_SERVER['SERVER_PROTOCOL'].' 404 Not Found';
				break;

		}
		header($header);
	}

	function output($data) {
		echo $data;
	}

	function update() {
		$ids = $this->getIDs();
		$servers = $this->get(URL.'world?c:show=state,world_id&world_id='.$ids);
		$alerts = $this->sortAlerts($this->get(URL.'world_event?type=METAGAME&world_id='.$ids)->world_event_list);

		foreach ($servers->world_list as $server) {
			$data = $this->servers[$server->world_id];
			$data['id'] = 0+$server->world_id;

			if ($server->state === 'online') {
				$data['isOnline'] = true;

				if (!isset($alerts[$data['id']])) {
					$data['status'] = 'no alert';
				} else {
					$data2 = $alerts[$data['id']];

					if (!isset($this->activeEvent[$data2->metagame_event_state])) {
						$data['status'] = 'no alert';
					} else {
						$this->output['alertCount']++;
						$event = $this->events[$data2->metagame_event_id - 1];

						$data['status'] = 1;
						$data['alert'] = array(
						                       'start' => 0+($data2->timestamp . '000'),
						                       'type' => $event['type'],
						                       'zone' => $event['zone'],
						                       'faction_nc' => $data2->faction_nc,
						                       'faction_tr' => $data2->faction_tr,
						                       'faction_vs' => $data2->faction_vs,
						                       'experience_bonus' => $data2->experience_bonus,
						                       'facilities' => array()
						);

						if ($event['type'] > 1) {
							$type = $event['type'] === 2?3:($event['type'] === 3?4:2);
							$file3 = $this->get('http://fishy.sytes.net/ps2territory.php?world='.$data['id'].'&continent='.$event['zone'].'&facility='.$type, true);

							if ($file3) {
								$data['alert']['facilities'] = $file3['control-list'][0]['facilities'];
								$data['alert']['faction_vs'] = $file3['control-list'][0]['control-percentage'][1];
								$data['alert']['faction_nc'] = $file3['control-list'][0]['control-percentage'][2];
								$data['alert']['faction_tr'] = $file3['control-list'][0]['control-percentage'][3];
							}
						}
					}
				}
			} else {
				$data['status'] = $server->state;
			}
			$this->output['servers'][$data['id']] = $data;
		}

		$this->output['time'] = 0+(NOW . '000');
		@file_put_contents(self::FILE_NAME, json_encode($this->output));
	}

	function getIDs() {
		return implode(',', array_keys($this->servers));
	}

	function get($url, $array = false) {
		return json_decode(@file_get_contents($url), $array);
	}

	function sortAlerts($alerts) {
		$return = array();
		foreach ($alerts as $alert) {
			if (!array_key_exists($alert->world_id, $return))
				$return[$alert->world_id] = $alert;
		}
		return $return;
	}
}
