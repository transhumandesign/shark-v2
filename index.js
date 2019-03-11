const Discord = require("discord.js");
const client = new Discord.Client();

const config = require("./config.json");
const util = require("./modules/util.js");
util.init(client);
const serverlist = require("./modules/serverlist.js");

client.on("error", console.error);

client.on("ready", () => {
	console.log(`Logged in as ${client.user.username} on ${client.guilds.size} ${util.plural(client.guilds.size, "guild")}`);

	serverlist.init(client);
	util.updatePresence();
});

client.on("message", async message => {
	if (
		!message.guild ||								//direct message
		message.guild.id !== config.guild ||			//wrong guild
		message.author.bot ||							//bot message
		message.content.indexOf(config.prefix) !== 0	//wrong/no prefix
	) {
		return;
	}

	const args = message.content.slice(config.prefix.length).trim().split(/\s+/g);
	const command = args.shift().toLowerCase();

	//delete commands not sent in commands channel
	if (
		config.commands_channel &&										//commands channel is specified
		util.getChannel(message.channel) !== config.commands_channel	//message sent in wrong channel
	) {
		util.deleteMessage(message);
		return;
	}

	if (command === "ping") {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		//dont auto delete message if moderator sent command
		//used for initially creating server list message
		util.sendMessage(message.channel, `Pong! Latency: ${Math.round(client.ping)}ms`, !util.isMod(message.author));
	}

	if (["author", "creator"].includes(command)) {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		util.sendMessage(message.channel, `${client.user.username} was created by epsilon and Mazey`, true);
	}

	if (["prune", "purge"].includes(command)) {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		if (!util.isMod(message.author)) {
			return util.sendMessage(message.channel, `You aren't able to ${command} messages, ${message.author.toString()}`, true);
		}

		let amount = args[0];
		if (isNaN(amount)) {
			return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [amount]\``, true);
		}

		if (args[0] > 99) { //too many messages
			return util.sendMessage(message.channel, `You can only ${command} less than 100 messages`, true);
		}

		message.channel.fetchMessages({ limit: +args[0] + 1 }).then(messages => message.channel.bulkDelete(messages));
	}

	if (command === "find") {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		let msg = await message.channel.send("Finding player...");
		let username = args[0];
		util.XMLHttpRequest(info => {
			if (!info) { //doesnt exist
				return util.editMessage(msg, `**${username}** doesn't exist`, true);
			}

			username = info.playerInfo.username;

			if (!info.playerInfo.gold) { //not gold
				return util.editMessage(msg, `**${username}** doesn't own KAG`, true);
			}

			util.XMLHttpRequest(servers => {
				for (let server of servers.serverList) {
					for (let player of server.playerList) {
						if (player === username) { //player on server
							let text = `**${username}** is on **${server.name}** (${server.currentPlayers}/${server.maxPlayers})`;
							if (!server.password) {
								text += `\n<kag://${server.IPv4Address}:${server.port}>`;
							}

							return util.editMessage(msg, text, true);
						}
					}
				}

				//player not on server
				return util.editMessage(msg, `**${username}** isn't on a server`, true);
			}, 'https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true},{"field":"currentPlayers","op":"gt","value":"0"}]');
		}, `https://api.kag2d.com/v1/player/${username}`);
	}
});

client.login(config.token);