const config = require('../config.json');
const util = require('./util.js');

module.exports.onCommand = async (message, command, args) => {
	// guild-only command
	if (!message.guild) return;

	// delete command
	let commandDeleted = false;
	if (config.delete_commands) {
		util.deleteMessage(message);
		commandDeleted = true;
	}

	// ensure role is specified
	if (!args[0]) {
		return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [role]\``, true);
	}

	// ensure role exists
	const role = util.getRole(args.join(' '));
	if (!role) {
		return util.sendMessage(message.channel, `The **${util.sanitize(args.join(' '))}** role couldn't be found`, true);
	}

	const mentionable = role.mentionable;

	// temporarily enable permissions
	if (!mentionable) {
		await setMentionable(role, true);
	}

	// ensure role can be mentioned
	if (!role.mentionable) {
		return util.sendMessage(message.channel, 'The bot is unable to mention this role', true);
	}

	// ensure command is always deleted
	if (!commandDeleted) {
		util.deleteMessage(message);
	}

	// mention the role
	await message.channel.send(role.toString()).catch(err => {
		console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err.message}`);
	});

	// disable permissions
	if (!mentionable) {
		setMentionable(role, false);
	}
};

async function setMentionable(role, mentionable) {
	// unable to edit the bot's highest role
	if (role.editable) {
		await role.setMentionable(mentionable).catch();
	}
}
