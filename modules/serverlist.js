const Discord = require('discord.js');
const config = require('../config.json');
const util = require('./util.js');

let server_list;

module.exports.init = () => {
	util.fetchMessage(message => {
		if (!message) return;

		console.log(`Fetched server list message in #${message.channel.name}`);
		server_list = message;
	}, config.server_list);
};

module.exports.update = (servers) => {
	if (!server_list) return;

	if (servers && servers.length) {
		let count = 0;
		for (const server of servers) {
			// get flag for each server
			util.XMLHttpRequest(data => {
				count++;

				if (data) {
					server.country = data.country;
				}

				// add servers to embed once we have all flags
				if (count === servers.length) {
					createEmbed(servers);
				}
			}, `https://get.geojs.io/v1/ip/country/${server.IPv4Address}.json`);
		}
	} else {
		createEmbed(servers);
	}
};

function createEmbed(servers, trimAmount = 0) {
	const total_servers = servers ? servers.length : 0;
	const total_players = servers ? servers.reduce((t, x) => t + x.currentPlayers, 0) : 0;

	const embed = new Discord.EmbedBuilder()
		.setTitle(':crossed_swords: KAG Server List :bow_and_arrow:')
		.setColor(config.server_list.embed_colour)
		.setDescription('\n​')
		.setFooter({ text: 'Last updated' })
		.setTimestamp();

	if (servers) {
		// remove servers if too many for embed
		servers = servers.slice(0, 25);
		const hidden_servers = (total_servers - servers.length) + trimAmount;

		// embed description
		let description = `${total_servers} ${util.plural(total_servers, 'server')} with ${total_players} ${util.plural(total_players, 'player')}`;
		// description += hidden_servers ? `\n${hidden_servers} ${util.plural(hidden_servers, "server")} not visible` : "";
		description += hidden_servers ? `\nShowing ${total_servers - hidden_servers}/${total_servers} servers` : '';

		embed.setDescription(description + '\n​');

		for (let i = 0; i < servers.length - trimAmount; i++) {
			const server = servers[i];
			const full = server.currentPlayers >= server.maxPlayers ? ' [FULL]' : '';
			const spectators = server.spectatorPlayers > 0 ? ` (${server.spectatorPlayers} ${util.plural(server.spectatorPlayers, 'spectator')})` : '';
			const modded = server.usingMods ? ' (modded)' : '';

			// escape underscores so they don't italicise the text
			let text = [
				// `**Description:** ${description.length ? util.sanitize(description) : "*no description*"}`,
				`**Address:** ${server.password ? '*locked server*' : `<kag://${server.IPv4Address}:${server.port}>`}`,
				`**Gamemode:** ${util.sanitize(server.gameMode)}${modded}`,
				`**Players:** ${server.currentPlayers}/${server.maxPlayers}${full}${spectators}`,
				util.sanitize(server.playerList.join(' ')),
			].sort(Boolean).reverse().join('\n');

			// truncate text if too long
			const ellipsis = '…';
			if (text.length > 1024 - ellipsis.length) {
				// trim the string to the maximum length
				text = text.substr(0, 1024 - ellipsis.length);
				// re-trim if we are in the middle of a word
				text = text.substr(0, Math.min(text.length, text.lastIndexOf(' ') + 1)) + ellipsis;
			}

			const flag = server.country ? `:flag_${server.country.toLowerCase()}:` : '';

			embed.addFields({ name:`${flag} ${util.sanitize(server.name)}`, value: text + '\n​' });
		}
	} else {
		embed.addFields({ name:':small_red_triangle:​ Unable to retrieve servers :small_red_triangle:', value:'​' });
	}

	// edit message
	util.editEmbed(server_list, embed, false, err => {
		if (err) {
			// more than 6000 characters in embed
			if (err.code === 50035) {
				console.log('embed too long');
				createEmbed(servers, trimAmount + 1);
			} else {
				console.log(`ERROR: Couldn't edit server list message - ${err.message}`);
			}
		} else if (config.server_list.special_channel_name) {
			server_list.channel.setName(`${total_servers}-servers_${total_players}-players`).catch(err => {
				console.log(`ERROR: Couldn't change name of #${server_list.channel.name} - ${err.message}`);
			});
		}
	});
}
