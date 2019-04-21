const Discord = require("discord.js");
const config = require("../config.json");
const util = require("./util.js");

var server_list;
var client;

exports.init = (cl) => {
	client = cl;
	util.init(cl);
	util.fetchMessage(message => {
		if (!message) return;

		console.log(`Fetched server list message in #${message.channel.name}`);
		server_list = message;
	}, config.server_list);
}

exports.update = (servers) => {
	if (!server_list) return;

	if (servers && servers.length) {
		let count = 0;
		for (let server of servers) {
			//get flag for each server
			util.XMLHttpRequest(data => {
				count++;

				if (data) {
					server.region = data.country;
				}

				//add servers to embed once we have all flags
				if (count === servers.length) {
					createEmbed(servers);
				}
			}, `https://get.geojs.io/v1/ip/country/${server.IPv4Address}.json`);
		}
	} else {
		createEmbed(servers);
	}
}

function createEmbed(servers, trimAmount = 0) {
	//embed description
	let total_servers = servers ? servers.length : 0;
	let total_players = servers ? servers.reduce((t, x) => t + x.currentPlayers, 0) : 0;

	const embed = new Discord.RichEmbed()
		.setTitle(":crossed_swords: KAG Server List :bow_and_arrow:")
		.setColor(config.server_list.embed_colour)
		.setDescription(`${total_servers} ${util.plural(total_servers, "server")} with ${total_players} ${util.plural(total_players, "player")}\n​`)
		.setFooter("Last updated")
		.setTimestamp();

	if (servers) {
		for (let i = 0; i < servers.length - trimAmount; i++) {
			let server = servers[i];

			let description = server.usingMods ? server.description.replace(/(\n\n|\n$)[^\n]*$/, "") : server.description;
			let spectators = server.spectatorPlayers ? ` (${server.spectatorPlayers} ${util.plural(server.spectatorPlayers, "spectator")})` : "";
			let modded = server.usingMods ? " (modded)" : "";

			//escape underscores so they dont italicise the text
			let text = [
				`**Description:** ${description.length ? description.replace(/_/g, "\\_") : "*no description*"}`,
				`**Address:** ${server.password ? "*locked server*" : `<kag://${server.IPv4Address}:${server.port}>`}`,
				`**Gamemode:** ${server.gameMode.replace(/_/g, "\\_")}${modded}`,
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

			let flag = server.region ? `:flag_${server.region.toLowerCase()}:` : "";

			embed.addField(`${flag} ${server.name}`, text);
		}
	} else {
		embed.addField(":small_red_triangle:​ Unable to retrieve servers :small_red_triangle:", "​");
	}

	//edit message
	util.editMessage(server_list, embed, false, err => {
		if (err) {
			if (err.code === 50035) { //more than 6000 characters in embed
				createEmbed(servers, trimAmount + 1);
			} else {
				console.log(`ERROR: Couldn't edit server list message - ${err.message}`);
			}
		} else {
			//special channel name
			if (config.server_list.special_channel_name) {
				server_list.channel.setName(`${total_servers}-servers_${total_players}-players`).catch(err => {
					console.log(`ERROR: Couldn't change name of #${server_list.channel.name} - ${err.message}`);
				});
			}
		}
	});
}