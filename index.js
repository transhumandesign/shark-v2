const Discord = require("discord.js");
const client = new Discord.Client();

const config = require("./config.json");
const util = require("./modules/util.js");
util.init(client);

const serverlist = require("./modules/serverlist.js");
const roles = require("./modules/roles.js");
const find = require("./modules/find.js");

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

	if (["help", "commands"].includes(command)) {
		let available_roles = [...config.regional_roles, ...config.open_roles].filter(x => util.getRole(x));
		let commands = [
			["ping",										"Used to check if the bot is alive"],
			["creator",										`${client.user.username} was created by epsilon and Mazey`],
			["prune/purge [amount]",						"Admin command for bulk-deleting messages"],
			["find [username]",								"Attempts to find the server the specified player is playing on"],
			[`role [${available_roles.join("/")}]`,				"Gives yourself the role specified"]
		].map(x => `\`${config.prefix + x[0]}\` - ${x[1]}`);

		//direct message user
		return message.author.send("**Commands:**\n" + commands.join("\n"));
	}

	if (command === "find") {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		return find.onCommand(message, args);
	}

	if (command === "role") {
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		return roles.onCommand(message, args);
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