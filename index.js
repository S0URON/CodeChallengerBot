"use strict";

const https = require('https');
const schedule = require('node-schedule');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const Discord = require('discord.js');
const config = require('./config.json');

// create a new Discord client
const client = new Discord.Client();
const manualEmbed = {
    color: 0xfa0000,
	title: 'CodeChallenger help',
	author: {
		name: 'bot created by Buggy_Script.sh (Dovahkiin #0448)',
		icon_url: 'https://i.imgur.com/F8nDBCo.jpg',
		url: 'https://github.com/s0uron',
	},
	description: 'CodeChallenger manual page',
	thumbnail: {
		url: 'https://imgur.com/7Sw0uFD.png',
	},
	fields: [
        {
            name: '/init test',
			value: 'check if the bot is up and running',
        },
		{
			name: '/init startFetching',
			value: 'start getting coding problems at the default time (for now default is every 30sec)',
		},
        {
			name: '/init startFetching HH:MM',
			value: 'start getting coding problems at your chosen HH:MM each day (note that the format must be HH:MM) ',
		},
		{
			name: '/init reschedule',
			value: 'reschedule the job, to default time',
		},
        {
			name: '/init reschedule HH:MM',
			value: 'reschedule the job to your chosen HH:MM',
		},
		{
			name: '/init stopFetching',
			value: 'stop getting the problems',
		},
		{
			name: '/init help',
			value: 'show this manual',
		},
		{
			name: '\u200b',
			value: 'if something is not clear or you notice unwanted behavior please contact the developer Dovahkiin #0448',
			inline: false,
		},
	],
	timestamp: new Date(),
	footer: {
		text: 'end of manual',
	},
};

let servers = [];
let instances = [];
client.once('ready', () => {
    console.log('CodeChallenger Ready!');
    client.guilds.cache.map((guild) => {
        servers.push(guild.id);
    });
});

function init(message){
    for(let i = 0; i < servers.length;i++){
        if(message.guild.id === servers[i]){
            if(instances.some((e) => e.id === message.guild.id)){
                console.log('instance exists');
                let oldInstance;
                instances.some((e) => e.id === message.guild.id ? oldInstance = e : false);
                oldInstance.message = message;
                return oldInstance;
            }else{
                console.log(' msg = ' + message.guild.id + ' serv = ' + servers[i]);
                console.log('new isntance : msg_id= ' + message.guild.id + ' serv_id= ' + servers[i]);
                const ins =  new Job({id : servers[i], message : message}); 
                instances.push(ins);
                return ins;
            }
        }
    }
}

const setSchedule = (message) => {
    console.log(message.content);
    try{
        if(message != undefined){
            if(message.content.length == '/init startFetching'.length + 6 || message.content.length == '/init reschedule'.length + 6){
                let time = message.content.split(' ')[2];
                if((time.match(/:/g) || []).length === 1 && time.indexOf(':') === Math.floor(time.length / 2)){
                    for(let e of time){
                        if(e < '0' || e > ':'){
                            throw 'wrong hh:mm format';
                        }
                    }
                    let when = {
                        hour : parseInt(time.split(':')[0]),
                        minute : parseInt(time.split(':')[1])
                    }
                    if(when.hour > 23 || when.minute > 59)
                        throw "specfied time must be between 00 and 23 for the hours and between 00 and 59 for the minutes";
                    else{
                        console.log('schedueled at ' + when.hour + ':' + when.minute);
                        return when;
                    }
                }else{
                    throw 'wrong hh:mm format';
                }
            }else{
                return '*/30 * * * * *';//{hour:22,minute:05};
            }
        }else{
            throw 'message not defined';
        }
    }catch(err){
        console.log(err);
        if(err === 'wrong hh:mm format' || err === "specfied time must be between 00 and 23 for the hours and between 00 and 59 for the minutes"){
            message.channel.send(err);
            return '*/30 * * * * *';
        }
    }
}

