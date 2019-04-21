const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const config = require("../config.json");

var client;

exports.init = (cl) => {
	client = cl;
}

exports.getRole = (role) => {
	if (!role) return null;
	if (typeof role === "object") return role;
	if (/<@&\d+>/.test(role) || !isNaN(role)) { //mention or ID
		role = client.guilds.get(config.guild).roles.get(role.match(/\d+/)[0]);
	} else { //name
		role = client.guilds.get(config.guild).roles.find(x => x.name.toLowerCase() === role.toLowerCase());
	}
	return role || null;
}

exports.getUser = (user) => {
	if (!user) return null;
	if (typeof user === "object") return user;
	if (/<@!?\d+>/.test(user) || !isNaN(user)) { //mention or ID
		user = client.guilds.get(config.guild).members.get(user.match(/\d+/)[0]);
	} else if (/.+#\d{4}$/.test(user)) { //tag
		user = client.guilds.get(config.guild).members.array().find(x => user === `${x.user.username}#${x.user.discriminator}`);
	} else { //name
		let guildMembers = client.guilds.get(config.guild).members;
		user = guildMembers.find(x => x.user.username.toLowerCase() === user.toLowerCase())
			|| guildMembers.find(x => (x.nickname || x.user.username).toLowerCase() === user.toLowerCase())
			|| guildMembers.find(x => x.user.username.toLowerCase().includes(user.toLowerCase()))
			|| guildMembers.find(x => (x.nickname || x.user.username).toLowerCase().includes(user.toLowerCase()));
	}
	return user || null;
}

exports.getChannel = (channel) => {
	if (typeof channel === "object") return channel;
	return client.guilds.get(config.guild).channels.get(channel) || null;
}

exports.userHasRole = (user, role) => {
	user = this.getUser(user);
	role = this.getRole(role);
	if (!user || !role) return false;
	return client.guilds.get(config.guild).members.get(user.id).roles.has(role.id);
}

exports.addRole = (user, role, callback) => {
	user = this.getUser(user);
	if (!user) {
		if (callback) callback(false);
		return;
	}

	if (Array.isArray(role)) {
		//remove multiple roles
		let roles = role.map(x => this.getRole(x)).filter(Boolean);

		client.guilds.get(config.guild).members.get(user.id).addRoles(roles).then(() => { //success
			if (callback) callback(true);
		}, err => { //error
			console.log(`ERROR: Couldn't add a role to ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	} else {
		//remove a single role
		role = this.getRole(role);
		if (!role) {
			if (callback) callback(false);
			return;
		}

		client.guilds.get(config.guild).members.get(user.id).addRole(role).then(() => { //success
			if (callback) callback(true);
		}, err => { //error
			console.log(`ERROR: Couldn't add ${role.name} role to ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	}
}

exports.removeRole = (user, role, callback) => {
	user = this.getUser(user);
	if (!user) {
		if (callback) callback(false);
		return;
	}

	if (Array.isArray(role)) {
		//remove multiple roles
		let roles = role.map(x => this.getRole(x)).filter(Boolean);

		client.guilds.get(config.guild).members.get(user.id).removeRoles(roles).then(() => { //success
			if (callback) callback(true);
		}, err => { //error
			console.log(`ERROR: Couldn't remove a role from ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	} else {
		//remove a single role
		role = this.getRole(role);
		if (!role) {
			if (callback) callback(false);
			return;
		}

		client.guilds.get(config.guild).members.get(user.id).removeRole(role).then(() => { //success
			if (callback) callback(true);
		}, err => { //error
			console.log(`ERROR: Couldn't remove ${role.name} role from ${user.username} - ${err.message}`);
			if (callback) callback(false);
		});
	}
}

exports.plural = (val, text, suffix = "s") => {
	return val === 1 ? text : text + suffix;
}

exports.XMLHttpRequest = (callback, url) => {
	let xhttp = new XMLHttpRequest();
	xhttp.onload = function() {
		if (this.status === 200) {
			return callback(JSON.parse(xhttp.responseText));
		} else {
			console.log(`ERROR: Couldn't retrieve data from ${url}`);
			return callback(null);
		}
	}
	xhttp.open("GET", url, true);
	xhttp.send();
}

exports.sendMessage = (channel, text, delete_message = false) => {
	channel = this.getChannel(channel);
	if (!channel) return;
	channel.send(text).then(message => {
		if (delete_message) {
			this.deleteMessage(message, config.delete_response_secs * 1000);
		}
	}).catch(err => {
		console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err.message}`);
	});
}

exports.editMessage = (message, text, delete_message = false, callback) => {
	if (!message) return;
	message.edit(text).then(message => {
		if (callback) callback();
		if (delete_message) {
			this.deleteMessage(message, config.delete_response_secs * 1000);
		}
	}).catch(err => {
		if (callback) return callback(err);
		console.log(`ERROR: Couldn't edit message in #${message.channel.name} - ${err.message}`);
	});
}

exports.deleteMessage = (message, delete_message = 0) => {
	if (!message) return;
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
}

exports.fetchMessage = (callback, cfg_group) => {
	channel = this.getChannel(cfg_group.channel);
	if (!channel) {
		console.log("ERROR: Couldn't get channel to fetch message");
		if (callback) callback(null)
		return;
	}
	channel.fetchMessage(cfg_group.message).then(message => {
		if (callback) callback(message);
	}).catch(err => {
		console.log(`ERROR: Couldn't fetch message from #${channel.name} - ${err.message}`);
	});
}

exports.sortServers = (servers) => {
	if (!servers) return null;

	if (servers.hasOwnProperty("serverList")) {
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

	servers = servers.slice(0, 25);

	for (let server of servers) {
		server.playerList.sort((a, b) => {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		});
	}

	return servers;
}

exports.isMod = (user) => {
	return config.mod_roles.some(role => {
		return this.userHasRole(user, role);
	});
}

exports.updatePresence = (servers) => {
		let total_players = servers ? servers.reduce((t, x) => t + x.currentPlayers, 0) : 0;
		client.user.setActivity(`${total_players} in KAG | ${config.prefix}help`, { type: 'WATCHING' });
}