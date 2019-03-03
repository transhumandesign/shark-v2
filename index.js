const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const func = require("./functions.js");
exports.client = client;

var serverList;

client.on("error", console.error);

client.on("ready", () => {
	console.log(`Logged in as ${client.user.username} on ${client.guilds.size} ${func.plural(client.guilds.size, "guild")}`);

	func.fetchMessage(message => {
		console.log(`Fetched server list message in #${message.channel.name}`);
		serverList = message;
		loop();
	}, config.serverList);

});

client.on("message", async message => {
	if (
		!message.channel.guild ||						//direct message
		message.guild.id !== config.guild ||			//wrong guild
		message.author.bot ||							//bot message
		message.content.indexOf(config.prefix) !== 0	//wrong/no prefix
	) {
		return;
	}

	const args = message.content.slice(config.prefix.length).trim().split(/\s+/g);
	const command = args.shift().toLowerCase();

	//delete commands not sent in commands channel
	if (config.commandsChannel &&									//commands channel is specified
		func.getChannel(message.channel) !== config.commandsChannel	//message sent in wrong channel
	) {
		func.deleteMessage(message);
		return;
	}

	if (command === "ping") {
		if (config.deleteCommands) {
			func.deleteMessage(message);
		}
		
		func.sendMessage(message.channel, `Pong! Latency: ${Math.round(client.ping)}ms`);
	}

	if (command === "prune" || command === "purge") {
		if (config.deleteCommands) {
			func.deleteMessage(message);
		}

		if (!func.isMod(message.author)) {
			return func.sendMessage(message.channel, `You aren't able to ${command} messages, ${message.author.toString()}`, config.deleteResponseSecs * 1000);
		}
		
		let amount = args[0];
		if (isNaN(amount)) {
			return func.sendMessage(message.channel, `Invalid command usage: \`!${command} [amount]\``, config.deleteResponseSecs * 1000);
		}

		if (args[0] > 99) { //too many messages
			return func.sendMessage(message.channel, `You can only ${command} less than 100 messages`, config.deleteResponseSecs * 1000);
		}

		message.channel.fetchMessages({ limit: +args[0] + 1 }).then(messages => message.channel.bulkDelete(messages));
	}

	if (command === "find") {
		if (config.deleteCommands) {
			func.deleteMessage(message);
		}

		let msg = await message.channel.send("Finding player...");
		let username = args[0];
		func.XMLHttpRequest(info => {
			if (!info) { //doesnt exist
				return func.editMessage(msg, `**${username}** doesn't exist`, config.deleteResponseSecs * 1000);
			}

			username = info.playerInfo.username;

			if (!info.playerInfo.gold) { //not gold
				return func.editMessage(msg, `**${username}** doesn't own KAG`, config.deleteResponseSecs * 1000);
			}
			
			func.XMLHttpRequest(servers => {
				for (let server of servers.serverList) {
					for (let player of server.playerList) {
						if (player === username) { //player on server
							let text = `**${username}** is on **${server.name}** (${server.currentPlayers}/${server.maxPlayers})`;
							if (!server.password) {
								text += `\n<kag://${server.IPv4Address}:${server.port}>`;
							}

							return func.editMessage(msg, text, config.deleteResponseSecs * 1000);
						}
					}
				}

				//player not on server
				return func.editMessage(msg, `**${username}** isn't on a server`, config.deleteResponseSecs * 1000);
			}, 'https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true},{"field":"currentPlayers","op":"gt","value":"0"}]');
		}, `https://api.kag2d.com/v1/player/${username}`);
	}
});

function loop() {	
	func.XMLHttpRequest(servers => {
		
		servers = func.sortServers(servers);

		func.updateServerList(serverList, servers);

		let totalPlayers = servers.reduce((t, x) => t + x.currentPlayers, 0);
		client.user.setPresence({ status: 'online', game: { name: `${totalPlayers} in KAG | ${config.prefix}help` } });

	}, 'https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true},{"field":"currentPlayers","op":"gt","value":"0"}]');
	
	//loop every minute
	let ms = config.serverList.updateIntervalSecs * 1000;
	let delay = ms - new Date() % ms;
	setTimeout(loop, delay);
}

client.login(config.token);