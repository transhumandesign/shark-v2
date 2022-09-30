const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const config = require('../config.json');
const { ActivityType } = require('discord.js');

let client;

module.exports.init = (cl) => {
	client = cl;
};

module.exports.getRole = (role) => {
	if (!role) return null;
	if (typeof role === 'object') return role;
	if (/<@&\d+>/.test(role) || !isNaN(role)) {
		// mention or ID
		role = client.guilds.cache.get(config.guild).roles.cache.get(role.match(/\d+/)[0]);
	} else {
		// name
		role = client.guilds.cache.get(config.guild).roles.cache.find(x => x.name.toLowerCase() === role.toLowerCase());
	}
	return role || null;
};

module.exports.getUser = (user) => {
	if (!user) return null;
	if (typeof user === 'object') return user;
	if (/<@!?\d+>/.test(user) || !isNaN(user)) {
		// mention or ID
		user = client.guilds.cache.get(config.guild).members.cache.get(user.match(/\d+/)[0]);
	} else if (/.+#\d{4}$/.test(user)) {
		// tag
		user = client.guilds.cache.get(config.guild).members.cache.array().find(x => user === `${x.user.username}#${x.user.discriminator}`);
	} else {
		// name
		const guildMembers = client.guilds.cache.get(config.guild).members;
		user = guildMembers.find(x => x.user.username.toLowerCase() === user.toLowerCase())
			|| guildMembers.find(x => (x.nickname || x.user.username).toLowerCase() === user.toLowerCase())
			|| guildMembers.find(x => x.user.username.toLowerCase().includes(user.toLowerCase()))
			|| guildMembers.find(x => (x.nickname || x.user.username).toLowerCase().includes(user.toLowerCase()));
	}
	return user || null;
};

module.exports.getChannel = (channel) => {
	if (typeof channel === 'object') return channel;
	return client.guilds.cache.get(config.guild).channels.cache.get(channel) || null;
};

module.exports.userHasRole = (user, role) => {
	user = this.getUser(user);
	role = this.getRole(role);
	const member = client.guilds.cache.get(config.guild).members.cache.get(user.id);
	if (!user || !role || !member) return false;
	return member.roles.cache.has(role.id);
};

