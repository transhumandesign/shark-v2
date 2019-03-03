const Discord = require("discord.js");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const config = require("./config.json");
const index = require("./index.js");

module.exports = {
	getRole(role) {
		if (!role) return null;
		if (typeof role === "object") return role;
		if (/<@&\d+>/.test(role) || !isNaN(role)) { //mention or ID
			role = index.client.guilds.get(config.guild).roles.get(role.match(/\d+/)[0]);
		} else { //name
			role = index.client.guilds.get(config.guild).roles.find(x => x.name.toUpperCase() === role.toUpperCase());
		}
		return role || null;
	},

	getUser(user) {
		if (!user) return null;
		if (typeof user === "object") return user;
		if (/<@!?\d+>/.test(user) || !isNaN(user)) { //mention or ID
			user = index.client.guilds.get(config.guild).members.get(user.match(/\d+/)[0]);
		} else if (/.+#\d{4}$/.test(user)) { //tag
			user = index.client.guilds.get(config.guild).members.array().find(x => user === `${x.user.username}#${x.user.discriminator}`);
		} else { //name
			let guildMembers = index.client.guilds.get(config.guild).members;
			user = guildMembers.find(x => x.user.username.toUpperCase() === user.toUpperCase())
				|| guildMembers.find(x => (x.nickname || x.user.username).toUpperCase() === user.toUpperCase())
				|| guildMembers.find(x => x.user.username.toUpperCase().includes(user.toUpperCase()))
				|| guildMembers.find(x => (x.nickname || x.user.username).toUpperCase().includes(user.toUpperCase()));
		}
		return user || null;
	},

	getChannel(channel) {
		if (typeof channel === "object") return channel;
		return index.client.guilds.get(config.guild).channels.get(channel) || null;
	},

	userHasRole(user, role) {
		user = this.getUser(user);
		role = this.getRole(role);
		if (!user || !role) return false;
		return index.client.guilds.get(config.guild).members.get(user.id).roles.has(role.id);
	},

	plural(val, text, suffix = "s") {
		return val === 1 ? text : text + suffix;
	},
	
	XMLHttpRequest(callback, url) {
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
	
	sendMessage(channel, text, milliseconds = 0) {
        channel = this.getChannel(channel);
        if (!channel) return null;
        channel.send(text).then(message => {
			if (milliseconds && config.deleteResponseSecs) {
				this.deleteMessage(message, milliseconds);
			}
		}).catch(err => {
			console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err}`);
		});
	},

	editMessage(message, text, milliseconds = 0) {
		message.edit(text).then(message => {
			if (milliseconds && config.deleteResponseSecs) {
				this.deleteMessage(message, milliseconds);
			}
		}).catch(err => {
			console.log(`ERROR: Couldn't edit message in #${message.channel.name} - ${err}`);
		});
	},
	
	deleteMessage(message, milliseconds = 0) {
		if (milliseconds) {
			setTimeout(() => {
				message.delete().catch(err => {
					console.log(`ERROR: Couldn't auto delete message in #${message.channel.name} - ${err}`);
				});
			}, milliseconds);
		} else {
			message.delete().catch(err => {
				console.log(`ERROR: Couldn't delete message in #${message.channel.name} - ${err}`);
			});
		}
	},

	fetchMessage(callback, cfgGroup) {
		channel = this.getChannel(cfgGroup.channel);
		if (!channel) {
			console.log("ERROR: Couldn't get channel to fetch message");
			return callback(null);
		}
		channel.fetchMessage(cfgGroup.message).then(message => {
			return callback(message);
		}).catch(() => {
			console.log(`ERROR: Couldn't fetch message from #${channel.name}`);
		});
	},

	sortServers(servers) {
		if (servers.hasOwnProperty("serverList")) {
            servers = servers.serverList;
        } else {
            return null;
		}
		
        servers.sort((a, b) => {
            if (a.currentPlayers === b.currentPlayers) {
				if (a.name.toUpperCase() === b.name.toUpperCase()) {
					return `${a.IPv4Address}:${a.port}`.localeCompare(`${b.IPv4Address}:${b.port}`);
				}
                return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
            }
            return b.currentPlayers - a.currentPlayers;
		});

		servers = servers.slice(0, 25);
		
        for (let server of servers) {
            server.playerList.sort((a, b) => {
                return a.toUpperCase().localeCompare(b.toUpperCase());
            });
		}
		
        return servers;
	},

	isMod(user) {
		return config.modRoles.some(role => {
			return this.userHasRole(user, role);
		});
	},

	updateServerList(message, servers) {
		if (!message) return;
		
        let totalServers = servers.length;
		let totalPlayers = servers.reduce((t, x) => t + x.currentPlayers, 0);

		const embed = new Discord.RichEmbed()
			.setTitle(":crossed_swords:   KAG Server List   :bow_and_arrow:")
			.setColor(config.serverList.embedColour)
			.setDescription(`${totalServers} ${this.plural(totalServers, "server")} with ${totalPlayers} ${this.plural(totalPlayers, "player")}\n​`)
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
						let spectators = server.spectatorPlayers ? ` (${server.spectatorPlayers} ${this.plural(server.spectatorPlayers, "spectator")})` : "";
						let text = [
							`**Address:** ${server.password ? "locked server" : `<kag://${server.IPv4Address}:${server.port}>`}`,
							`**Gamemode:** ${server.gameMode}`,
							`**Players:** ${server.currentPlayers}/${server.maxPlayers}${spectators}`,
							`${server.playerList.join(" ")}`,
							"​" //zero-width character
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

					if (config.serverList.specialChannelName) {
						message.channel.setName(`${totalServers}-servers_${totalPlayers}-players`).catch(() => {
							console.log(`ERROR: Couldn't change name of #${message.channel.name}`);
						});
					}
				}
			}, `https://get.geojs.io/v1/ip/country/${server.IPv4Address}.json`);
		}
	}
}
