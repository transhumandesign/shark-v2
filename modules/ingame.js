const Discord = require("discord.js");
const config = require("../config.json");
const util = require("./util.js");

var client;

exports.init = (cl) => {
	client = cl;
}

exports.update = (servers) => {
	if (!servers || !config.ingame.role || !config.ingame.check_name) return;

	//get role
	let role = util.getRole(config.ingame.role);
	if (!role) return console.log(`ERROR: ingame role doesn't exist`);

	//get members
	let memberArray = client.guilds.get(config.guild).members.array();
	for (let member of memberArray) {

		//check if in-game
		let onServer = false;
		for (let server of servers) {
			if (server.playerList.some(player => player.toLowerCase() === (member.nickname || member.user.username).toLowerCase())) {
				onServer = true;
				break;
			}
		}

		//check presence
		let playingKAG = false;
		if (member.presence.game && member.presence.game.name === "King Arthur's Gold") {
			playingKAG = true;
		}

		//update role
		if ((onServer || playingKAG) && !util.userHasRole(member, config.ingame.role)) {
			util.addRole(member, role);
		} else if (!(onServer || playingKAG) && util.userHasRole(member, config.ingame.role)) {
			util.removeRole(member, role);
		}
	}
}