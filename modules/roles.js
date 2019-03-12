const config = require("../config.json");
const util = require("./util.js");

function doRole(member, name) {
	var regional = false;

	var regional_role = config.regional_roles[config.regional_roles.join("\u200b").toLowerCase().split("\u200b").indexOf(name.toLowerCase())];
	var open_role = config.open_roles[config.open_roles.join("\u200b").toLowerCase().split("\u200b").indexOf(name.toLowerCase())];
	var role_name =  regional_role || open_role;

	if (role_name == undefined) return;
	if (role_name == regional_role) regional = true;

	var role = util.getRole(role_name); // if this returns null there is an issue in config

	var has_role = member.roles.has(role.id);

	if (!has_role) {
		member.addRole(role);

		if (regional) {
			config.regional_roles.forEach((r) => { // remove any regional role user may have
				if (r == role_name) return;

				var _role = member.guild.roles.find(x => x.name === r);
				if (member.roles.has(_role.id)) { 
					member.removeRole(_role);
				}
			});
		}
	}
	else {
		member.removeRole(role);
	}
}

exports.onCommand = (member, args) => {
	doRole(member, args.join(" "));
}