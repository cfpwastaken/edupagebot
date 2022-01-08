const Discord = require("discord.js");
const bot = new Discord.Client({intents: ["GUILDS", "GUILD_MEMBERS"]});
const TOKEN = require("./token.json").token;
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Edupage } = require("edupage-api");
let edupage = new Edupage();
const fs = require("fs");

const SUCCESS = ":white_check_mark:";
const ERROR = ":x:";

async function ep_login() {
    await edupage.login(require("./token.json").ep_user, require("./token.json").ep_pass);
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

const rest = new REST({ version: '9' }).setToken(TOKEN);
const CLIENT_ID = "917427664153878600";
const GUILD_ID = "887709964049735740";

// sleep function with promises
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  try {
    // console.log('Started refreshing application (/) commands.');

    // await rest.put(
    //   Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    //   { body: commands },
    // );

    // console.log('Successfully reloaded application (/) commands.');
    
    try {
        await ep_login();
    } catch(e) {
        console.log(e);
    }

    while(true) {
        await sleep(1000);
        const assignments = edupage.assignments;
        // for every assignment, check if it is in doneid.json, if not, post it
        for(let i = 0; i < assignments.length; i++) {
            let assignment = assignments[i];
            let done = require("./doneid.json");
            if(!done.assignments.includes(assignment.id)) {
                let channel = bot.channels.cache.get("923553605401853965");
                if(channel) {
                    console.log("[!] Posting assignment: " + assignment.id);
                    let embed = new Discord.MessageEmbed()
                        .setTitle(assignment.title + " - " + assignment.type)
                        .setDescription(assignment.subject.name + " " + assignment.cardsCount + " cards, " + assignment.answerCardsCount + " answer cards")
                        .setColor(0x00ff00)
                        .setFooter("Edupage")
                    await channel.send({content: "@everyone", embeds: [embed]});
                    done.assignments.push(assignment.id);
                    require("fs").writeFileSync("./doneid.json", JSON.stringify(done));
                }
            }
        }
        const timeline = edupage.timeline;
        for(let i = 0; i < timeline.length; i++) {
            let msg = timeline[i];
            if(msg.recipientUserString == "*") {
                let done = require("./doneid.json");
                if(!done.msgs.includes(msg.id)) {
                    let channel = bot.channels.cache.get("923553605401853965");
                    if(channel) {
                        console.log("Posting message: " + msg.id);
                        let embed = new Discord.MessageEmbed()
                            .setTitle(msg.title)
                            .setDescription(msg.text)
                            .setColor(msg.isImportant ? "RED" : "WHITE")
                            .setFooter("Edupage")
                        await channel.send({content: "@everyone", embeds: [embed]});
                        done.msgs.push(msg.id);
                        require("fs").writeFileSync("./doneid.json", JSON.stringify(done));
                    }
                }
            }
        }
        await sleep(1000 * 60 * 25);
    }
  } catch (error) {
    console.error(error);
  }
})();

(async () => {
    while(true) {
        await sleep(1000 * 60 * 30);
        await edupage.refresh();
        console.log("Refreshed edupage");
    }
})();

bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
  
    if (interaction.commandName === 'ping') {
      await interaction.reply('Pong!');
    } else if(interaction.commandName === "login-edupage") {
        try {
            await ep_login();
            await interaction.reply(`${SUCCESS} Angemeldet!`);
        } catch(e) {
            await interaction.reply(`${ERROR} ${e}`);
        }
    } else if(interaction.commandName === "refresh-edupage") {
        try {
            await edupage.refresh();
            await interaction.reply(`${SUCCESS} Aktualisiert!`);
        } catch(e) {
            await interaction.reply(`${ERROR} ${e}`);
        }
    } else if(interaction.commandName === "timetable") {
        let timetable = fs.readFileSync("./timetable.svg", {encoding: "utf8"});
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const today = new Date();

        const ttyesterday = await edupage.getTimetableForDate(yesterday);
        const tttoday = await edupage.getTimetableForDate(today);
        const tttomorrow = await edupage.getTimetableForDate(tomorrow);

        timetable.replace("PH-D1", yesterday.getDay());
        timetable.replace("PH-D2", today.getDay());
        timetable.replace("PH-D3", tomorrow.getDay());

        const tables = [ttyesterday, tttoday, tttomorrow];
        for (let i = 1; i < tables.length + 1; i++) {
            const table = tables[i - 1];
            const lessons = table.lessons;
            for (let j = 1; j < 10; j++) {
                const lesson = lessons[i];
                timetable.replace("PH-D" + i + "-S" + j + "-S", lesson.subject.name);
                timetable.replace("PH-D" + i + "-S" + j + "-T", lesson.teachers[0].name);
                timetable.replace("PH-D" + i + "-S" + j + "-R", lesson.classrooms[0].name);
            }
        }

        fs.writeFileSync("tt.svg", timetable);
    }
});

bot.login(TOKEN);