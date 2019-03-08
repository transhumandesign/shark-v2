const config = require("../config.json");
const util = require("./util.js");

var server_list;
var client;

exports.init = (cl) => {
	client = cl;
	util.init(cl);
	util.fetchMessage(message => {
		console.log(`Fetched server list message in #${message.channel.name}`);
		server_list = message;
		loop();
	}, config.server_list);
}



function loop() {	
	util.XMLHttpRequest(servers => {
		
		servers = util.sortServers(servers);

		util.updateServerList(server_list, servers);

		let total_players = servers.reduce((t, x) => t + x.currentPlayers, 0);
		client.user.setPresence({ status: 'online', game: { name: `${total_players} in KAG | ${config.prefix}help` } });

	}, 'https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true},{"field":"currentPlayers","op":"gt","value":"0"}]');
	
	//loop every minute
	let ms = config.server_list.update_interval_secs * 1000;
	let delay = ms - new Date() % ms;
	setTimeout(loop, delay);
}