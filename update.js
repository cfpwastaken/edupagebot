const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require("fs");
const config = require("./config.json");

if(!fs.existsSync("./doneid.json")) {
    fs.writeFileSync("./doneid.json", JSON.stringify({assignments: [], msgs: []}));
    console.log("Wrote new doneid.json");
}

if(!fs.existsSync("./token.json")) {
    fs.writeFileSync("./token.json", JSON.stringify({token: "discordBotTokenHere", ep_user: "edupageUser", ep_pass: "edupagePassword"}));
    console.log("Wrote new token.json. Please fill in the token.json file with your Edupage and discord credentials.");
}

const commands = [{
    name: 'ping',
    description: 'Pong!'
}, {
    name: "login-edupage",
    description: "Edupage relogin"
}, {
    name: "refresh-edupage",
    description: "Edupage refresh"
}, {
    name: "timetable",
    description: "Get timetable"
}];

const rest = new REST({ version: '9' }).setToken(require("./token.json").token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(require("./config.json").client_id, require("./config.json").guild_id),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();