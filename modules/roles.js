const config = require("../config.json");
const util = require("./util.js");

exports.onCommand = async (message, command, args) => {
	//guild-only command
	if (!message.guild) return;

	//get available roles
	let regional_roles = config.regional_roles.map(x => util.getRole(x)).filter(Boolean);
	let open_roles = config.open_roles.map(x => util.getRole(x)).filter(Boolean);
	let available_roles = [...regional_roles, ...open_roles];
	let available_role_names = available_roles.map(x => x.name);
	let available_role_names_sanitized = available_role_names.map(x => util.sanitize(x));

	//ensure roles are available
	if (!available_roles.length) {
		return;
	}

	//delete command
	if (config.delete_commands) {
		util.deleteMessage(message);
	}

	//ensure role is specified
	if (args.length == 0) {
		return util.sendMessage(message.channel, `Invalid command usage: \`!${command} [${available_role_names.join("/")}]\``, true);
	}

	//ensure role exists
	let role = util.getRole(args.join(" "));
	if (!role) {
		return util.sendMessage(message.channel, `A role with the name **${util.sanitize(args.join(" "))}** doesn't exist\nAvailable roles: ${available_role_names_sanitized.join(", ")}`, true);
	}

	//ensure role is one that can be self-given
	let can_add_role = available_roles.includes(role);
	if (!can_add_role) {
		return util.sendMessage(message.channel, `You are unable to add the **${util.sanitize(role.name)}** role to yourself\nAvailable roles: ${available_role_names_sanitized.join(", ")}`, true);
	}

	//immediately send response
	let msg = await message.channel.send("Organising roles...").catch(err => {
		console.log(`ERROR: Couldn't send message in #${message.channel.name} - ${err.message}`);
	});
	if (!msg) return;

	//toggle role
	if (!util.userHasRole(message.author, role)) {
		let regional = regional_roles.includes(role);
		if (regional) {
			//remove all other region roles
			let roles = regional_roles.filter(x => util.userHasRole(message.author, x));
			util.removeRole(message.author, roles, success => {
				if (success) {
					//add the region role
					util.addRole(message.author, role, success => {
						if (success) {
							return util.editMessage(msg, `You now have the **${util.sanitize(role.name)}** role`, true);
						} else {
							return util.editMessage(msg, `There was an issue adding the **${util.sanitize(role.name)}** role`, true);
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
					return util.editMessage(msg, `You now have the **${util.sanitize(role.name)}** role`, true);
				} else {
					return util.editMessage(msg, `There was an issue adding the **${util.sanitize(role.name)}** role`, true);
				}
			});
		}
	} else {
		//remove the role
		util.removeRole(message.author, role, success => {
			if (success) {
				return util.editMessage(msg, `You no longer have the **${util.sanitize(role.name)}** role`, true);
			} else {
				return util.editMessage(msg, `There was an issue removing the **${util.sanitize(role.name)}** role`, true);
			}
		});
	}
}