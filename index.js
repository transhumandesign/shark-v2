const Discord = require('discord.js');
const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.MessageContent,
		Discord.GatewayIntentBits.GuildMembers,
		Discord.GatewayIntentBits.DirectMessages,
		Discord.GatewayIntentBits.DirectMessageReactions,
		Discord.GatewayIntentBits.DirectMessageTyping,
	],
	partials: [Discord.Partials.Channel],
});

const config = require('./config.json');
const util = require('./modules/util.js');
util.init(client);

const help = require('./modules/help.js');
const purge = require('./modules/purge.js');
const serverlist = require('./modules/serverlist.js');
const ingame = require('./modules/ingame.js');
const roles = require('./modules/roles.js');
const find = require('./modules/find.js');
const mention = require('./modules/mention.js');
const advertise = require('./modules/advertise.js');

let servers;

// client.on("error", console.error);

client.once('ready', () => {
	console.log(`Logged in as ${client.user.username} on ${client.guilds.cache.size} ${util.plural(client.guilds.size, 'guild')}`);

	getServers();
	help.init(client);
	serverlist.init(client);
	ingame.init(client);
	advertise.init(client);
});

client.on('messageCreate', async (message) => {
	if (
		// wrong guild
		(message.guild && message.guild.id !== config.guild) ||
		// bot message
		message.author.bot ||
		// wrong/no prefix
		message.content.indexOf(config.prefix) !== 0
	) {
		return;
	}

	const args = message.content.slice(config.prefix.length).trim().split(/\s+/g);
	const command = args.shift().toLowerCase();

	// delete commands not sent in commands channel
	if (
		// commands channel is specified
		config.commands_channel &&
		// message sent in wrong channel
		util.getChannel(message.channel) !== config.commands_channel
	) {
		util.deleteMessage(message);
		return;
	}

	if (command === 'ping') {
		// delete command
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		// dont auto delete message if moderator sent command
		// used for initially creating server list message
		return util.sendMessage(message.channel, 'Pong!', !util.isMod(message.author));
	}

	if (command === 'creator') {
		// delete command
		if (config.delete_commands) {
			util.deleteMessage(message);
		}

		return util.sendMessage(message.channel, `${client.user.username} was created by epsilon and Mazey`, true);
	}

	if (['prune', 'purge'].includes(command) && util.isMod(message.author)) {
		return purge.onCommand(message, command, args);
	}

	if (['help', 'commands'].includes(command)) {
		return help.onCommand(message, command, args);
	}

	if (command === 'find') {
		return find.onCommand(message, command, args);
	}

	if (command === 'role') {
		return roles.onCommand(message, command, args);
	}

	if (['advertise', 'invite'].includes(command)) {
		return advertise.onCommand(message, command, args);
	}

	if (['mention', 'tag'].includes(command) && util.isMod(message.author)) {
		return mention.onCommand(message, command, args);
	}
});

client.on('guildMemberAdd', (member) => {
	if (config.welcome_channel) {
		util.sendMessage(config.welcome_channel, `Welcome ${member.toString()}! Please read the <#${config.rules_channel}> and check out <#${config.information_channel}>.`);
	}
});

client.on('presenceUpdate', () => {
	ingame.update(servers);
});

function getServers() {
	util.XMLHttpRequest(data => {
		servers = util.sortServers(data);
		util.updatePresence(servers);
		serverlist.update(servers);
		ingame.update(servers);
	}, 'https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true},{"field":"currentPlayers","op":"gt","value":"0"}]');

	// loop every minute
	const ms = config.update_interval_secs * 1000;
	const delay = ms - new Date() % ms;
	setTimeout(getServers, delay);
}

client.login(config.token);
