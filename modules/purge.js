const config = require('../config.json');
const util = require('./util.js');

module.exports.onCommand = async (message, command, args) => {
	// guild-only command
	if (!message.guild) return;

	// delete command
	if (config.delete_commands) {
		util.deleteMessage(message);
	}

	// ensure a numerical amount is specified
	const amount = args[0];
	if (!amount || isNaN(amount)) {
		return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [amount]\``, true);
	}

	// ensure its a valid amount
	if (amount < 1 || amount > 99) {
		return util.sendMessage(message.channel, `You can only ${command} 1 to 99 messages`, true);
	}

	// purge them all!
	return message.channel.messages.fetch({ limit: +args[0] + 1 }).then(messages => message.channel.bulkDelete(messages));
};
