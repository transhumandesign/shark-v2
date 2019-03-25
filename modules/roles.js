const config = require("../config.json");
const util = require("./util.js");

exports.onCommand = async (message, args) => {
	let available_roles = [...config.regional_roles, ...config.open_roles].filter(x => util.getRole(x));

	//ensure role is specified
	if (!args[0]) {
		return util.sendMessage(message.channel, `Invalid command usage: \`!role [${available_roles.join("/")}]\``, true);
	}

	//ensure role exists
	let role = util.getRole(args[0]);
	if (!role) {
		return util.sendMessage(message.channel, `A role with the name **${args[0]}** doesn't exist\nAvailable roles: ${available_roles.join(", ")}`, true);
	}

	//ensure role is one that can be self-given
	let can_add_role = available_roles.some(x => util.getRole(x) === role);
	if (!can_add_role) {
		return util.sendMessage(message.channel, `You are unable to add the **${role.name}** role to yourself\nAvailable roles: ${available_roles.join(", ")}`, true);
	}

	//immediately send response
	let msg = await message.channel.send("Organising roles...").catch(err => {
		console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err.message}`);
	});

	//toggle role
	if (!util.userHasRole(message.author, role)) {
		let regional = config.regional_roles.find(x => util.getRole(x) === role);
		if (regional) {
			//remove all other region roles
			let roles = config.regional_roles.map(x => util.getRole(x)).filter(x => util.userHasRole(message.author, x));
			util.removeRole(message.author, roles, success => {
				if (success) {
					//add the region role
					util.addRole(message.author, role, success => {
						if (success) {
							return util.editMessage(msg, `You now have the **${role.name}** role`, true);
						} else {
							return util.editMessage(msg, `There was an issue adding the **${role.name}** role`, true);
						}
					});
				} else {
					return util.editMessage(msg, "There was an issue removing the other region roles", true);
				}
			});
		} else {
			//add the role
			util.addRole(message.author, role, success => {
				if (success) {
					return util.editMessage(msg, `You now have the **${role.name}** role`, true);
				} else {
					return util.editMessage(msg, `There was an issue adding the **${role.name}** role`, true);
				}
			});
		}
	} else {
		//remove the role
		util.removeRole(message.author, role, success => {
			if (success) {
				return util.editMessage(msg, `You no longer have the **${role.name}** role`, true);
			} else {
				return util.editMessage(msg, `There was an issue removing the **${role.name}** role`, true);
			}
		});
	}
}