module.exports.addRole = async (user, role, callback) => {
	user = this.getUser(user);
	if (!user) {
		if (callback) callback(false);
		return;
	}

	if (Array.isArray(role)) {
		// remove multiple roles
		const roles = role.map(x => this.getRole(x)).filter(Boolean);

		client.guilds.cache.get(config.guild).members.cache.get(user.id).addRoles(roles).then(() => {
			// success
			if (callback) callback(true);
		}, err => {
			// error
			console.log(`ERROR: Couldn't add a role to ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	} else {
		// remove a single role
		role = this.getRole(role);
		if (!role) {
			if (callback) callback(false);
			return;
		}

		await client.guilds.cache.get(config.guild).members.cache.get(user.id).roles.add(role).then(() => {
			// success
			if (callback) callback(true);
		}, err => {
			// error
			console.log(`ERROR: Couldn't add ${role.name} role to ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	}
};

module.exports.removeRole = async (user, role, callback) => {
	user = this.getUser(user);
	if (!user) {
		if (callback) callback(false);
		return;
	}

	if (Array.isArray(role)) {
		// remove multiple roles
		const roles = role.map(x => this.getRole(x)).filter(Boolean);

		await client.guilds.cache.get(config.guild).members.cache.get(user.id).roles.remove(roles).then(() => {
			// success
			if (callback) callback(true);
		}, err => {
			// error
			console.log(`ERROR: Couldn't remove a role from ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	} else {
		// remove a single role
		role = this.getRole(role);
		if (!role) {
			if (callback) callback(false);
			return;
		}

		await client.guilds.cache.get(config.guild).members.cache.get(user.id).roles.remove(role).then(() => {
			// success
			if (callback) callback(true);
		}, err => {
			// error
			console.log(`ERROR: Couldn't remove ${role.name} role from ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	}
};

module.exports.plural = (val, text, suffix = 's', trim = 0) => {
	if (val === 1) {
		return text;
	} else {
		if (trim) text = text.slice(0, -trim);
		return text + suffix;
	}
};

module.exports.XMLHttpRequest = (callback, url) => {
	const xhttp = new XMLHttpRequest();
	xhttp.onload = function() {
		if (this.status === 200) {
			return callback(JSON.parse(xhttp.responseText));
		} else {
			console.log(`ERROR: Couldn't retrieve data from ${url}`);
			return callback(null);
		}
	};
	xhttp.open('GET', url, true);
	xhttp.send();
};

module.exports.sendMessage = (channel, text, delete_message = false) => {
	channel = this.getChannel(channel);
	if (!channel) return;
	channel.send(text).then(message => {
		if (delete_message) {
			this.deleteMessage(message, config.delete_response_secs * 1000);
		}
	}).catch(err => {
		console.log(`ERROR: Couldn't send message in #${channel.message.channel.name} - ${err.message}`);
	});
};

module.exports.editEmbed = (message, embed, delete_message = false, callback) => {
	if (!message) return;
	message.edit({ embeds: [embed] }).then(message => {
		if (callback) {
			callback();
		}
		if (delete_message) {
			this.deleteMessage(message, config.delete_response_secs * 1000);
		}
	}).catch(err => {
		if (callback) return callback(err);
		console.log(`ERROR: Couldn't edit message in #${message.channel.name} - ${err.message}`);
	});
};

module.exports.editMessage = (message, text, delete_message = false, callback) => {
	if (!message) return;
	message.edit(text).then(message => {
		if (callback) {
			callback();
		}
		if (delete_message) {
			this.deleteMessage(message, config.delete_response_secs * 1000);
		}
	}).catch(err => {
		if (callback) return callback(err);
		console.log(`ERROR: Couldn't edit message in #${message.channel.name} - ${err.message}`);
	});
};

module.exports.deleteMessage = (message, delete_message = 0) => {
	if (!message || !message.guild) return;
	if (delete_message) {
		setTimeout(() => {
			message.delete().catch(err => {
				console.log(`ERROR: Couldn't auto delete message in #${message.channel.name} - ${err.message}`);
			});
		}, config.delete_response_secs * 1000);
	} else {
		message.delete().catch(err => {
			console.log(`ERROR: Couldn't delete message in #${message.channel.name} - ${err.message}`);
		});
	}
};

module.exports.fetchMessage = (callback, cfg_group) => {
	const channel = this.getChannel(cfg_group.channel);
	if (!channel) {
		console.log('ERROR: Couldn\'t get channel to fetch message');
		if (callback) callback(null);
		return;
	}
	channel.messages.fetch(cfg_group.message).then(message => {
		if (callback) callback(message);
	}).catch(err => {
		console.log(`ERROR: Couldn't fetch message from #${channel.name} - ${err.message}`);
	});
};

module.exports.sortServers = (servers) => {
	if (!servers) return null;

	if (Object.prototype.hasOwnProperty.call(servers, 'serverList')) {
		servers = servers.serverList;
	} else {
		return null;
	}

	servers.sort((a, b) => {
		if (a.currentPlayers === b.currentPlayers) {
			if (a.name.toLowerCase() === b.name.toLowerCase()) {
				return `${a.IPv4Address}:${a.port}`.localeCompare(`${b.IPv4Address}:${b.port}`);
			}
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		}
		return b.currentPlayers - a.currentPlayers;
	});

	for (const server of servers) {
		server.playerList.sort((a, b) => {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		});
	}

	return servers;
};

module.exports.isMod = (user) => {
	return config.mod_roles.some(role => {
		return this.userHasRole(user, role);
	});
};

module.exports.updatePresence = (servers) => {
	const total_players = servers ? servers.reduce((t, x) => t + x.currentPlayers, 0) : 0;
	const text = `with ${total_players} ${this.plural(total_players, 'fishy', 'ies', 1)} | ${config.prefix}help`;
	client.user.setActivity(text, { type: ActivityType.Watching });
};

module.exports.sanitize = (data) => {
	// add zero width whitespace after the character to prevent the bot mentioning the channel/role/user
	// escape any discord markdown characters (\ * _ ` ~ >)
	return data.replace(/([@#])/g, '$1​').replace(/([\\*_`~>])/g, '\\$1');
};
