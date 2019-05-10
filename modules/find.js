const config = require("../config.json");
const util = require("./util.js");

exports.onCommand = async (message, command, args) => {
	//delete command
	if (config.delete_commands) {
		util.deleteMessage(message);
	}

	//ensure username is specified
	let username = args[0];
	if (!username) {
		return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [KAG username]\``, true);
	}

	if (username.match(/[^\w_-]/)) {
		return util.sendMessage(message.channel, "Please provide a KAG username", true);
	}

	//immediately send response
	let msg = await message.channel.send("Finding player...").catch(err => {
		console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err.message}`);
	});
	if (!msg) return;

	//get player info
	util.XMLHttpRequest(info => {
		//player doesnt exist
		if (!info) {
			return util.editMessage(msg, `**${username}** doesn't exist or the API is currently down`, true);
		}

		//get proper capitalisation
		username = info.playerInfo.username;

		//player doesnt own kag
		if (!info.playerInfo.gold) {
			return util.editMessage(msg, `**${username}** doesn't own KAG`, true);
		}

		//get servers
		util.XMLHttpRequest(servers => {
			if (!servers) {
				return util.editMessage(msg, `Unable to retrieve servers. Please try again later`, true);
			}

			for (let server of servers.serverList) {
				//player on a server
				if (server.playerList.some(player => player === username)) {
					let text = `**${username}** is on **${server.name}** (${server.currentPlayers}/${server.maxPlayers})`;
					if (!server.password) {
						text += `\n<kag://${server.IPv4Address}:${server.port}>`;
					}

					return util.editMessage(msg, text, true);
				}
			}

			//player not on server
			return util.editMessage(msg, `**${username}** isn't on a server`, true);

		}, 'https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true},{"field":"currentPlayers","op":"gt","value":"0"}]');
	}, `https://api.kag2d.com/v1/player/${username}/info`);
}