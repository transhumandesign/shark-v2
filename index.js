const Discord = require("discord.js");
const client = new Discord.Client();

const config = require("./config.json");
const util = require("./modules/util.js");
util.init(client);
const serverlist = require("./modules/serverlist.js");

client.on("error", console.error);

client.on("ready", () => {
	console.log(`Logged in as ${client.user.username} on ${client.guilds.size} ${util.plural(client.guilds.size, "guild")}`);

	getServers();
	serverlist.init(client);
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
		return util.sendMessage(message.channel, `Pong! Latency: ${Math.round(client.ping)}ms`, !util.isMod(message.author));
	}

	if (command === "creator") {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		return util.sendMessage(message.channel, `${client.user.username} was created by epsilon and Mazey`, true);
	}

	if (["prune", "purge"].includes(command)) {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		//mod-only command
		if (!util.isMod(message.author)) {
			return util.sendMessage(message.channel, `You aren't able to ${command} messages, ${message.author.toString()}`, true);
		}

		//ensure a numerical amount is specified
		let amount = args[0];
		if (!amount || isNaN(amount)) {
			return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [amount]\``, true);
		}

		//ensure its a valid amount
		if (amount < 1 || amount > 99) {
			return util.sendMessage(message.channel, `You can only ${command} 1 to 99 messages`, true);
		}

		//purge them all!
		return message.channel.fetchMessages({ limit: +args[0] + 1 }).then(messages => message.channel.bulkDelete(messages));
	}

	if (command === "find") {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		//ensure username is specified
		let username = args[0];
		if (!username) {
			return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [username]\``, true);
		}

		//immediately send response
		let msg = await message.channel.send("Finding player...").catch(err => {
			console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err.message}`);
		});

		//get player info
		util.XMLHttpRequest(info => {
			//player doesnt exist
			if (!info) {
				return util.editMessage(msg, `**${username}** doesn't exist`, true);
			}

			//get proper capitalisation
			username = info.playerInfo.username;

			//player doesnt own kag
			if (!info.playerInfo.gold) {
				return util.editMessage(msg, `**${username}** doesn't own KAG`, true);
			}

			//get servers
			util.XMLHttpRequest(servers => {
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
		}, `https://api.kag2d.com/v1/player/${username}`);
	}

	if (["help", "commands"].includes(command)) {
		//["command_name", "description"]
		let commands = [
			["ping",										"Used to check if the bot is alive"],
			["creator",										`${client.user.username} was created by epsilon and Mazey`],
			["prune/purge [amount]",						"Admin command for bulk-deleting messages"],
			["find [username]",								"Attempts to find the server the specified player is playing on"],
			[`region [${config.region_roles.join("/")}]`,	"Gives yourself the role for the specified region"]
		].map(x => `\`${config.prefix + x[0]}\` - ${x[1]}`);

		//direct message user
		return message.author.send("**Commands:**\n" + commands.join("\n"));
	}

	if (command === "region") {
		//ensure region is specified
		if (!args[0]) {
			return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [${config.region_roles.join("/")}]\``, true);
		}

		//ensure role exists
		let role = util.getRole(args[0]);
		if (!role) {
			return util.sendMessage(message.channel, `A role with the name **${args[0]}** doesn't exist`, true);
		}

		//check if user already has the role
		if (util.userHasRole(message.author, role)) {
			return util.sendMessage(message.channel, `You already have the **${role.name}** role`, true);
		}

		//immediately send response
		let msg = await message.channel.send("Organising roles...").catch(err => {
			console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err.message}`);
		});

		//only one region is allowed
		let roles = config.region_roles.map(x => util.getRole(x)).filter(x => util.userHasRole(message.author, x));
		message.member.removeRoles(roles).then(() => {
			message.member.addRole(role).then(() => { //success
				return util.editMessage(msg, `You now have the **${role.name}** role`, true);
			}, err => { //addRole error
				console.log(`ERROR: Couldn't add ${role.name} role to ${message.author.username} - ${err.message}`);
				return util.editMessage(msg, `There was an issue adding the **${role.name}** role`, true);
			});
		}, err => { //removeRoles error
			console.log(`ERROR: Couldn't remove a role from ${message.author.username} - ${err.message}`);
			return util.editMessage(msg, "There was an issue removing the other region roles", true);
		});
	}
});

function getServers() {
	util.XMLHttpRequest(servers => {
		servers = util.sortServers(servers);
		util.updatePresence(servers);
		serverlist.update(servers);
	}, 'https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true},{"field":"currentPlayers","op":"gt","value":"0"}]');

	//loop every minute
	let ms = config.update_interval_secs * 1000;
	let delay = ms - new Date() % ms;
	setTimeout(getServers, delay);
}

client.login(config.token);