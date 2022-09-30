const config = require('../config.json');
const util = require('./util.js');

let client;

module.exports.init = (cl) => {
	client = cl;
};

module.exports.update = (servers) => {
	if (!servers || !config.ingame.role || !config.ingame.check_name) return;

	// get role
	const role = util.getRole(config.ingame.role);
	if (!role) return console.log('ERROR: ingame role doesn\'t exist');

	// get members
	const memberArray = client.guilds.cache.get(config.guild).members.array();
	for (const member of memberArray) {

		// check if in-game
		let onServer = false;
		for (const server of servers) {
			if (server.playerList.some(player => player.toLowerCase() === (member.nickname || member.user.username).toLowerCase())) {
				onServer = true;
				break;
			}
		}

		// check presence
		let playingKAG = false;
		if (member.presence.game && member.presence.game.name === 'King Arthur\'s Gold') {
			playingKAG = true;
		}

		// update role
		if ((onServer || playingKAG) && !util.userHasRole(member, config.ingame.role)) {
			util.addRole(member, role);
		} else if (!(onServer || playingKAG) && util.userHasRole(member, config.ingame.role)) {
			util.removeRole(member, role);
		}
	}
};
