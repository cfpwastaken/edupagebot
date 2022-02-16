const Discord = require("discord.js");
const bot = new Discord.Client({intents: ["GUILDS", "GUILD_MEMBERS"]});
const TOKEN = require("./token.json").token;
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Edupage } = require("edupage-api");
let edupage = new Edupage();
const fs = require("fs");
const config = require("./config.json");
const msgAllowed = require("./msg-allowed-recips.json");

const SUCCESS = config.messages.sucess;
const ERROR = config.messages.error;
const WARN = config.messages.warning;
const INFO = config.messages.info;
const QUESTION = config.messages.question;

async function ep_login() {
    await edupage.login(require("./token.json").ep_user, require("./token.json").ep_pass);
}

// sleep function with promises
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  try {
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
                let channel = bot.channels.cache.get(config.assignment_channel);
                if(channel) {
                    console.log("[!] Posting assignment: " + assignment.id);
                    let embed = new Discord.MessageEmbed()
                        .setTitle(assignment.title + " - " + assignment.type)
                        .setDescription(assignment.subject.name + " " + assignment.cardsCount + " cards, " + assignment.answerCardsCount + " answer cards")
                        .setColor(0x00ff00)
                        .setFooter("Edupage")
                    await channel.send({content: config.messages.new_assignment, embeds: [embed]});
                    done.assignments.push(assignment.id);
                    require("fs").writeFileSync("./doneid.json", JSON.stringify(done));
                }
            }
        }
        const timeline = edupage.timeline;
        for(let i = 0; i < timeline.length; i++) {
            let msg = timeline[i];
            console.log("NEW MESSAGE", msg.recipientUserString, msgAllowed.includes(msg.recipientUserString));
            if(msgAllowed.includes(msg.recipientUserString)) {
                let done = require("./doneid.json");
                if(!done.msgs.includes(msg.id)) {
                    console.log("NOT DONE");
                    let channel = bot.channels.cache.get(config.message_channel);
                    if(channel) {
                        console.log("Posting message: " + msg.id);
                        let embed = new Discord.MessageEmbed()
                            .setTitle(msg.title)
                            .setDescription(msg.text)
                            .setColor(msg.isImportant ? "RED" : "WHITE")
                            .setFooter("Edupage")
                        await channel.send({content: config.messages.new_message, embeds: [embed]});
                        done.msgs.push(msg.id);
                        require("fs").writeFileSync("./doneid.json", JSON.stringify(done));
                    }
                }
            }
        }
        await sleep(1000 * 60 * 1);
        await edupage.refresh();
    }
  } catch (error) {
    console.error(error);
  }
})();
const sharp = require("sharp")

bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
  
    if (interaction.commandName === 'ping') {
      await interaction.reply('Pong!');
    } else if(interaction.commandName === "login-edupage") {
        try {
            await ep_login();
            await interaction.reply(`${SUCCESS} ${config.messages.logged_in}`);
        } catch(e) {
            await interaction.reply(`${ERROR} ${e}`);
        }
    } else if(interaction.commandName === "refresh-edupage") {
        try {
            await edupage.refresh();
            await interaction.reply(`${SUCCESS} ${config.messages.refreshed}`);
        } catch(e) {
            await interaction.reply(`${ERROR} ${e}`);
        }
    } else if(interaction.commandName === "timetable") {
        await interaction.deferReply(); // Give us some more time to reply
        let timetable = fs.readFileSync("./timetable.svg", {encoding: "utf8"});
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const today = new Date();

        const ttyesterday = await edupage.getTimetableForDate(yesterday);
        const tttoday = await edupage.getTimetableForDate(today);
        const tttomorrow = await edupage.getTimetableForDate(tomorrow);

        const tables = [ttyesterday, tttoday, tttomorrow];
        for (let i = 1; i < tables.length + 1; i++) {
            const table = tables[i - 1];
            const lessons = table.lessons;
            if(table.lessons.length == 0) {
                console.log("EMPTY LESSONS");
                //continue;
            }
            const periods = [];
            for (let j = 1; j < 11; j++) {
                const lesson = lessons[j - 1];
                if(lesson == undefined) {
                    // timetable = timetable.replace("PH-D" + i + "-S" + j + "-S", "");
                    // timetable = timetable.replace("PH-D" + i + "-S" + j + "-T", "");
                    // timetable = timetable.replace("PH-D" + i + "-S" + j + "-R", "");
                    continue;
                }
                console.log("Replacing");
                periods.push(lesson.period.id);
                timetable = timetable.replace("PH-D" + i + "-S" + lesson.period.id + "-S", lesson.subject.short);
                timetable = timetable.replace("PH-D" + i + "-S" + lesson.period.id + "-T", lesson.teachers[0].short);
                timetable = timetable.replace("PH-D" + i + "-S" + lesson.period.id + "-R", lesson.classrooms[0].name.replace("Klassenraum", "").replace("Classroom", "")); // PLEASE PULL REQUEST MORE
            }
            // for every missing period, replace it with an empty string
            for (let j = 1; j < 11; j++) {
                if(!periods.includes(j)) {
                    timetable = timetable.replace("PH-D" + i + "-S" + j + "-S", "");
                    timetable = timetable.replace("PH-D" + i + "-S" + j + "-T", "");
                    timetable = timetable.replace("PH-D" + i + "-S" + j + "-R", "");
                }
            }

            // Convert the timetable to png

            sharp("tt.svg")
                .png()
                .on("finish", () => {
                    console.log("FINISH")
                })
                .toFile("tt.png")
                .then(function(info) {
                    console.log(info)
                    // send tt.png to discord
                    const embed = new Discord.MessageEmbed()
                        .setTitle("Stundenplan")
                        .setImage("attachment://tt.png")
                        .setColor(0x00ff00)
                        .setFooter("Edupage")
                    //                              \/ Zero width space here!!
                    interaction.editReply({content: "​", embeds: [embed], files: ["tt.png"]});
                })
                .catch(function(err) {
                    console.log(err)
                    interaction.editReply({content: `${ERROR} ${err}`});
                })
        }
        timetable = timetable.replace("PH-D1", yesterday.getDay());
        timetable = timetable.replace("PH-D2", today.getDay());
        timetable = timetable.replace("PH-D3", tomorrow.getDay());


        fs.writeFileSync("tt.svg", timetable);
    }
});

bot.login(TOKEN);
