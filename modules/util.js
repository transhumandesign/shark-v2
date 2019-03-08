const Discord = require("discord.js");
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
},

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
},

exports.getChannel = (channel) => {
	if (typeof channel === "object") return channel;
	return client.guilds.get(config.guild).channels.get(channel) || null;
},

exports.userHasRole = (user, role) => {
	user = this.getUser(user);
	role = this.getRole(role);
	if (!user || !role) return false;
	return client.guilds.get(config.guild).members.get(user.id).roles.has(role.id);
},

exports.plural = (val, text, suffix = "s") => {
	return val === 1 ? text : text + suffix;
},

exports.XMLHttpRequest = (callback, url) => {
	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			return callback(JSON.parse(xhttp.responseText));
		}
		if (this.readyState == 4 && this.status == 404) {
			console.log("ERROR: Couldn't retrieve JSON from URL");
			return callback(null);
		}
	}
	xhttp.open("GET", url, true);
	xhttp.send();
},

exports.sendMessage = (channel, text, delete_message = 0) => {
    channel = this.getChannel(channel);
    if (!channel) return null;
    channel.send(text).then(message => {
		if (delete_message) {
			this.deleteMessage(message, config.delete_response_secs * 1000);
		}
	}).catch(err => {
		console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err}`);
	});
},

exports.editMessage = (message, text, delete_message = 0) => {
	message.edit(text).then(message => {
		if (delete_message) {
			this.deleteMessage(message, config.delete_response_secs * 1000);
		}
	}).catch(err => {
		console.log(`ERROR: Couldn't edit message in #${message.channel.name} - ${err}`);
	});
},

exports.deleteMessage = (message, delete_message = 0) => {
	if (delete_message) {
		setTimeout(() => {
			message.delete().catch(err => {
				console.log(`ERROR: Couldn't auto delete message in #${message.channel.name} - ${err}`);
			});
		}, config.delete_response_secs * 1000);
	} else {
		message.delete().catch(err => {
			console.log(`ERROR: Couldn't delete message in #${message.channel.name} - ${err}`);
		});
	}
},

exports.fetchMessage = (callback, cfg_group) => {
	channel = this.getChannel(cfg_group.channel);
	if (!channel) {
		console.log("ERROR: Couldn't get channel to fetch message");
		return callback(null);
	}
	channel.fetchMessage(cfg_group.message).then(message => {
		return callback(message);
	}).catch(() => {
		console.log(`ERROR: Couldn't fetch message from #${channel.name}`);
	});
},

exports.sortServers = (servers) => {
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
},

exports.isMod = (user) => {
	return config.mod_roles.some(role => {
		return this.userHasRole(user, role);
	});
},

exports.updateServerList = (message, servers) => {
	if (!message) return;
	
    let total_servers = servers.length;
	let total_players = servers.reduce((t, x) => t + x.currentPlayers, 0);

	const embed = new Discord.RichEmbed()
		.setTitle(":crossed_swords: KAG Server List :bow_and_arrow:")
		.setColor(config.server_list.embed_colour)
		.setDescription(`${total_servers} ${this.plural(total_servers, "server")} with ${total_players} ${this.plural(total_players, "player")}\n​`)
		.setFooter("Last updated")
		.setTimestamp();
	
	let count = 0;
	for (let server of servers) {
		//get flag for each server
		this.XMLHttpRequest(data => {
			count++;
			if (!data) return;
			server.region = data.country;

			//add servers to embed once we have all flags
			if (count === servers.length) {
				for (let server of servers) {

					let description = server.description;
					if (server.usingMods) {
						description = description.replace(/(\n\n|\n$)[^\n]*$/, "");
					}
					let spectators = server.spectatorPlayers ? ` (${server.spectatorPlayers} ${this.plural(server.spectatorPlayers, "spectator")})` : "";

					//escape underscores so they dont italicise the text
					let text = [
						`**Description:** ${description.length ? description.replace(/_/g, "\\_") : "*no description*"}`,
						`**Address:** ${server.password ? "*locked server*" : `<kag://${server.IPv4Address}:${server.port}>`}`,
						`**Gamemode:** ${server.gameMode.replace(/_/g, "\\_")}`,
						`**Players:** ${server.currentPlayers}/${server.maxPlayers}${spectators}`,
						server.playerList.join(" ").replace(/_/g, "\\_"),
						"​" //zero-width character for spacing
					].sort(Boolean).join("\n");

					//truncate text if too long
					let ellipsis = "…";
					if (text.length > 1024 - ellipsis.length)
					{
						//trim the string to the maximum length
						text = text.substr(0, 1024 - ellipsis.length);
						//re-trim if we are in the middle of a word
						text = text.substr(0, Math.min(text.length, text.lastIndexOf(" ") + 1)) + ellipsis;
					}

					embed.addField(`:flag_${server.region.toLowerCase()}: ${server.name}`, text);
				}
				this.editMessage(message, embed);

				if (config.server_list.special_channel_name) {
					message.channel.setName(`${total_servers}-servers_${total_players}-players`).catch(() => {
						console.log(`ERROR: Couldn't change name of #${message.channel.name}`);
					});
				}
			}
		}, `https://get.geojs.io/v1/ip/country/${server.IPv4Address}.json`);
	}
}