class Job {
    constructor(server){
        this.message = server.message;
        this.num = 1;
        this.options = {
            hostname: 'projecteuler.net',
            path: '/problem=' + this.num,
            method: 'GET'
        };
        this.id = server.id;
        this.job;
        this.isRunning = false;
        this.when;
    }
    //fetch problems, starts on /init startFetching
    getProblem(){
        this.when = setSchedule(this.message);
        console.log(this.when);
        try{
            if(this.message != undefined && this.isRunning == false){
                this.message.channel.send(`schedueled to ${(this.when.hour === undefined &&  this.when.minute === undefined) ? "default" : this.when.hour + ":" + this.when.minute}`);
                //schedule to fetch every 30 sec
                let time =  this.when.minute + " " + this.when.hour + " " + "* * *";

                this.job = schedule.scheduleJob(this.id.toString(),time,() => {
                    this.isRunning = true;
                    console.log(`${Date()}`);
                        //make request from url and get problem
                        const req = https.request(this.options, res => {
                            console.log(`fetched success = > statusCode: ${res.statusCode}` + ' - ' + this.message.guild.name + ' - ' + this.message.channel.name);
                            res.on('data', d => {
                                const newHtml = d.toString();
                                const dom = new JSDOM(newHtml);
                                let Contentdiv = dom.window.document.getElementsByClassName("problem_content")[0];
                                let problem = "";
                                Contentdiv.childNodes.forEach(element => {
                                    if (element.innerHTML != undefined)
                                        problem += " " + element.innerHTML;
                                });
                                this.message.channel.send(`challenge number ${this.num-1} :\n `+ '```' + problem + '```');
                            });
                        });
                        req.on('error', error => {
                            console.error(error)
                        });
                        req.end();
                        this.num++;
                        this.options.path = '/problem=' + this.num;
                });
            }else if(this.message != undefined && this.isRunning == true){
                this.message.channel.send("new job tryin to run, stop the old one first !");
            }   
            else{
                throw "sth went wrong, check ur param count when calling getProblem";
            }
        }catch(err){
            console.log(err);
        }
    }
    reschedule(){
        try{
            if(this.message != undefined){
                this.when = setSchedule(this.message);
                if(this.isRunning == false){
                    this.getProblem();
                }else{
                    this.job.reschedule(this.when);
                    this.message.channel.send("successufully reschedueled to " + this.when.hour + ":" + this.when.minute);
                    this.isRunning == true;
                }
            }else{
                throw 'probelem with command';
            }
        }catch(err){
            console.error(err);
            this.message.channel.send(err);
        }
    }
    //stop the fetching, triggered by /init StopFetching
    stopFetch(){
        try{
            if(this.isRunning == false)
                throw 'job already stopped !'
            console.log('called stopFetch');
            schedule.scheduledJobs[this.id].cancel();
            this.isRunning = false;
            console.log("successuflly stopped " + this.message.guild.name);
            this.message.channel.send('job stopped !');
        }catch(err){console.error(err); this.message.channel.send(err);}
    }
}

client.on('message', message => {
    if (message.content.startsWith('/init') && !message.author.bot){
        console.log(message.content + ' - ' + message.guild.name + ' - ' + message.channel.name);
        let d = new Date(message.createdTimestamp);
        console.log(`${d}`);
        try{
            if(!servers.includes(message.guild.id))
                servers.push(message.guild.id);

            if (message.content.includes('test') && message.content.length == '/init test'.length){
                message.channel.send("testing");
            }else if (message.content.includes('help') && message.content.length == '/init help'.length){
                message.channel.send({ embed: manualEmbed });
            }else{
                const _job = init(message);
                if (message.content.includes('startFetching') && message.content.length <= '/init startFetching'.length + 6){
                    _job.getProblem();
                }else if (message.content.includes('stopFetching') && message.content.length == '/init stopFetching'.length){
                    _job.stopFetch();
                }else if(message.content.includes('reschedule') && message.content.length <= '/init reschedule'.length + 6){
                    _job.reschedule();
                }else{
                    throw "command doesn t exit, do /init help for usermanual"
                }
            }
        }catch(err){
            console.error(err);
            message.channel.send(err);
        }
    }
});

client.login(process.env.TOKEN);