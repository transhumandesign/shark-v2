const config = require('../config.json');
const util = require('./util.js');

let client;

module.exports.init = (cl) => {
	client = cl;
};

module.exports.onCommand = async (message) => {
	// delete command
	if (config.delete_commands) {
		util.deleteMessage(message);
	}

	// get help content
	const commands = getCommands();
	const features = getFeatures();

	// direct message user
	return message.author.send(`**Commands:**\n${commands}\n\n**Features:**\n${features}`);
};

function getCommands() {
	// only display working modules
	const commands = [
		['ping',					'Used to check if the bot is alive.'],
		['creator',					`${client.user.username} was created by epsilon and Mazey.`],
		['find [KAG username]',		'Attempts to find the server the specified player is playing on.'],
		['prune/purge [amount]',	'Admin command for bulk-deleting messages.'],
		['mention/tag [role name]',	'Admin command to mention any role, even roles that cannot normally be mentioned.'],
	];

	const available_roles = [...config.regional_roles, ...config.open_roles].map(x => util.getRole(x)).filter(Boolean);
	if (available_roles.length) {
		commands.push([`role [${available_roles.map(x => x.name).join('/')}]`, 'Gives yourself the role specified.']);
	}

	const queue_channel = util.getChannel(config.advertise.channel_queue);
	const publish_channel = util.getChannel(config.advertise.channel_publish);
	if (queue_channel && publish_channel) {
		commands.push(['advertise/invite [invite] [description]', `Request to have your KAG-related Discord server advertised in the ${publish_channel.toString()} channel.`]);
	}

	return commands.map(x => `\`${config.prefix + x[0]}\` - ${x[1]}`).join('\n');
}

function getFeatures() {
	// only display enabled modules
	const features = [];

	const servers_channel = util.getChannel(config.server_list.channel);
	if (servers_channel) {
		features.push(['KAG Server List', `A list of KAG servers updated every minute. The channel name displays the number of active servers and players. The server list can be found in the ${servers_channel.toString()} channel.`]);
	}

	const ingame_role = util.getRole(config.ingame.role);
	if (ingame_role) {
		features.push([`@${ingame_role.name} role`, `Displays players who are playing KAG on the member list. Relies on Discord presence${config.ingame.check_name ? ' or your nickname/username being your KAG username' : ''}.`]);
	}

	return features.map(x => `\`${x[0]}\` - ${x[1]}`).join('\n');
}
