<?php

if (isset($_GET['data'])) {
	define('UPDATE_TIME', 2);
	$data = @file_get_contents('cache/data');
	if (!$data) {
		$data = '{"time": 0}';
	}
	$data = json_decode($data);

	$now = time();
	header('Content-type: application/json');
	if ($now - $data->time <= UPDATE_TIME * 60000) {
		exit(json_encode($data));
	} else {
		require_once 'config.inc.php';
		$url = 'http://census.soe.com/s:'.ID.'/get/ps2:v2/';
		$servers = array(
		                 array('name' => 'Briggs', 'id' => 25, 'status' => 'no alert', 'isOnline' => false, 'alert' => array()),
		                 array('name' => 'Ceres', 'id' => 11, 'status' => 'no alert', 'isOnline' => false, 'alert' => array()),
		                 array('name' => 'Cobalt', 'id' => 13, 'status' => 'no alert', 'isOnline' => false, 'alert' => array()),
		                 array('name' => 'Connery', 'id' => 1, 'status' => 'no alert', 'isOnline' => false, 'alert' => array()),
		                 array('name' => 'Mattherson', 'id' => 17, 'status' => 'no alert', 'isOnline' => false, 'alert' => array()),
		                 array('name' => 'Miller', 'id' => 10, 'status' => 'no alert', 'isOnline' => false, 'alert' => array()),
		                 array('name' => 'Waterson', 'id' => 18, 'status' => 'no alert', 'isOnline' => false, 'alert' => array()),
		                 array('name' => 'Woodman', 'id' => 9, 'status' => 'no alert', 'isOnline' => false, 'alert' => array())
		);

		$events = array(
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

		$activeEvent = array(
			'135' => true,
			'136' => true,
			'139' => true
		);

		$output = array('time' => $now, 'alerts' => array());

		foreach($servers as $server) {
			$file = json_decode(@file_get_contents($url.'world?world_id=' . $server['id']));
			$data = array(
			               'name' => $server['name'],
			               'id' => $server['id'],
			               'status' => 'API error (U)',
			               'alert' => array()
			 );

			if ($file->world_list && $file->world_list[0]) {
				$state = $file->world_list[0]->state;
				if ($state === 'online') {
					$data['isOnline'] = true;
					$file2 = json_decode(@file_get_contents($url . 'world_event?world_id=' . $server['id'] . '&type=METAGAME'));
					if (!$file2 || !$file2->world_event_list) {
						$data['status'] = 'API error (A)';
					} else {
						$data2 = $file2->world_event_list[0];
						if (!isset($activeEvent[''.$data2->metagame_event_state])) {
							$data['status'] = 'no alert';
						} else {
							$event = $events[''.($data2->metagame_event_id - 1)];

							$data['status'] = 1;
							$data['alert'] = array(
							                       'start' => $data2->timestamp . '000',
							                       'type' => $event['type'],
							                       'zone' => $event['zone'],
							                       'faction_nc' => $data2->faction_nc,
							                       'faction_tr' => $data2->faction_tr,
							                       'faction_vs' => $data2->faction_vs,
							                       'experience_bonus' => $data2->experience_bonus || 0
							);
						}
					}
				} else {
					$data['status'] = $state.' error';
				}
			}

			$output['alerts'][''.$server['id']] = $data;
		}

		$json = json_encode($output);
		echo $json;
		@file_put_contents('cache/data', $json);
		exit;
	}

}

header($_SERVER['SERVER_PROTOCOL'].' 404 Not Found');
exit;